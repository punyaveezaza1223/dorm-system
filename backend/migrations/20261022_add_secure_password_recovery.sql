SET @email_verified_column_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'email_verified_at'
);
SET @email_verified_column_sql := IF(
  @email_verified_column_exists = 0,
  'ALTER TABLE users ADD COLUMN email_verified_at DATETIME NULL',
  'SELECT ''email_verified_at already exists'' AS migration_result'
);
PREPARE email_verified_column_statement FROM @email_verified_column_sql;
EXECUTE email_verified_column_statement;
DEALLOCATE PREPARE email_verified_column_statement;

SET @session_version_column_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'session_version'
);
SET @session_version_column_sql := IF(
  @session_version_column_exists = 0,
  'ALTER TABLE users ADD COLUMN session_version INT UNSIGNED NOT NULL DEFAULT 0',
  'SELECT ''session_version already exists'' AS migration_result'
);
PREPARE session_version_column_statement FROM @session_version_column_sql;
EXECUTE session_version_column_statement;
DEALLOCATE PREPARE session_version_column_statement;

CREATE TABLE IF NOT EXISTS password_reset_request_attempts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  email_hash CHAR(64) NOT NULL,
  ip_hash CHAR(64) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_password_reset_email_created (email_hash, created_at),
  KEY idx_password_reset_ip_created (ip_hash, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS password_reset_otps (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT NOT NULL,
  otp_hash CHAR(64) NOT NULL,
  request_ip_hash CHAR(64) NOT NULL,
  expires_at DATETIME NOT NULL,
  attempt_count TINYINT UNSIGNED NOT NULL DEFAULT 0,
  verified_at DATETIME NULL,
  used_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_password_reset_otp_user (user_id, expires_at, used_at),
  CONSTRAINT fk_password_reset_otp_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_password_reset_token_hash (token_hash),
  KEY idx_password_reset_token_user (user_id, expires_at, used_at),
  CONSTRAINT fk_password_reset_token_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS email_delivery_events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  recipient_id INT NOT NULL,
  event_key VARCHAR(191) NOT NULL,
  event_type VARCHAR(40) NOT NULL,
  status ENUM('pending','sent','failed','skipped') NOT NULL DEFAULT 'pending',
  last_error VARCHAR(500) NULL,
  sent_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_email_delivery_event (recipient_id, event_key),
  KEY idx_email_delivery_status (status, created_at),
  CONSTRAINT fk_email_delivery_recipient FOREIGN KEY (recipient_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
