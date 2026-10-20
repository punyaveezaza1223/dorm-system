-- Monthly utility rates, meter readings and immutable invoice snapshots.
CREATE TABLE IF NOT EXISTS utility_rate_periods (
  id INT NOT NULL AUTO_INCREMENT,
  billing_period CHAR(7) NOT NULL,
  water_rate DECIMAL(12,2) NOT NULL,
  electric_rate DECIMAL(12,2) NOT NULL,
  common_fee DECIMAL(12,2) NOT NULL DEFAULT 200.00,
  created_by INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_utility_rate_period (billing_period),
  CONSTRAINT fk_utility_rate_creator FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS utility_readings (
  id INT NOT NULL AUTO_INCREMENT,
  room_id INT NOT NULL,
  billing_period CHAR(7) NOT NULL,
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
  UNIQUE KEY uq_utility_reading_room_period (room_id, billing_period),
  KEY idx_utility_readings_period (billing_period),
  CONSTRAINT fk_utility_reading_room FOREIGN KEY (room_id) REFERENCES rooms(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS utility_invoices (
  id INT NOT NULL AUTO_INCREMENT,
  reading_id INT NOT NULL,
  room_id INT NOT NULL,
  tenant_id INT NOT NULL,
  contract_id INT NOT NULL,
  payment_id INT NOT NULL,
  billing_period CHAR(7) NOT NULL,
  issued_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  due_date DATE NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_utility_invoice_room_period (room_id, billing_period),
  UNIQUE KEY uq_utility_invoice_payment (payment_id),
  KEY idx_utility_invoice_tenant (tenant_id),
  CONSTRAINT fk_utility_invoice_reading FOREIGN KEY (reading_id) REFERENCES utility_readings(id),
  CONSTRAINT fk_utility_invoice_room FOREIGN KEY (room_id) REFERENCES rooms(id),
  CONSTRAINT fk_utility_invoice_tenant FOREIGN KEY (tenant_id) REFERENCES users(id),
  CONSTRAINT fk_utility_invoice_contract FOREIGN KEY (contract_id) REFERENCES contracts(id),
  CONSTRAINT fk_utility_invoice_payment FOREIGN KEY (payment_id) REFERENCES payments(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
