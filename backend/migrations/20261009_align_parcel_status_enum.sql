-- Align an older Thai parcel-status ENUM with the API values without deleting
-- records or removing any existing ENUM members. Safe to run repeatedly.

SET @parcel_schema := DATABASE();

SELECT
  COLUMN_TYPE,
  IS_NULLABLE,
  CHARACTER_SET_NAME,
  COLLATION_NAME,
  COLUMN_COMMENT
INTO
  @parcel_status_type,
  @parcel_status_nullable,
  @parcel_status_charset,
  @parcel_status_collation,
  @parcel_status_comment
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = @parcel_schema
  AND TABLE_NAME = 'parcels'
  AND COLUMN_NAME = 'status';

SET @parcel_status_needs_pending :=
  @parcel_status_type LIKE 'enum(%'
  AND LOCATE(QUOTE('pending'), @parcel_status_type) = 0;
SET @parcel_status_needs_received :=
  @parcel_status_type LIKE 'enum(%'
  AND LOCATE(QUOTE('received'), @parcel_status_type) = 0;

SET @parcel_status_definition := CONCAT(
  LEFT(@parcel_status_type, CHAR_LENGTH(@parcel_status_type) - 1),
  IF(@parcel_status_needs_pending, CONCAT(', ', QUOTE('pending')), ''),
  IF(@parcel_status_needs_received, CONCAT(', ', QUOTE('received')), ''),
  ')'
);

SET @parcel_status_null_clause :=
  IF(@parcel_status_nullable = 'YES', ' NULL', ' NOT NULL');
SET @parcel_status_charset_clause :=
  IF(@parcel_status_charset IS NULL, '', CONCAT(' CHARACTER SET ', @parcel_status_charset));
SET @parcel_status_collation_clause :=
  IF(@parcel_status_collation IS NULL, '', CONCAT(' COLLATE ', @parcel_status_collation));
SET @parcel_status_comment_clause :=
  IF(@parcel_status_comment = '', '', CONCAT(' COMMENT ', QUOTE(@parcel_status_comment)));

SET @parcel_status_schema_sql :=
  CASE
    WHEN @parcel_status_type IS NULL THEN 'SELECT ''parcels.status was not found; no schema change was made'' AS migration_result'
    WHEN @parcel_status_type NOT LIKE 'enum(%' THEN 'SELECT ''parcels.status is not an ENUM; no schema change was needed'' AS migration_result'
    WHEN NOT @parcel_status_needs_pending AND NOT @parcel_status_needs_received THEN 'SELECT ''parcels.status already supports pending and received'' AS migration_result'
    ELSE CONCAT(
      'ALTER TABLE `parcels` MODIFY COLUMN `status` ',
      @parcel_status_definition,
      @parcel_status_charset_clause,
      @parcel_status_collation_clause,
      @parcel_status_null_clause,
      ' DEFAULT ', QUOTE('pending'),
      @parcel_status_comment_clause
    )
  END;

PREPARE parcel_status_schema_migration FROM @parcel_status_schema_sql;
EXECUTE parcel_status_schema_migration;
DEALLOCATE PREPARE parcel_status_schema_migration;

SET @parcel_status_data_sql :=
  CASE
    WHEN @parcel_status_type IS NULL THEN 'SELECT ''No parcel status rows were changed'' AS migration_result'
    ELSE CONCAT(
      'UPDATE `parcels` SET `status` = CASE ',
      'WHEN `status` = ', QUOTE('รอรับ'), ' THEN ', QUOTE('pending'), ' ',
      'WHEN `status` = ', QUOTE('รับแล้ว'), ' THEN ', QUOTE('received'), ' ',
      'ELSE `status` END ',
      'WHERE `status` IN (', QUOTE('รอรับ'), ', ', QUOTE('รับแล้ว'), ')'
    )
  END;

PREPARE parcel_status_data_migration FROM @parcel_status_data_sql;
EXECUTE parcel_status_data_migration;
DEALLOCATE PREPARE parcel_status_data_migration;
