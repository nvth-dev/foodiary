UPDATE `blog_settings`
SET
	`about_body` = 'Trên con đường trở thành food reviewer không có dấu chân của kẻ lười ăn uống.',
	`updated_at` = CURRENT_TIMESTAMP
WHERE `id` = 'main'
	AND `about_body` = 'Một email nhỏ về quán mới, món ngon và những góc phố mình vừa đi qua.';
