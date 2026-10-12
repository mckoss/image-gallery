// The gallery's state (src/gallery.ts), as the 2004 player behaved.
import { describe, expect, it } from 'vitest';
import { Gallery, startIndex, thumbColumns } from '../src/gallery.ts';

describe('a gallery', () => {
  it('starts on the first photo, or the one asked for', () => {
    expect(new Gallery(9).current).toBe(0);
    expect(new Gallery(9, { start: 4 }).current).toBe(4);
    expect(new Gallery(9, { start: 99 }).current).toBe(8);
  });

  it('plays from the start if the show says so (and has more than one photo)', () => {
    expect(new Gallery(9, { autoPlay: true }).playing).toBe(true);
    expect(new Gallery(1, { autoPlay: true }).playing).toBe(false);
  });

  it('steps both ways, wrapping around, and stops playing', () => {
    const g = new Gallery(3, { autoPlay: true });
    g.step(-1);
    expect([g.current, g.playing]).toEqual([2, false]);
    g.step(1);
    expect(g.current).toBe(0);
  });

  it('shows a clicked thumbnail\'s photo, and stops playing', () => {
    const g = new Gallery(5, { autoPlay: true });
    g.select(3);
    expect([g.current, g.playing]).toEqual([3, false]);
  });

  it('moves on at once when Play starts the show', () => {
    const g = new Gallery(5);
    g.togglePlay();
    expect([g.current, g.playing]).toEqual([1, true]);
    g.togglePlay();
    expect([g.current, g.playing]).toEqual([1, false]);
  });

  it('plays to the last photo, then stops and fades the music', () => {
    const g = new Gallery(3, { autoPlay: true });
    g.tick();
    expect([g.current, g.playing, g.fadeOut]).toEqual([1, true, false]);
    g.tick();
    expect([g.current, g.playing, g.fadeOut]).toEqual([2, false, true]);
    g.fadeOut = false;
    g.tick();
    expect(g.current).toBe(2);
  });

  it('does nothing when the timer fires after it stopped', () => {
    const g = new Gallery(3);
    g.tick();
    expect(g.current).toBe(0);
  });

  it('copes with no photos', () => {
    const g = new Gallery(0, { autoPlay: true });
    g.step(1);
    g.togglePlay();
    expect([g.current, g.playing]).toEqual([0, false]);
  });
});

describe('thumbnails', () => {
  it('go in a near-square grid', () => {
    expect([0, 1, 4, 9, 10, 12].map(thumbColumns)).toEqual([1, 1, 2, 3, 4, 4]);
  });
});

describe('?image=N', () => {
  it('starts on photo N (1-based, as in 2004), else the first', () => {
    expect(startIndex('?image=3', 9)).toBe(2);
    expect(startIndex('?Image=9', 9)).toBe(8);
    for (const q of ['', '?image=0', '?image=10', '?image=x', '?image=1.5']) expect(startIndex(q, 9)).toBe(0);
  });
});
