const { S3Client, ListObjectsV2Command } = require("@aws-sdk/client-s3");
const { createClient } = require("@supabase/supabase-js");

const R2_ENDPOINT = "https://ef2bd3a95bf46a4691f8c1d525b0c876.r2.cloudflarestorage.com";
const R2_BUCKET = "portal-aluk";
const R2_ACCESS_KEY_ID = "36d936b2280fb3933f0620ac0fbef799";
const R2_SECRET_ACCESS_KEY = "11b4f399ac882f0f5c7133d174bdbf7045192f2fd81222ac4ad651d77d09eacd";

const SUPABASE_URL = "https://ugwchsznxsuxbxdvigsu.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVnd2Noc3pueHN1eGJ4ZHZpZ3N1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTExNjQ3MSwiZXhwIjoyMDg0NjkyNDcxfQ.vTBbAzs7FwkQ-VH2KsJXuwEJT1E1wbF8AdylFn1qEDc";
const SUPABASE_TABLE = "files";

const s3 = new S3Client({
  region: "auto",
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY
  }
});

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

function toDisplayName(filename) {
  const withoutExt = String(filename || "").replace(/\.[^/.]+$/, "");
  return withoutExt.replace(/_/g, " ");
}

function keyToRow(key, size, lastModified) {
  const safeKey = String(key || "").replace(/^\/+/, "");
  if (!safeKey || safeKey.endsWith("/")) return null;

  const parts = safeKey.split("/");
  const filename = parts[parts.length - 1];
  if (!filename) return null;

  const parentParts = parts.slice(0, -1);
  const r2Path = parentParts.length ? `${parentParts.join("/")}/` : "";
  const folderName = parentParts.length ? parentParts[parentParts.length - 1] : "Katalogi";

  return {
    name: toDisplayName(filename),
    folder_name: folderName,
    filename,
    r2_path: r2Path,
    size_bytes: Number.isFinite(Number(size)) ? Number(size) : 0,
    updated_at: lastModified ? new Date(lastModified).toISOString() : null
  };
}

async function listAllR2Objects() {
  const objects = [];
  let continuationToken;

  while (true) {
    const res = await s3.send(
      new ListObjectsV2Command({
        Bucket: R2_BUCKET,
        ContinuationToken: continuationToken,
        MaxKeys: 1000
      })
    );

    const batch = Array.isArray(res.Contents) ? res.Contents : [];
    objects.push(...batch);

    if (!res.IsTruncated) break;
    continuationToken = res.NextContinuationToken;
    if (!continuationToken) break;
  }

  return objects;
}

async function upsertRows(rows) {
  const batches = chunk(rows, 500);
  let done = 0;

  for (const [i, batch] of batches.entries()) {
    const { error } = await supabase
      .from(SUPABASE_TABLE)
      .upsert(batch, { onConflict: "r2_path,filename" });
    if (error) {
      throw new Error(`Supabase upsert failed on batch ${i + 1}/${batches.length}: ${error.message}`);
    }
    done += batch.length;
    console.log(`Upserted ${done}/${rows.length}`);
  }
}

async function fetchAllSupabaseFileKeys() {
  const out = [];
  const pageSize = 1000;
  let from = 0;

  while (true) {
    const to = from + pageSize - 1;
    const { data, error } = await supabase
      .from(SUPABASE_TABLE)
      .select("r2_path,filename")
      .range(from, to);

    if (error) {
      throw new Error(`Supabase select failed: ${error.message}`);
    }

    const batch = Array.isArray(data) ? data : [];
    out.push(...batch);
    if (batch.length < pageSize) break;
    from += pageSize;
  }

  return out;
}

function makeKey(r2Path, filename) {
  const p = String(r2Path || "");
  const f = String(filename || "");
  return `${p}|||${f}`;
}

function chunkMapValues(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

async function deleteMissingRows(currentR2Rows) {
  const dbRows = await fetchAllSupabaseFileKeys();
  const r2KeySet = new Set(
    currentR2Rows.map((r) => makeKey(r.r2_path || "", r.filename || ""))
  );

  const stale = dbRows.filter((r) => {
    const key = makeKey(r.r2_path || "", r.filename || "");
    return !r2KeySet.has(key);
  });

  if (!stale.length) {
    console.log("No stale rows to delete.");
    return;
  }

  // Group by r2_path so we can delete with eq(path) + in(filename)
  const byPath = new Map();
  for (const row of stale) {
    const pathKey = String(row.r2_path || "");
    const filename = String(row.filename || "");
    if (!filename) continue;
    if (!byPath.has(pathKey)) byPath.set(pathKey, []);
    byPath.get(pathKey).push(filename);
  }

  let deletedTotal = 0;
  for (const [pathKey, filenames] of byPath.entries()) {
    const chunks = chunkMapValues([...new Set(filenames)], 500);
    for (const fileChunk of chunks) {
      const { error } = await supabase
        .from(SUPABASE_TABLE)
        .delete()
        .eq("r2_path", pathKey)
        .in("filename", fileChunk);

      if (error) {
        throw new Error(
          `Supabase delete failed for path "${pathKey}": ${error.message}`
        );
      }
      deletedTotal += fileChunk.length;
    }
  }

  console.log(`Deleted ${deletedTotal} stale row(s) from "${SUPABASE_TABLE}".`);
}

async function main() {
  console.log("Listing all objects from R2...");
  const objects = await listAllR2Objects();
  console.log(`Found ${objects.length} object(s) in bucket "${R2_BUCKET}".`);

  const rows = objects
    .map((obj) => keyToRow(obj.Key, obj.Size, obj.LastModified))
    .filter(Boolean);

  if (!rows.length) {
    console.log("No file rows to sync.");
    return;
  }

  console.log(`Prepared ${rows.length} row(s) for upsert into "${SUPABASE_TABLE}".`);
  await upsertRows(rows);
  await deleteMissingRows(rows);
  console.log("Sync finished.");
}

main().catch((err) => {
  console.error("Sync failed:", err.message || err);
  process.exit(1);
});
