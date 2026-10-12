// Converts the legacy galleries (scripts/migrations.ts) to show.json, with
// their photos and thumbnails, and lists anything that didn't carry over.
//   npm run migrate
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { JSDOM } from 'jsdom';
import { convertLegacy } from '../src/legacy.ts';
import { MIGRATIONS } from './migrations.ts';
import type { Migration } from './migrations.ts';
import type { Show } from '../src/show.ts';

export function migrated(m: Migration): { show: Show; warnings: string[] } {
  const { window } = new JSDOM('');
  const { show, warnings } = convertLegacy(readFileSync(m.source, 'latin1'), window);
  return { show: m.edit(show), warnings };
}

export function showJson(show: Show): string {
  return JSON.stringify(show, null, 2) + '\n';
}

if (import.meta.url === `file://${process.argv[1]}`) {
  for (const m of MIGRATIONS) {
    const { show, warnings } = migrated(m);
    mkdirSync(m.dest, { recursive: true });
    for (const slide of show.slides) {
      for (const file of [slide.src, slide.thumb]) {
        const from = join(m.images, file);
        if (existsSync(from)) copyFileSync(from, join(m.dest, file));
        else warnings.push(`${file} isn't in ${m.images}`);
      }
    }
    writeFileSync(join(m.dest, 'show.json'), showJson(show));
    console.log(`${m.source} -> ${m.dest}/show.json (${show.slides.length} slides)`);
    for (const w of warnings) console.log(`  ${w}`);
  }
}
