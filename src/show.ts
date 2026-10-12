// show.json: a gallery, in the format the player reads. Converted from the
// 2004 XML data islands by src/legacy.ts.

export const FORMAT = 1;

export interface Size { width: number; height: number }
export interface Rect extends Size { x: number; y: number }

export interface Slide {
  src: string;              // the photo, relative to imageBase
  thumb: string;            // its thumbnail, relative to thumbBase
  title: string;            // may hold simple HTML
  date?: string;
  desc?: string;            // may hold simple HTML
  size?: Size;              // display size; the show's size if absent
  crop?: Rect;              // the Designer's crop and thumbnail rectangles
  thumbRect?: Rect;
  large?: Size;             // the size of a larger copy (not yet used)
  imageCredit?: string;
}

export interface Soundtrack { src: string; loop: boolean; credit?: string }

export interface Theme {
  background: string;
  text: string;
  border: string;           // the photo's border, and the selected thumbnail's
  unselected: string;       // a loaded thumbnail's border
  error: string;            // a thumbnail whose photo failed to load
  font: string;
  fontSize: number;         // px
  titleFont: string;
  titleFontSize: number;
  borderWidth: number;
  margin: number;
  thumbSize: number;
}

export interface Show {
  format: typeof FORMAT;
  title: string;            // may hold simple HTML
  home?: string;            // the Home button's link
  date?: string;
  size: Size;
  delay: number;            // seconds per photo while playing
  autoPlay: boolean;
  imageBase: string;
  thumbBase: string;
  soundtrack?: Soundtrack;
  imageCredit?: string;
  transition?: string;
  theme: Partial<Theme>;
  slides: Slide[];
}

// The 2004 player's defaults.
export const DEFAULT_THEME: Theme = {
  background: '#3C3C3C',
  text: 'white',
  border: 'white',
  unselected: 'black',
  error: 'red',
  font: 'Verdana',
  fontSize: 14,
  titleFont: 'Verdana',
  titleFontSize: 18,
  borderWidth: 2,
  margin: 10,
  thumbSize: 40,
};
export const DEFAULT_SIZE: Size = { width: 640, height: 480 };
export const DEFAULT_DELAY = 7;

export function theme(show: Show): Theme {
  return { ...DEFAULT_THEME, ...show.theme };
}

export function slideSize(show: Show, slide: Slide): Size {
  return slide.size ?? show.size;
}

export function isLandscape(size: Size): boolean {
  return size.width >= size.height;
}

// A URL in the show, resolved against its base and the show's own URL.
export function resolve(showUrl: string | URL, base: string, url: string): string {
  const full = /^[a-z][a-z0-9+.-]*:/i.test(url) ? url : base + url;
  return new URL(full, showUrl).href;
}

export class ShowError extends Error {}

// Checks parsed JSON is a show this player can read, and fills defaults.
export function parseShow(data: unknown): Show {
  const fail = (why: string): never => { throw new ShowError(`Not a gallery: ${why}`); };
  if (!data || typeof data !== 'object') fail('not an object');
  const d = data as Record<string, unknown>;
  if (d.format !== FORMAT) fail(`format ${JSON.stringify(d.format)} (expected ${FORMAT})`);
  if (!Array.isArray(d.slides)) fail('no slides');
  const slides = (d.slides as unknown[]).map((s, i) => {
    if (!s || typeof s !== 'object') fail(`slide ${i + 1} is not an object`);
    const slide = s as Slide;
    if (typeof slide.src !== 'string' || !slide.src) fail(`slide ${i + 1} has no src`);
    return { ...slide, thumb: slide.thumb || thumbFor(slide.src), title: slide.title ?? '' };
  });
  return {
    ...(d as Partial<Show>),
    format: FORMAT,
    title: typeof d.title === 'string' ? d.title : '',
    size: (d.size as Size) ?? DEFAULT_SIZE,
    delay: typeof d.delay === 'number' ? d.delay : DEFAULT_DELAY,
    autoPlay: d.autoPlay === true,
    imageBase: typeof d.imageBase === 'string' ? d.imageBase : '',
    thumbBase: typeof d.thumbBase === 'string' ? d.thumbBase : (typeof d.imageBase === 'string' ? d.imageBase : ''),
    theme: (d.theme as Partial<Theme>) ?? {},
    slides,
  };
}

// The 2004 naming rule: foo.jpg's thumbnail is foo-T.jpg.
export function thumbFor(src: string): string {
  const dot = src.lastIndexOf('.');
  return dot < 0 ? `${src}-T` : `${src.slice(0, dot)}-T${src.slice(dot)}`;
}
