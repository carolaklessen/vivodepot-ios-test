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
const CACHE = 'vivodepot-shell-v71';  // v71 (2026-07-21): Harness gehoben auf cleanslate dc49a24 — U2-ADR-095 Passwort-Lebenszyklus. (1) Passwort-Wechsel-Flow, Einstellungen -> Abschnitt "Passwort". Das alte Passwort wird per vollstaendigem Entschluesselungs-Roundtrip geprueft (kein Hash-Vergleich); danach neue Salts, vollstaendige Neuverschluesselung, erst serialisieren dann schreiben. kryptoVersion bleibt 3, Krypto-Block byte-identisch. Vertrauens-Zugang und eingebettete Sub-Depots ueberleben den Wechsel (eigene Passwoerter, in der Suite belegt). (2) Verpflichtender Abschluss-Bildschirm: aeltere Fassungen der Depot-Datei bleiben mit dem ALTEN Passwort lesbar. (3) Notfall-Blatt zum Ausdrucken, ausschliesslich Leerfelder — die App setzt nirgends ein Passwort ein. Schale traegt SCHALEN_STAND=v71. AM GERAET ZU PRUEFEN — das ist der eigentliche Grund dieser Runde: Der Chromium-Nachweis lief mit einer Attrappe fuer den Datei-Dialog und sagt ueber iOS NICHTS. Auf iOS entsteht beim Speichern eine NEUE Datei statt eines In-place-Ersetzens; genau darauf zielt der Warntext. Zu pruefen: (a) Wechsel durchfuehren, Depot verlassen, mit dem NEUEN Passwort wieder oeffnen; (b) das ALTE Passwort darf die neue Datei nicht mehr oeffnen; (c) im Dateien-App nachsehen, ob die alte Datei daneben liegen blieb — und ob der Warntext das trifft; (d) falsches altes Passwort: Inline-Fehler, nichts gespeichert; (e) Wartezustand des Knopfes waehrend der zwei 600k-Ableitungen (am Telefon spuerbar); (f) Druckbild des Notfall-Blatts (Schreiblinien, kein Passwort darauf); (g) Vertrauens-Zugang nach dem Wechsel. Ausserdem in dieser Runde: die Lese-App-Korrekturen vom 21.07. (Vorsorge-Instrumente wurden in der Lese-App gar nicht angezeigt; eigener Wortlaut fuer eine Datei aus fremder Fassung). skipWaiting bleibt (nur Harness).  // v70 (2026-07-21): Harness gehoben auf cleanslate 90f3925 — Sammel-Stand seit v69. Overwrite-Fix Weg A (refMehrfach: ein Tastendruck in eine bestaetigte Zeile konnte die Referenz loeschen, jetzt data-refm-bestaetigt + Bestand-Fallback). Muster B Weg 1 (Fokus/Scroll/Vorschlagsliste bleiben bei fremder Listen-Aktion erhalten, focusout+relatedTarget statt focusin-Nullung). Autosave-Luecke geschlossen (refMehrfach-Felder loesten bislang keinen Speicher-Trigger aus). Vorsorge-Instrument-Liste Block 1 (U2-ADR-089: Vollmacht/Testament/PV/Betreuung/Sorgerecht/KI als eine geteilte Liste). Eingangsschirm Teil A+B: Logo/Sidebar-Knopf heissen jetzt "Depot verlassen" statt "Zuhause" (versprachen einen Ort im Depot, den es nicht gibt), und renderWelcome() raeumt jetzt selbst data+DOM ab, wenn eine echte Sitzung verlassen wird (vorher nur bei manchen Wegen, u.a. Logo/Sidebar gar nicht). Lese-App: gleiches Prinzip (entladen() jetzt zentral in renderWelcome()). Schale traegt SCHALEN_STAND=v70. Am Geraet zu pruefen (siehe iOS-Pruefliste): Muster-B-Fokusverhalten bei allen drei Listen-Aktionen (Hinzufuegen/Bearbeiten/Entfernen), Overwrite-Fix inkl. iOS-eigener Ausloeser (Autokorrektur/QuickType/Diktat), "Depot verlassen" zeigt den Willkommensschirm ohne Restdaten. skipWaiting bleibt (nur Harness).  // v69 (2026-07-16): Harness gehoben auf cleanslate f4e802d — reiner Versions-Bump, KEINE Logik-Aenderung. Dies ist der zweite, eigentliche Testschritt der Update-Zustellung: v68 lief bereits (nach einmaligem Website-Daten-Loeschen). Jetzt: nur zum Tab zurueckkehren, NICHT loeschen -- wenn der "Neu laden"-Hinweis erscheint, greift der Fix aus v68 (registration.update() bei Fokus + controllerchange-Banner). Schale traegt SCHALEN_STAND=v69.  // v68 (2026-07-16): Harness gehoben auf cleanslate a3e3fd5 — CC-Bauauftrag Service-Worker-Update-Zustellung (Stufe 1+2). Reagiert auf den Geraete-Befund "Schale ueberlebt jeden Cache-Bump, nur hartes Website-Daten-Loeschen hilft": (1) registration.update() jetzt aktiv bei visibilitychange/focus (vivodepot.html) -- zwingt den Browser, sw.js frisch zu pruefen, statt auf den naechsten Browser-eigenen Check zu warten. (2) controllerchange-Listener zeigt einen abweisbaren "Neu laden"-Hinweis, sobald ein neuer Worker die Kontrolle uebernommen hat -- KEIN automatischer Reload (ein offenes, ungespeichertes Depot darf nie mitten in der Sitzung umgeschaltet werden). Eine Unterscheidung verhindert den Fehlalarm beim allerersten Laden (Erst-Erwerb der Kontrolle via clients.claim() ungleich Update). (3) skipWaiting bleibt in Produktion ausdruecklich AUS (unveraendert); dieser Harness-SW behaelt skipWaiting weiterhin NUR fuer den Test-Zyklus. Schale traegt SCHALEN_STAND=v68. Am Geraet zu pruefen (ZWEI Schritte, siehe Bauauftrag): (a) einmalig Website-Daten loeschen, um v68 ueberhaupt zu laden (alter Worker kennt den neuen Mechanismus noch nicht) -- danach zeigt die Fusszeile "Schale v68"; (b) der EIGENTLICHE Beweis: nach dem NAECHSTEN Cache-Bump (v69) nur noch zum Tab zurueckkehren, NICHT loeschen -- der "Neu laden"-Hinweis muss erscheinen, ohne dass hart geloescht wird.  // v67 (2026-07-16): Harness gehoben auf cleanslate cb8a54b — fuenf Layout-/Abstands-Funde aus der Mac-Safari-Geraete-Abnahme (E2/H/E, 15.-16.07.). .liste-eintrag-zusammenfassung waechst (flex:1) + .liste-eintraege li gap space-2->space-3 (Name/Knopfgruppe klebten aneinander). .feld-ref-picker bricht jetzt unconditional um statt nur unter dem 760px-Viewport-Breakpoint (langer Institutions-/Personenname quetschte das Freitext-Feld auch auf breiten Desktop-Fenstern -- native <select>-Breite folgt der laengsten Option, nicht dem Container). .liste-eintrag-form .feld-zeile-sub steht jetzt unconditional als 1fr (Label ueber Feld) -- betraf sowohl das "Neuer Eintrag"-Modal als auch den verschachtelten Kind-Inline-Editor (dieselbe Klasse, ein Fund, kein Zufall zweier Einzelfaelle). .feld-hint traegt jetzt eigenen margin-bottom, unabhaengig vom umgebenden Kontext-Padding. Schale traegt SCHALEN_STAND=v67. Am Geraet zu pruefen: MENSCHEN-Zeile (Name+Knopf-Abstand, auch Konten/Fahrzeuge/Vollmachten), Pflegedienst-/Vermieter-ref-Widget bei langem Namen, Kind-/Institutions-Modal (Label bei Feld), Hint-Abstaende in Sozialversicherung/Gesundheit, Kind-Inline-Editor im Modal (nichts abgeschnitten). skipWaiting bleibt (nur Harness).  // v66 (2026-07-15): Harness gehoben auf cleanslate e9fcfe4 (+ 29587ee) — Sammel-Hub aus vier Mustern plus zwei CI-Fixes. E2 (D0-D4): Selbstbezug-Ausschluss in Personen-Vorschlaegen, Freitext-Felder (betreuung/tierarzt/geburt_hebamme/erb_notar) auf ref-Widget umgestellt (Weiche B), Situationsblatt-__neu__-Verdrahtung. Muster H: Wallet/Banken-Export-Label ehrlich formuliert, Sub-Depot-Kind-Link (Kinder-Liste -> flowKindSubDepotAnlegen), KI-Verfuegung umbenannt ("Mein digitales Weiterleben" -> "Verfuegung zur digitalen Nachbildung"). Muster D: sieben Hints von Behoerden-/Fremd-Anlass-Ton auf Vivodepot-eigenen Zweck umgestellt. Muster E: flex-wrap an .liste-eintraege li + dvh statt vh an .modal (Geraete-Abnahme steht noch aus, siehe CC_Bauauftrag_Muster_E). WCAG-2.2-AA: sechs Kontrast-Fundstellen auf 4.5:1 angehoben (Sidebar/Fusszeile-Cluster + Deckblatt-Platzhalter + quelle-tag). Ausserdem ein bislang unbemerkter Lese-App-Fehler behoben: feldWertText() kannte die seit v61 (Chip-Mechanik) geltende Chip-Array-Form von codeListe-Feldern (allergien/krankheiten/medikamente) nicht und zeigte "[object Object]" statt Klartext -- jede echte .vivodepot-Datei mit einem solchen Feld war seit dem 13.07. betroffen. Schale traegt SCHALEN_STAND=v66. Am Geraet zu pruefen: geburt_hebamme/erb_notar als ref-Widget (Dropdown+Override) statt Freitext, Sub-Depot-Knopf an der Kind-Zeile, Kontrast an Sidebar/Fusszeile, Lese-App zeigt Allergien-Chips als Text. skipWaiting bleibt (nur Harness).  // v65 (2026-07-14): Harness gehoben auf cleanslate 60b0cb1 — CC-08: Bereichs-Modal-QR ERSATZLOS ENTFERNT (kritisch, Spiegel zu CC-01/PDF-QR). bereichQrModell/bereichQrText/flowBereichQr + Chooser-Knopf "Als QR-Code" waren live in DIESER Harness und erzeugten fuer jeden Bereich (auch Gesundheit/Finanzen/Identitaet) einen Klartext-"VDQR|..."-Rahmen, den die native Kamera an eine Websuche weiterreicht statt an die App -- ein Gesundheitsdaten-Abfluss an einen Fremd-Endpunkt. Text-Einfuege-Weg in die Lese-App bleibt. Enthaelt weiter v64 (Notfallkarte-Schliessen-Fix) + v63 (INV-9) + v62/v61 (Chip-Mechanik). Schale traegt SCHALEN_STAND=v65. Am Geraet zu pruefen: Herausgeben-Chooser zeigt keinen QR-Knopf mehr, PDF/maschinenlesbar unveraendert. skipWaiting bleibt (nur Harness).  // v63 (2026-07-14): Harness gehoben auf cleanslate 6616bbe — INV-9-Fix (kritischer Geraete-Befund: "Schliessen" im Herausgeben-Chooser UND auf der Notfallkarte schloss das Depot OHNE Warnung, ungesicherte Aenderungen verloren). Root Cause: geheZuZuhause() pruefte in der echten Sitzung nie schliessenWarnungNoetig() -- jetzt wie der Topbar-Schliessen-Knopf gefixt. Enthaelt weiter v62 (Chip-Speicherpfad-Fix) + v61 (Chip-Mechanik, Schema 38, U2-ADR-083/084). Schale traegt SCHALEN_STAND=v63. Am Geraet zu pruefen: Aenderung eintragen -> Notfallkarte/Herausgeben-Chooser -> Schliessen -> Warn-Modal muss erscheinen, kein stiller Verlust. skipWaiting bleibt (nur Harness).  // v62 (2026-07-14): Harness gehoben auf cleanslate 135f9cb — Chip-Speicherpfad-Fix (Geraete-Befund: "Woraus herausgeben?" sah frisch bestaetigte Chips nicht, da der delegierte Autosave-Hoerer die Chip-Elemente nicht kannte). Enthaelt weiter v61 (Chip-Mechanik 70e9318, Schema 38, U2-ADR-083/084). Schale traegt SCHALEN_STAND=v62. Fix am Geraet erneut zu pruefen: Chip anlegen -> ohne Bereich zu verlassen -> Weitergeben -> Bereich muss erscheinen. skipWaiting bleibt (nur Harness).  // v61 (2026-07-14): Harness gehoben auf cleanslate 70e9318 — Chip-Mechanik fuer Code-Slot-Felder (allergien/medikamente/krankheiten, Schema 38, U2-ADR-083/084); enthaelt zusaetzlich 56f75fc (PDF-Selbstverif-QR raus), a616a44/6219fa5 (Datum-Plausibilitaet, Untergrenze pro Feld). Schale traegt SCHALEN_STAND=v61. DOM-Chip-Verdrahtung ist am Geraet noch zu pruefen (node-Suite deckt Logik, nicht DOM). skipWaiting bleibt (nur Harness).  // v57 (2026-07-13): Harness gehoben auf cleanslate 0342d68 — 078/079/080/081 + Firma (GmbH) + Build-Stempel + Lockstep-Gate; Schale traegt SCHALEN_STAND=v57, Stempel muss v57/v57 zeigen. skipWaiting bleibt (nur Harness).  // v29 (2026-07-10): cleanslate 6ca648f — (Zusatz 6) Personen-Zeile responsiv: bei <=560px Feld volle Breite, Knopfgruppe ✓↑↓× darunter, damit das Loeschen-× am iPhone im tippbaren Bereich liegt (>=44px, nichts ragt aus dem Viewport); Desktop einreihig. Enthaelt weiter Zusatz 5 Chip-Input + Zusatz 4 Scroll-Nachfuehrung; skipWaiting bleibt

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
