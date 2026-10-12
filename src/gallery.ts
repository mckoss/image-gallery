// The gallery's state, apart from the page: which photo is showing, and
// whether the show is playing. Follows the 2004 player: any click on a
// photo or arrow stops the show; Play advances at once; playing stops on
// the last photo, and the soundtrack fades out on the way to it.

export type Change = 'none' | 'slide' | 'play';

export class Gallery {
  current: number;
  playing: boolean;
  // Set when the show reaches its last photo while playing: fade the music.
  fadeOut = false;

  constructor(readonly count: number, options: { start?: number; autoPlay?: boolean } = {}) {
    this.current = count ? clamp(options.start ?? 0, 0, count - 1) : 0;
    this.playing = !!options.autoPlay && count > 1;
  }

  // A thumbnail clicked.
  select(index: number): void {
    this.playing = false;
    this.go(index);
  }

  // Previous or Next clicked (or ← →).
  step(by: number): void {
    this.playing = false;
    this.go(this.current + by);
  }

  // Play clicked (or space): starting moves on at once, as in 2004.
  togglePlay(): void {
    if (!this.playing) this.go(this.current + 1);
    this.playing = !this.playing && this.count > 1;
  }

  // The play timer: on to the next photo, stopping at the last one.
  tick(): void {
    if (!this.playing) return;
    if (this.current === this.count - 2) {
      this.playing = false;
      this.fadeOut = true;
    }
    this.go(this.current + 1);
  }

  private go(index: number): void {
    if (this.count) this.current = (index % this.count + this.count) % this.count;
  }
}

// Thumbnails go in a near-square grid: ceil(sqrt(n)) columns.
export function thumbColumns(count: number): number {
  return Math.max(1, Math.ceil(Math.sqrt(count)));
}

// ?image=N (1-based, as in 2004's ?Image=N) as a slide index.
export function startIndex(search: string, count: number): number {
  const params = new URLSearchParams(search);
  const n = Number(params.get('image') ?? params.get('Image'));
  return Number.isInteger(n) && n >= 1 && n <= count ? n - 1 : 0;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}
