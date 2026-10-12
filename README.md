# The Image Gallery

A photo slideshow: cropped thumbnails to jump between pictures, a title and
caption for each one, cross-fades, auto-play, and an optional soundtrack.
Written in 2004 for Internet Explorer; this repo brings it to modern
browsers, and later to a Svelte and TypeScript app.

**Try it:** the Whizmo and Gizmo gallery, *JerkQuest '03 Tour, Day 1*, at
[mckoss.com/image-gallery](https://mckoss.com/image-gallery/).

## History

- **2004.** Mike Koss, Mark Jennings and Darrell Plank built The Image
  Gallery as CodeRats.com, kept in CVS on coderats.com. A gallery was one
  HTML file holding its photos' list as an `<XML>` "data island"; copy the
  file, edit the list, and drop the folder on a web server. A Windows
  **Designer** app (not kept here) picked the photos, cropped them, chose
  each thumbnail's rectangle, and wrote the folder for you. Versions: the
  Designer in March and April, version 1.0 in September, and the last
  player in November.
- **The galleries.** The sample was Whizmo and Gizmo's *JerkQuest '03 Tour*,
  Day 1: grain elevators, abandoned farmhouses and wide-load hay trucks
  across North Dakota and Montana, set to "Ventura Highway". Another
  showed off the Cessna Caravan.
- **2012.** The old mckoss.com, gallery included, was archived to
  [mckoss/original-mckoss.com](https://github.com/mckoss/original-mckoss.com).
  By then it no longer ran: data islands and its cross-fade (`filters`)
  worked only in Internet Explorer.
- **2026.** Moved here. The 2004 files are in [`legacy/`](legacy/),
  unchanged; the gallery format is now JSON, and the player is TypeScript.

## Using it

Node 24 LTS (see `.nvmrc`).

```sh
npm install
npm run dev       # the player, with the Whizmo and Gizmo gallery
npm test          # unit tests
npm run build     # the site, in dist/
npm run migrate   # convert the legacy galleries to show.json again
```

`index.html` plays the gallery named by `?show=` (a `show.json` URL; the
default is the Whizmo and Gizmo one). `?image=3` starts on the third photo.

Keys: ← and → step through the photos, space starts and stops the show.

## The gallery format: `show.json`

```jsonc
{
  "format": 1,
  "title": "<a href=\"http://www.whizmoandgizmo.com\">Whizmo and Gizmo</a> - <i>JerkQuest '03 Tour</i>",
  "home": "http://www.whizmoandgizmo.com/JerkQuest03/Report01.html",
  "size": { "width": 678, "height": 452 },   // each photo's size, unless it gives its own
  "delay": 15,                                 // seconds per photo while playing
  "autoPlay": true,
  "soundtrack": { "src": "music.mp3", "loop": true, "credit": "..." },
  "imageBase": "",                             // prefix for relative src and thumb URLs
  "slides": [
    {
      "src": "Grain Elevator in Beach.jpg",
      "thumb": "Grain Elevator in Beach-T.jpg",
      "title": "Grain Elevator in Beach, North Dakota",
      "desc": "Optional caption; may hold simple HTML.",
      "date": "Optional date"
    }
  ]
}
```

URLs are relative to the `show.json` file. Slides may also give `size`,
`crop` and `thumbRect` (the Designer's crop and thumbnail rectangles, as
`{ x, y, width, height }`), `imageCredit`, and `large` (the size of a
larger copy). A gallery may set `theme` colors and fonts. `src/show.ts`
defines every field.

`npm run migrate` converts the legacy galleries (`src/legacy.ts` reads the
2004 XML) into `public/shows/`. It reports any field it can't carry over;
the Designer's local file paths are dropped.

## Licenses

The code is MIT licensed (see [LICENSE](LICENSE)). The Whizmo and Gizmo
photos and the Caravan thumbnails belong to their owners and aren't
covered by the MIT license. The sample's soundtrack, a commercial
recording, isn't included.
