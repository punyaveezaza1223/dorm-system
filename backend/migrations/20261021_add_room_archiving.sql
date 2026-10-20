SET @room_archiving_column_exists := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'rooms'
    AND COLUMN_NAME = 'deleted_at'
);
SET @room_archiving_sql := IF(
  @room_archiving_column_exists = 0,
  'ALTER TABLE rooms ADD COLUMN deleted_at DATETIME NULL',
  'SELECT ''deleted_at already exists'' AS migration_result'
);
PREPARE room_archiving_statement FROM @room_archiving_sql;
EXECUTE room_archiving_statement;
DEALLOCATE PREPARE room_archiving_statement;
