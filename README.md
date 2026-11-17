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
- Folder import is recursive and can be slow for large collections. The import result returns all photos at once; progress/cancel is pending.
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
