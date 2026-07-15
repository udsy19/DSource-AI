#!/usr/bin/env node
/**
 * Backfills CLIP embeddings for every product in scraped_product_list that
 * has an image_url but no embedding yet. Resumable — re-running only
 * processes rows still missing embeddings.
 *
 * Usage:
 *   NEXT_PUBLIC_SUPABASE_URL=... \
 *   SUPABASE_SERVICE_ROLE_KEY=... \
 *   REPLICATE_API_TOKEN=... \
 *   node scripts/backfill-embeddings.mjs
 *
 * Requires supabase/migrations/20260715_product_embeddings.sql applied first.
 *
 * PACE_MS (default 11000): delay between Replicate calls. Accounts with
 * <$5 credit are throttled to 6 predictions/min — raise credit or keep the
 * default pace. ~50k products ≈ $11 at $0.0002/image.
 *
 * NOTE: CSV bulk uploads do NOT auto-embed (too slow inline) — re-run this
 * script after bulk imports. Single-product creates embed automatically.
 */
import { createClient } from "@supabase/supabase-js";
import Replicate from "replicate";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const REPLICATE_TOKEN = process.env.REPLICATE_API_TOKEN;
const PACE_MS = Number(process.env.PACE_MS ?? 11_000);
const BATCH = 100;

// Keep in sync with src/utils/visualizer/embeddings.js
const EMBEDDING_MODEL =
  "andreasjansson/clip-features:75b33f253f7714a281ad3e9b28f63e3232d583716ef6718f2e46641077ea040a";
const EMBEDDING_DIM = 768;

if (!SUPABASE_URL || !SERVICE_KEY || !REPLICATE_TOKEN) {
  console.error(
    "Missing env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, REPLICATE_API_TOKEN"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
const replicate = new Replicate({ auth: REPLICATE_TOKEN, useFileOutput: false });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let done = 0;
let failed = 0;

for (;;) {
  const { data: rows, error } = await supabase
    .from("scraped_product_list")
    .select("id, image_url")
    .is("embedding", null)
    .not("image_url", "is", null)
    .limit(BATCH);

  if (error) {
    console.error("Query failed (migration applied?):", error.message);
    process.exit(1);
  }
  if (!rows?.length) break;

  for (const row of rows) {
    try {
      const output = await replicate.run(EMBEDDING_MODEL, {
        input: { inputs: row.image_url },
      });
      const embedding = Array.isArray(output) ? output[0]?.embedding : null;
      if (!Array.isArray(embedding) || embedding.length !== EMBEDDING_DIM) {
        throw new Error(`bad embedding (${embedding?.length ?? "none"} dims)`);
      }
      const { error: updateError } = await supabase
        .from("scraped_product_list")
        .update({ embedding })
        .eq("id", row.id);
      if (updateError) throw new Error(updateError.message);
      done += 1;
      console.log(`ok   id=${row.id} (${done} done)`);
    } catch (err) {
      failed += 1;
      console.error(`FAIL id=${row.id}: ${err.message.slice(0, 140)}`);
      // Mark unembeddable rows? No — leave null so a re-run can retry.
      if (/429|throttl/i.test(err.message)) {
        console.log("Rate limited — waiting 65s...");
        await sleep(65_000);
      }
    }
    await sleep(PACE_MS);
  }
}

console.log(`\nBackfill complete: ${done} embedded, ${failed} failed.`);
