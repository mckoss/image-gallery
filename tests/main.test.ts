// The page's ?show= parameter (src/main.ts).
import { describe, expect, it } from 'vitest';
import { DEFAULT_SHOW, showUrl } from '../src/main.ts';

const page = 'https://mckoss.com/image-gallery/?image=2';

describe('?show=', () => {
  it('defaults to the Whizmo and Gizmo gallery', () => {
    expect(showUrl('', page).href).toBe(`https://mckoss.com/image-gallery/${DEFAULT_SHOW}`);
  });

  it('names another show on this site', () => {
    expect(showUrl('?show=shows/b/show.json', page).href).toBe('https://mckoss.com/image-gallery/shows/b/show.json');
    expect(showUrl('?show=/other/show.json', page).href).toBe('https://mckoss.com/other/show.json');
  });

  it('refuses a show from another site (its HTML could run script here)', () => {
    expect(() => showUrl('?show=https://evil.example/show.json', page)).toThrow('Only galleries on this site');
  });
});
