-- Test billing data is deliberately kept out of production utility/payment tables.
CREATE TABLE IF NOT EXISTS utility_test_runs (
  id INT NOT NULL AUTO_INCREMENT,
  billing_period CHAR(7) NOT NULL,
  version INT NOT NULL,
  water_rate DECIMAL(12,2) NOT NULL,
  electric_rate DECIMAL(12,2) NOT NULL,
  common_fee DECIMAL(12,2) NOT NULL DEFAULT 200.00,
  created_by INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_utility_test_run_period_version (billing_period, version),
  CONSTRAINT fk_utility_test_run_creator FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS utility_test_readings (
  id INT NOT NULL AUTO_INCREMENT,
  test_run_id INT NOT NULL,
  room_id INT NOT NULL,
  rent_amount DECIMAL(12,2) NOT NULL,
  water_previous DECIMAL(12,2) NOT NULL,
  water_current DECIMAL(12,2) NOT NULL,
  water_units DECIMAL(12,2) NOT NULL,
  water_rate DECIMAL(12,2) NOT NULL,
  water_amount DECIMAL(12,2) NOT NULL,
  electric_previous DECIMAL(12,2) NOT NULL,
  electric_current DECIMAL(12,2) NOT NULL,
  electric_units DECIMAL(12,2) NOT NULL,
  electric_rate DECIMAL(12,2) NOT NULL,
  electric_amount DECIMAL(12,2) NOT NULL,
  common_fee DECIMAL(12,2) NOT NULL,
  total_amount DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_utility_test_reading_run_room (test_run_id, room_id),
  CONSTRAINT fk_utility_test_reading_run FOREIGN KEY (test_run_id) REFERENCES utility_test_runs(id) ON DELETE CASCADE,
  CONSTRAINT fk_utility_test_reading_room FOREIGN KEY (room_id) REFERENCES rooms(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS utility_test_invoices (
  id INT NOT NULL AUTO_INCREMENT,
  test_run_id INT NOT NULL,
  reading_id INT NOT NULL,
  room_id INT NOT NULL,
  tenant_id INT NULL,
  contract_id INT NULL,
  due_date DATE NOT NULL,
  issued_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_utility_test_invoice_reading (reading_id),
  KEY idx_utility_test_invoice_run (test_run_id),
  CONSTRAINT fk_utility_test_invoice_run FOREIGN KEY (test_run_id) REFERENCES utility_test_runs(id) ON DELETE CASCADE,
  CONSTRAINT fk_utility_test_invoice_reading FOREIGN KEY (reading_id) REFERENCES utility_test_readings(id) ON DELETE CASCADE,
  CONSTRAINT fk_utility_test_invoice_room FOREIGN KEY (room_id) REFERENCES rooms(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
