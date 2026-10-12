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
    edit: show => ({
      ...show,
      imageBase: '',
      thumbBase: '',
      // In 2004 this played "Ventura Highway" (America), a commercial
      // recording that can't be distributed here. In its place, a Creative
      // Commons track in the same easy acoustic spirit.
      soundtrack: {
        src: 'porch-swing-days-slower.mp3',
        loop: true,
        credit: '<a href="https://incompetech.com/music/royalty-free/music.html">"Porch Swing Days - slower"</a> '
          + 'Kevin MacLeod (incompetech.com), licensed under '
          + '<a href="https://creativecommons.org/licenses/by/4.0/">Creative Commons: By Attribution 4.0</a>',
      },
    }),
  },
];
