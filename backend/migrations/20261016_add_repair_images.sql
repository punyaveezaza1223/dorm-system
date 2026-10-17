CREATE TABLE IF NOT EXISTS repair_images (
  id BIGINT NOT NULL AUTO_INCREMENT,
  repair_id INT NOT NULL,
  stored_name VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  file_size INT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_repair_image_name (stored_name),
  KEY idx_repair_images_repair (repair_id),
  CONSTRAINT fk_repair_images_repair FOREIGN KEY (repair_id) REFERENCES repair(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
