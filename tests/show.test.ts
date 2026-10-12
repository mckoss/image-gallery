// show.json (src/show.ts): reading it, its defaults and URLs.
import { describe, expect, it } from 'vitest';
import { DEFAULT_THEME, parseShow, resolve, ShowError, slideSize, theme, thumbFor } from '../src/show.ts';

describe('reading show.json', () => {
  it('fills in the 2004 defaults', () => {
    const show = parseShow({ format: 1, slides: [{ src: 'a.jpg' }] });
    expect(show).toMatchObject({
      title: '', size: { width: 640, height: 480 }, delay: 7, autoPlay: false, imageBase: '', thumbBase: '', theme: {},
    });
    expect(show.slides[0]).toEqual({ src: 'a.jpg', thumb: 'a-T.jpg', title: '' });
  });

  it('uses the image base for thumbnails unless it has its own', () => {
    expect(parseShow({ format: 1, imageBase: 'img/', slides: [] }).thumbBase).toBe('img/');
    expect(parseShow({ format: 1, imageBase: 'img/', thumbBase: 't/', slides: [] }).thumbBase).toBe('t/');
  });

  it('refuses what isn\'t a gallery', () => {
    for (const bad of [null, 'x', {}, { format: 2, slides: [] }, { format: 1 }, { format: 1, slides: [{}] }]) {
      expect(() => parseShow(bad)).toThrow(ShowError);
    }
  });
});

describe('a show\'s URLs', () => {
  const page = 'https://mckoss.com/image-gallery/shows/a/show.json';

  it('are relative to show.json, after the base', () => {
    expect(resolve(page, '', 'Grain Elevator in Beach.jpg'))
      .toBe('https://mckoss.com/image-gallery/shows/a/Grain%20Elevator%20in%20Beach.jpg');
    expect(resolve(page, '../b/', 'x.jpg')).toBe('https://mckoss.com/image-gallery/shows/b/x.jpg');
  });

  it('are used as they are when absolute', () => {
    expect(resolve(page, '../b/', 'http://example.com/x.jpg')).toBe('http://example.com/x.jpg');
  });
});

describe('thumbnail names', () => {
  it('add -T before the extension', () => {
    expect(thumbFor('Grain Elevator In Plevna 3.jpg')).toBe('Grain Elevator In Plevna 3-T.jpg');
    expect(thumbFor('photo')).toBe('photo-T');
  });
});

describe('sizes and themes', () => {
  const show = parseShow({ format: 1, size: { width: 678, height: 452 }, theme: { text: 'black' },
    slides: [{ src: 'a.jpg' }, { src: 'b.jpg', size: { width: 300, height: 400 } }] });

  it('a slide is the show\'s size unless it has its own', () => {
    expect(slideSize(show, show.slides[0])).toEqual({ width: 678, height: 452 });
    expect(slideSize(show, show.slides[1])).toEqual({ width: 300, height: 400 });
  });

  it('the theme overrides the 2004 defaults', () => {
    expect(theme(show)).toEqual({ ...DEFAULT_THEME, text: 'black' });
  });
});
