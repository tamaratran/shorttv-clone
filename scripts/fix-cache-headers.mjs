#!/usr/bin/env node

/**
 * Fix cache-control headers on all Firebase Storage video files.
 *
 * Many videos were uploaded without cache-control metadata, defaulting to
 * "private, max-age=0" which forces the browser to re-download the full
 * file on every request. This script sets:
 *
 *   cache-control: public, max-age=86400   (videos — 1 day)
 *   cache-control: public, max-age=31536000 (covers — 1 year)
 *
 * Usage: GOOGLE_APPLICATION_CREDENTIALS=... node scripts/fix-cache-headers.mjs
 *
 * Options:
 *   --dry-run   List files that need fixing without making changes
 *   --covers    Also fix cover image headers
 */

import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";

const PROJECT_ID = "shorttv-videos";
const BUCKET_NAME = "shorttv-videos.firebasestorage.app";
const DRY_RUN = process.argv.includes("--dry-run");
const FIX_COVERS = process.argv.includes("--covers");
const CONCURRENCY = 10;

const VIDEO_CACHE = "public, max-age=86400";
const COVER_CACHE = "public, max-age=31536000";

const app = initializeApp({
  credential: applicationDefault(),
  projectId: PROJECT_ID,
  storageBucket: BUCKET_NAME,
});

const bucket = getStorage(app).bucket();

async function processFiles(prefix, targetCache, label) {
  console.log(`\n--- ${label} (prefix: "${prefix}") ---`);

  const [files] = await bucket.getFiles({ prefix });
  console.log(`  Found ${files.length} files`);

  let fixed = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < files.length; i += CONCURRENCY) {
    const batch = files.slice(i, i + CONCURRENCY);

    await Promise.all(
      batch.map(async (file) => {
        try {
          const [metadata] = await file.getMetadata();
          const current = metadata.cacheControl || "";

          if (current === targetCache) {
            skipped++;
            return;
          }

          if (DRY_RUN) {
            console.log(`  NEEDS FIX: ${file.name} (current: "${current}")`);
            fixed++;
            return;
          }

          await file.setMetadata({ cacheControl: targetCache });
          fixed++;
        } catch (err) {
          console.error(`  ERROR: ${file.name} — ${err.message}`);
          errors++;
        }
      })
    );

    if ((i + CONCURRENCY) % 100 === 0 || i + CONCURRENCY >= files.length) {
      console.log(
        `  Progress: ${Math.min(i + CONCURRENCY, files.length)}/${files.length} (${fixed} ${DRY_RUN ? "need fix" : "fixed"}, ${skipped} ok, ${errors} errors)`
      );
    }
  }

  return { fixed, skipped, errors, total: files.length };
}

async function main() {
  console.log("=== Fix Cache Headers ===");
  if (DRY_RUN) console.log("  (dry-run mode — no changes)\n");

  // Process all video folders (anything not in covers/)
  const [allFiles] = await bucket.getFiles();
  const videoFiles = allFiles.filter(
    (f) => f.name.endsWith(".mp4") && !f.name.startsWith("covers/")
  );
  const coverFiles = allFiles.filter((f) => f.name.startsWith("covers/"));

  console.log(`Total files in bucket: ${allFiles.length}`);
  console.log(`Video files (.mp4): ${videoFiles.length}`);
  console.log(`Cover files: ${coverFiles.length}`);

  let videoFixed = 0;
  let videoSkipped = 0;
  let videoErrors = 0;

  // Fix videos
  console.log(`\n--- Videos (target: "${VIDEO_CACHE}") ---`);
  for (let i = 0; i < videoFiles.length; i += CONCURRENCY) {
    const batch = videoFiles.slice(i, i + CONCURRENCY);

    await Promise.all(
      batch.map(async (file) => {
        try {
          const [metadata] = await file.getMetadata();
          const current = metadata.cacheControl || "";

          if (current === VIDEO_CACHE) {
            videoSkipped++;
            return;
          }

          if (DRY_RUN) {
            console.log(`  NEEDS FIX: ${file.name} (current: "${current}")`);
            videoFixed++;
            return;
          }

          await file.setMetadata({ cacheControl: VIDEO_CACHE });
          videoFixed++;
        } catch (err) {
          console.error(`  ERROR: ${file.name} — ${err.message}`);
          videoErrors++;
        }
      })
    );

    if ((i + CONCURRENCY) % 100 === 0 || i + CONCURRENCY >= videoFiles.length) {
      console.log(
        `  Progress: ${Math.min(i + CONCURRENCY, videoFiles.length)}/${videoFiles.length}`
      );
    }
  }

  console.log(`\n  Videos: ${videoFixed} ${DRY_RUN ? "need fix" : "fixed"}, ${videoSkipped} already ok, ${videoErrors} errors`);

  // Optionally fix covers
  if (FIX_COVERS) {
    let coverFixed = 0;
    let coverSkipped = 0;
    let coverErrors = 0;

    console.log(`\n--- Covers (target: "${COVER_CACHE}") ---`);
    for (let i = 0; i < coverFiles.length; i += CONCURRENCY) {
      const batch = coverFiles.slice(i, i + CONCURRENCY);

      await Promise.all(
        batch.map(async (file) => {
          try {
            const [metadata] = await file.getMetadata();
            const current = metadata.cacheControl || "";

            if (current === COVER_CACHE) {
              coverSkipped++;
              return;
            }

            if (DRY_RUN) {
              console.log(`  NEEDS FIX: ${file.name} (current: "${current}")`);
              coverFixed++;
              return;
            }

            await file.setMetadata({ cacheControl: COVER_CACHE });
            coverFixed++;
          } catch (err) {
            console.error(`  ERROR: ${file.name} — ${err.message}`);
            coverErrors++;
          }
        })
      );
    }

    console.log(`  Covers: ${coverFixed} ${DRY_RUN ? "need fix" : "fixed"}, ${coverSkipped} already ok, ${coverErrors} errors`);
  }

  console.log("\n=== Done ===");
  process.exit(0);
}

main().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});
