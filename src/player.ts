// The gallery on the page: the photo (cross-fading between photos), its
// title and caption, the control buttons (Home, Sound, Previous, Next,
// Play) and the thumbnails. A minimal port of the 2004 player
// (legacy/LATEST/slideshow.js); the state lives in Gallery (gallery.ts).
//
// Titles and captions are HTML from show.json, so a show must be trusted,
// as it was in 2004.
import { Gallery, thumbColumns } from './gallery.ts';
import { isLandscape, resolve, slideSize, theme } from './show.ts';
import type { Show, Size } from './show.ts';
import homeUp from './icons/home-up.png';
import homeDown from './icons/home-down.png';
import prevUp from './icons/prev-up.png';
import prevDown from './icons/prev-down.png';
import nextUp from './icons/next-up.png';
import nextDown from './icons/next-down.png';
import playUp from './icons/play-up.png';
import playDown from './icons/play-down.png';
import soundOn from './icons/sound-on.png';
import soundOff from './icons/sound-off.png';

export const SOURCE = 'https://github.com/mckoss/image-gallery';

type PhotoState = 'unloaded' | 'loaded' | 'error';

export interface PlayerOptions {
  showUrl: string;          // show.json's URL: the show's URLs are relative to it
  start?: number;           // the first photo's index
}

export class Player {
  readonly gallery: Gallery;
  readonly root: HTMLElement;
  private readonly show: Show;
  private readonly srcs: string[];
  private readonly states: PhotoState[];
  private readonly cache = new Map<number, HTMLImageElement>();
  private readonly photos: [HTMLImageElement, HTMLImageElement];
  private front = 0;
  private shown = -1;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private readonly audio: HTMLAudioElement | undefined;
  private soundOn = false;
  private readonly el: Record<string, HTMLElement> = {};
  private readonly onKey = (e: KeyboardEvent) => this.key(e);

  constructor(root: HTMLElement, show: Show, options: PlayerOptions) {
    this.root = root;
    this.show = show;
    const url = (base: string, file: string) => resolve(options.showUrl, base, file);
    this.srcs = show.slides.map(s => url(show.imageBase, s.src));
    this.states = show.slides.map(() => 'unloaded');
    this.gallery = new Gallery(show.slides.length, { start: options.start, autoPlay: show.autoPlay });
    if (show.soundtrack) {
      this.audio = new Audio(url('', show.soundtrack.src));
      this.audio.loop = show.soundtrack.loop;
    }
    root.innerHTML = this.markup(show, url);
    root.querySelectorAll<HTMLElement>('[data-part]').forEach(e => { this.el[e.dataset.part!] = e; });
    this.photos = [this.el.photoA as HTMLImageElement, this.el.photoB as HTMLImageElement];
    this.bind();
    this.update();
  }

  // Stops the show, the music and the keyboard shortcuts.
  destroy(): void {
    clearTimeout(this.timer);
    this.audio?.pause();
    document.removeEventListener('keydown', this.onKey);
  }

  private markup(show: Show, url: (base: string, file: string) => string): string {
    const t = theme(show);
    const box = maxSize(show);
    const style = [
      `--ig-background:${t.background}`, `--ig-text:${t.text}`, `--ig-border:${t.border}`,
      `--ig-unselected:${t.unselected}`, `--ig-error:${t.error}`, `--ig-font:${t.font}`,
      `--ig-font-size:${t.fontSize}px`, `--ig-title-font:${t.titleFont}`, `--ig-title-font-size:${t.titleFontSize}px`,
      `--ig-border-width:${t.borderWidth}px`, `--ig-margin:${t.margin}px`, `--ig-thumb:${t.thumbSize}px`,
      `--ig-stage-width:${box.width}px`, `--ig-stage-ratio:${box.width}/${box.height}`,
      `--ig-columns:${thumbColumns(show.slides.length)}`,
    ].join(';');
    const button = (part: string, label: string, icon: string) =>
      `<button type="button" class="ig-button" data-part="${part}" aria-label="${label}" title="${label}">`
      + `<img src="${icon}" alt=""></button>`;
    const thumbs = show.slides.map((s, i) =>
      `<button type="button" class="ig-thumb" data-index="${i}" title="${attr(text(s.title))}">`
      + `<img src="${attr(url(show.thumbBase, s.thumb))}" alt="${attr(text(s.title))}"></button>`).join('');
    const credits = [show.imageCredit && `Photos: ${show.imageCredit}`,
      show.soundtrack?.credit && `Music: ${show.soundtrack.credit}`].filter(Boolean).join(' · ');
    return `<div class="ig ${landscapeShow(show) ? 'ig-landscape' : 'ig-portrait'}" style="${style}">
  <header class="ig-title" data-part="title">${show.title}</header>
  <div class="ig-body">
    <div class="ig-stage" data-part="stage">
      <img class="ig-photo" data-part="photoA" alt="">
      <img class="ig-photo" data-part="photoB" alt="">
    </div>
    <div class="ig-side">
      <div class="ig-caption" aria-live="polite">
        <div class="ig-slide-title" data-part="slideTitle"></div>
        <div class="ig-date" data-part="date"></div>
        <div class="ig-desc" data-part="desc"></div>
      </div>
      <div class="ig-controls">
        ${show.home ? `<a class="ig-button" data-part="home" href="${attr(show.home)}" aria-label="Home page" title="Home page"><img src="${homeUp}" alt=""></a>` : ''}
        ${this.audio ? button('sound', 'Sound on/off', soundOff) : ''}
        ${button('prev', 'Previous photo', prevUp)}
        ${button('next', 'Next photo', nextUp)}
        ${button('play', 'Play', playUp)}
      </div>
      <div class="ig-thumbs" data-part="thumbs">${thumbs}</div>
    </div>
  </div>
  <footer class="ig-credits">${credits ? `${credits} · ` : ''}Powered by <a href="${SOURCE}">The Image Gallery</a> (2004)</footer>
  <div class="ig-splash" data-part="splash">${show.title}<br><br>${show.slides.length ? 'Loading…' : 'No photos!'}</div>
</div>`;
  }

  private bind(): void {
    this.el.thumbs.addEventListener('click', e => {
      const thumb = (e.target as Element).closest<HTMLElement>('.ig-thumb');
      if (thumb) this.act(() => this.gallery.select(Number(thumb.dataset.index)));
    });
    this.el.prev.addEventListener('click', () => this.act(() => this.gallery.step(-1)));
    this.el.next.addEventListener('click', () => this.act(() => this.gallery.step(1)));
    this.el.play.addEventListener('click', () => this.act(() => this.gallery.togglePlay()));
    this.el.sound?.addEventListener('click', () => this.setSound(!this.soundOn));
    for (const [part, up, down] of [['home', homeUp, homeDown], ['prev', prevUp, prevDown],
      ['next', nextUp, nextDown]] as const) {
      const img = this.el[part]?.querySelector('img');
      if (!img) continue;
      this.el[part].addEventListener('pointerdown', () => { img.src = down; });
      for (const ev of ['pointerup', 'pointerleave'] as const) {
        this.el[part].addEventListener(ev, () => { img.src = up; });
      }
    }
    this.thumbImages().forEach((img, i) => img.addEventListener('error', () => {
      img.closest('.ig-thumb')!.classList.add('ig-thumb-missing');
      this.thumbImages()[i].alt = '';
    }));
    document.addEventListener('keydown', this.onKey);
  }

  private key(e: KeyboardEvent): void {
    if (e.altKey || e.ctrlKey || e.metaKey || (e.target as Element)?.closest?.('input, textarea')) return;
    if (e.key === 'ArrowLeft') this.act(() => this.gallery.step(-1));
    else if (e.key === 'ArrowRight') this.act(() => this.gallery.step(1));
    else if (e.key === ' ' && !(e.target as Element)?.closest?.('button, a')) this.act(() => this.gallery.togglePlay());
    else return;
    e.preventDefault();
  }

  private act(change: () => void): void {
    change();
    this.update();
  }

  // Brings the page up to date with the gallery.
  private update(): void {
    const g = this.gallery;
    this.el.play?.setAttribute('aria-pressed', String(g.playing));
    const playImg = this.el.play?.querySelector('img');
    if (playImg) playImg.src = g.playing ? playDown : playUp;
    this.thumbButtons().forEach((b, i) => {
      b.classList.toggle('ig-selected', i === g.current);
      b.setAttribute('aria-current', String(i === g.current));
      b.dataset.state = this.states[i];
    });
    if (g.fadeOut) {
      g.fadeOut = false;
      this.fadeSound(this.show.delay);
    }
    clearTimeout(this.timer);
    if (g.count && g.current !== this.shown) this.load(g.current).then(() => this.display(g.current));
    else this.schedule();
  }

  private schedule(): void {
    clearTimeout(this.timer);
    if (this.gallery.playing) this.timer = setTimeout(() => this.act(() => this.gallery.tick()), this.show.delay * 1000);
  }

  // Shows photo `index`, once it has loaded, if it's still the current one.
  private display(index: number): void {
    if (index !== this.gallery.current) return;
    const slide = this.show.slides[index];
    const size = slideSize(this.show, slide);
    const back = this.photos[1 - this.front];
    back.src = this.srcs[index];
    back.alt = text(slide.title);
    back.style.aspectRatio = `${size.width}/${size.height}`;
    back.classList.toggle('ig-error', this.states[index] === 'error');
    back.classList.add('ig-front');
    this.photos[this.front].classList.remove('ig-front');
    this.front = 1 - this.front;
    this.el.slideTitle.innerHTML = slide.title;
    this.el.date.textContent = slide.date ?? '';
    this.el.desc.innerHTML = slide.desc ?? '';
    if (this.shown < 0) {
      this.root.querySelector('.ig')!.classList.add('ig-ready');
      if (this.audio) this.setSound(true);
    }
    this.shown = index;
    this.schedule();
    this.preloadNext();
  }

  // Loads photo `index` (once), resolving when it has loaded or failed.
  private load(index: number): Promise<void> {
    let img = this.cache.get(index);
    if (!img) {
      img = new Image();
      this.cache.set(index, img);
      img.src = this.srcs[index];
    }
    const done = (state: PhotoState) => {
      this.states[index] = state;
      const b = this.thumbButtons()[index];
      if (b) b.dataset.state = state;
    };
    if (this.states[index] !== 'unloaded') return Promise.resolve();
    return new Promise(res => {
      img!.addEventListener('load', () => { done('loaded'); res(); }, { once: true });
      img!.addEventListener('error', () => { done('error'); res(); }, { once: true });
    });
  }

  // While idle, loads the next photo not yet loaded, as the 2004 player did.
  private preloadNext(): void {
    const n = this.gallery.count;
    for (let k = 1; k < n; k++) {
      const i = (this.gallery.current + k) % n;
      if (!this.cache.has(i)) { void this.load(i); return; }
    }
  }

  private setSound(on: boolean): void {
    if (!this.audio) return;
    this.soundOn = on;
    const img = this.el.sound?.querySelector('img');
    if (img) img.src = on ? soundOn : soundOff;
    this.el.sound?.setAttribute('aria-pressed', String(on));
    if (on) {
      this.audio.volume = 1;
      // Browsers may refuse until the visitor has clicked; then it's off.
      this.audio.play()?.catch(() => this.setSound(false));
    } else {
      this.audio.pause();
    }
  }

  private fadeSound(seconds: number): void {
    const audio = this.audio;
    if (!audio || !this.soundOn) return;
    const steps = 20;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      audio.volume = Math.max(0, 1 - step / steps);
      if (step >= steps) { clearInterval(timer); this.setSound(false); }
    }, seconds * 1000 / steps);
  }

  private thumbButtons(): HTMLElement[] {
    return Array.from(this.el.thumbs.querySelectorAll<HTMLElement>('.ig-thumb'));
  }

  private thumbImages(): HTMLImageElement[] {
    return Array.from(this.el.thumbs.querySelectorAll<HTMLImageElement>('.ig-thumb img'));
  }
}

export function mountPlayer(root: HTMLElement, show: Show, options: PlayerOptions): Player {
  return new Player(root, show, options);
}

// The largest photo size in the show: the stage is that big.
export function maxSize(show: Show): Size {
  const sizes = show.slides.map(s => slideSize(show, s));
  return sizes.length
    ? { width: Math.max(...sizes.map(s => s.width)), height: Math.max(...sizes.map(s => s.height)) }
    : show.size;
}

// Mostly landscape photos: the caption and controls go under the photo;
// otherwise beside it (the 2004 player's landscape and portrait layouts).
export function landscapeShow(show: Show): boolean {
  const sizes = show.slides.map(s => slideSize(show, s));
  return sizes.filter(isLandscape).length * 2 >= sizes.length;
}

function text(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&');
}

function attr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}
