// The 2004 XML converted to show.json (src/legacy.ts), checked against the
// legacy galleries themselves.
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import { convertLegacy, dataIsland } from '../src/legacy.ts';
import { parseShow } from '../src/show.ts';
import { MIGRATIONS } from '../scripts/migrations.ts';
import { migrated, showJson } from '../scripts/migrate.ts';

const { window } = new JSDOM('');
const legacy = (path: string) => readFileSync(join('legacy', path), 'latin1');
const convert = (path: string) => convertLegacy(legacy(path), window);

describe('the data island', () => {
  it('is found in a gallery page', () => {
    expect(dataIsland(legacy('LATEST/sample.htm'))).toMatch(/^<Show[\s\S]*<\/Show>$/);
  });

  it('is the whole text of an .xml file', () => {
    expect(dataIsland('  <Show/>\n')).toBe('<Show/>');
  });
});

describe('the Whizmo and Gizmo gallery (LATEST/sample.htm)', () => {
  const { show, warnings } = convert('LATEST/sample.htm');

  it('keeps the show settings', () => {
    expect(show).toMatchObject({
      format: 1, size: { width: 678, height: 452 }, delay: 15, autoPlay: true,
      imageBase: '../SampleSource/', thumbBase: '../SampleSource/',
      home: 'http://www.whizmoandgizmo.com/JerkQuest03/Report01.html',
      soundtrack: { src: 'http://mckoss.com/jscript/slideshow/SampleSource/VH.wma', loop: true },
    });
  });

  it('keeps the title as modern HTML', () => {
    expect(show.title).toBe('<a href="http://www.whizmoandgizmo.com">Whizmo and Gizmo</a> - '
      + '<i>JerkQuest \'03 Tour</i> - Pictures from Day 1');
  });

  it('keeps all nine slides, with -T thumbnails and collapsed captions', () => {
    expect(show.slides).toHaveLength(9);
    expect(show.slides[0]).toEqual({
      src: 'Grain Elevator in Beach.jpg', thumb: 'Grain Elevator in Beach-T.jpg',
      title: 'Grain Elevator in Beach, North Dakota',
    });
    expect(show.slides[6].desc).toBe('The trains are very active in this part of the country, but tend to haul '
      + 'great quantities of a single homogenous cargo such as gas or grain. One train we passed had over 100 '
      + 'grain cars - each car exactly the same.');
  });

  it('carries everything over', () => {
    expect(warnings).toEqual([]);
  });
});

describe('version 1.0\'s sample (1.0/sample.xml)', () => {
  const { show, warnings } = convert('1.0/sample.xml');

  it('keeps credits, colors and large sizes', () => {
    expect(show.imageCredit).toBe('Whole Show Credit');
    expect(show.soundtrack?.credit).toBe('<a href="http://www.amazon.com/exec/obidos/ASIN/B000002TC4/qid=1086843885/">'
      + 'Ventura Highway</a> by America');
    expect(show.theme).toEqual({ text: 'black', border: 'red' });
    expect(show.transition).toBe('Slide');
    expect(show.slides[0].large).toEqual({ width: 1024, height: 683 });
    expect(show.slides[1].imageCredit).toBe('Individual image credit');
  });

  it('reports what the 2004 player ignored', () => {
    expect(warnings).toEqual(expect.arrayContaining([
      '<Show Upscale> isn\'t supported; dropped',
      '<Show NavHigh> isn\'t supported; dropped',
      '<Show ThumbMargin> isn\'t supported; dropped',
      '<Show SoundLoop="false"> was ignored by the 2004 player; the soundtrack loops',
      '<Title ShowTitle> isn\'t supported; dropped',
    ]));
  });
});

describe('the Caravan gallery (LATEST/caravan.htm)', () => {
  const { show, warnings } = convert('LATEST/caravan.htm');

  it('keeps the Designer\'s crop and thumbnail rectangles, and a separate thumbnail base', () => {
    expect(show.thumbBase).toBe('../CaravanSource/Thumbs/');
    expect(show.slides[0]).toMatchObject({
      src: 'wall_800_01.jpg', thumb: 'wall_800_01-T.jpg',
      size: { width: 800, height: 600 },
      crop: { x: 0, y: 0, width: 800, height: 600 },
      thumbRect: { x: 464, y: 271, width: 83, height: 83 },
    });
  });

  it('keeps entities and paragraphs', () => {
    expect(show.slides[1].title).toBe('Mission &gt;&gt; Personal/Corporate/Other');
    expect(show.slides[3].desc).toContain('<p> See for yourself');
  });

  it('drops the Designer\'s local paths, and says so', () => {
    expect(JSON.stringify(show)).not.toContain('Documents and Settings');
    expect(warnings).toContain('slide 1: the Designer\'s local path dropped');
  });
});

describe('a gallery that isn\'t one', () => {
  it('is refused', () => {
    expect(() => convertLegacy('<html><body>no island</body></html>', window)).toThrow('no <Show> element');
  });
});

describe('the migrated galleries in public/shows', () => {
  for (const m of MIGRATIONS) {
    it(`${m.dest} is up to date with ${m.source} (npm run migrate)`, () => {
      expect(readFileSync(join(m.dest, 'show.json'), 'utf8')).toBe(showJson(migrated(m).show));
    });

    it(`${m.dest} has every photo and thumbnail, and reads as a show`, () => {
      const show = parseShow(JSON.parse(readFileSync(join(m.dest, 'show.json'), 'utf8')));
      for (const slide of show.slides) {
        expect(existsSync(join(m.dest, slide.src)), slide.src).toBe(true);
        expect(existsSync(join(m.dest, slide.thumb)), slide.thumb).toBe(true);
      }
      if (show.soundtrack) expect(existsSync(join(m.dest, show.soundtrack.src)), show.soundtrack.src).toBe(true);
    });
  }
});
