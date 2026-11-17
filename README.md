# Auto Album Studio — Phase 1 starter

Offline Electron + React/Vite desktop foundation for Windows, with Sharp-powered local thumbnail import, versioned JSON project save/open, print settings, 18 deterministic layout patterns, sheet preview and tests.

## Requirements
Node.js 20+ and npm, Windows 10/11 recommended.

## Run
```powershell
npm install
npm run dev
```

## Tests
```powershell
npm test
npm run build
```

## Current limitations
- This is a **source-code starter**, not a packaged Windows installer.
- Save format is `.aas.json` (JSON); SQLite persistence is not implemented. A single local recovery draft is autosaved after edits; it is not a replacement for manually saving named projects.
- Folder import is recursive and can be slow for large collections. The import now reports per-file progress and supports cancellation; results are still returned together, and thumbnail processing is sequential.
- Thumbnail images are stored in Electron user-data cache; project JSON references original file paths. Moving source files or cache breaks previews. Reopening a named project checks source file existence and warns about missing files.
- Layout generation is deterministic and keeps input ordering; it does not yet match portrait/landscape orientation, rank hero images, detect duplicates, or avoid visual crop issues.
- Positive sheet-count targets are enforced exactly when feasible; impossible targets are rejected.
- Preview uses `object-fit: contain`, not final print rendering. The center guide is visual only.
- No full-resolution JPG, PSD, PDF exports, editor tools, licensing, packaging, or installer yet.
- No network upload is implemented. The dev server binds to 127.0.0.1.

## Security
Electron context isolation and limited preload IPC are enabled. Do not open untrusted project files; stricter schema and path validation is needed before commercial distribution.

## Recovery drafts
The Electron app saves one local recovery draft in its user-data directory after a short idle period. On next startup, choose **Recover album** or **Discard recovery** before new autosaving begins. Drafts contain local file paths and album metadata, not original photographs. Use **Save project** to create a durable named `.aas.json` project file. Recovery behavior requires Windows/Electron testing; GitHub commits alone do not verify it.

## Saved album library
The **Save to album library** action stores each album as an atomic local project record under Electron user data (`album-library`). **Saved albums** reopens records, while **Export project file** still writes portable `.aas.json` files. The library uses JSON, not SQLite yet; it never copies original photographs. The saved album selector updates an existing selected album. Local Windows/Electron validation remains necessary.

## Import progress and cancellation
While importing a folder, the workspace displays the number of processed photos and a cancellation control. Cancelling is cooperative: the current thumbnail finishes before the import stops. Successfully processed photos are retained. Folder discovery reports a scanning stage before the total is known. Progress is not a guarantee of constant speed.

## Large photo libraries
The photo browser shows up to 90 thumbnails per page and uses lazy image loading to reduce renderer load for 400+ photo collections. All imported photos remain in the album project and are still available to layout generation. This is pagination, not faster image decoding or parallel importing. The recursive import image-extension filter was corrected.

## Interactive editor history
Drag a photo onto a slot to replace or swap it. The sheet preview now includes **Undo** and **Redo** for photo-placement edits, with up to 40 undo states. History is in memory only, resets on album load/new generation, and is not persisted in saved project files. Saving an album stores the current edited sheets.

## Crop and zoom editor
Select a photo slot in the sheet preview to edit its zoom (1–3×), horizontal focus and vertical focus (0–100%). Reset crop returns to centered 1×. Each slot stores a `crop` object in the existing version-1 JSON project format; older projects without this field use centered defaults. Crop adjustments participate in Undo/Redo. This is a thumbnail-based preview; full-resolution print export must implement matching crop geometry before output can be considered print-accurate.

## 300 DPI JPG export (initial implementation)
After generating sheets, select **Export 300 DPI JPG sheets** and choose an output folder. The Electron main process uses Sharp to render the original source images at the configured physical sheet dimensions and 300 DPI, with saved crop zoom/focal settings. Export writes numbered JPEG sheets, reports progress, and refuses to overwrite existing output filenames. If export fails partway through, newly created sheets from that attempt are removed. Source photos must remain accessible. This output is flattened JPG only, not PSD or PDF. Print-production color profiles, full crop parity validation, bleed marks and Windows runtime testing remain pending.

### Export cancellation and safety
During JPG export, use **Cancel export** to stop after the current rendering operation; sheets already saved are retained and reported. Before rendering, the application checks all referenced source photo files and rejects output names that already exist. Files are created exclusively to prevent accidental overwrite. If rendering or writing fails, the exporter attempts to remove files created by that failed run. Cancellation is cooperative and cannot interrupt Sharp while one sheet is being rendered. Full Windows integration testing is still pending.

## PDF proof export
Choose **Export PDF proof (100 DPI)** to generate a multi-page PDF with one flattened RGB JPEG per album sheet. PDF page dimensions correspond to the physical sheet size in inches. The proof uses the original photos through the sheet renderer and includes saved crop settings, but is deliberately rendered at 100 DPI for review, **not for print production**. Export refuses to overwrite an existing PDF, reports progress and supports cooperative cancellation; cancelled or failed PDF files are removed. The app's 300 DPI JPG export remains separate. PDF viewer compatibility, Windows runtime verification and press-ready color management remain pending.

## Experimental layered PSD proofs
Use **Export layered PSD proof (72 DPI)** to create one PSD v1 RGB file per album sheet. Each placed photo is a separate raster layer with its saved crop and focal position; a flattened RGB composite is also embedded. The writer uses raw, uncompressed channel data and a conservative pixel limit. It does not yet offer Photoshop adjustment layers, editable smart objects, text, ICC color profiles, 300 DPI PSD, or a validated press-ready workflow. Files may be large. **Photoshop interoperability and full Windows integration have not yet been verified**; treat this as an experimental export and retain your .aas.json project. PSD export can be cancelled between sheets and refuses to overwrite existing filenames.
