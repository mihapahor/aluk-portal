const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

function requireEnv(name, fallback) {
  const v = process.env[name] || fallback;
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

const SUPABASE_URL = requireEnv("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
const BUCKET = process.env.SUPABASE_BUCKET || "Catalogs";
const BACKUP_ROOT = path.resolve(process.env.SUPABASE_BACKUP_ROOT || "./Supabase_Backup");

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function listAllFilesRecursive(folder = "") {
  const files = [];
  const limit = 1000;
  let offset = 0;

  while (true) {
    const { data, error } = await supabase.storage.from(BUCKET).list(folder, {
      limit,
      offset,
      sortBy: { column: "name", order: "asc" }
    });

    if (error) {
      throw new Error(`List failed for "${folder || "/"}": ${error.message}`);
    }

    if (!Array.isArray(data) || data.length === 0) break;

    for (const item of data) {
      if (!item || item.name === ".emptyFolderPlaceholder") continue;
      const fullPath = folder ? `${folder}/${item.name}` : item.name;

      if (item.metadata) {
        files.push(fullPath);
      } else {
        const nested = await listAllFilesRecursive(fullPath);
        files.push(...nested);
      }
    }

    if (data.length < limit) break;
    offset += limit;
  }

  return files;
}

async function downloadFile(storagePath, index, total) {
  const localPath = path.join(BACKUP_ROOT, storagePath);
  const localDir = path.dirname(localPath);
  fs.mkdirSync(localDir, { recursive: true });

  const { data, error } = await supabase.storage.from(BUCKET).download(storagePath);
  if (error) {
    throw new Error(`Download failed for "${storagePath}": ${error.message}`);
  }
  if (!data) {
    throw new Error(`Download returned empty data for "${storagePath}"`);
  }

  const arrayBuffer =
    data instanceof ArrayBuffer ? data : await data.arrayBuffer();
  fs.writeFileSync(localPath, Buffer.from(arrayBuffer));
  console.log(`[${index}/${total}] Downloaded: ${storagePath}`);
}

async function main() {
  console.log(`Starting backup from bucket "${BUCKET}"...`);
  console.log(`Destination: ${BACKUP_ROOT}`);
  fs.mkdirSync(BACKUP_ROOT, { recursive: true });

  const files = await listAllFilesRecursive("");
  console.log(`Found ${files.length} file(s).`);

  for (let i = 0; i < files.length; i += 1) {
    const storagePath = files[i];
    await downloadFile(storagePath, i + 1, files.length);
  }

  console.log("Backup completed.");
}

main().catch((err) => {
  console.error("Backup failed:", err.message || err);
  process.exit(1);
});
