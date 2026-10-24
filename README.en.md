# liberadoPDF

Portable PDF viewer and presenter for Windows and Linux that plays the animations of the LaTeX `animate` package just like Adobe Acrobat Reader, plays the videos embedded in or linked from a PDF (without audio), and brings a **Tools** menu with 17 file operations (merge, split, OCR, compress…) that work offline, without installing anything. Inside it runs the pdf.js viewer, whose JavaScript sandbox executes the animations; liberadoPDF adds the presentation experience: full screen, keys and clickers, slides with steps, black screen, clock, auto-advance and recent files.

*Español: véase [README.md](README.md).*

## Usage

1. Copy the `liberadoPDF-win32-x64` folder (or unzip the `.zip`) to a disk or a USB stick. Nothing to install.
2. Double-click `liberadoPDF.exe`: the start page offers "Open PDF", the recent files and a drop zone.
3. You can also use "Open with…" on a PDF, drag a PDF onto the executable or the window, or pass it on the command line.
4. `F5` or double click enter the presentation; `Esc` leaves it.
5. **Presentation mode** is on the main toolbar; View ▸ "Customize toolbar…" chooses which buttons are shown.
6. The X closes the window without asking, unless you have unsaved annotations or form fields.
7. **Language**: the interface starts in English. Settings (`Ctrl+,`) ▸ "Language / Idioma" switches to Spanish; the app restarts by itself with the same document (pdf.js changes language too).

**First start on a new PC**: Windows and the antivirus scan the executable the first time, which can take 10–20 s; afterwards it opens in under 2 s.

## Linux

There is a portable Linux x64 package (`liberadoPDF-linux-x64.tar.gz`): extract it and run `./liberadoPDF.sh`. The launcher uses Chromium's sandbox when the system allows it (unprivileged user namespaces, or `chrome-sandbox` with setuid root: `sudo chown root chrome-sandbox && sudo chmod 4755 chrome-sandbox`) and otherwise starts without it, saying so on the terminal. Data lives in `data/` next to the program, as on Windows.

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
| `Ctrl+Shift+S` | snapshot to clipboard (drag a rectangle) | — |
| `Ctrl+Shift+P` | presenter view | same |
| `Ctrl+,` | settings | same |
| `F1` | key help | key help |

Clickers send `PgUp`/`PgDn`: they work without any setup. In presentation, the counter "slide X / Y · step a / b" uses the PDF's page labels, so with Beamer it shows the same number as the slide footer.

## Presenter view, notes and displays

- `Ctrl+Shift+P` (or View ▸ Presenter view) opens a second window with the current slide, the next one, the clock, a stopwatch (`R` resets it) and the notes.
- **Notes**: a text file next to the PDF called `<name>.pdf.notas.txt` with `## N` blocks (N = slide number as Beamer prints it).
- **Beamer with notes on the right half** (`show notes on second screen=right`): Settings ▸ This document ▸ "Pages with the notes on the right".
- **Two displays**: entering the presentation moves the window to the non-primary display (the projector) and the presenter view to the primary one. Fixed in Settings ▸ Displays.

## Videos inside the PDF

liberadoPDF plays, **without audio**, the videos a PDF embeds or links: *RichMedia* annotations (`media9`, embedded video), *Screen* (`movie15`) and *Movie* (`\movie` from Beamer's `multimedia` package, file next to the PDF). pdf.js does not show them; liberadoPDF overlays a muted player exactly on the annotation rectangle, in the window and in presentation, following the zoom.

- They start automatically and loop (Settings ▸ "PDF videos: play automatically" / "loop"); a click pauses or resumes. Options carried by the annotation (`autostart`, `loop`) take precedence.
- Formats: those of Chromium (H.264/MP4, VP9/WebM, AV1); not HEVC. If it cannot be decoded, a notice is shown on the rectangle.
- An external video is only looked up in the PDF's folder or its subfolders.

With `ffmpeg -i original.mp4 -an -c:v libx264 -profile:v baseline -pix_fmt yuv420p -movflags +faststart video.mp4` the video has no audio and plays in any Chromium. Such a PDF still does not move in Acrobat or Sumatra: playback is liberadoPDF's job.

## Tools

The **Tools** menu works on the open document and **never overwrites it**: each tool saves a new file (`<name> - <tool>.pdf` next to the document is proposed) or asks for a folder when several files come out; then it offers "Open the result". Everything runs on this computer. An encrypted PDF must be unlocked before using the other tools.

| Tool | What it does | Result |
|---|---|---|
| Merge PDF… | Reorderable list with the open document plus the PDFs you add | one PDF |
| Split or extract pages… | Ranges (`1-3,5,8-`) to one PDF, every N pages, or one page per file | one or several PDFs |
| Organize pages… | Thumbnails with drag and drop; rotate, duplicate, remove, insert a blank page | one PDF |
| Rotate pages… | 90°, 180° or 270° on the chosen pages | one PDF |
| Page numbers… | Text with `{n}` and `{total}` in six positions; respects CropBox and rotation | one PDF |
| Watermark… | Text (color, opacity, angle, tiling) or PNG/JPG image | one PDF |
| Crop pages… | Mark a rectangle on the page or type the measurements; changes the CropBox | one PDF |
| PDF to images… | PNG or JPEG per page at the chosen resolution, saved one by one into a folder | a folder |
| Images to PDF… | One page per image (A4, Letter or the image size); format detected by content, EXIF orientation applied | one PDF |
| Web page or HTML to PDF… | An http(s) address (needs internet) or a local `.html` file, printed by Electron | one PDF |
| Flatten forms and annotations… | Fields become fixed text; optionally removes all annotations | one PDF |
| Metadata… | Title, author, subject, keywords and creator | one PDF |
| Protect with password… | AES-256 with open and owner passwords; print/copy/modify permissions | one PDF |
| Unlock PDF… | Removes the encryption with the password | one PDF |
| Repair PDF… | qpdf rewrites the file; a missing xref/trailer is rebuilt (object streams included); pdf-lib as last resort. Lets you pick another file, since a broken PDF often does not open | one PDF |
| OCR (text in scanned PDF)… | Recognizes the text of each page (Spanish, English or both; 200 or 300 dpi) and adds it as an invisible layer (also on rotated pages) | one PDF |
| Compress… | Re-encodes photos as JPEG (high, medium, low) and recompresses the structure with qpdf; if it does not shrink by at least 2 %, it warns and saves nothing | one PDF |

Known limitations: merging, splitting or organizing copies the form fields without their form (the `animate` animations are fields and stop working in the result); Compress leaves masked, indexed or 1-bit images alone; Repair cannot recover content that is no longer in the file.

## Settings

`Ctrl+,` or View ▸ Settings…: auto-advance, loop, transitions, background color, cursor, displays, measurement unit, night mode, theme, language and videos. Saved in `data\config.json` next to the executable (portable mode); if that folder is not writable, in `%APPDATA%\liberadoPDF\config.json`.

## Building from WSL or Linux

Requirements: Node 24, a display (WSLg) for the smoke test, Python 3 with Pillow, ffmpeg, and for the sample PDFs a TeX Live with `beamer`, `tikz`, `animate`, `graphicx`, `multimedia` and `media9`.

```bash
npm install
npm test            # unit tests (node --test)
npm run humo        # smoke test (39 phases) under WSLg
npm run construir   # dist/liberadoPDF-win32-x64(.zip) and dist/liberadoPDF-linux-x64(.tar.gz); scripts/construir.sh win32|linux for one
scripts/humo_windows.sh [phase] [pdf] [page]   # smoke phases on the real .exe, launched from WSL
```

## License

MIT. pdf.js (Apache 2.0) is distributed unmodified in `vendor/pdfjs/`. The tools use pdf-lib (MIT), qpdf-wasm (Apache 2.0) and tesseract.js (Apache 2.0); the `tessdata_fast` language data is Apache 2.0.
