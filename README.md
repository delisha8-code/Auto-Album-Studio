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
- Save format is `.aas.json` (JSON); SQLite persistence and autosave are not implemented.
- Folder import is recursive and can be slow for large collections. The import result returns all photos at once; progress/cancel is pending.
- Thumbnail images are stored in Electron user-data cache; project JSON references original file paths. Moving source files or cache breaks previews.
- Layout generation is deterministic and keeps input ordering; it does not yet match portrait/landscape orientation, rank hero images, detect duplicates, or avoid visual crop issues.
- The sheet count target is a preference, **not an exact locked count**.
- Preview uses `object-fit: contain`, not final print rendering. The center guide is visual only.
- No full-resolution JPG, PSD, PDF exports, editor tools, licensing, packaging, or installer yet.
- No network upload is implemented. The dev server binds to 127.0.0.1.

## Security
Electron context isolation and limited preload IPC are enabled. Do not open untrusted project files; stricter schema and path validation is needed before commercial distribution.
