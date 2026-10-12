// The page: loads the show named by ?show= (a show.json URL on this site;
// the Whizmo and Gizmo gallery by default) and plays it. ?image=N starts on
// photo N.
import './player.css';
import { startIndex } from './gallery.ts';
import { mountPlayer } from './player.ts';
import { parseShow } from './show.ts';

export const DEFAULT_SHOW = 'shows/whizmo-jerkquest-03-day-1/show.json';

// The show's URL. Only this site's shows: their titles and captions are
// HTML, so a show from elsewhere could run script here.
export function showUrl(search: string, page: string): URL {
  const url = new URL(new URLSearchParams(search).get('show') || DEFAULT_SHOW, page);
  if (url.origin !== new URL(page).origin) throw new Error(`Only galleries on this site can be shown, not ${url.href}`);
  return url;
}

async function main(): Promise<void> {
  const root = document.getElementById('gallery')!;
  try {
    const url = showUrl(location.search, location.href);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Couldn't load ${url.pathname} (${response.status})`);
    const show = parseShow(await response.json());
    document.title = `${root.ownerDocument.createRange().createContextualFragment(show.title).textContent} - The Image Gallery`;
    mountPlayer(root, show, { showUrl: url.href, start: startIndex(location.search, show.slides.length) });
  } catch (e) {
    root.className = 'ig-failed';
    root.textContent = (e as Error).message;
  }
}

if (typeof document !== 'undefined' && document.getElementById('gallery')) void main();
