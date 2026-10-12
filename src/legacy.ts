// Reads a 2004 gallery: the <Show> XML that was a "data island" in the
// gallery's HTML page (or a .xml file), and converts it to a show.json
// Show. Follows the 2004 player (legacy/LATEST/slideshow.js): booleans are
// TRUE/ON/YES, sizes default to 640x480, a slide's title defaults to its
// file name, and foo.jpg's thumbnail is foo-T.jpg. Anything it can't carry
// over is reported in `warnings`.
import { DEFAULT_DELAY, DEFAULT_SIZE, FORMAT, thumbFor } from './show.ts';
import type { Rect, Show, Size, Slide, Theme } from './show.ts';

export interface Dom {
  DOMParser: typeof DOMParser;
  XMLSerializer: typeof XMLSerializer;
}

export interface Converted { show: Show; warnings: string[] }

// The <XML ...>...</XML> data island in a gallery page, or the text itself
// if it's already XML.
export function dataIsland(text: string): string {
  const island = /<XML\b[^>]*>([\s\S]*?)<\/XML\s*>/i.exec(text);
  return (island ? island[1] : text).trim();
}

const SHOW_THEME: Record<string, [keyof Theme, 'string' | 'number']> = {
  BackColor: ['background', 'string'],
  TextColor: ['text', 'string'],
  BorderColor: ['border', 'string'],
  UnselectedColor: ['unselected', 'string'],
  ErrorColor: ['error', 'string'],
  Font: ['font', 'string'],
  FontSize: ['fontSize', 'number'],
  TitleFont: ['titleFont', 'string'],
  TitleFontSize: ['titleFontSize', 'number'],
  Border: ['borderWidth', 'number'],
  Margin: ['margin', 'number'],
  ThumbSize: ['thumbSize', 'number'],
};
const SHOW_ATTRS = new Set(['Width', 'Height', 'Delay', 'AutoPlay', 'ImageBase', 'ThumbBase', 'SoundTrack',
  'SoundLoop', 'Transition', ...Object.keys(SHOW_THEME)]);
const SHOW_CHILDREN = new Set(['Title', 'Home', 'Date', 'ImageCredit', 'SoundCredit', 'Slide']);
const SLIDE_ATTRS = new Set(['Src', 'Thumb', 'Width', 'Height', 'LargeWidth', 'LargeHeight']);
const SLIDE_CHILDREN = new Set(['Title', 'Date', 'Desc', 'ImageCredit', 'CropRect', 'ThumbRect']);

export function convertLegacy(text: string, dom: Dom = globalThis): Converted {
  const doc = new dom.DOMParser().parseFromString(dataIsland(text), 'text/xml');
  const root = doc.documentElement;
  if (!root || root.nodeName !== 'Show' || doc.getElementsByTagName('parsererror').length) {
    throw new Error('Not a 2004 gallery: no <Show> element');
  }
  const warnings: string[] = [];
  const serializer = new dom.XMLSerializer();
  const htmlParser = new dom.DOMParser();
  const content = (el: Element | undefined) => el ? html(el, serializer, htmlParser) : '';

  const showAttr = attrs(root);
  for (const name of Object.keys(showAttr)) {
    if (!SHOW_ATTRS.has(name)) warnings.push(`<Show ${name}> isn't supported; dropped`);
  }
  for (const child of elements(root)) {
    if (!SHOW_CHILDREN.has(child.nodeName)) warnings.push(`<Show><${child.nodeName}> isn't supported; dropped`);
  }
  const titleEl = child(root, 'Title');
  if (titleEl?.getAttribute('ShowTitle') != null) warnings.push('<Title ShowTitle> isn\'t supported; dropped');

  const theme: Partial<Theme> = {};
  for (const [name, [key, type]] of Object.entries(SHOW_THEME)) {
    const value = showAttr[name];
    if (value === undefined) continue;
    (theme as Record<string, string | number>)[key] = type === 'number' ? Number(value) : value;
  }

  const imageBase = showAttr.ImageBase ?? '';
  const show: Show = {
    format: FORMAT,
    title: content(titleEl),
    ...optional('home', child(root, 'Home')?.getAttribute('HREF') ?? undefined),
    ...optional('date', content(child(root, 'Date'))),
    size: size(showAttr, DEFAULT_SIZE),
    delay: showAttr.Delay ? Number(showAttr.Delay) : DEFAULT_DELAY,
    autoPlay: bool(showAttr.AutoPlay, false),
    imageBase,
    thumbBase: showAttr.ThumbBase ?? imageBase,
    ...optional('soundtrack', showAttr.SoundTrack ? {
      src: showAttr.SoundTrack,
      // The 2004 player always looped (fLoop = true); SoundLoop="false" was ignored.
      loop: true,
      ...optional('credit', content(child(root, 'SoundCredit'))),
    } : undefined),
    ...optional('imageCredit', content(child(root, 'ImageCredit'))),
    ...optional('transition', showAttr.Transition),
    theme,
    slides: [],
  };
  if (showAttr.SoundLoop && !bool(showAttr.SoundLoop, true)) {
    warnings.push('<Show SoundLoop="false"> was ignored by the 2004 player; the soundtrack loops');
  }

  elements(root).filter(el => el.nodeName === 'Slide').forEach((el, i) => {
    const a = attrs(el);
    const where = `slide ${i + 1}`;
    for (const name of Object.keys(a)) {
      if (name === 'NoBase') warnings.push(`${where}: NoBase isn't supported; its src gets the base`);
      else if (name === 'Aspect') warnings.push(`${where}: Aspect="${a.Aspect}" (a Designer setting) dropped`);
      else if (!SLIDE_ATTRS.has(name)) warnings.push(`${where}: ${name} isn't supported; dropped`);
    }
    for (const c of elements(el)) {
      if (c.nodeName === 'Path') warnings.push(`${where}: the Designer's local path dropped`);
      else if (!SLIDE_CHILDREN.has(c.nodeName)) warnings.push(`${where}: <${c.nodeName}> isn't supported; dropped`);
    }
    const src = a.Src ?? '';
    if (!src) warnings.push(`${where}: no Src`);
    const slide: Slide = {
      src,
      thumb: a.Thumb ?? thumbFor(src),
      title: content(child(el, 'Title')) || src.slice(0, src.indexOf('.') < 0 ? undefined : src.indexOf('.')),
      ...optional('date', content(child(el, 'Date'))),
      ...optional('desc', content(child(el, 'Desc'))),
      ...optional('size', a.Width || a.Height ? size(a, show.size) : undefined),
      ...optional('crop', rect(child(el, 'CropRect'))),
      ...optional('thumbRect', rect(child(el, 'ThumbRect'))),
      ...optional('large', a.LargeWidth || a.LargeHeight ? size(a, show.size, 'Large') : undefined),
      ...optional('imageCredit', content(child(el, 'ImageCredit'))),
    };
    show.slides.push(slide);
  });
  return { show, warnings };
}

// An element's content as modern HTML (lowercase tags and attributes, as
// the HTML parser writes it), whitespace collapsed as the browser shows it.
function html(el: Element, serializer: XMLSerializer, parser: DOMParser): string {
  const xml = Array.from(el.childNodes, n => serializer.serializeToString(n)).join('');
  return parser.parseFromString(xml, 'text/html').body.innerHTML.replace(/\s+/g, ' ').trim();
}

function attrs(el: Element): Record<string, string> {
  return Object.fromEntries(Array.from(el.attributes, a => [a.name, a.value]));
}

function elements(el: Element): Element[] {
  return Array.from(el.childNodes).filter((n): n is Element => n.nodeType === 1);
}

function child(el: Element, name: string): Element | undefined {
  return elements(el).find(c => c.nodeName === name);
}

function bool(value: string | undefined, def: boolean): boolean {
  return value === undefined ? def : ['TRUE', 'ON', 'YES'].includes(value.toUpperCase());
}

function size(a: Record<string, string>, def: Size, prefix = ''): Size {
  return {
    width: a[`${prefix}Width`] ? Number(a[`${prefix}Width`]) : def.width,
    height: a[`${prefix}Height`] ? Number(a[`${prefix}Height`]) : def.height,
  };
}

function rect(el: Element | undefined): Rect | undefined {
  if (!el) return undefined;
  const a = attrs(el);
  return { x: Number(a.X ?? 0), y: Number(a.Y ?? 0), width: Number(a.Width ?? 0), height: Number(a.Height ?? 0) };
}

// { [key]: value } when there's a value (not undefined or ''), else {}.
function optional<K extends string, V>(key: K, value: V | undefined | ''): { [P in K]?: V } {
  return value === undefined || value === '' ? {} : { [key]: value } as { [P in K]?: V };
}
