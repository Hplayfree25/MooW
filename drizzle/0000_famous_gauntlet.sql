CREATE TABLE `account` (
	`userId` text NOT NULL,
	`type` text NOT NULL,
	`provider` text NOT NULL,
	`providerAccountId` text NOT NULL,
	`refresh_token` text,
	`access_token` text,
	`expires_at` integer,
	`token_type` text,
	`scope` text,
	`id_token` text,
	`session_state` text,
	PRIMARY KEY(`provider`, `providerAccountId`),
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `character_comments` (
	`id` text PRIMARY KEY NOT NULL,
	`character_id` text NOT NULL,
	`user_id` text,
	`parent_id` text,
	`user_name` text NOT NULL,
	`content` text NOT NULL,
	`likes_count` integer DEFAULT 0,
	`laugh_count` integer DEFAULT 0,
	`cool_count` integer DEFAULT 0,
	`thumbs_up_count` integer DEFAULT 0,
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `character_likes` (
	`user_id` text NOT NULL,
	`character_id` text NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	PRIMARY KEY(`user_id`, `character_id`),
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `characters` (
	`id` text PRIMARY KEY NOT NULL,
	`image_url` text NOT NULL,
	`character_name` text NOT NULL,
	`character_chat_name` text NOT NULL,
	`character_bio` text NOT NULL,
	`tags` text NOT NULL,
	`publish_settings` text NOT NULL,
	`content_rating` text DEFAULT 'Limited' NOT NULL,
	`personality` text NOT NULL,
	`scenario` text NOT NULL,
	`first_messages` text NOT NULL,
	`example_dialogue` text NOT NULL,
	`creator_notes` text DEFAULT '',
	`creator_id` text,
	`likes_count` integer DEFAULT 0,
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	`updated_at` integer DEFAULT (strftime('%s', 'now'))
);
--> statement-breakpoint
CREATE TABLE `comment_reactions` (
	`user_id` text NOT NULL,
	`comment_id` text NOT NULL,
	`reaction_type` text NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	PRIMARY KEY(`user_id`, `comment_id`),
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`comment_id`) REFERENCES `character_comments`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `media_files` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`folder_id` text,
	`url` text NOT NULL,
	`filename` text NOT NULL,
	`size` integer DEFAULT 0,
	`format` text DEFAULT 'unknown',
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`folder_id`) REFERENCES `media_folders`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `media_folders` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`folder_name` text NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `session` (
	`sessionToken` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`expires` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `user_api_configurations` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`config_name` text NOT NULL,
	`model_name` text NOT NULL,
	`model_list` text,
	`api_url` text NOT NULL,
	`api_key` text NOT NULL,
	`api_format` text DEFAULT 'openai' NOT NULL,
	`prompt_processing` text DEFAULT 'none' NOT NULL,
	`custom_prompt` text,
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	`updated_at` integer DEFAULT (strftime('%s', 'now')),
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `user_settings` (
	`user_id` text PRIMARY KEY NOT NULL,
	`nsfw_enabled` integer DEFAULT false NOT NULL,
	`new_comment_notification` integer DEFAULT true NOT NULL,
	`new_reply_notification` integer DEFAULT true NOT NULL,
	`comment_pinned_notification` integer DEFAULT true NOT NULL,
	`new_character_notification` integer DEFAULT true NOT NULL,
	`character_updated_notification` integer DEFAULT true NOT NULL,
	`community_poll_notification` integer DEFAULT true NOT NULL,
	`new_follower_notification` integer DEFAULT true NOT NULL,
	`character_favorited_notification` integer DEFAULT true NOT NULL,
	`comment_liked_notification` integer DEFAULT true NOT NULL,
	`reply_liked_notification` integer DEFAULT true NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text,
	`username` text,
	`email` text,
	`emailVerified` integer,
	`password` text,
	`image` text,
	`about_me` text,
	`appearance` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_name_unique` ON `user` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE TABLE `verificationToken` (
	`identifier` text NOT NULL,
	`token` text NOT NULL,
	`expires` integer NOT NULL,
	PRIMARY KEY(`identifier`, `token`)
);
