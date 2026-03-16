/**
 * Base interface that every domain item must extend.
 * core/ only ever knows about these fields.
 * Domain-specific fields live in typed extensions (e.g. VinylItem extends CollectionItem).
 */
export interface CollectionItem {
  id: string | number;
  title: string;               // The item's name (album title, book title, wine name)
  creator: string;             // The maker (artist, author, winery, director)
  thumbUrl?: string | null;    // Cover/label/poster image URL
  addedAt: number;             // Unix timestamp in seconds — when added to collection
  tags?: string[];             // Categories (genre, varietal, format, subject)
  isSaved?: boolean;           // Universal bookmark/favourite flag
}
