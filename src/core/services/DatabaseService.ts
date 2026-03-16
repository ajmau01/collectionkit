import * as SQLite from 'expo-sqlite';

import { CollectionItem } from '../types/CollectionItem';
import { ColumnDefinition } from '../types/ColumnDefinition';

/**
 * Generic SQLite service for CollectionKit.
 *
 * Base columns (id, title, creator, thumbUrl, addedAt, tags, isSaved) are always
 * created. Domain-specific columns are injected via schemaExtensions at
 * construction time.
 *
 * Safe migration pattern: ALTER TABLE ADD COLUMN IF NOT EXISTS is used for
 * schema extensions so existing installs are never destroyed on upgrade.
 */

const DB_NAME = 'collectionkit.db';
const TABLE = 'items';

/** Base columns that are always present — domain must not redeclare these. */
const BASE_COLUMNS: ColumnDefinition[] = [
  { name: 'id',        type: 'TEXT'    },
  { name: 'userId',    type: 'TEXT'    },
  { name: 'title',     type: 'TEXT'    },
  { name: 'creator',   type: 'TEXT'    },
  { name: 'thumbUrl',  type: 'TEXT',   nullable: true  },
  { name: 'addedAt',   type: 'INTEGER' },
  { name: 'tags',      type: 'TEXT',   nullable: true  },   // JSON array string
  { name: 'isSaved',   type: 'INTEGER', defaultValue: 0, preserveOnSync: true },
];

function columnDDL(col: ColumnDefinition): string {
  const nullable = col.nullable !== false;
  const notNull  = nullable ? '' : ' NOT NULL';
  const def      = col.defaultValue !== undefined ? ` DEFAULT ${col.defaultValue}` : '';
  return `${col.name} ${col.type}${notNull}${def}`;
}

export class DatabaseService {
  private db: SQLite.SQLiteDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  constructor(private readonly schemaExtensions: ColumnDefinition[] = []) {}

  // ---------------------------------------------------------------------------
  // Initialisation
  // ---------------------------------------------------------------------------

  public async initialize(): Promise<void> {
    if (this.db) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        this.db = await SQLite.openDatabaseAsync(DB_NAME);

        // Create the base table if it does not exist yet.
        const baseColDDL = BASE_COLUMNS.map(columnDDL).join(',\n          ');
        await this.db.execAsync(`
          CREATE TABLE IF NOT EXISTS ${TABLE} (
            ${baseColDDL},
            PRIMARY KEY (id, userId)
          );
          CREATE INDEX IF NOT EXISTS idx_items_userId   ON ${TABLE}(userId);
          CREATE INDEX IF NOT EXISTS idx_items_addedAt  ON ${TABLE}(addedAt);
          CREATE INDEX IF NOT EXISTS idx_items_title    ON ${TABLE}(title);
          CREATE INDEX IF NOT EXISTS idx_items_creator  ON ${TABLE}(creator);
        `);

        // Safe migration: add any missing columns (base or extension).
        await this._applyMigrations();
      } catch (error) {
        console.error('[DB] Failed to initialize', error);
        this.initPromise = null;
        throw error;
      }
    })();

    return this.initPromise;
  }

  private async _applyMigrations(): Promise<void> {
    const db = await this._ensureDb();

    // Read existing column names once.
    const tableInfo = await db.getAllAsync<{ name: string }>(
      `PRAGMA table_info(${TABLE})`
    );
    const existingCols = new Set(tableInfo.map(r => r.name));

    // Only extension columns need runtime migration; base columns are handled
    // by CREATE TABLE IF NOT EXISTS above. Still safe to check all.
    for (const col of this.schemaExtensions) {
      if (!existingCols.has(col.name)) {
        const def = col.defaultValue !== undefined ? ` DEFAULT ${col.defaultValue}` : '';
        await db.execAsync(
          `ALTER TABLE ${TABLE} ADD COLUMN ${col.name} ${col.type}${def}`
        );
        console.log(`[DB] Migration: added column '${col.name}'`);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  private async _ensureDb(): Promise<SQLite.SQLiteDatabase> {
    if (!this.db) await this.initialize();
    if (!this.db) throw new Error('[DB] Database initialization failed');
    return this.db;
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Batch upsert items for a user.
   *
   * For each column marked preserveOnSync, COALESCE keeps the existing local
   * value instead of overwriting with the incoming sync value — preserving
   * bookmarks and other locally-edited fields across sync cycles.
   */
  public async upsertMany(items: CollectionItem[], userId: string): Promise<void> {
    if (items.length === 0) return;
    const db = await this._ensureDb();

    // Determine all columns we will write.
    const allCols: ColumnDefinition[] = [...BASE_COLUMNS, ...this.schemaExtensions];

    // Build column name list (excluding composite PK duplication — id & userId
    // are already in BASE_COLUMNS and will be part of INSERT OR REPLACE).
    const colNames = allCols.map(c => c.name);

    // Build per-column SQL expressions.
    // preserveOnSync cols use COALESCE to prefer the existing local value.
    const valueExprs = allCols.map(col => {
      if (col.preserveOnSync) {
        const fallbackPlaceholder = '?';
        return `COALESCE((SELECT ${col.name} FROM ${TABLE} WHERE id = ? AND userId = ?), ${fallbackPlaceholder})`;
      }
      return '?';
    });

    const sql = `INSERT OR REPLACE INTO ${TABLE} (${colNames.join(', ')}) VALUES (${valueExprs.join(', ')})`;

    await db.withTransactionAsync(async () => {
      for (const item of items) {
        const params: (string | number | null)[] = [];

        for (const col of allCols) {
          if (col.preserveOnSync) {
            // Three params for the COALESCE sub-query: id, userId, fallback
            params.push(String(item.id));
            params.push(userId);
            // Fallback value from the incoming item
            params.push(this._resolveColValue(col, item, userId));
          } else {
            params.push(this._resolveColValue(col, item, userId));
          }
        }

        await db.runAsync(sql, params);
      }
    });
  }

  /** Extract and normalise a column value from a CollectionItem. */
  private _resolveColValue(
    col: ColumnDefinition,
    item: CollectionItem,
    userId: string
  ): string | number | null {
    if (col.name === 'userId') return userId;

    const raw = (item as Record<string, unknown>)[col.name];

    if (raw === undefined || raw === null) {
      return col.defaultValue !== undefined ? col.defaultValue : null;
    }

    if (col.name === 'tags' && Array.isArray(raw)) {
      return JSON.stringify(raw);
    }

    if (col.type === 'INTEGER' && typeof raw === 'boolean') {
      return raw ? 1 : 0;
    }

    return raw as string | number;
  }

  /**
   * Fetch all items for a user, ordered by addedAt DESC.
   * INTEGER boolean columns are converted back to JS booleans.
   */
  public async getItems(userId: string): Promise<CollectionItem[]> {
    const db = await this._ensureDb();

    const rows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT * FROM ${TABLE} WHERE userId = ? ORDER BY addedAt DESC`,
      [userId]
    );

    // Determine which columns are INTEGER and have boolean semantics.
    // We treat any INTEGER column whose name starts with 'is' as a boolean.
    const boolCols = new Set<string>(
      [...BASE_COLUMNS, ...this.schemaExtensions]
        .filter(c => c.type === 'INTEGER' && c.name.startsWith('is'))
        .map(c => c.name)
    );

    return rows.map(row => {
      const item: Record<string, unknown> = { ...row };

      // Convert INTEGER booleans back to JS booleans.
      for (const col of boolCols) {
        if (col in item) {
          item[col] = item[col] === 1;
        }
      }

      // Deserialise tags JSON string back to string[].
      if (typeof item['tags'] === 'string') {
        try {
          item['tags'] = JSON.parse(item['tags'] as string);
        } catch {
          item['tags'] = [];
        }
      }

      return item as unknown as CollectionItem;
    });
  }

  /**
   * Toggle isSaved for an item. Returns the new boolean value.
   */
  public async toggleSaved(id: string | number): Promise<boolean> {
    const db = await this._ensureDb();

    await db.runAsync(
      `UPDATE ${TABLE} SET isSaved = 1 - isSaved WHERE id = ?`,
      [String(id)]
    );

    const rows = await db.getAllAsync<{ isSaved: number }>(
      `SELECT isSaved FROM ${TABLE} WHERE id = ?`,
      [String(id)]
    );

    return (rows[0]?.isSaved ?? 0) === 1;
  }

  /**
   * Delete all items for a specific user (e.g. before a full re-sync).
   */
  public async clearUserItems(userId: string): Promise<void> {
    const db = await this._ensureDb();
    await db.runAsync(`DELETE FROM ${TABLE} WHERE userId = ?`, [userId]);
  }

  /**
   * Delete every row in the items table.
   */
  public async clearAll(): Promise<void> {
    const db = await this._ensureDb();
    await db.execAsync(`DELETE FROM ${TABLE}`);
  }

  // Only for testing
  public _resetForTesting() {
    this.db = null;
    this.initPromise = null;
  }
}
