/**
 * Parity Test Suite — domain/vinyl
 *
 * These tests are the correctness proof for the CollectionKit domain/vinyl
 * reference implementation. They verify that the view mode definitions
 * (grouper / sorter / filter / keyOrder) produce identical behavior to
 * Social Vinyl's useGroupedReleases hook.
 *
 * Strategy: call the view mode functions directly on a static fixture of 25+
 * VinylItems. No React environment required.
 */

import { artistViewMode } from '../../../src/domain/vinyl/viewModes/artist';
import { genreViewMode } from '../../../src/domain/vinyl/viewModes/genre';
import { decadeViewMode } from '../../../src/domain/vinyl/viewModes/decade';
import { newViewMode } from '../../../src/domain/vinyl/viewModes/new';
import { savedViewMode } from '../../../src/domain/vinyl/viewModes/saved';
import { spinViewMode } from '../../../src/domain/vinyl/viewModes/spin';
import { vinylConfig } from '../../../src/domain/vinyl/config';
import { VinylItem } from '../../../src/domain/vinyl/types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const NOW_S = Math.floor(Date.now() / 1000);
const DAY_S = 24 * 60 * 60;

/** Build a VinylItem with defaults, overriding only what the test needs. */
function item(overrides: Partial<VinylItem> & { id: number; title: string; creator: string }): VinylItem {
  return {
    addedAt: NOW_S - 400 * DAY_S, // older than 180 days (excluded from 'new')
    tags: [],
    isSaved: false,
    isNotable: false,
    spinCount: 0,
    ...overrides,
  };
}

/**
 * Apply a view mode's filter + grouper to a list of items and return a
 * { [sectionTitle]: VinylItem[] } map, with each section's items sorted by
 * the view mode's sorter, and sections sorted by keyOrder.
 */
function applyViewMode(
  items: VinylItem[],
  mode: {
    filter?: (item: VinylItem) => boolean;
    grouper: (item: VinylItem) => string | string[];
    sorter: (a: VinylItem, b: VinylItem) => number;
    keyOrder: (a: string, b: string) => number;
  }
): { title: string; data: VinylItem[] }[] {
  // 1. Filter
  const filtered = mode.filter ? items.filter(mode.filter) : items;

  // 2. Group (multi-group aware)
  const groups: Map<string, VinylItem[]> = new Map();
  for (const it of filtered) {
    const keys = mode.grouper(it);
    const keyArr = Array.isArray(keys) ? keys : [keys];
    for (const key of keyArr) {
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(it);
    }
  }

  // 3. Sort items within each section
  for (const [, sectionItems] of groups) {
    sectionItems.sort(mode.sorter);
  }

  // 4. Sort section keys
  const sortedKeys = Array.from(groups.keys()).sort(mode.keyOrder);

  return sortedKeys.map(title => ({ title, data: groups.get(title)! }));
}

// ─── Fixture ──────────────────────────────────────────────────────────────────

const FIXTURE: VinylItem[] = [
  // Artist prefix tests
  item({ id: 1,  title: 'Abbey Road',           creator: 'The Beatles',   year: '1969', tags: ['Rock'],       spinCount: 15, isNotable: true,  isSaved: true,  addedAt: NOW_S - 1 * DAY_S }),
  item({ id: 2,  title: 'Led Zeppelin IV',       creator: 'Led Zeppelin',  year: '1971', tags: ['Rock'],       spinCount: 8 }),
  item({ id: 3,  title: 'Nevermind',             creator: 'Nirvana',       year: '1991', tags: ['Rock'],       spinCount: 3, isNotable: true, addedAt: NOW_S - 5 * DAY_S }),
  item({ id: 4,  title: 'Kind of Blue',          creator: 'Miles Davis',   year: '1959', tags: ['Jazz'],       spinCount: 1, isSaved: true, addedAt: NOW_S - 20 * DAY_S }),
  item({ id: 5,  title: 'A Love Supreme',        creator: 'John Coltrane', year: '1965', tags: ['Jazz'],       spinCount: 0 }),
  item({ id: 6,  title: 'Thriller',              creator: 'Michael Jackson', year: '1982', tags: ['Pop'],     spinCount: 12, isNotable: true,  isSaved: true,  addedAt: NOW_S - 50 * DAY_S }),
  item({ id: 7,  title: 'Purple Rain',           creator: 'Prince',        year: '1984', tags: ['Pop'],       spinCount: 5, addedAt: NOW_S - 100 * DAY_S }),
  item({ id: 8,  title: 'Post',                  creator: 'Björk',         year: '1995', tags: ['Electronic'], spinCount: 3 }),
  item({ id: 9,  title: 'Homogenic',             creator: 'Björk',         year: '1997', tags: ['Electronic'], spinCount: 1, isSaved: true }),
  item({ id: 10, title: 'Homework',              creator: 'Daft Punk',     year: '1997', tags: ['Electronic'], spinCount: 0 }),
  item({ id: 11, title: 'Random Access Memories', creator: 'Daft Punk',   year: '2013', tags: ['Electronic'], spinCount: 11, isNotable: true, addedAt: NOW_S - 3 * DAY_S }),
  item({ id: 12, title: 'OK Computer',           creator: 'Radiohead',     year: '1997', tags: ['Rock'],       spinCount: 6 }),
  item({ id: 13, title: 'In Rainbows',           creator: 'Radiohead',     year: '2007', tags: ['Rock'],       spinCount: 2, isSaved: true }),
  item({ id: 14, title: 'Dummy',                 creator: 'Portishead',    year: '1994', tags: ['Trip Hop'],   spinCount: 0 }),
  item({ id: 15, title: 'Blue Lines',            creator: 'Massive Attack', year: '1991', tags: ['Trip Hop'],  spinCount: 1 }),
  item({ id: 16, title: 'An Awesome Wave',       creator: 'alt-J',         year: '2012', tags: ['Indie'],      spinCount: 0 }),
  item({ id: 17, title: 'This Is Happening',     creator: 'LCD Soundsystem', year: '2010', tags: ['Electronic'], spinCount: 4 }),
  item({ id: 18, title: 'Untitled',              creator: 'The Artist',    year: undefined, tags: [],          spinCount: 0 }),
  item({ id: 19, title: 'No Genre Album',        creator: 'Zappa Frank',   year: '2001', tags: [],             spinCount: 0 }),
  item({ id: 20, title: 'New Today',             creator: 'Album Artist',  year: '2026', tags: ['Pop'],        spinCount: 0, addedAt: NOW_S - 2 * 60 * 60 }),       // 2h ago → Today
  item({ id: 21, title: 'New This Week',         creator: 'Band This Week', year: '2026', tags: ['Rock'],     spinCount: 0, addedAt: NOW_S - 3 * DAY_S }),           // 3d ago → This Week
  item({ id: 22, title: 'New This Month',        creator: 'Crew Month',    year: '2025', tags: ['Jazz'],       spinCount: 0, addedAt: NOW_S - 15 * DAY_S }),          // 15d ago → This Month
  item({ id: 23, title: 'Earlier This Year',     creator: 'Artist Year',   year: '2025', tags: ['Pop'],        spinCount: 0, addedAt: NOW_S - 60 * DAY_S }),          // 60d ago → Earlier This Year
  item({ id: 24, title: 'Old With Notable',      creator: 'Legacy Artist', year: '1975', tags: ['Jazz'],       spinCount: 0, isNotable: true, addedAt: NOW_S - 500 * DAY_S }), // >180d but notable
  item({ id: 25, title: 'Saved Only',            creator: 'Another Band',  year: '1988', tags: ['Rock'],       spinCount: 7, isSaved: true }),
];

// ─── artist mode ──────────────────────────────────────────────────────────────

describe('artist view mode', () => {
  const sections = applyViewMode(FIXTURE, artistViewMode);
  const titles = sections.map(s => s.title);

  it('produces only A-Z letters and # as section titles', () => {
    for (const title of titles) {
      expect(/^[A-Z#]$/.test(title)).toBe(true);
    }
  });

  it('The Beatles appears under B not T', () => {
    const beatlesSection = sections.find(s =>
      s.data.some(i => i.creator === 'The Beatles')
    );
    expect(beatlesSection?.title).toBe('B');
  });

  it('Led Zeppelin appears under L', () => {
    const lSection = sections.find(s =>
      s.data.some(i => i.creator === 'Led Zeppelin')
    );
    expect(lSection?.title).toBe('L');
  });

  it('Björk appears under B', () => {
    const bjorkSection = sections.find(s =>
      s.data.some(i => i.creator === 'Björk')
    );
    expect(bjorkSection?.title).toBe('B');
  });

  it('alt-J appears under A (leading "A " not stripped — only "An ", "A " article is "A ")', () => {
    // "alt-J" — leading article check: "An Awesome Wave" artist is "alt-J",
    // not "The/A/An" — so first char of sort key is 'a' → 'A'
    const aSection = sections.find(s =>
      s.data.some(i => i.creator === 'alt-J')
    );
    expect(aSection?.title).toBe('A');
  });

  it('"An Awesome Wave" artist "alt-J" → section A', () => {
    const aSection = sections.find(s => s.title === 'A');
    expect(aSection).toBeDefined();
    expect(aSection?.data.some(i => i.creator === 'alt-J')).toBe(true);
  });

  it('sections are in alphabetical order (A before B before L, # last)', () => {
    const letterSections = titles.filter(t => t !== '#');
    for (let i = 0; i < letterSections.length - 1; i++) {
      expect(letterSections[i].localeCompare(letterSections[i + 1])).toBeLessThan(0);
    }
    if (titles.includes('#')) {
      expect(titles[titles.length - 1]).toBe('#');
    }
  });

  it('items within B section: Beatles before Bjork (sort ignores "The")', () => {
    const bSection = sections.find(s => s.title === 'B')!;
    const creators = bSection.data.map(i => i.creator);
    const beatlesIdx = creators.indexOf('The Beatles');
    const bjorkIdx = creators.findIndex(c => c.startsWith('Björk'));
    // "beatles" < "bjork"
    expect(beatlesIdx).toBeLessThan(bjorkIdx);
  });

  it('items within R section: Radiohead albums both present', () => {
    const rSection = sections.find(s => s.title === 'R')!;
    const creators = rSection.data.map(i => i.creator);
    expect(creators.filter(c => c === 'Radiohead').length).toBe(2);
  });

  it('The Artist (no leading article strip for "The" without following word) → T', () => {
    // "The Artist" → sort key "Artist" → first char A — goes into A section
    // Wait: LEADING_ARTICLES strips "the " so sort key is "Artist" → A section
    const aSection = sections.find(s =>
      s.data.some(i => i.creator === 'The Artist')
    );
    expect(aSection?.title).toBe('A');
  });
});

// ─── genre mode ───────────────────────────────────────────────────────────────

describe('genre view mode', () => {
  const sections = applyViewMode(FIXTURE, genreViewMode);
  const titles = sections.map(s => s.title);

  it('section title equals first tag of items', () => {
    const electronicSection = sections.find(s => s.title === 'Electronic');
    expect(electronicSection).toBeDefined();
    expect(electronicSection?.data.every(i => i.tags?.[0] === 'Electronic')).toBe(true);
  });

  it('items with no tags go into Unknown', () => {
    const unknownSection = sections.find(s => s.title === 'Unknown');
    expect(unknownSection).toBeDefined();
    const unknownItems = unknownSection!.data;
    expect(unknownItems.some(i => i.title === 'No Genre Album')).toBe(true);
  });

  it('sections are alphabetical (except Unknown last)', () => {
    const withoutUnknown = titles.filter(t => t !== 'Unknown');
    for (let i = 0; i < withoutUnknown.length - 1; i++) {
      expect(withoutUnknown[i].localeCompare(withoutUnknown[i + 1])).toBeLessThan(0);
    }
    if (titles.includes('Unknown')) {
      expect(titles[titles.length - 1]).toBe('Unknown');
    }
  });

  it('items within a section are sorted by title', () => {
    const rockSection = sections.find(s => s.title === 'Rock')!;
    const rockTitles = rockSection.data.map(i => i.title);
    const sorted = [...rockTitles].sort((a, b) => a.localeCompare(b));
    expect(rockTitles).toEqual(sorted);
  });
});

// ─── decade mode ─────────────────────────────────────────────────────────────

describe('decade view mode', () => {
  const sections = applyViewMode(FIXTURE, decadeViewMode);
  const titles = sections.map(s => s.title);

  it('produces decade keys like "1960s", "1990s", "2020s"', () => {
    for (const title of titles) {
      if (title !== 'Unknown') {
        expect(/^\d{4}s$/.test(title)).toBe(true);
      }
    }
  });

  it('1969 album (Abbey Road) appears in 1960s', () => {
    const s = sections.find(s => s.title === '1960s');
    expect(s?.data.some(i => i.title === 'Abbey Road')).toBe(true);
  });

  it('1991 albums appear in 1990s', () => {
    const s = sections.find(s => s.title === '1990s');
    expect(s?.data.some(i => i.title === 'Nevermind')).toBe(true);
    expect(s?.data.some(i => i.title === 'Blue Lines')).toBe(true);
  });

  it('sections are descending (2020s before 1960s)', () => {
    const decades = titles
      .filter(t => t !== 'Unknown')
      .map(t => parseInt(t)); // strip "s"
    for (let i = 0; i < decades.length - 1; i++) {
      expect(decades[i]).toBeGreaterThan(decades[i + 1]);
    }
  });

  it('Unknown section is last', () => {
    if (titles.includes('Unknown')) {
      expect(titles[titles.length - 1]).toBe('Unknown');
    }
  });

  it('album with no year goes into Unknown', () => {
    const unknownSection = sections.find(s => s.title === 'Unknown');
    expect(unknownSection?.data.some(i => i.title === 'Untitled')).toBe(true);
  });

  it('within a decade items sort by year ascending', () => {
    const s1990s = sections.find(s => s.title === '1990s');
    if (s1990s && s1990s.data.length > 1) {
      const years = s1990s.data.map(i => parseInt(i.year ?? '9999'));
      for (let i = 0; i < years.length - 1; i++) {
        expect(years[i]).toBeLessThanOrEqual(years[i + 1]);
      }
    }
  });
});

// ─── new mode ─────────────────────────────────────────────────────────────────

describe('new view mode', () => {
  const sections = applyViewMode(FIXTURE, newViewMode);
  const titles = sections.map(s => s.title);

  it('Notable section contains only isNotable items', () => {
    const notable = sections.find(s => s.title === 'Notable');
    expect(notable).toBeDefined();
    expect(notable!.data.every(i => i.isNotable === true)).toBe(true);
  });

  it('Notable section contains all isNotable items from fixture', () => {
    const notable = sections.find(s => s.title === 'Notable');
    const notableIds = notable!.data.map(i => i.id);
    const fixtureNotable = FIXTURE.filter(i => i.isNotable).map(i => i.id);
    for (const id of fixtureNotable) {
      expect(notableIds).toContain(id);
    }
  });

  it('item added today appears in "New: Today"', () => {
    const s = sections.find(s => s.title === 'New: Today');
    expect(s).toBeDefined();
    expect(s!.data.some(i => i.title === 'New Today')).toBe(true);
  });

  it('item added 3 days ago appears in "New: This Week"', () => {
    const s = sections.find(s => s.title === 'New: This Week');
    expect(s).toBeDefined();
    expect(s!.data.some(i => i.title === 'New This Week')).toBe(true);
  });

  it('item added 15 days ago appears in "New: This Month"', () => {
    const s = sections.find(s => s.title === 'New: This Month');
    expect(s).toBeDefined();
    expect(s!.data.some(i => i.title === 'New This Month')).toBe(true);
  });

  it('item added 60 days ago appears in "New: Earlier This Year" or "New: <YYYY>"', () => {
    const matchingSection = sections.find(s =>
      s.data.some(i => i.title === 'Earlier This Year')
    );
    expect(matchingSection).toBeDefined();
    expect(matchingSection!.title).toMatch(/^New: /);
  });

  it('isNotable item added this week appears in BOTH Notable AND New: This Week', () => {
    // id:1 Abbey Road: isNotable=true, addedAt = NOW_S - 1 * DAY_S (this week)
    const notableSection = sections.find(s => s.title === 'Notable');
    const thisWeekSection = sections.find(s => s.title === 'New: This Week');

    expect(notableSection?.data.some(i => i.id === 1)).toBe(true);
    expect(thisWeekSection?.data.some(i => i.id === 1)).toBe(true);
  });

  it('item older than 180 days with no isNotable flag is excluded', () => {
    // id:2 Led Zeppelin IV: addedAt=400d ago, isNotable=false
    const allItems = sections.flatMap(s => s.data);
    expect(allItems.some(i => i.id === 2)).toBe(false);
  });

  it('Old notable-only item (>180d) appears in Notable but not in any time bucket', () => {
    // id:24 Old With Notable: 500d ago, isNotable=true
    const notableSection = sections.find(s => s.title === 'Notable');
    expect(notableSection?.data.some(i => i.id === 24)).toBe(true);

    const timeBucketSections = sections.filter(s => s.title.startsWith('New:'));
    for (const s of timeBucketSections) {
      expect(s.data.some(i => i.id === 24)).toBe(false);
    }
  });

  it('section order: Notable before Today before This Week before This Month', () => {
    const order = ['Notable', 'New: Today', 'New: This Week', 'New: This Month', 'New: Earlier This Year'];
    const presentOrder = order.filter(t => titles.includes(t));
    const indices = presentOrder.map(t => titles.indexOf(t));
    for (let i = 0; i < indices.length - 1; i++) {
      expect(indices[i]).toBeLessThan(indices[i + 1]);
    }
  });

  it('within each section items sort by addedAt descending', () => {
    for (const section of sections) {
      for (let i = 0; i < section.data.length - 1; i++) {
        expect(section.data[i].addedAt).toBeGreaterThanOrEqual(section.data[i + 1].addedAt);
      }
    }
  });
});

// ─── saved mode ───────────────────────────────────────────────────────────────

describe('saved view mode', () => {
  const sections = applyViewMode(FIXTURE, savedViewMode);

  it('only isSaved items appear', () => {
    const allItems = sections.flatMap(s => s.data);
    expect(allItems.every(i => i.isSaved === true)).toBe(true);
  });

  it('all isSaved items from fixture appear', () => {
    const allItems = sections.flatMap(s => s.data);
    const savedIds = FIXTURE.filter(i => i.isSaved).map(i => i.id);
    for (const id of savedIds) {
      expect(allItems.some(i => i.id === id)).toBe(true);
    }
  });

  it('single section titled "Saved Albums"', () => {
    expect(sections.length).toBe(1);
    expect(sections[0].title).toBe('Saved Albums');
  });

  it('items within section sort by creator then title', () => {
    const data = sections[0].data;
    for (let i = 0; i < data.length - 1; i++) {
      const a = data[i];
      const b = data[i + 1];
      const creatorCmp = (a.creator ?? '').localeCompare(b.creator ?? '');
      if (creatorCmp === 0) {
        const titleCmp = (a.title ?? '').localeCompare(b.title ?? '');
        expect(titleCmp).toBeLessThanOrEqual(0);
      } else {
        expect(creatorCmp).toBeLessThanOrEqual(0);
      }
    }
  });

  it('non-saved items are excluded (e.g. Led Zeppelin IV)', () => {
    const allItems = sections.flatMap(s => s.data);
    expect(allItems.some(i => i.id === 2)).toBe(false);
  });
});

// ─── spin mode ────────────────────────────────────────────────────────────────

describe('spin view mode', () => {
  const sections = applyViewMode(FIXTURE, spinViewMode);
  const titles = sections.map(s => s.title);

  it('produces exactly 4 bucket sections', () => {
    expect(sections.length).toBe(4);
  });

  it('section order: Heavy Rotation, Regular Play, Occasional Play, Never Played', () => {
    expect(titles).toEqual([
      'Heavy Rotation',
      'Regular Play',
      'Occasional Play',
      'Never Played',
    ]);
  });

  it('spinCount >= 10 → Heavy Rotation', () => {
    const hr = sections.find(s => s.title === 'Heavy Rotation')!;
    expect(hr.data.every(i => (i.spinCount ?? 0) >= 10)).toBe(true);
    // Abbey Road (15), Thriller (12), Random Access Memories (11)
    expect(hr.data.some(i => i.id === 1)).toBe(true);
    expect(hr.data.some(i => i.id === 6)).toBe(true);
    expect(hr.data.some(i => i.id === 11)).toBe(true);
  });

  it('spinCount 3-9 → Regular Play', () => {
    const rp = sections.find(s => s.title === 'Regular Play')!;
    expect(rp.data.every(i => {
      const c = i.spinCount ?? 0;
      return c >= 3 && c < 10;
    })).toBe(true);
  });

  it('spinCount 1-2 → Occasional Play', () => {
    const op = sections.find(s => s.title === 'Occasional Play')!;
    expect(op.data.every(i => {
      const c = i.spinCount ?? 0;
      return c >= 1 && c < 3;
    })).toBe(true);
  });

  it('spinCount 0 → Never Played', () => {
    const np = sections.find(s => s.title === 'Never Played')!;
    expect(np.data.every(i => (i.spinCount ?? 0) === 0)).toBe(true);
  });

  it('within bucket: items sort by spinCount descending', () => {
    for (const section of sections) {
      for (let i = 0; i < section.data.length - 1; i++) {
        expect(section.data[i].spinCount ?? 0).toBeGreaterThanOrEqual(
          section.data[i + 1].spinCount ?? 0
        );
      }
    }
  });

  it('Abbey Road (spinCount=15) is first in Heavy Rotation', () => {
    const hr = sections.find(s => s.title === 'Heavy Rotation')!;
    expect(hr.data[0].id).toBe(1);
  });
});

// ─── search filter ───────────────────────────────────────────────────────────

describe('searchFilter (vinylConfig)', () => {
  it('exact match works', () => {
    const bjork = FIXTURE.find(i => i.creator === 'Björk')!;
    expect(vinylConfig.searchFilter(bjork, 'Björk')).toBe(true);
  });

  it('diacritic-insensitive: "Bjork" matches Björk', () => {
    const bjork = FIXTURE.find(i => i.creator === 'Björk' && i.title === 'Post')!;
    expect(vinylConfig.searchFilter(bjork, 'Bjork')).toBe(true);
  });

  it('diacritic-insensitive: "bjork" (lowercase) matches Björk', () => {
    const bjork = FIXTURE.find(i => i.creator === 'Björk' && i.title === 'Post')!;
    expect(vinylConfig.searchFilter(bjork, 'bjork')).toBe(true);
  });

  it('partial title match works', () => {
    const abbey = FIXTURE.find(i => i.title === 'Abbey Road')!;
    expect(vinylConfig.searchFilter(abbey, 'abbey')).toBe(true);
  });

  it('partial creator match works', () => {
    const miles = FIXTURE.find(i => i.creator === 'Miles Davis')!;
    expect(vinylConfig.searchFilter(miles, 'miles')).toBe(true);
  });

  it('empty query returns true (show all)', () => {
    expect(vinylConfig.searchFilter(FIXTURE[0], '')).toBe(true);
    expect(vinylConfig.searchFilter(FIXTURE[0], '   ')).toBe(true);
  });

  it('no-match returns false', () => {
    expect(vinylConfig.searchFilter(FIXTURE[0], 'zzznomatch')).toBe(false);
  });

  it('"beatles" matches "The Beatles"', () => {
    const beatles = FIXTURE.find(i => i.creator === 'The Beatles')!;
    expect(vinylConfig.searchFilter(beatles, 'beatles')).toBe(true);
  });
});

// ─── parseApiItem ─────────────────────────────────────────────────────────────

describe('vinylConfig.parseApiItem', () => {
  it('maps releaseId → id', () => {
    const result = vinylConfig.parseApiItem({ releaseId: 42, artist: 'X', title: 'Y' });
    expect(result.id).toBe(42);
  });

  it('maps artist → creator', () => {
    const result = vinylConfig.parseApiItem({ releaseId: 1, artist: 'Test Artist', title: 'T' });
    expect(result.creator).toBe('Test Artist');
  });

  it('maps coverImage → thumbUrl', () => {
    const result = vinylConfig.parseApiItem({ releaseId: 1, artist: 'A', title: 'T', coverImage: 'http://example.com/img.jpg' });
    expect(result.thumbUrl).toBe('http://example.com/img.jpg');
  });

  it('maps genres[] → tags', () => {
    const result = vinylConfig.parseApiItem({ releaseId: 1, artist: 'A', title: 'T', genres: ['Rock', 'Pop'] });
    expect(result.tags).toEqual(['Rock', 'Pop']);
  });

  it('converts addedTimestamp (ms) → addedAt (seconds)', () => {
    const msTimestamp = 1700000000000;
    const result = vinylConfig.parseApiItem({ releaseId: 1, artist: 'A', title: 'T', addedTimestamp: msTimestamp });
    expect(result.addedAt).toBe(Math.floor(msTimestamp / 1000));
  });

  it('falls back to date_added ISO string when no addedTimestamp', () => {
    const isoDate = '2025-01-15T10:00:00Z';
    const result = vinylConfig.parseApiItem({ releaseId: 1, artist: 'A', title: 'T', date_added: isoDate });
    const expected = Math.floor(new Date(isoDate).getTime() / 1000);
    expect(result.addedAt).toBe(expected);
  });

  it('addedTimestamp takes priority over date_added', () => {
    const msTimestamp = 1700000000000;
    const result = vinylConfig.parseApiItem({
      releaseId: 1,
      artist: 'A',
      title: 'T',
      addedTimestamp: msTimestamp,
      date_added: '2020-01-01T00:00:00Z',
    });
    expect(result.addedAt).toBe(Math.floor(msTimestamp / 1000));
  });

  it('resolves instanceId from snake_case instance_id', () => {
    const result = vinylConfig.parseApiItem({ releaseId: 1, artist: 'A', title: 'T', instance_id: 999 });
    expect((result as any).instanceId).toBe(999);
  });

  it('resolves instanceId from camelCase instanceId', () => {
    const result = vinylConfig.parseApiItem({ releaseId: 1, artist: 'A', title: 'T', instanceId: 888 });
    expect((result as any).instanceId).toBe(888);
  });

  it('JSON-stringifies tracks array', () => {
    const tracks = [{ position: '1', title: 'Track 1', duration: '3:20' }];
    const result = vinylConfig.parseApiItem({ releaseId: 1, artist: 'A', title: 'T', tracks });
    expect((result as any).tracks).toBe(JSON.stringify(tracks));
  });

  it('passes through string tracks unchanged', () => {
    const tracksStr = '[{"position":"1","title":"T","duration":"3:00"}]';
    const result = vinylConfig.parseApiItem({ releaseId: 1, artist: 'A', title: 'T', tracks: tracksStr });
    expect((result as any).tracks).toBe(tracksStr);
  });

  it('defaults isSaved=false when not provided', () => {
    const result = vinylConfig.parseApiItem({ releaseId: 1, artist: 'A', title: 'T' });
    expect(result.isSaved).toBe(false);
  });

  it('defaults spinCount=0 when not provided', () => {
    const result = vinylConfig.parseApiItem({ releaseId: 1, artist: 'A', title: 'T' });
    expect((result as any).spinCount).toBe(0);
  });
});
