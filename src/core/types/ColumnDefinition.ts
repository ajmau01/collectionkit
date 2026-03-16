/**
 * Defines a SQLite column for domain-specific schema extensions.
 * Domain passes these via CollectionConfig.schemaExtensions.
 * core/DatabaseService uses these to extend the base table schema.
 */
export interface ColumnDefinition {
  name: string;
  type: 'TEXT' | 'INTEGER' | 'REAL' | 'BLOB';
  nullable?: boolean;           // Default: true
  defaultValue?: string | number;
  /**
   * If true, existing local value is preserved during sync (COALESCE).
   * Use for fields the user modifies locally: bookmarks, ratings, curation flags.
   * e.g. isSaved, isNotable, spinCount in domain/vinyl
   */
  preserveOnSync?: boolean;
  /**
   * If true, this INTEGER column stores a boolean (0/1) and will be cast
   * back to JS boolean when reading from the database.
   * Must be declared explicitly — do not rely on column name conventions.
   */
  isBoolean?: boolean;
}
