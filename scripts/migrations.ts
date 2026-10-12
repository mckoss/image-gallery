// The legacy galleries converted to show.json (npm run migrate), and how:
// the photos are copied next to show.json, so the bases are cleared.
import type { Show } from '../src/show.ts';

export interface Migration {
  source: string;                       // the 2004 page or XML, in legacy/
  dest: string;                         // the show's folder, in public/shows/
  images: string;                       // the legacy folder holding its photos
  edit: (show: Show) => Show;
}

export const MIGRATIONS: Migration[] = [
  {
    source: 'legacy/LATEST/sample.htm',
    dest: 'public/shows/whizmo-jerkquest-03-day-1',
    images: 'legacy/SampleSource',
    edit: show => {
      // Its soundtrack ("Ventura Highway", a commercial recording) isn't
      // distributed here.
      const { soundtrack: _, ...rest } = show;
      return { ...rest, imageBase: '', thumbBase: '' };
    },
  },
];
