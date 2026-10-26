# liberadoPDF

*Español: véase [README.es.md](README.es.md).*

Portable PDF viewer and presenter for Windows, Linux and macOS that plays the animations of the LaTeX `animate` package just like Adobe Acrobat Reader, and the videos embedded in or linked from a PDF (without audio). Inside it runs the pdf.js viewer, whose JavaScript sandbox executes the animations; liberadoPDF adds the presentation experience: full screen, keys and clickers, slides with steps, black screen, clock, auto-advance and recent files.

It was born to give a talk with a Beamer presentation that carries a video embedded with `animate`, which no installed viewer would play. It also brings a **Tools** menu with 17 file operations (merge, split, OCR, compress…) that work offline, without installing anything.

## Usage

1. Copy the `liberadoPDF-win32-x64` folder (or unzip the `.zip`) to a disk or a USB stick. Nothing to install.
2. Double-click `liberadoPDF.exe`: the start page offers "Open PDF", the recent files and a zone to drop a PDF.
3. You can also use "Open with…" on a PDF, drag a PDF onto the executable or the window, or pass it on the command line.
4. `F5` or a double click enters the presentation; `Esc` leaves it.
5. **Presentation mode** is on the main toolbar (screen icon next to "»"). View ▸ "Customize toolbar…" (or the last entry of the "»" menu) chooses which buttons are shown; it is remembered in `config.json` (`barra`).
6. The X closes the window without asking, unless you have annotated or filled fields without saving: then it asks. (Animations also modify the PDF internally; that does not count.)
7. **Language**: the interface starts in English. Settings (`Ctrl+,`) ▸ "Language / Idioma" switches to Spanish; on change the app restarts by itself with the same document (the pdf.js viewer changes language too).

**First start on a new PC**: Windows and the antivirus scan the executable the first time, which can take 10–20 s; afterwards it opens in under 2 s. Open it once before the talk. From a USB 2.0 stick the first start is also slow: better copy the folder to the disk.

## Linux

There is a portable Linux x64 package (`liberadoPDF-linux-x64.tar.gz`): extract it and run `./liberadoPDF.sh`. The launcher uses Chromium's sandbox when the system allows it (unprivileged user namespaces, or `chrome-sandbox` with setuid root: `sudo chown root chrome-sandbox && sudo chmod 4755 chrome-sandbox`) and otherwise starts without it, saying so on the terminal. Data lives in `data/` next to the program, as on Windows. For "Open with…" from the desktop, point it at `liberadoPDF.sh`.

## macOS

Download `liberadoPDF-macos-universal.dmg` (one package for Apple Silicon and Intel; macOS 12 or later), open it and drag `liberadoPDF.app` to Applications. The app has an ad-hoc signature but is not notarized by Apple (that needs a paid developer account), so the first time macOS asks for confirmation:

- **macOS 15 Sequoia or later**: double-click it, close the warning, then System Settings ▸ Privacy & Security ▸ "Open Anyway" next to liberadoPDF.
- **macOS 14 or earlier**: right-click (or Ctrl-click) the app ▸ Open ▸ Open.

After that it opens with a normal double click, appears under "Open with…" for PDFs and accepts PDFs dropped on its Dock icon. If macOS ever says the app "is damaged" (a copy that lost its signature), `xattr -cr /Applications/liberadoPDF.app` in Terminal fixes it. Shortcuts use `Cmd` instead of `Ctrl` (`Cmd+S`, `Cmd+,`, `Cmd+Shift+P`…). The dark theme follows the system or is chosen in View ▸ Interface theme. Inside a `.app` there is no portable mode: data lives in `~/Library/Application Support/liberadoPDF`.

## Keys

| Key | Window | Presentation |
|---|---|---|
| `→` `↓` `PgDn` `Space` `Enter` | next page | next page |
| `←` `↑` `PgUp` `Backspace` | previous page | previous page |
| `Shift+→` / `Shift+←` | next / previous slide (skips Beamer steps) | same |
| `Home` / `End` | first / last | same |
| number + `Enter` | go to that slide | same |
| `F5` / double click | enter presentation | — |
| `Esc` | close the help | leave presentation |
| `T` | — | clock and stopwatch |
| `B` / `W` | — | black / white screen |
| `L` / `S` / `D` | — | laser pointer / spotlight / drawing (`C` clears, `Ctrl+Z` undoes) |
| `G` / `Tab` | slide grid | same |
| `N` | night mode | same |
| `Ctrl+O` / `Ctrl+N` | open / open in a new window | same |
| `Ctrl+S` / `Ctrl+Shift+G` | save / save as | — |
| `Ctrl+Shift+S` | snapshot to the clipboard (drag a rectangle) | — |
| `Ctrl+Shift+P` | presenter view | same |
| `Ctrl+,` | settings | same |
| `Ctrl+F`, `Ctrl+P`, `+`, `-`, `r` | find, print, zoom, rotate (pdf.js) | `r` disabled |
| `F1` | key help | key help |

Common clickers send `PgUp`/`PgDn`: they work without any setup. In presentation, the counter "slide X / Y · step a / b" uses the PDF's page labels: with Beamer it shows the same number as the slide footer (the title page is 0) and "number + Enter" jumps to that label; the steps of one slide share the label.

## Presenter view, notes and displays

- `Ctrl+Shift+P` (or View ▸ Presenter view) opens a second window with the current slide, the next one, the clock, a stopwatch (`R` resets it) and the notes. The arrow keys in that window also change the slide.
- **Notes**: a text file next to the PDF called `<name>.pdf.notas.txt` with `## N` blocks (N = slide number, as Beamer prints it in the footer), for example `## 3` followed by the text.
- **Beamer with notes on the right half** (`\setbeameroption{show notes on second screen=right}`): in Settings ▸ This document tick "Pages with the notes on the right"; the presentation shows only the left half, enlarged, and the presenter view shows the right half (limitation: the left half is scaled to twice the page-fit size, so it loses some sharpness).
- **Two displays**: entering the presentation moves the window to the non-primary display (the projector) and the presenter view to the primary one. It can be fixed in Settings ▸ Displays.

## Transitions, measurements and snapshot

- The PDF's `/Trans` transitions (`\transfade`, `\transwipe`, `\transsplitverticalin`… from Beamer) are played in presentation; `R` (what Beamer writes by default) is an instant change. They can be turned off in Settings.
- View ▸ Measure distance / Measure area draw on the page in window mode with the unit chosen in Settings (mm, cm, in) and honour `/UserUnit`; "Calibrate scale…" adjusts the scale of that document by marking a known segment. `Esc` clears.
- `Ctrl+Shift+S` copies to the clipboard the rectangle you drag over the window.
- Save (`Ctrl+S`) writes over the open file after confirming; "Save as…" opens the dialog. The pdf.js editors (notes, signature, highlight, text, drawing, image) are active on the toolbar.

## Tools

The **Tools** menu works on the open document and **never overwrites it**: each tool saves a new file (`<name> - <tool>.pdf` in the document's folder is proposed) or asks for a folder when several files come out; then it offers "Open the result". Everything runs on this computer: pdf-lib and qpdf in a worker, tesseract.js for the OCR, Electron itself to print HTML. An encrypted PDF must be unlocked before using the other tools.

| Tool | What it does | Result |
|---|---|---|
| Merge PDF… | Reorderable list with the open document plus the PDFs you add | one PDF |
| Split or extract pages… | Ranges (`1-3,5,8-`) to one PDF, every N pages, or one page per file | one or several PDFs (`… - part 01.pdf`) |
| Organize pages… | Thumbnails with drag and drop; rotate, duplicate, remove, insert a blank page | one PDF |
| Rotate pages… | 90°, 180° or 270° on the chosen pages (added to their current rotation) | one PDF |
| Page numbers… | Text with `{n}` and `{total}` in six positions, size and first number; Helvetica | one PDF |
| Watermark… | Text (color, opacity, angle, tiling) or a PNG/JPG image (other formats are converted) | one PDF |
| Crop pages… | Mark a rectangle on the page or type the measurements; changes the CropBox | one PDF |
| PDF to images… | PNG or JPEG per page at the chosen resolution; asks for the folder first and saves each image as it comes out | a folder (`… - page 01.png`) |
| Images to PDF… | One page per image (A4, Letter or the image size); the format is detected from the content, photos with EXIF orientation are straightened and unreadable files are skipped with a notice | one PDF |
| Web page or HTML to PDF… | An http(s) address (needs internet) or a local `.html` file, printed by Electron | one PDF |
| Flatten forms and annotations… | Fields become fixed content; optionally removes all annotations | one PDF |
| Metadata… | Title, author, subject, keywords and creator application (preloads the current ones) | one PDF |
| Protect with password… | AES-256 with open and owner passwords; print, copy and modify permissions | one PDF |
| Unlock PDF… | Removes the encryption with the password | one PDF |
| Repair PDF… | qpdf rewrites the file; a missing xref or trailer (truncated file) is rebuilt, object streams included (the format of pdflatex, Word or Chrome); pdf-lib as a last resort. An encrypted PDF must be unlocked first. Lets you pick another file, since a broken PDF often does not open | one PDF |
| OCR (text in scanned PDF)… | Recognizes the text of each page (Spanish, English or both; 200 or 300 dpi) and adds it as an invisible layer (invisible text mode, also on rotated or cropped pages): the PDF becomes searchable and copyable | one PDF |
| Compress… | Re-encodes photos as JPEG (high, medium or low) and recompresses the structure with qpdf; if it does not shrink by at least 2 %, it warns and saves nothing | one PDF |

- **OCR**: about 2–5 s per page at 200 dpi on an ordinary PC; the languages ship inside the program (`recursos/tessdata`, 6 MB) and nothing is downloaded. Rotated text or text very close to the edge is recognized worse.
- **Cancel** stops the tool without leaving half-written files.
- **Limitations**: merging, splitting or organizing copies the form fields (including the `animate` animations, which are fields) without their form, so they stop working in the result; Compress leaves masked, indexed or 1-bit images alone and only replaces an image if the resulting JPEG is smaller than it was in the file; Repair cannot recover content that is no longer in the file.

## Videos inside the PDF

liberadoPDF plays, **without audio**, the videos a PDF embeds or links: *RichMedia* annotations (`media9` package, embedded video), *Screen* (`movie15`) and *Movie* (`\movie` from Beamer's `multimedia` package, file next to the PDF). pdf.js does not show them; liberadoPDF overlays a muted player exactly on the rectangle, in the window and in presentation, and follows it when the zoom changes.

- They start by themselves and loop (Settings ▸ "PDF videos: play automatically" / "loop"); a click on the video pauses or resumes it. If the annotation carries its own options (`autostart`, `loop`), those win.
- Formats: Chromium's (H.264/MP4, VP9/WebM and AV1); not HEVC. If it cannot be decoded, a notice appears on the rectangle.
- An external video is only looked up in the PDF's folder or its subfolders.

To put a video in a Beamer presentation:

```latex
\usepackage{multimedia}   % external file: video.mp4 must sit next to the PDF
\movie[autostart,loop,width=8cm,height=4.5cm]{\includegraphics[width=8cm]{poster.png}}{video.mp4}

\usepackage{media9}       % video embedded in the PDF (no need to carry the file separately)
\includemedia[width=8cm,height=4.5cm,activate=pageopen,addresource=video.mp4,
  flashvars={source=video.mp4&autoPlay=true&loop=true}]{\includegraphics[width=8cm]{poster.png}}{VPlayer.swf}
```

With `ffmpeg -i original.mp4 -an -c:v libx264 -profile:v baseline -pix_fmt yuv420p -movflags +faststart video.mp4` the video has no audio and is in a format any Chromium plays. That PDF will still not move in Acrobat or Sumatra: playback is liberadoPDF's job.

## Settings

`Ctrl+,` or View ▸ Settings…: auto-advance, loop, transitions, background color, cursor, displays, measurement unit, night mode, theme, language and videos. They are saved in `data\config.json` next to the executable (portable mode; `data\` also holds Chromium's cache). If that folder is not writable, in `%APPDATA%\liberadoPDF\config.json`.

```json
{
  "presentacion": { "avanceSegundos": 0, "bucle": false, "transiciones": true, "fondo": "#000000", "ocultarCursor": true },
  "unidadMedida": "mm",
  "nocturno": false,
  "tema": "sistema",
  "monitorPresentacion": "auto",
  "monitorPresentador": "auto",
  "barra": { "presentationMode": true },
  "idioma": "en",
  "video": { "autoarranque": true, "bucle": true },
  "porDocumento": { "C:\\Talks\\talk.pdf": { "notasDerecha": true, "calibracion": 1 } }
}
```

The notes file (`<name>.pdf.notas.txt`) must be saved as UTF-8 (the modern Notepad does; an old ANSI editor garbles accented letters).

- `avanceSegundos`: advance by itself every N seconds in presentation (0 = off).
- `bucle`: when the end is reached, go back to the first slide (kiosk mode).
- `fondo`: color around the slide in presentation.
- `ocultarCursor`: hide the cursor after 2 s without moving it.

## Building from WSL or Linux

Requirements: Node 24, a display (WSLg) for the smoke test, Python 3 with Pillow (icon and the scanned and photo sample PDFs), ffmpeg (test video, `scripts/generar_video.sh`), and for the sample PDFs a TeX Live with `beamer`, `tikz`, `animate`, `graphicx`, `multimedia` and `media9`.

On Linux/WSLg, Electron is launched with `ELECTRON_DISABLE_SANDBOX=1` (set by `npm start`, `npm run humo` and the scripts): there is no setuid sandbox, and adding `no-sandbox` from the code breaks printing to PDF.

```bash
npm install
npm test            # unit tests (node --test)
npm run humo        # smoke test (40 phases): viewer, presentation, presenter, language, video and one phase per tool; generates its test PDFs
npm run construir   # dist/liberadoPDF-win32-x64(.zip), dist/liberadoPDF-linux-x64(.tar.gz) ; on macOS, scripts/construir.sh darwin → dist/liberadoPDF-macos-universal.dmg
scripts/humo_windows.sh                                         # smoke test on the .exe, launched from WSL
scripts/humo_windows.sh presentacionAnimada "path/to/pdf" 11    # does the animation on page 11 run in presentation?
scripts/humo_windows.sh guardar | cuadricula | presentador | cierre   # other phases on the .exe
scripts/humo_windows.sh unir | proteger | ocr | comprimir               # tools on the .exe
scripts/humo_linux.sh basica | video | …                                # the same phases on the Linux package
```

The `.exe` icon is set by `wine` (if installed) or by `rcedit-x64.exe` in `~/tools/rcedit/` run through WSL interop ([electron/rcedit](https://github.com/electron/rcedit/releases)). Without either, the executable keeps Electron's default icon.

The macOS package is built only on macOS: from Linux the `.app` comes out with a broken signature and macOS calls it "damaged". The `.github/workflows/macos.yml` workflow does it on GitHub's Macs (on `v*` tags, `mac/**` branches or by hand): unit tests and the full smoke test, a universal `.app` with an ad-hoc signature inside a `.dmg`, and smoke phases on the installed app on Apple Silicon and on Intel. The `.dmg` is left as an artifact of the run.

## Structure

- `src/main/`: Electron main process (`liberadopdf://` protocol, windows, menu, IPC, configuration, smoke test).
- `src/preload/preload.cjs`: safe bridge to the renderer and injection of liberadoPDF's own layer over the pdf.js viewer.
- `src/renderer/`: liberadoPDF's layer over the viewer (keys, presentation, counter, help) and the start page; `herramientas/` has one module per tool, the base dialog and the worker (`trabajador.mjs`, with pdf-lib and qpdf).
- `src/comun/`: pure logic, tested with `node --test` (`herramientas/` for ranges, names, stamping, cropping, images, repair, OCR and compression; `i18n.mjs` + `i18n/en.mjs` for the language; `video.mjs` for the videos).
- `recursos/`: sample PDFs (animated, transitions, notes, scanned, photos), icon, `linux/` (launcher), `macos/` (`.icns` icon and extra `Info.plist`) and `tessdata/` (OCR languages).
- `vendor/pdfjs/`: pdf.js 6.4.299 as is (not modified).
- `docs/superpowers/`: design and plans (in Spanish).

## Pending

- Tools 54–59 of the plan: PDF ↔ Office (Word, Excel, PowerPoint), edit text, redact (black out content), compare PDFs, PDF/A and scan from a camera.
- Opening "Tools ▸ Repair" from the start page (today a PDF must be open and the broken file is chosen in the dialog).
- Out of scope: read aloud, audio, external video by URL, Flash and 3D, digital signature validation.

## License

MIT. pdf.js is distributed in `vendor/pdfjs/` under Apache 2.0 (see `vendor/pdfjs/LICENSE`). The tools use pdf-lib (MIT), qpdf-wasm (Apache 2.0, qpdf) and tesseract.js / tesseract.js-core (Apache 2.0); the `tessdata_fast` language data is Apache 2.0 (see `recursos/tessdata/LICENSE.txt`).
