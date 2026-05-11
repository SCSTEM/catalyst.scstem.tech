DROP INDEX `idx_reactions_user`;--> statement-breakpoint
DROP INDEX `idx_reactions_user_created`;--> statement-breakpoint
CREATE INDEX `idx_reactions_user_channel_created` ON `reactions` (`user_id`,`channel_id`,`created_at`);--> statement-breakpoint
DELETE FROM reaction_totals;--> statement-breakpoint
INSERT INTO reaction_totals (emoji, count)
  SELECT emoji, COUNT(*) FROM reactions GROUP BY emoji;--> statement-breakpoint
DELETE FROM user_emoji_counts;--> statement-breakpoint
INSERT INTO user_emoji_counts (user_id, emoji, count)
  SELECT user_id, emoji, COUNT(*) FROM reactions GROUP BY user_id, emoji;--> statement-breakpoint
CREATE TRIGGER reactions_after_insert AFTER INSERT ON reactions
BEGIN
  INSERT INTO reaction_totals (emoji, count) VALUES (NEW.emoji, 1)
    ON CONFLICT(emoji) DO UPDATE SET count = count + 1;
  INSERT INTO user_emoji_counts (user_id, emoji, count)
    VALUES (NEW.user_id, NEW.emoji, 1)
    ON CONFLICT(user_id, emoji) DO UPDATE SET count = count + 1;
END;--> statement-breakpoint
CREATE TRIGGER reactions_after_delete AFTER DELETE ON reactions
BEGIN
  UPDATE reaction_totals SET count = MAX(0, count - 1) WHERE emoji = OLD.emoji;
  UPDATE user_emoji_counts SET count = MAX(0, count - 1)
    WHERE user_id = OLD.user_id AND emoji = OLD.emoji;
  DELETE FROM reaction_totals WHERE count = 0;
  DELETE FROM user_emoji_counts WHERE count = 0;
END;
