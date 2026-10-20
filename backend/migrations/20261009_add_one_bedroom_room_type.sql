-- Adds the room type used by the admin UI without removing existing ENUM values.
-- Safe to run repeatedly: it changes the column only when `1-bedroom` is absent.
-- This migration intentionally does nothing when `rooms.type` is not an ENUM.

SET @rooms_type_schema := DATABASE();

SELECT
  COLUMN_TYPE,
  IS_NULLABLE,
  COLUMN_DEFAULT,
  CHARACTER_SET_NAME,
  COLLATION_NAME,
  COLUMN_COMMENT
INTO
  @rooms_type,
  @rooms_type_nullable,
  @rooms_type_default,
  @rooms_type_charset,
  @rooms_type_collation,
  @rooms_type_comment
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = @rooms_type_schema
  AND TABLE_NAME = 'rooms'
  AND COLUMN_NAME = 'type';

SET @rooms_type_needs_value :=
  @rooms_type LIKE 'enum(%'
  AND LOCATE(QUOTE('1-bedroom'), @rooms_type) = 0;

SET @rooms_type_definition := CONCAT(
  LEFT(@rooms_type, CHAR_LENGTH(@rooms_type) - 1),
  IF(@rooms_type_needs_value, CONCAT(', ', QUOTE('1-bedroom')), ''),
  ')'
);

SET @rooms_type_null_clause :=
  IF(@rooms_type_nullable = 'YES', ' NULL', ' NOT NULL');
SET @rooms_type_default_clause :=
  CASE
    WHEN @rooms_type_default IS NULL AND @rooms_type_nullable = 'YES' THEN ' DEFAULT NULL'
    WHEN @rooms_type_default IS NULL THEN ''
    ELSE CONCAT(' DEFAULT ', QUOTE(@rooms_type_default))
  END;
SET @rooms_type_charset_clause :=
  IF(@rooms_type_charset IS NULL, '', CONCAT(' CHARACTER SET ', @rooms_type_charset));
SET @rooms_type_collation_clause :=
  IF(@rooms_type_collation IS NULL, '', CONCAT(' COLLATE ', @rooms_type_collation));
SET @rooms_type_comment_clause :=
  IF(@rooms_type_comment = '', '', CONCAT(' COMMENT ', QUOTE(@rooms_type_comment)));

SET @rooms_type_sql :=
  CASE
    WHEN @rooms_type IS NULL THEN 'SELECT ''rooms.type was not found; no schema change was made'' AS migration_result'
    WHEN @rooms_type NOT LIKE 'enum(%' THEN 'SELECT ''rooms.type is not an ENUM; no schema change was needed'' AS migration_result'
    WHEN NOT @rooms_type_needs_value THEN 'SELECT ''rooms.type already supports 1-bedroom'' AS migration_result'
    ELSE CONCAT(
      'ALTER TABLE `rooms` MODIFY COLUMN `type` ',
      @rooms_type_definition,
      @rooms_type_charset_clause,
      @rooms_type_collation_clause,
      @rooms_type_null_clause,
      @rooms_type_default_clause,
      @rooms_type_comment_clause
    )
  END;

PREPARE rooms_type_migration FROM @rooms_type_sql;
EXECUTE rooms_type_migration;
DEALLOCATE PREPARE rooms_type_migration;
