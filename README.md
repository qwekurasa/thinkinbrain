# thinkinbrain

An offline idea journal with a 3D notebook, dictation, and a calendar.

This PWA follows thinkinbrain for iOS 2.12.3 and reuses its notebook mesh,
cover grain, and app icon. Create a journal, rotate and customize its cover,
write and edit ideas, browse the calendar, and use stars for pins, cover
finishes, and avatar pupils.

Ideas and settings stay in the current browser. After one online visit the
interface, editing, calendar, and local data work offline. Dictation uses
the browser speech engine and may require an internet connection. The iOS
camera avatar uses ARKit. Browser camera tracking is available when the
browser exposes its Face Detection API.

## Run locally

```sh
python -m http.server 8080
```

Open http://localhost:8080. To install on iPhone, open the HTTPS site in Safari
and choose Share → Add to Home Screen.

## GitHub Pages

Publish the root of the `main` branch in Settings → Pages. All assets use
relative paths and work under `/thinkinbrain/`.

Topics: `pwa`, `progressive-web-app`, `offline-first`, `idea-journal`,
`note-taking`, `productivity`, `speech-recognition`, `webgl`, `vanilla-javascript`.
