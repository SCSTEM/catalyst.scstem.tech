CREATE TABLE `emoji_images` (
	`name` text PRIMARY KEY NOT NULL,
	`image_url` text NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `emoji_totals` (
	`emoji` text PRIMARY KEY NOT NULL,
	`count` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `reactions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`emoji` text NOT NULL,
	`channel_id` text NOT NULL,
	`message_ts` text NOT NULL,
	`event_ts` text NOT NULL,
	`is_removal` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_reactions_emoji` ON `reactions` (`emoji`);--> statement-breakpoint
CREATE INDEX `idx_reactions_user` ON `reactions` (`user_id`);--> statement-breakpoint
CREATE TABLE `user_emoji_counts` (
	`user_id` text NOT NULL,
	`emoji` text NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`user_id`, `emoji`)
);
--> statement-breakpoint
CREATE INDEX `idx_uec_user` ON `user_emoji_counts` (`user_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`user_id` text PRIMARY KEY NOT NULL,
	`display_name` text DEFAULT '' NOT NULL,
	`avatar_url` text DEFAULT '' NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
