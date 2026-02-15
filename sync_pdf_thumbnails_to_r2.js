/*
  Generate and upload PDF first-page thumbnails to Cloudflare R2.

  Behavior:
  - For each *.pdf object, ensure a sibling thumbnail exists as: <same name>.png
  - Only regenerate/upload when the PDF changed (compare PDF ETag vs thumbnail metadata).
  - IMPORTANT: if you manually uploaded a preview image (same base name: .png/.jpg/.jpeg/.webp),
    this script will NOT create/overwrite thumbnails for that PDF.

  Requirements (macOS):
  - qlmanage (built-in) to render PDF -> PNG thumbnail

  Usage:
    node sync_pdf_thumbnails_to_r2.js
    node sync_pdf_thumbnails_to_r2.js --prefix "Ostala dokumentacija/"
    node sync_pdf_thumbnails_to_r2.js --prefix "Okenski sistemi/" --dry-run

  Env vars (loaded from .env automatically if present):
    R2_ACCOUNT_ID=...
    R2_ENDPOINT=https://<account>.r2.cloudflarestorage.com   (optional if R2_ACCOUNT_ID is set)
    R2_BUCKET=portal-aluk
    R2_ACCESS_KEY_ID=...
    R2_SECRET_ACCESS_KEY=...
*/

const fs = require("fs");
const path = require("path");
const os = require("os");
const { spawnSync } = require("child_process");
const {
  S3Client,
  ListObjectsV2Command,
  HeadObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
} = require("@aws-sdk/client-s3");

function loadDotEnvFile(envPath = path.join(__dirname, ".env")) {
  try {
    if (!fs.existsSync(envPath)) return;
    const raw = fs.readFileSync(envPath, "utf8");
    raw.split(/\r?\n/).forEach((line) => {
      const s = String(line || "").trim();
      if (!s || s.startsWith("#")) return;
      const cleaned = s.startsWith("export ") ? s.slice("export ".length) : s;
      const eq = cleaned.indexOf("=");
      if (eq === -1) return;
      const key = cleaned.slice(0, eq).trim();
      let val = cleaned.slice(eq + 1).trim();
      if (!key) return;
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (process.env[key] == null) process.env[key] = val;
    });
  } catch (e) {}
}

loadDotEnvFile();

if (!process.env.R2_ENDPOINT && process.env.R2_ACCOUNT_ID) {
  process.env.R2_ENDPOINT = `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
}

function requireEnv(name, fallback) {
  const v = process.env[name] || fallback;
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

function parseArgs(argv) {
  const out = { prefix: "", dryRun: false, summary: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") out.dryRun = true;
    else if (a === "--summary" || a === "--quiet") out.summary = true;
    else if (a === "--prefix") out.prefix = String(argv[++i] || "");
    else if (a && a.startsWith("--prefix=")) out.prefix = a.slice("--prefix=".length);
  }
  return out;
}

function stripQuotes(s) {
  const v = String(s || "");
  if (v.startsWith('"') && v.endsWith('"')) return v.slice(1, -1);
  return v;
}

function hasCmd(cmd) {
  const r = spawnSync("sh", ["-lc", `command -v ${cmd} >/dev/null 2>&1`], { stdio: "ignore" });
  return r.status === 0;
}

async function streamToFile(readable, filePath) {
  await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
  return new Promise((resolve, reject) => {
    const w = fs.createWriteStream(filePath);
    readable.pipe(w);
    w.on("finish", resolve);
    w.on("error", reject);
  });
}

function run(cmd, args, opts = {}) {
  return spawnSync(cmd, args, { encoding: "utf8", ...opts });
}

function toThumbKey(pdfKey) {
  return pdfKey.slice(0, -4) + ".png";
}

function toBaseKey(pdfKey) {
  return pdfKey.slice(0, -4);
}

function getBaseNameForTmp(key) {
  return key.replace(/[\/\\]/g, "__").replace(/[^a-zA-Z0-9_.-]/g, "_");
}

function renderPdfToPngFirstPage(pdfPath, outDir, sizePx = 900) {
  const r = run("qlmanage", ["-t", "-s", String(sizePx), "-o", outDir, pdfPath], { stdio: "pipe" });
  if (r.status !== 0) throw new Error(`qlmanage failed: ${r.stderr || r.stdout || "unknown error"}`);

  const files = fs.readdirSync(outDir).filter((f) => f.toLowerCase().endsWith(".png"));
  if (!files.length) throw new Error("qlmanage did not produce a PNG thumbnail");
  files.sort((a, b) => fs.statSync(path.join(outDir, b)).mtimeMs - fs.statSync(path.join(outDir, a)).mtimeMs);
  return path.join(outDir, files[0]);
}

async function listAllObjects(s3, bucket, prefix) {
  const keys = [];
  let token = undefined;
  while (true) {
    const res = await s3.send(new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix || undefined,
      ContinuationToken: token,
      MaxKeys: 1000,
    }));
    const contents = Array.isArray(res.Contents) ? res.Contents : [];
    for (const o of contents) if (o && o.Key) keys.push(o.Key);
    if (!res.IsTruncated) break;
    token = res.NextContinuationToken;
  }
  return keys;
}

async function headSafe(s3, bucket, key) {
  try {
    return await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
  } catch (e) {
    const code = e && (e.$metadata && e.$metadata.httpStatusCode);
    if (code === 404) return null;
    if (String(e && e.name) === "NotFound") return null;
    return null;
  }
}

async function main() {
  const args = parseArgs(process.argv);

  const endpoint = requireEnv("R2_ENDPOINT");
  const bucket = requireEnv("R2_BUCKET", "portal-aluk");
  const accessKeyId = requireEnv("R2_ACCESS_KEY_ID");
  const secretAccessKey = requireEnv("R2_SECRET_ACCESS_KEY");

  if (!hasCmd("qlmanage")) throw new Error("Missing qlmanage (expected on macOS).");

  const s3 = new S3Client({
    region: "auto",
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
  });

  const prefix = args.prefix || "";
  console.log(`Scanning R2 bucket "${bucket}" prefix "${prefix || "(all)"}"...`);

  const allKeys = await listAllObjects(s3, bucket, prefix);
  const pdfKeys = allKeys.filter((k) => String(k).toLowerCase().endsWith(".pdf"));
  console.log(`Found ${pdfKeys.length} PDFs.`);

  let created = 0;
  let skipped = 0;
  let failed = 0;
  let wouldUpload = 0;
  let wouldCreate = 0;
  let wouldUpdate = 0;

  for (let i = 0; i < pdfKeys.length; i++) {
    const pdfKey = pdfKeys[i];
    const baseKey = toBaseKey(pdfKey);
    const thumbKey = toThumbKey(pdfKey);
    if (!args.summary) {
      process.stdout.write(`\n[${i + 1}/${pdfKeys.length}] ${pdfKey}\n`);
    } else if ((i + 1) % 50 === 0 || i === 0) {
      process.stdout.write(`\nProgress: ${i + 1}/${pdfKeys.length}\n`);
    }

    const pdfHead = await headSafe(s3, bucket, pdfKey);
    if (!pdfHead || !pdfHead.ETag) {
      if (!args.summary) console.log("  skip: cannot HEAD PDF (missing ETag)");
      skipped++;
      continue;
    }
    const pdfEtag = stripQuotes(pdfHead.ETag);

    const thumbHead = await headSafe(s3, bucket, thumbKey);
    const thumbSrcEtag =
      thumbHead && thumbHead.Metadata
        ? (thumbHead.Metadata["src-etag"] || thumbHead.Metadata["src_etag"] || "")
        : "";

    // Manual preview detection:
    // - If <name>.png/jpg/jpeg exists, treat it as manual and skip.
    // - If <name>.webp exists, treat it as manual and skip.
    // - If <name>.png exists WITHOUT src-etag metadata, treat it as manual and skip.
    const manualPreviewExts = [".jpg", ".jpeg", ".webp"];
    let hasManualPreview = false;
    for (const ext of manualPreviewExts) {
      const h = await headSafe(s3, bucket, baseKey + ext);
      if (h) { hasManualPreview = true; break; }
    }
    if (thumbHead && !thumbSrcEtag) hasManualPreview = true; // existing png but not managed by us

    if (hasManualPreview) {
      if (!args.summary) console.log("  skip: manual preview image exists for this PDF");
      skipped++;
      continue;
    }

    if (thumbHead && thumbSrcEtag && thumbSrcEtag === pdfEtag) {
      if (!args.summary) console.log("  ok: thumbnail up-to-date");
      skipped++;
      continue;
    }

    if (args.dryRun) {
      if (thumbHead) {
        if (!args.summary) console.log("  would update thumbnail (DRY RUN: no upload)");
        wouldUpdate++;
      } else {
        if (!args.summary) console.log("  would create thumbnail (DRY RUN: no upload)");
        wouldCreate++;
      }
      wouldUpload++;
      continue;
    }

    const tmpBase = getBaseNameForTmp(pdfKey);
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "aluk-pdf-thumb-"));
    const localPdf = path.join(tmpDir, `${tmpBase}.pdf`);
    const qlOutDir = path.join(tmpDir, "ql");
    const localPng = path.join(tmpDir, `${tmpBase}.png`);

    try {
      const pdfObj = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: pdfKey }));
      if (!pdfObj || !pdfObj.Body) throw new Error("GetObject returned no Body");
      await streamToFile(pdfObj.Body, localPdf);

      fs.mkdirSync(qlOutDir, { recursive: true });
      const pngThumb = renderPdfToPngFirstPage(localPdf, qlOutDir, 900);
      // Normalize name for upload; keep PNG format (works without extra tools and portal supports it).
      fs.copyFileSync(pngThumb, localPng);

      await s3.send(new PutObjectCommand({
        Bucket: bucket,
        Key: thumbKey,
        // Read eagerly to avoid async stream open errors if we clean up temp dir on failure.
        Body: fs.readFileSync(localPng),
        ContentType: "image/png",
        CacheControl: "public, max-age=0, must-revalidate",
        Metadata: {
          "src-etag": pdfEtag,
          // Don't store raw key in metadata headers (can contain non-ASCII characters).
          // If you ever need it, derive it from the object name (<name>.pdf <-> <name>.png).
        },
      }));

      if (!args.summary) console.log(thumbHead ? "  updated: uploaded thumbnail" : "  created: uploaded thumbnail");
      created++;
    } catch (e) {
      if (!args.summary) console.log(`  failed: ${e && e.message ? e.message : String(e)}`);
      failed++;
    } finally {
      try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (e) {}
    }
  }

  if (args.dryRun) {
    console.log(`\nDone (dry run). wouldUpload=${wouldUpload} (create=${wouldCreate}, update=${wouldUpdate}), skipped=${skipped}, failed=${failed}`);
  } else {
    console.log(`\nDone. created/updated=${created}, skipped=${skipped}, failed=${failed}`);
  }
  if (failed > 0) process.exitCode = 1;
}

main().catch((e) => {
  console.error(String(e && e.message ? e.message : e));
  process.exit(1);
});
