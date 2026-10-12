// @vitest-environment jsdom
// The player on a page (src/player.ts), playing the migrated Whizmo and
// Gizmo gallery. jsdom loads no images, so a photo "loads" (or fails, for
// names in `failing`) just after its src is set.
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mountPlayer, maxSize, landscapeShow } from '../src/player.ts';
import type { Player } from '../src/player.ts';
import { parseShow } from '../src/show.ts';
import type { Show } from '../src/show.ts';

const SHOW_URL = 'https://mckoss.com/image-gallery/shows/whizmo-jerkquest-03-day-1/show.json';
const whizmo = () => parseShow(JSON.parse(
  readFileSync('public/shows/whizmo-jerkquest-03-day-1/show.json', 'utf8')));

const failing = new Set<string>();
const flush = async () => { for (let i = 0; i < 10; i++) await Promise.resolve(); };

let player: Player | undefined;
let root: HTMLElement;

beforeEach(() => {
  failing.clear();
  Object.defineProperty(HTMLImageElement.prototype, 'src', {
    configurable: true,
    get() { return this.getAttribute('src') ?? ''; },
    set(this: HTMLImageElement, url: string) {
      this.setAttribute('src', url);
      const fail = [...failing].some(f => url.includes(encodeURI(f)));
      queueMicrotask(() => this.dispatchEvent(new Event(fail ? 'error' : 'load')));
    },
  });
  document.body.innerHTML = '<main id="gallery"></main>';
  root = document.getElementById('gallery')!;
});

afterEach(() => {
  player?.destroy();
  player = undefined;
  vi.useRealTimers();
});

async function mount(show: Show = whizmo(), start?: number): Promise<Player> {
  player = mountPlayer(root, show, { showUrl: SHOW_URL, start });
  await flush();
  return player;
}

const $ = (sel: string) => root.querySelector<HTMLElement>(sel)!;
const shownPhoto = () => root.querySelector<HTMLImageElement>('.ig-photo.ig-front')!;
const button = (label: string) => root.querySelector<HTMLElement>(`[aria-label="${label}"]`)!;
const key = (k: string) => document.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));

describe('the page', () => {
  it('has the show\'s title, the buttons, and a thumbnail per photo', async () => {
    await mount();
    expect($('.ig-title').innerHTML).toContain('<a href="http://www.whizmoandgizmo.com">Whizmo and Gizmo</a>');
    expect(root.querySelectorAll('.ig-thumb')).toHaveLength(9);
    expect(root.querySelector<HTMLImageElement>('.ig-thumb img')!.src)
      .toBe('https://mckoss.com/image-gallery/shows/whizmo-jerkquest-03-day-1/Grain%20Elevator%20in%20Beach-T.jpg');
    expect(button('Home page').getAttribute('href')).toBe('http://www.whizmoandgizmo.com/JerkQuest03/Report01.html');
    for (const label of ['Previous photo', 'Next photo', 'Play']) expect(button(label)).not.toBeNull();
    expect(button('Sound on/off')).toBeNull();
    expect($('.ig-credits').textContent).toContain('Powered by The Image Gallery (2004)');
  });

  it('lays out a landscape show with the photo as big as the biggest', async () => {
    const show = whizmo();
    expect(maxSize(show)).toEqual({ width: 678, height: 452 });
    expect(landscapeShow(show)).toBe(true);
    await mount(show);
    expect($('.ig').classList.contains('ig-landscape')).toBe(true);
    expect($('.ig').getAttribute('style')).toContain('--ig-columns:3');
  });
});

describe('showing photos', () => {
  it('says Loading until the first photo is in, then shows it with its caption', async () => {
    player = mountPlayer(root, whizmo(), { showUrl: SHOW_URL, start: 2 });
    expect($('.ig').classList.contains('ig-ready')).toBe(false);
    expect($('.ig-splash').textContent).toContain('Loading…');
    await flush();
    expect($('.ig').classList.contains('ig-ready')).toBe(true);
    expect(shownPhoto().src).toMatch(/Little%20House%20on%20Prarie%20S%20of%20Williston\.jpg$/);
    expect($('.ig-slide-title').textContent).toBe('Abandoned Farmhouse Near Theodore Roosevelt National Park');
    expect($('.ig-desc').textContent).toBe('The landscape of western North Dakota is littered with structures like this.');
  });

  it('cross-fades: the new photo goes in front of the old one', async () => {
    await mount();
    const first = shownPhoto();
    button('Next photo').click();
    await flush();
    expect(shownPhoto()).not.toBe(first);
    expect(first.classList.contains('ig-front')).toBe(false);
  });

  it('marks the thumbnails of photos loaded, showing and failed', async () => {
    failing.add('Old Garage in Alexander.jpg');
    await mount();
    const thumbs = [...root.querySelectorAll<HTMLElement>('.ig-thumb')];
    expect(thumbs[0].classList.contains('ig-selected')).toBe(true);
    expect(thumbs[0].dataset.state).toBe('loaded');
    thumbs[3].click();
    await flush();
    expect(thumbs[3].dataset.state).toBe('error');
    expect(shownPhoto().classList.contains('ig-error')).toBe(true);
  });
});

describe('the controls', () => {
  it('a thumbnail shows its photo and stops the show', async () => {
    const p = await mount();
    expect(p.gallery.playing).toBe(true);
    root.querySelectorAll<HTMLElement>('.ig-thumb')[4].click();
    await flush();
    expect(p.gallery.current).toBe(4);
    expect(button('Play').getAttribute('aria-pressed')).toBe('false');
    expect($('.ig-slide-title').textContent).toBe('Montana 7 North of Baker');
  });

  it('Previous and Next wrap around', async () => {
    const p = await mount();
    button('Previous photo').click();
    expect(p.gallery.current).toBe(8);
    button('Next photo').click();
    expect(p.gallery.current).toBe(0);
  });

  it('← → step and space plays', async () => {
    const p = await mount();
    key('ArrowRight');
    key('ArrowRight');
    expect([p.gallery.current, p.gallery.playing]).toEqual([2, false]);
    key('ArrowLeft');
    expect(p.gallery.current).toBe(1);
    key(' ');
    expect([p.gallery.current, p.gallery.playing]).toEqual([2, true]);
  });

  it('Play moves on every `delay` seconds, and stops on the last photo', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
    const p = await mount(whizmo(), 6);
    expect(p.gallery.playing).toBe(true);
    vi.advanceTimersByTime(14_999);
    expect(p.gallery.current).toBe(6);
    vi.advanceTimersByTime(1);
    await flush();
    expect([p.gallery.current, p.gallery.playing]).toEqual([7, true]);
    expect($('.ig-slide-title').textContent).toBe('Wide-load Hay Hauling on US 85 South of Williston');
    vi.advanceTimersByTime(15_000);
    await flush();
    expect([p.gallery.current, p.gallery.playing]).toEqual([8, false]);
    expect($('.ig-slide-title').textContent).toBe('Tornado Siren in Beach, North Dakota');
    vi.advanceTimersByTime(60_000);
    expect(p.gallery.current).toBe(8);
  });

  it('stops listening to keys once destroyed', async () => {
    const p = await mount();
    p.destroy();
    key('ArrowRight');
    expect(p.gallery.current).toBe(0);
  });
});

describe('a soundtrack', () => {
  it('gets a Sound button that turns the music on and off', async () => {
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
    const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
    await mount({ ...whizmo(), soundtrack: { src: 'music.mp3', loop: true } });
    const sound = button('Sound on/off');
    expect(play).toHaveBeenCalled();             // on with the first photo
    expect(sound.getAttribute('aria-pressed')).toBe('true');
    sound.click();
    expect(pause).toHaveBeenCalled();
    expect(sound.getAttribute('aria-pressed')).toBe('false');
  });

  it('starts when Play is clicked, unless the visitor turned it off', async () => {
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockRejectedValueOnce(new Error('NotAllowedError'))
      .mockResolvedValue(undefined);
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
    const p = await mount({ ...whizmo(), autoPlay: false, soundtrack: { src: 'music.mp3', loop: true } });
    await flush();
    const sound = button('Sound on/off');
    expect(sound.getAttribute('aria-pressed')).toBe('false');   // the browser said no
    button('Play').click();
    expect(p.gallery.playing).toBe(true);
    expect(play).toHaveBeenCalledTimes(2);
    expect(sound.getAttribute('aria-pressed')).toBe('true');
    sound.click();                                              // the visitor turns it off
    button('Play').click();                                     // stop
    button('Play').click();                                     // and play again
    expect(play).toHaveBeenCalledTimes(2);
    expect(sound.getAttribute('aria-pressed')).toBe('false');
  });

  it('is off if the browser won\'t play it yet', async () => {
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockRejectedValue(new Error('NotAllowedError'));
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
    await mount({ ...whizmo(), soundtrack: { src: 'music.mp3', loop: true } });
    expect(button('Sound on/off').getAttribute('aria-pressed')).toBe('false');
  });
});
