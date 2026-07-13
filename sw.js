/* ════════════════════════════════════════════════════════════════════════
   Vivodepot — Service Worker (D43 / U2-ADR-015, Etappe 8) — PAGES-AUSLIEFERUNG
   ────────────────────────────────────────────────────────────────────────
   Auslieferungs-MECHANIK, KEIN Daten-Pfad. Echte Offline-Fähigkeit der
   gehosteten Mobil-Auslieferung (GitHub Pages).

   Diese Fassung liegt im Pages-Bundle (pages/) NEBEN der ausgelieferten
   vivodepot.html. Sie ist identisch in Logik zur Repo-Wurzel-sw.js und adressiert
   die Schale unter demselben Dateinamen `vivodepot.html` (U2-ADR-020, Weg 1: die
   Datei ist selbst der Pages-Einstieg, KEINE index.html-Kopie). Alle Pfade sind
   RELATIV → das Bundle funktioniert an jedem Unterpfad (z. B. https://<org>.github.io/<repo>/),
   ohne dass Scope oder Verweise angefasst werden müssen.

   HARTE GRENZE:
   • Gecacht wird AUSSCHLIESSLICH die App-Schale: die eine HTML-Datei (vivodepot.html),
     das Manifest, die Icons (Icons sind inline/data: → reisen mit HTML/Manifest).
   • NIE gecacht: Depot-Daten, IndexedDB-Inhalte, Templates, Bürger-Inhalte.
     Daten leben getrennt in IndexedDB; der SW berührt IndexedDB NICHT.
   • Kein erfundener Netz-Pfad für Inhalte (ADR-066). Der SW lädt keine Inhalte
     aus dem Netz nach — nur die Schale.

   VERSIONS-BUMP: Cache-Name trägt ein Versions-Suffix. `activate` löscht alle
   alten `vivodepot-shell-*`-Caches → sauberer Schnitt. Ein neuer SW erneuert NUR
   die Schale; IndexedDB bleibt unberührt (Daten liegen außerhalb jedes Caches).
   Schema-Migrationen der Daten laufen separat über IndexedDB-onupgradeneeded.
   ════════════════════════════════════════════════════════════════════════ */
'use strict';

// Cache-Name mit Versions-Suffix. Bei Schalen-Update HOCHZÄHLEN (v1 → v2 …).
// v3 (U2-ADR-024): Schalen-Schnitt für U2-ADR-021/022/023 + Sammel-Fix-Cluster. Diese pages/-Kopie
// ist mit der Wurzel-`sw.js` (Auslieferungsquelle) bewusst byte-logik-gleich zu halten.
// v4 (2026-07-03): a11y-Schnitt (aria-label-Felder, vertiefter Topbar-Kontrast) + RC-Sammelstand (s. Wurzel-sw.js).
const CACHE = 'vivodepot-shell-v57';  // v57 (2026-07-13): Harness gehoben auf cleanslate 0342d68 — 078/079/080/081 + Firma (GmbH) + Build-Stempel + Lockstep-Gate; Schale traegt SCHALEN_STAND=v57, Stempel muss v57/v57 zeigen. skipWaiting bleibt (nur Harness).  // v29 (2026-07-10): cleanslate 6ca648f — (Zusatz 6) Personen-Zeile responsiv: bei <=560px Feld volle Breite, Knopfgruppe ✓↑↓× darunter, damit das Loeschen-× am iPhone im tippbaren Bereich liegt (>=44px, nichts ragt aus dem Viewport); Desktop einreihig. Enthaelt weiter Zusatz 5 Chip-Input + Zusatz 4 Scroll-Nachfuehrung; skipWaiting bleibt

// Die App-Schale. Einzeln & tolerant gecacht (fehlende Einträge brechen den
// Install NICHT). Pages liefert vivodepot.html aus (U2-ADR-020, Weg 1); './' wird
// zusätzlich vorgehalten, damit ein Verzeichnis-Aufruf die Schale aus dem Cache bekommt.
const SCHALE = [
  './',
  './vivodepot.html',
  './manifest.webmanifest',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((cache) =>
      Promise.all(SCHALE.map((url) => cache.add(url).catch(() => undefined)))
    )
  );
  // NUR im iOS-TEST-HARNESS: skipWaiting — der neue SW aktiviert sofort, statt auf das
  // Schließen aller alten Tabs zu warten. So schlägt jede Test-Runde mit EINEM Neuladen durch
  // (der Produktiv-Stick behält den bewussten Schnitt ohne skipWaiting — das hier ist NICHT
  // für Produktion). IndexedDB bleibt unberührt; nur die Schale wird getauscht.
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const namen = await caches.keys();
    await Promise.all(
      namen
        .filter((n) => n !== CACHE && n.indexOf('vivodepot-shell-') === 0)
        .map((n) => caches.delete(n))   // alte Schalen-Versionen sauber entfernen
    );
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;                       // nur GET (Schale)
  let url;
  try { url = new URL(req.url); } catch (_) { return; }
  if (url.origin !== self.location.origin) return;        // NIE fremde Origins

  e.respondWith((async () => {
    // Cache-first für die Schale.
    const cached = await caches.match(req);
    if (cached) return cached;
    try {
      const net = await fetch(req);
      // Nur same-origin-Schale nachcachen (Navigation oder gelistete Schalen-URL).
      // KEIN Daten-Caching — IndexedDB ist strikt getrennt und wird nie berührt.
      const istSchale = req.mode === 'navigate'
        || SCHALE.some((s) => url.pathname.endsWith(s.replace('./', '')));
      if (net && net.ok && istSchale) {
        const cache = await caches.open(CACHE);
        cache.put(req, net.clone());
      }
      return net;
    } catch (err) {
      // Offline + nicht im Cache: für Navigationen die Schale ausliefern.
      if (req.mode === 'navigate') {
        const schale = (await caches.match('./vivodepot.html'))
                    || (await caches.match('./'));
        if (schale) return schale;
      }
      throw err;
    }
  })());
});
