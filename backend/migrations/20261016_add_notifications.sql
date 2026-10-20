-- Per-user, event-backed notifications. event_key makes retries safe.
CREATE TABLE IF NOT EXISTS notifications (
  id BIGINT NOT NULL AUTO_INCREMENT,
  recipient_id INT NOT NULL,
  type ENUM('invoice','payment','repair','parcel','announcement') NOT NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT NULL,
  related_id INT NULL,
  destination VARCHAR(255) NULL,
  event_key VARCHAR(191) NOT NULL,
  read_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_notification_event (recipient_id, event_key),
  KEY idx_notification_recipient (recipient_id, read_at, created_at),
  CONSTRAINT fk_notification_recipient FOREIGN KEY (recipient_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
