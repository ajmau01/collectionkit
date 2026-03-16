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
}
