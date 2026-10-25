CREATE TABLE `preferences` (
	`user_id` text PRIMARY KEY NOT NULL,
	`pace` integer DEFAULT 2 NOT NULL,
	`visits_per_week` integer DEFAULT 2 NOT NULL
);

CREATE TABLE `machine_progress` (
	`user_id` text NOT NULL,
	`machine_id` text NOT NULL,
	`status` text DEFAULT 'new' NOT NULL,
	`availability` text DEFAULT 'unknown' NOT NULL,
	`seat` text DEFAULT '' NOT NULL,
	`weight` text DEFAULT '' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`user_id`, `machine_id`)
);

CREATE TABLE `visits` (
	`id` text NOT NULL,
	`user_id` text NOT NULL,
	`machine_ids` text NOT NULL,
	`started_at` text NOT NULL,
	`finished_at` text,
	PRIMARY KEY (`user_id`, `id`)
);

CREATE TABLE profile (user_id TEXT PRIMARY KEY NOT NULL, age INTEGER, height_cm REAL, starting_weight_kg REAL);
CREATE UNIQUE INDEX one_active_visit_per_user ON visits(user_id) WHERE finished_at IS NULL;
