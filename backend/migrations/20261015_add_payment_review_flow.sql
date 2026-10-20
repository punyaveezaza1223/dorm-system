-- Extend the existing payment workflow without touching existing payment rows.
ALTER TABLE payments
  MODIFY COLUMN status ENUM('pending', 'reviewing', 'paid', 'overdue', 'rejected')
  NOT NULL DEFAULT 'pending';

-- Real recipient account / QR data is intentionally configuration-only: no
-- placeholder bank account or QR image is inserted.
CREATE TABLE IF NOT EXISTS payment_settings (
  id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
  bank_name VARCHAR(120) NULL,
  account_name VARCHAR(160) NULL,
  account_number VARCHAR(80) NULL,
  qr_image_url VARCHAR(500) NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
