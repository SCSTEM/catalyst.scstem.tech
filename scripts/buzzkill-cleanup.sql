-- Anti-buzzkill cleanup: remove excess reactions in burst windows.
-- For each user, in each 60-second time bucket, if the bucket contains more
-- than 10 reactions, only the first 10 are kept.
--
-- Constants must match packages/worker/src/lib/buzzkill.ts
--
-- Usage:
--   bunx wrangler d1 execute DB --file=./scripts/buzzkill-cleanup.sql --local
--   bunx wrangler d1 execute DB --file=./scripts/buzzkill-cleanup.sql --remote

DELETE FROM reactions WHERE rowid IN (
  SELECT rowid FROM (
    SELECT rowid,
      ROW_NUMBER() OVER (
        PARTITION BY user_id, (CAST(strftime('%s', created_at) AS INTEGER) / 60)
        ORDER BY created_at, message_ts
      ) AS rn,
      COUNT(*) OVER (
        PARTITION BY user_id, (CAST(strftime('%s', created_at) AS INTEGER) / 60)
      ) AS bucket_count
    FROM reactions
  )
  WHERE bucket_count > 10 AND rn > 10
);

-- Rebuild aggregate tables from cleaned data
DELETE FROM reaction_totals;
INSERT INTO reaction_totals (emoji, count) SELECT emoji, COUNT(*) FROM reactions GROUP BY emoji;

DELETE FROM user_emoji_counts;
INSERT INTO user_emoji_counts (user_id, emoji, count) SELECT user_id, emoji, COUNT(*) FROM reactions GROUP BY user_id, emoji;
