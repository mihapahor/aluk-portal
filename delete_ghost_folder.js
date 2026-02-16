const {
  S3Client,
  ListObjectsV2Command,
  DeleteObjectsCommand
} = require("@aws-sdk/client-s3");

function requireEnv(name, fallback) {
  const v = process.env[name] || fallback;
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

const ACCOUNT_ID = requireEnv("R2_ACCOUNT_ID");
const ACCESS_KEY_ID = requireEnv("R2_ACCESS_KEY_ID");
const SECRET_ACCESS_KEY = requireEnv("R2_SECRET_ACCESS_KEY");
const ENDPOINT = requireEnv(
  "R2_ENDPOINT",
  `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`
);
const BUCKET = requireEnv("R2_BUCKET", "portal-aluk");
const TARGET_PREFIX = process.env.R2_TARGET_PREFIX || "Okenski sistem C67K/";

const client = new S3Client({
  region: "auto",
  endpoint: ENDPOINT,
  credentials: {
    accessKeyId: ACCESS_KEY_ID,
    secretAccessKey: SECRET_ACCESS_KEY
  }
});

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

async function listAllKeysByPrefix(prefix) {
  const keys = [];
  let continuationToken;

  do {
    const res = await client.send(
      new ListObjectsV2Command({
        Bucket: BUCKET,
        Prefix: prefix,
        ContinuationToken: continuationToken
      })
    );

    const found = (res.Contents || []).map((obj) => obj.Key).filter(Boolean);
    keys.push(...found);
    continuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (continuationToken);

  return keys;
}

async function deleteKeys(keys) {
  const batches = chunk(keys, 1000);
  const deleted = [];
  const errors = [];

  for (const batch of batches) {
    const res = await client.send(
      new DeleteObjectsCommand({
        Bucket: BUCKET,
        Delete: {
          Quiet: false,
          Objects: batch.map((Key) => ({ Key }))
        }
      })
    );

    (res.Deleted || []).forEach((d) => {
      if (d.Key) deleted.push(d.Key);
    });
    (res.Errors || []).forEach((e) => {
      errors.push({ key: e.Key, code: e.Code, message: e.Message });
    });
  }

  return { deleted, errors };
}

async function main() {
  console.log("Account ID:", ACCOUNT_ID);
  console.log("Bucket:", BUCKET);
  console.log("Target prefix:", TARGET_PREFIX);
  console.log("Listing objects...");

  const keys = await listAllKeysByPrefix(TARGET_PREFIX);

  if (!keys.length) {
    console.log("No objects found for prefix. Nothing to delete.");
    return;
  }

  console.log(`Found ${keys.length} object(s). Deleting...`);
  keys.forEach((k) => console.log("FOUND:", k));

  const { deleted, errors } = await deleteKeys(keys);

  console.log(`Deleted ${deleted.length} object(s):`);
  deleted.forEach((k) => console.log("DELETED:", k));

  if (errors.length) {
    console.error(`Delete returned ${errors.length} error(s):`);
    errors.forEach((e) =>
      console.error(`ERROR: ${e.key || "(unknown)"} | ${e.code || "UnknownCode"} | ${e.message || "No message"}`)
    );
    process.exitCode = 1;
  } else {
    console.log("Done. Prefix cleanup finished without delete errors.");
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
