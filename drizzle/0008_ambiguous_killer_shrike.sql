CREATE TABLE IF NOT EXISTS `suggestion_form_tokens` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`expires_at` text NOT NULL,
	`used_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `suggestion_form_tokens_expires_idx` ON `suggestion_form_tokens` (`expires_at`);
