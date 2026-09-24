/* ════════════════════════════════════════════════════════════════════════
   Vivodepot — Service Worker (D43 / U2-ADR-015, Etappe 8)
   ────────────────────────────────────────────────────────────────────────
   Auslieferungs-MECHANIK, KEIN Daten-Pfad. Echte Offline-Fähigkeit der
   gehosteten Mobil-Auslieferung (GitHub Pages).

   HARTE GRENZE:
   • Gecacht wird AUSSCHLIESSLICH die App-Schale: die eine HTML-Datei, das
     Manifest, die Icons (Icons sind inline/data: → reisen mit HTML/Manifest).
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
// v3 (U2-ADR-024): Schalen-Schnitt für U2-ADR-021/022/023 + Sammel-Fix-Cluster — ohne Bump
// erreicht eine schon installierte PWA die neue Schale NIE (cache-first; alte Schale bliebe).
// v4 (2026-07-03): a11y-Schnitt (Inline-Edit-Felder mit aria-label, vertiefter Topbar-Kontrast)
// + RC-Sammelstand — deployte PWAs bekommen die neue Schale erst mit diesem Bump.
// v5 (2026-07-04): Schema 24 (U2-ADR-045) — autoritative Original-Ablage + fhir-lab-Import.
// v6 (2026-07-05): Schema 26 (U2-ADR-050/051 — E1–E3 + Template-Code-Listen) + iOS/Desktop-Test-Runde
// (U2-ADR-052/053/054 — Wortlaut, Kosmetik, Wizard-Bugs). RC-Blocker „SW-Cache-Bump": ohne diesen
// Bump erreichen die Security-/Findings-Fixes deployte PWAs nie (cache-first). v1-RC-DoD §2.
// v7 (2026-07-05): „Ganzes Depot" in beide Türen (U2-ADR-058, 4a §4) — Gesamt-Exporte aus den
// Einstellungen in „Daten herausgeben"; JSON-Backup bleibt Wartung. UI-Schnitt → neue Schale.
// v8 (2026-07-05): Chooser-Bündel (U2-ADR-059) — Fachpfad-Schnitt (provider/beta raus aus Bereich-
// Einlese), Notfall-Stelle (Sidebar-Sicht + Karte/QR aus notfallKernModell), Karte/QR raus aus „Ganzes
// Depot". Nav-/Tür-Struktur → deployte PWAs brauchen die neue Schale.
// v9 (2026-07-06): Angehörigen-Modus fünf Situationsblätter (U2-ADR-060) — Notarzt raus (Notfall-Modus),
// Tod-Split → Beerdigung + Behörden/Nachlass (voller 23er erb_*-Satz), Meine Menschen eigenes Blatt,
// 7 Pflege-Delta-Felder. Read-only-Sicht-Struktur → neue Schale.
// v10 (2026-07-06): Datei-Speichern-Guard (U2-ADR-061) — Web-Share-Blatt nur auf Touch/Standalone;
// Desktop-WebKit (Safari/DuckDuckGo) nutzt jetzt den Download-Pfad (Downloads-Ordner) statt eines
// Teilen-Blatts ohne „In Dateien sichern". Transport-Schicht, keine Krypto.
// v11 (2026-07-06): Stufe-2-Vertrauens-Zugang (U2-ADR-062) — Owner-Setup „Vertrauensperson einrichten"
// (Einstellungen) + cache-only Vertrauens-Passwort-Eintritt, der Option B ersetzt (schwache Depot-PW-Tür
// zu); Schema 26→27, angehoerigenCache als Umschlag-Geschwister. Neue Kern-Sicht → neue Schale.
// v12 (2026-07-06): Startseiten-Eintritt „Als Angehörige öffnen" (U2-ADR-062-Nachlauf) — der starke
// Zugang muss im Ernstfall ohne Anleitung findbar sein; Overlay-Angehörigen-Modus (Vertrauens-Passwort-
// Primär, kein Owner-Öffnen-Knopf → keine Verwechslung). Welcome-Struktur → neue Schale.
// v13 (2026-07-06): finale Angehörigen-Krypto (U2-ADR-062) — PBKDF2 fest 600k, 200k-Browser-Fallback
// gestrichen, kein iterations-Feld mehr im Cache-Header (Cache-v2), Ladehinweis für langsame Geräte.
// v14 (2026-07-06): VP-Passwort-Härtung (Qwen-Angreifer-Review) — Live-Stärke-Balken + „schwach"-Blocker
// im „Vertrauensperson einrichten"-Dialog (passwortStaerke, analog zum Depot-Passwort).
// v15 (2026-07-06): Kosmetik — PDF-Fuß-Überlappung (Haftung↔Seitenzahl) behoben, Update-Knopf neutral
// („Nach Aktualisierung suchen"), Titel/BUILD_DATUM auf v1.0-rc/06.07., EUDI-Marker „(experimentell)".
// v16 (2026-07-06): EUDI-„Übergeben"-Knopf ausgeblendet (EUDIW_SICHTBAR=false) — Code bleibt, Reaktivierung
// bei EUDIW-Rollout; UI zeigt keinen EUDI-Export mehr, bis eine echte Wallet den Ausschnitt annimmt.
// v17 (2026-07-06): Feldtyp mehrfachauswahl (U2-ADR-063, Schema 27→28) — Checkboxen/Array; vollmachtsGrundlage
// darf mehrere Vollmacht-Arten tragen; Anzeige „, "-getrennt (nie roh); Migration Skalar→Array verlustfrei.
// v18 (2026-07-07): Vollmacht-liste-Record (U2-ADR-064, Schema 28→29) — erteilte Vollmachten als wiederholbarer
// Datensatz {Art·Person·Form·Ablageort} mit conditional Unterfeld + reaktiver Modal-Schicht; ADR-063 für
// vollmachtsGrundlage supersediert; Gate vollmacht_vorhanden bleibt; Migration Flach→Liste verlustfrei.
// v19 (2026-07-08): refMehrfach-Feldtyp (U2-ADR-065, Schema 29→30) — Vollmacht-bevollmaechtigter als
// Personen-Mehrfachpick gegen Register (Array {ref,override}, umsortierbar ↑/↓) + Vertretungs-Modus
// (gleichwertig/nacheinander, nur bei >1 Person) + Listen-Eintrag-Umsortieren; Migration Einzel→Array verlustfrei.
// v20 (2026-07-08): refMehrfach-Straffung (Namensfeld primär, kein „+ Neu"-Zweischritt) + Scroll-Halten + erben als refMehrfach (U2-ADR-065-Nachlauf, Schema 30→31).
// v21 (2026-07-08): refMehrfach-Bugfixes (U2-ADR-065-Nachlauf 2, kein Schema-Bump) — (1) getippte Namen werden
// beim Speichern zu Register-Personen (personFindenOderAnlegen, case-insensitiver Dedup; Freitext-only entfällt);
// (2) Widget rendert in Sektor-Feld (Erben) und Listen-Unterfeld (Vollmacht) identisch (breiten-unabhängiges Grid).
// v22 (2026-07-09): Personen-Widget nach UX-Spezifikation (Phase 1, kein Schema-Bump) — das Zwei-Felder-Widget
// (leeres Namensfeld über Register-Select) ersetzt durch EIN Combobox-Feld pro Person: Eingabe + Suche zugleich,
// weiche Live-Vorschlagsliste aus dem Register (kein System-Dropdown), stumme Neuanlage bei Blur (Dedup), ↑/↓
// Umsortieren rein im DOM (kein Sprung), Fokus ohne Auto-Scroll. Überall identisch (Erben + Vollmacht). Tap ≥44px.
// v23 (2026-07-09): Personen-Widget Nachbesserungen (UX-Spec-Zusatz 09.07., kein Schema-Bump) — (1) Neuanlage
// EXPLIZIT statt stumm: Vorschlagsliste zeigt „<Getipptes>" als neue Person anlegen; nur Tap darauf legt an (Dedup);
// Blur ohne Tap legt NICHTS an und verwirft neu getippten Freitext (_refmInsRegister legt am Save nicht mehr an);
// (2) Vorschlagsliste im verschachtelten Vollmacht-Modal: position:fixed (entkommt dem overflow-Clip), Feldbreite,
// kein Umbruch, z-index über allem — Erben-Feld unverändert.
// v24 (2026-07-09): Vorschlagsliste im Vollmacht-Modal lesbar (reiner Darstellungs-Fix, keine Logik) — Liste WÄCHST
// mit dem Namen (width:max-content, min=Feldbreite, max=Viewport; Ellipsis nur als Extremfall-Reserve) statt zu
// kürzen; klar als Auswahl erkennbar (kräftiger Rahmen+Schatten, Optionen mit Trennlinie, ≥44px, Anlege-Zeile
// abgehoben). Dazu modal-scoped: das eine Feld über die volle Breite, ↑↓× darunter (im Modal war es auf ~68px
// gequetscht → Name abgeschnitten). Erben-Sektorfeld bleibt einreihig/unverändert.
// v25 (2026-07-09): Regression-Fix Vorschlagsliste (cleanslate) — die position:fixed-Liste folgt dem Feld jetzt
// beim Scrollen/Resize (Scroll/Resize-Hörer, solange offen). Ohne das löste sie sich beim Fokus-Scroll bzw. auf
// iOS bei erscheinender Tastatur vom Feld und wirkte „weg". Anlage-Logik unverändert (byte-gleich zu 1ba69e3).
// v26 (2026-07-10): Personen-Widget auf Chip-Input-Konvention (UX-Spec Zusatz 2). Anlage-Zeile (Klickfalle)
// ENTFERNT; Neuanlage nur noch bewusst — Enter oder „Übernehmen"-Haken (beide Dedup via personFindenOderAnlegen).
// Tippen/Blur legen NIE an; unbestätigter Freitext wird beim Verlassen verworfen. Bestätigter Name trägt eine
// sichtbare „gesetzt"-Quittung (Salbei-Akzent) + Toast. Zeilen-Widget/↑↓×/Umsortieren unverändert. Kein Schema-Bump.
// v27 (2026-07-10): Personen-Zeile responsiv (iPhone-Fund) — bei ≤560px Feld volle Breite, Knopfgruppe ✓↑↓×
// darunter (Reihe 2), statt vier Elemente in EINE zu enge Reihe zu zwängen (das × rutschte aus dem tippbaren
// Bereich). Tap-Ziele ≥44px, nichts ragt aus dem Viewport; Desktop einreihig wie bisher. Reiner CSS-Fix.
// v28 (2026-07-10): Patientenverfügung-Wizard (pvwiz) auf die amtlichen BMJ-Textbausteine umgestellt +
// Dokument-Generator (reiner Zusammensteller, Wortlaut 1:1) + druckbares PV-Dokument (Print-CSS/Overlay).
// Neue additive pv_*-Felder (kein Schema-Bump); alte Grundhaltung verwaist. Bereich-8-Erfassung + Druck.
// v29 (2026-07-10): PV_BMJ Wortlaut-Korrekturen (SP-Diff gegen BMJ-PDF) — Organspende-Zustimmung voller
// amtlicher Text (endet auf „…, dann", Vorrang-Option schließt an, keine erfundene Einleitung; nur bei
// Zustimmung), Verbindlichkeit-Rollen 1:1 („… oder …", Punkt, „anderer Person: …"), Aktualisierung
// „(Zeitangabe)". Reine Quelltext-Korrekturen + eine Generator-Zeile (Vorrang-Anschluss).
// v30 (2026-07-10): Aktualisierung (2.14) — die Frist wird INLINE in den amtlichen Platzhalter
// „(Zeitangabe)" eingesetzt (der Baustein ist EIN Satz), der nachgestellte „Die bestimmte Zeit
// beträgt: …"-Zusatzsatz entfällt (wäre freie Überleitung). Ohne Eingabe bleibt der Platzhalter.
// v31 (2026-07-10): PV-Feinschliff — (1) Eingangsformel-Prefill aus den eigenen Personendaten
// (Bereich 1 „identitaet": Vorname/Nachname/Geburtsdatum/Anschrift), amtlicher Klammer-Platzhalter
// bleibt Fallback; (2) das erzeugte PV-Dokument auch aus der Vorsorge-Sektor-Sicht erreichbar
// (Knopf „als Dokument ansehen/drucken", sobald PV-Angaben vorliegen). Kein Schema-Bump.
// v32 (2026-07-10): Vorsorge-Sektor Darstellung geheilt (reine Anzeige) — Instrumente je eigene Sektion
// (Betreuungs-Split geheilt, Testament/Vollmacht/PV entmischt); Detailfelder an ihr „vorhanden?"-Gate
// gekoppelt (sichtbarWenn, nur bei ja/in Vorbereitung); verwaiste PV-Reste (patientenverf_haltung/_wunsch,
// palliativ_wunsch) aus dem Formular entfernt. organspende bleibt (Notfall-QR). Gate-Konsumenten + Schema unverändert.
// v33 (2026-07-10): betreuungsverfuegung-Gate um „in Vorbereitung" (plant) erweitert (wie Sorgerecht/
// Testament); Betreuungs-Detailfelder-sichtbarWenn auf ['ja','plant'], damit die Details auch beim Entwerfen
// sichtbar sind. ERKENNUNG bleibt (erfuellt=='ja', plant löst keinen Vorschlag aus). Rein additive Option.
// v34 (2026-07-11): PV-Dokument-Generator in den geteilten, typ-getriebenen Generator (Modul-Vertrag,
// U2-ADR-068 Teil 2) extrahiert — PV_MODUL als erste Instanz. Reiner Umbau: PV-Ausgabe byte-identisch
// (Golden-Fixture, 42 Zweig-Fälle), kein Schema-Bump, Gate-Konsumenten + Block-Pins unverändert.
// v35 (2026-07-11): KI-Verfügung „Mein digitales Weiterleben" als ZWEITE Generator-Instanz (U2-ADR-069):
// KI_KORPUS (verbatim v0-1) + kiwiz-Wizard + KI_MODUL → Testament-Anlage (§ 2247, Herkunftsanzeige,
// Nachlassverwalter über Personen-Ref). Engine generalisiert (sichtbarWenn für alle Blocktypen +
// fuellByWert/refByWert); PV-Ausgabe weiter byte-identisch. Alte ki_verhalten_*-Felder verwaisen.
// v36 (2026-07-11): Instrument-Modul-Registry (U2-ADR-070) — sechs Vorsorge-Dokument-Instrumente für Bild C.
// PV+KI voll (Generator), vier STRUKTURELL eingehängte Stubs (Vollmacht/Betreuung/Testament/Sorgerecht,
// generator:null, Korpus folgt). Vollmacht mehrfach (Option A, listeId vollmachten) + referenzZiele.
// Reine additive Registry (kein UI, kein Schema-Bump); Bild C konsumiert sie im nächsten Schritt.
// v37 (2026-07-11): Bild C (Weg β) — Vorsorge-Regal (sechs gleichrangige Instrument-Karten) + Cross-Sektor-
// Sichtbarkeit über additive Liste-Projektion (Bankvollmacht erscheint als Verweis-Karte in Finanzen; Zeiger,
// keine Kopie) + Weg-2-Navigation (Sprung zum Heimat-Record + „zurück zu <Herkunft>"). Die zwei bestehenden
// Filter (dokumentPanel/erkennungsVorschlaege) bleiben byte-gleich; PV byte-identisch; ENTWURF am Gerät.
// v38 (2026-07-11): Bild-C-Nachtrag (U2-ADR-071) — in Vorsorge ersetzt das Regal die generische TOC (Karten =
// Sprungmarken; Heimat-Karte = Anker, KI = Fremd-Sprung mit Rückweg; die anderen TOC-Sektoren unberührt).
// Titel-Umbruch (Sorgerechtsverfügung). STABILE Record-id je Listen-Eintrag (Schema 31→32, verlustfreie
// Migration) → Cross-Sektor-Verweise überleben Umsortieren + Record-Feinsprung (rec-<id>). PV byte-identisch.
// v39 (2026-07-11): Bild-C-Abschluss (U2-ADR-071) — Nicht-Instrument-Sektionen (z. B. Pflegewünsche) bekommen
// unter dem Regal eine schmale Sprungliste (generisch, keine Sonderfälle); so ersetzt das Regal die TOC
// vollständig, ohne dass eine Sektion ihre Sprungmarke verliert. Regal bleibt reine Instrument-Übersicht.
// v54 (2026-07-12): U2-ADR-079 — delegierter FHIR-IPS-Export (RelatedPerson + Provenance, vertretende
// Person als Autorin; Einwilligungs-Gabel am Export). Baut den Clean-Slate-Verlust (b16 RoleCode/
// RelatedPerson/Provenance) wieder ein.
// v55 (2026-07-13): U2-ADR-081 — FHIR-Provenance auch im Selbst-Fall (agent.who=Patient). Schließt den
// dritten/letzten Clean-Slate-Verlust (0.3 ADR-063); jedes IPS-Bundle trägt eine Zusammenstellungs-Provenance.
// v56 (2026-07-13): Firmenbezeichnung „GmbH (i.Gr.)" → „GmbH" (HRB 289273 eingetragen) — App-Fußzeile,
// Dokument-Füße (PV/KI), Anbieter-Zeile, Copyright-Header. PV-Golden lockstep nachgezogen. Nur Text.
// v57 (2026-07-13): Sichtbarer Build-Stempel im Fuß — SCHALEN_STAND (geladene Generation) + live gelesener
// SW-Cache-Name. Macht den Stale-SW-Fehler in einer Sekunde sichtbar. SCHALEN_STAND (vivodepot.html) IM
// LOCKSTEP mit diesem CACHE hochzählen.
// v58 (2026-07-13): CC-01 — PDF-Selbstverifikations-QR (Klartext-Leck, U2-ADR-077-Nachtrag) aus
// Gesamt- und Bereichs-Export entfernt. Shell-Bytes (vivodepot.html) geändert → Lockstep-Bump.
// v59 (2026-07-13): CC-02 — Datums-Plausibilität (Jahresbereich, nicht nur Format) an Feld/
// Speichern/Import/Generator. Shell-Bytes geändert → Lockstep-Bump.
// v60 (2026-07-13): CC-02-Korrektur — Datums-Untergrenze ist NICHT global (1900 hätte Testament-
// Verweise auf Belege Dritter/Grundbuch-Eintragungsdaten abgeschnitten). Jetzt pro Feld
// (feld.datumJahrMin); nur Geburtsdatum setzt 1900, alles andere fällt auf 1800 zurück.
// v61 (2026-07-13): Chip-Mechanik für Code-Slot-Felder (E1 Option C, Chip-Mechanik).
// allergien/medikamente/krankheiten sind jetzt Chip-Arrays statt Skalar; Schema 37→38. Terminologie-
// Listen unangetastet (kein neuer Code, keine Andockpunkte). Shell-Bytes geändert → Lockstep-Bump.
// v62 (2026-07-14): Speicherpfad-Fix für die Chip-Mechanik (Geräte-Befund 14.07.: „Woraus
// herausgeben?" sah frisch bestätigte Chips nicht). `_autoSaveWennFeld` kannte nur die alten
// data-edit*-Attribute (inkl. totem data-edit-code); Chip-Bestätigung/-Entfernen löste nie den
// Fold nach `data` aus. Fix: Chip-Container meldet sich per bubbelndem 'change' (wie das Personen-
// Widget/_refMehrfachVerdrahten), plus data-chip-eingabe im Blur-Pfad; flowHerausgebenZentral()
// faltet zusätzlich explizit vor dem Lesen (U2-ADR-011-Konvention, wie an ~13 anderen Stellen).
// v63 (2026-07-14): INV-9 (Testkonzept-Katalog) — ein Depot mit ungesicherten Änderungen darf nie
// kommentarlos verschwinden. Geräte-Befund: geheZuZuhause() (Sidebar „Zuhause" UND Notfallkarte-
// „Schließen" laufen beide darüber) prüfte in der echten Sitzung KEIN schliessenWarnungNoetig() —
// anders als der Topbar-Schließen-Knopf (flowAppSchliessen), der das schon immer tat. Fix:
// flowSchliessenWarnungEchteSitzung() nimmt jetzt eine Fortsetzung entgegen (statt hart auf
// flowTrotzdemSchliessen zu verdrahten); geheZuZuhause() ruft sie bei offenem Warnbedarf mit der
// eigenen Fortsetzung (zurück zu Welcome) statt direkt zu navigieren.
// v64 (2026-07-14): INV-9-Nachtrag — Geräte-Gegenprobe (v63) zeigte: die Warnung griff, aber
// „Schließen" auf der Notfallkarte rief weiter geheZuZuhause() auf und beendete damit die ganze
// Sitzung statt nur die Notfall-Sicht zu verlassen (ein Overlay-Schließen-Knopf muss das Overlay
// schließen, nicht die Sitzung). Fix: neue Funktion verlasseNotfall() (Modus zurück auf 'anker',
// aktiverSektorId/aktiveAnsicht unverändert) — n-schliessen ruft jetzt sie, nicht mehr
// geheZuZuhause(). Keine INV-9-Warnung nötig, da nichts verloren geht (reine Lese-Sicht ohne
// eigenen Schreibpfad). Audit: alle anderen geheZuZuhause-Aufrufer (Logo, Sidebar-Zuhause,
// Wizard-Abbrechen-Fallback, Angehörigen-„beenden") sind echte Sitzungs-Ausstiege — dort korrekt.
// v65 (2026-07-14): CC-08 — Bereichs-Modal-QR ERSATZLOS ENTFERNT (Spiegel zu CC-01/PDF-QR).
// bereichQrModell/bereichQrText/flowBereichQr weg; der Chooser-Knopf „Als QR-Code" (data-h-qr)
// ist raus. Grund: Klartext-„VDQR|…"-Rahmen für JEDEN Bereich (auch Gesundheit/Finanzen/
// Identität), den die native Kamera an eine Websuche weiterreicht statt an die App (Geräte-
// Befund) — ein Gesundheitsdaten-Abfluss an einen Fremd-Endpunkt. Verschlüsseln löst es nicht
// ohne einen zweiten niedrigschwelligen Schlüsselkanal (offene Frage für die E5-Entscheidung).
// Text-Einfüge-Weg in die Lese-App bleibt unverändert. Zerlegungs-Infrastruktur (qrTeilePacken)
// bleibt für den EUDIW-Pfad (aktuell ausgeblendet). qrTeileZusammensetzen entfernt (U2-ADR-085
// §5, 14.07.2026) — kein Aufrufer, die Wallet setzt mit eigener Implementierung zusammen.
// Kamera-Bau der Lese-App (getUserMedia/jsQR) ebenfalls entfernt, U2-ADR-085 §5: beide
// Erzeuger (PDF-QR, Bereichs-QR) waren bereits weg, der Kamera-Zugriff blieb ohne Zweck stehen.
// v68 (2026-07-16): Service-Worker-Update-Zustellung (Stufe 1+2). Reagiert auf
// den Geräte-Befund „Schale überlebt jeden Cache-Bump, nur harter Website-Daten-Löschen hilft":
// (1) registration.update() jetzt aktiv bei visibilitychange/focus (vivodepot.html) — zwingt den
// Browser, sw.js frisch zu prüfen, statt auf den nächsten Browser-eigenen Check zu warten. (2)
// controllerchange-Listener zeigt einen abweisbaren „Neu laden"-Hinweis, sobald ein neuer Worker
// die Kontrolle übernommen hat — KEIN automatischer Reload (ein offenes, ungespeichertes Depot
// darf nie mitten in der Sitzung umgeschaltet werden). Eine Unterscheidung verhindert den
// Fehlalarm beim allerersten Laden (Erst-Erwerb der Kontrolle via clients.claim() ≠ Update).
// (3) skipWaiting bleibt in Produktion ausdrücklich AUS (unverändert, s. install-Handler unten) —
// das bleibt der sichere Pfad gegen den Zwangs-Reload-Fall. v67 war ein reiner Harness-Bump
// (Layout-Fixes, siehe pages/sw.js dort) und hat diese Datei nie berührt; daher der Sprung v66→v68.
// Schale trägt SCHALEN_STAND=v68. Am Gerät zu prüfen: nach diesem Bump EINMAL Website-Daten
// löschen (der alte Worker kennt den neuen Mechanismus noch nicht), danach beim NÄCHSTEN Bump
// nur noch zum Tab zurückkehren — der Hinweis muss erscheinen, ohne dass hart gelöscht wird.
// v69 (2026-07-16): reiner Versions-Bump, KEINE Logik-Änderung — der zweite, eigentliche
// Testschritt für die Update-Zustellung (v68 lief bereits, jetzt: nur zum Tab zurückkehren,
// NICHT Website-Daten löschen. Wenn der "Neu laden"-Hinweis erscheint, greift der Fix).
// v482 (2026-08-31): Service-Worker-Update-Sackgasse — Geräte-Befund: eine sehr alte
// Installation (vor v68/a3e3fd5, 16.07.2026) trägt den Update-Zustellung-Mechanismus (registration.
// update() bei Fokus + Hinweis-Banner) selbst gar nicht; für so einen Stand kann kein künftiger
// Code mehr etwas tun (er lädt seine eigenen neuen Bytes nie — nur hartes Website-Daten-Löschen
// hilft, s. Bericht). Dieser Bump hilft NICHT dieser Alt-Population, sondern JEDER Installation AB
// dieser Version: ein neuer, gut sichtbarer Sofort-Check-Knopf in den Einstellungen
// ("einst-sw-pruefen" → _swSofortPruefen()) ruft registration.update() auf Zuruf auf, statt nur auf
// den nächsten Fokus-Wechsel zu warten. Kein Zwangs-Reload, keine IndexedDB-Berührung — derselbe
// Hinweis-statt-Zwang-Pfad wie bisher (skipWaiting bleibt aus). Shell-Bytes (vivodepot.html)
// geändert → Lockstep-Bump.
// v492 (2026-09-01): U2-ADR-190 — die Sackgasse aus v482 war Erkennung UND Aktivierung; v482 löste
// nur Erkennung. Aktivierung blieb an „null offene Clients" gebunden (skipWaiting nie gerufen,
// U2-ADR-015 Etappe 8) — ein neuer Worker wartet damit, solange irgendein Tab offen ist, selbst
// wenn nichts Ungespeichertes im Spiel ist. NEU: ein `message`-Handler ruft skipWaiting() — aber
// NUR auf ausdrückliche Anweisung der Seite, nie von selbst. Die Seite kennt
// `_ungespeicherteAenderungen` (derselbe Zähler, der Politik A/U2-ADR-103 trägt), der Worker
// nicht — darum entscheidet die Seite, der Worker gehorcht nur. Der Schutzgrund von U2-ADR-015
// Etappe 8 bleibt exakt erhalten: „skipWaiting bleibt aus" gilt weiter als DEFAULT, jetzt mit einer
// benannten, geprüften Ausnahme statt einer pauschalen Sperre. Nachträgliche ADR-Umbenennung
// (Nummernkollision dreier paralleler Sitzungen, von 2 nach Landereihenfolge neu
// vergeben) änderte vivodepot.html-Kommentare inhaltlich (Testtitel-/ADR-Verweise) — kein
// Verhaltens-, nur ein Beschriftungswechsel. Rebase auf u2-kanon v491 ( 2, 01.09.2026)
// — v488/v489 lokal übersprungen, direkt v491→v492 im Lockstep. Shell-Bytes geändert.
// v492 → v493 (02.09.2026): U2-ADR-206, Signier-Werkzeug merkt sich stehende Pfade — reiner
// tools/tests-Zug, keine Shell-Bytes geändert. Landepunkt-Marke auf Anweisung 2.
// v493 → v494 (02.09.2026): U2-ADR-202, Kinder-Liste — verborgenWenn-Live-Verdrahtung. Shell-
// Bytes geändert.
// v494 → v495 (02.09.2026): U2-ADR-207, Vor-Depot-Sprachmodul übersteht fremdes Depot. Shell-
// Bytes geändert.
// v495 → v496 (02.09.2026): U2-ADR-193 (BBK-Quellenangabe aktueller Stand) + U2-ADR-199
// (Organspende-Register-Feld). Shell-Bytes geändert (vivodepot.html + vivodepot-lesen.html).
// v496 → v497 (02.09.2026): U2-ADR-208, Sprachkennung fällt auf aktive Sprache zurück. Shell-
// Bytes geändert.
// v497 → v498 (02.09.2026): U2-ADR-209, Produkt-Trennung im geteilten internen Speicher —
// Auftrag, Vorrang. Shell-Bytes geändert (vivodepot.html).
// v498 → v499 (02.09.2026): zweiter Rebase dieses Zweigs auf v498. Landepunkt-Marke auf
// Anweisung 2.
// v499 → v500 (02.09.2026): U2-ADR-211, Sicherungsstand bekannt — persistiert statt
// Arbeitsspeicher-Variable. Rebase auf v499. Shell-Bytes geändert (vivodepot.html).
// v500 → v501 (02.09.2026): U2-ADR-212, Sichern-Knopf folgt Speicher-Modus — der Regelfall-Klick
// faltet im internen Modus intern, keine Datei mehr je Klick. Shell-Bytes geändert (vivodepot.html).
// v501 → v502 (02.09.2026): U2-ADR-217, Format-Tags Lese-App/Spezifikation nachgezogen — NUR
// vivodepot-lesen.html geändert, kein vivodepot.html-Byte. Bump trotzdem nötig: vivodepot-lesen.html
// ist Teil des ausgelieferten Dateisatzes (s. tools/testfassung-legen.js), der Service Worker
// liefert sie sonst weiter aus einem veralteten Zwischenspeicher aus (Nebenfund, s. U2-ADR-217 +
// U2-ADR-215).
// v502 → v503 (02.09.2026): U2-ADR-222, ein leeres Depot ist keine Sicherung — der unbedingte
// Anlege-Schreibversuch setzt sicherungsStand nicht mehr. Shell-Bytes geändert (vivodepot.html).
// v503 → v504 (02.09.2026): U2-ADR-224, Boot-Wettlauf behoben — der vorDepot-Zweig
// überschreibt den bereits gezeigten internen Passwort-Eintritt nicht mehr mit
// renderWelcome(), wenn dessen Konfigurationsdatei-Fehlschlag schneller auflöst als der
// Boot-Weg. Shell-Bytes geändert (vivodepot.html).
// v504 → v505 (03.09.2026): Speicher-Modell Stück 3, Produktentscheidung „ein Speichersymbol,
// das speichert, wenn ich drauf klicke" — der Sichern-Klick geht im internen Modus wieder immer
// über die Datei (U2-ADR-212s Falt-Entscheidung zurückgebaut). Sieben stehengebliebene
// Registerzahlen im Fließtext gestrichen, nicht korrigiert. Shell-Bytes geändert (vivodepot.html).
// v505 → v506 (03.09.2026): U2-ADR-220, der Sicherungsdatei-Namens-Hinweis verspricht nicht mehr,
// dieselbe Datei künftig zu ersetzen — das traf im Nicht-FSA-Zweig (Firefox/Safari) nie zu.
// Shell-Bytes geändert (vivodepot.html).
// v506 → v507 (03.09.2026): U2-ADR-219, Nachbau — plattformabhängiger Hinweis bleibt bei iOS,
// dokumentierter Verzicht auf Android-/Schreibtisch-Safari-Erkennung (nur ein Kommentar, kein
// Verhalten geändert). Shell-Bytes geändert (vivodepot.html).
// v507 → v508 (03.09.2026): Signierungs-Automatisierung Zug 1 — _signJWS bekommt in allen vier
// Trägern denselben Wächterhinweis-Kommentar (Hüllenschicht in tools/krypto-block-propagation-
// pruefen.js deckt die Funktion jetzt, kein Verhalten geändert). Shell-Bytes geändert
// (vivodepot.html + vivodepot-lesen.html).
// v508 → v509 (03.09.2026, U2-ADR-233): Original-Bytes bleiben roh, Erkennung bleibt dekodiert.
// „Original herunterladen" verliert kein führendes UTF-8-BOM mehr; die Erkennung selbst bleibt
// auf dem dekodierten Text, unverändert. Shell-Bytes geändert (vivodepot.html).
// v509 → v510 (03.09.2026, U2-ADR-235): der Sub-Depot-Umschlag wird je Kryptoversion
// vollständig geprüft und versionsecht zurückgeschrieben. Sechs Stellen nahmen unbedingt die
// V3-Form an; seit A345 (19.08.2026) liefert der allgemeine Speicherweg V4. Shell-Bytes
// geändert (vivodepot.html).
// v510 → v511 (03.09.2026, U2-ADR-236): Rahmen folgt Kontext. Sub-Depot-Farbe als Rand statt
// Fläche bei Sub-Depot-Karten-Knopf (D47-Rücknahme), Navigation und Fußzeile nachgezogen; Palette
// sechs auf acht (Schilf, Malve). Shell-Bytes geändert (vivodepot.html).
// v511 → v512 (03.09.2026, U2-ADR-238, u2-kanon-Seite): das Depot-Pillen-Menü schließt nicht mehr
// über den Fokus als Stellvertreter. macOS Safari fokussiert einen <button> beim Klick nicht —
// der vorige focusout+requestAnimationFrame-Weg verlor damit den Wettlauf gegen den echten click.
// Ersetzt durch pointerdown (Maus/Touch) + focusin (Tastatur), beide auf document. Shell-Bytes
// geändert (vivodepot.html).
// v511 → v512 (03.09.2026, U2-ADR-230, dieser Zweig): PBKDF2_ITERATIONS ändert sich nur über
// einen Sprung der kryptoVersion, nie an Ort und Stelle — zwei neue Wächter-Tests, zwei
// erklärende Kommentare außerhalb des gepinnten Krypto-Blocks (kein Block-Byte geändert, kein
// Verhalten geändert). Shell-Bytes geändert (vivodepot.html).
// v512 → v513 (03.09.2026, U2-ADR-237, u2-kanon-Seite): jede Feld-Änderung speichert jetzt still
// intern (kein Klick, keine Pille); der Zähler bezieht sich auf die interne Ablage, nicht mehr
// auf die Datei; die Datei wird ein eigener, seltener Menüpunkt ("Sicherungskopie erstellen").
// Nimmt U2-ADR-015s Prinzip "vier bewusste Save-Punkte, kein stilles Auto-Save" für die interne
// Ablage zurück — Produktentscheidung, an der Wirklichkeit auf WebKit/iPhone gescheitert.
// Shell-Bytes geändert (vivodepot.html).
// REBASE-MERGE auf 4c448412 (03.09.2026): beide Seiten trugen denselben Ausgangswert v512 UND
// denselben Endwert v513 — zwei disjunkte Bumps (230 dieser Zweig, 237 u2-kanon-Seite),
// v512+1+1=v514, nicht v513.
// v514 → v515 (03.09.2026): U2-ADR-241 (Verlustwege-Zug 2) — EXPORT_TOPF_B_FELDER
// trägt jetzt auch 'fim-json' (dieselbe Set-Referenz wie 'xoev-verwaltung', da beide dieselbe
// Mapping-Tabelle teilen). Die „Das wird herausgegeben"-Übersicht zeigte 19 Felder für FIM
// bisher als enthalten, obwohl der Builder sie nie schreibt — der Export selbst ist unverändert,
// nur die Übersicht sagt jetzt die Wahrheit. Shell-Bytes geändert (vivodepot.html).
// v515 → v516 (04.09.2026, U2-ADR-245): Sensibel-Schranke in logikModulPruefen
// — ein datenSchema-Eintrag, der ein sensibel:true-Feld adressiert, braucht dafür das
// ausdrückliche sensibelErlaubt:true, sonst wird das ganze Bundle zurückgewiesen.
// REBASE-MERGE auf 4e1ba7fa (04.09.2026): U2-ADR-245 (u2-kanon-Seite) und U2-ADR-247 (dieser
// Zweig) trugen beide denselben Ausgangswert v515 UND denselben Endwert v516 — zwei disjunkte
// Bumps, v515+1+1=v517, nicht v516.
// v516 → v517 (04.09.2026, U2-ADR-247, gehoben von einem drei Tage liegengebliebenen Zweig vom
// 01.09.2026): Sichern-Knopf-Klick verliert nicht mehr das Ziel, wenn beim Klick noch ein zweites
// Feld fokussiert ist; die Statuskarte zieht sofort nach dem Feld-Autosave nach, ohne
// Bereichswechsel. Der Fix trug damals die Kennung U2-ADR-186 — dieselbe Nummer, die am selben
// Tag durch eine Drei-Wege-Kollision über acht parallele Arbeitsbäume (s. Kommentar in
// tests/adr-readme-uebereinstimmung.test.js) neu vergeben wurde; die beiden anderen Ansprüche
// wurden umnummeriert (190, 194), dieser dritte blieb auf einem unlandierten Zweig liegen und
// wurde nie mit umbenannt. Shell-Bytes geändert (vivodepot.html).
// v517 → v518 (04.09.2026, REBASE-MERGE auf 9b6d5347, U2-ADR-244): das Anlegen selbst braucht
// keinen Speicherort mehr — im Regelfall (internerSpeicherModus() true) entfällt der
// Datei-Dialog vor depotAnlegen() vollständig; der Fallback (file://, kaputtes IndexedDB)
// bleibt unverändert. U2-ADR-245/U2-ADR-247 (u2-kanon-Seite, bereits additiv v515→v517
// aufgelöst) und U2-ADR-244 (dieser Zweig) trugen beide denselben Ausgangswert v515 — drei
// disjunkte Bumps, v515+1+1+1=v518, nicht v517. Shell-Bytes geändert (vivodepot.html).
// v518 → v519 (04.09.2026, REBASE-MERGE auf a84e8319): zeichneDokumentPdf/dokSignaturHTML
// kannten unterschriftZeilen nur als Bestandsform — unterschriftZeilen ist kein
// LOGIK_DOK_AUSGABE_SCHLUESSEL-Schlüssel, jedes eingelassene logikModul brach beim
// Signaturblock, nicht nur bei unterschrift:false (gefunden beim Bau von
// Referenzdepot-Modul-Template-2026-09-04.vivodepot). Die u2-kanon-Seite (bereits additiv
// v515→v518 aufgelöst, drei Bumps: U2-ADR-245+U2-ADR-247+U2-ADR-244) und dieser Zweig
// (eigener Bump v515→v516) trugen beide denselben Ausgangswert v515 — vier disjunkte
// Bumps, v515+1+1+1+1=v519, nicht v518. Shell-Bytes geändert (vivodepot.html).
// v519 → v520 (04.09.2026, U2-ADR-246, dieser Zweig): Situationen werden andockbar — das achte
// Einlass-Register (situationsModule/situationFeldDefinitionen, situationsModulPruefen,
// _situationsModuleAusDepotAnmelden, situationenAlle()). Dieser Zweig hatte unabhängig von den
// vier oben schon einmal v515→v516 gebumpt (eigener Ausgangswert v515, wie die anderen vier
// Bumps in dieser Kette) — additiv aufgelöst: fünf disjunkte Bumps ab v515, v515+1+1+1+1+1=v520,
// nicht v519 und nicht v516.
// v520 → v521 (04.09.2026, REBASE-MERGE auf 6bbb0779, U2-ADR-248, u2-kanon-Seite): Erbschein-
// Vorbereitungsauszug las `kinder` aus dem Sektor 'identitaet' statt 'meine-menschen' — auf
// beiden Lesepfaden (PDF/HTML, XML), gefunden beim Bau von Referenzdepot-Modul-Template-
// 2026-09-04.vivodepot. Dieser Zweig hatte unabhängig von den fünf Bumps oben schon einmal
// v518→v519 gebumpt (eigener Ausgangswert v515, wie die anderen fünf) — additiv aufgelöst:
// sechs disjunkte Bumps ab v515, v515+1+1+1+1+1+1=v521, nicht v520 und nicht v519. Shell-Bytes
// geändert (vivodepot.html).
// v521 → v522 (04.09.2026, REBASE-MERGE auf c2261621): u2-kanon-Seite (echtes U2-ADR-248,
// Erbschein-Kinder-Sektor, eigener Bump v520→v521) und dieser Zweig (U2-ADR-250, Assistenten
// werden andockbar, Paket 2a des Gerüst-Umbaus — ursprünglich ebenfalls als „U2-ADR-248"
// geschrieben, eigener Bump v520→v521, seit der Nummern-Kollision umbenannt) trugen beide
// denselben Ausgangswert v520 — zwei disjunkte Bumps, v520+1+1=v522, nicht v521. Shell-Bytes
// geändert (vivodepot.html: wizardsModule, wizardsModulPruefen, _wizardsModuleAusDepotAnmelden,
// wizardsAlle(), das neunte Einlass-Register).
// v522 → v523 (04.09.2026, Rebase auf 5923e47e, U2-ADR-249 .vdkey-Huelle-Allowlist berührt
// vivodepot.html nicht): der Lockstep-Wächter verglich gegen den vorherigen PUSH-Stand dieses
// Zweigs (ebenfalls v522), nicht nur gegen den Kanon-Ausgangswert — durch den Rebase tragen
// die Commits im neuen Bereich neue Hashes und berühren vivodepot.html erneut, ohne dass sich
// der Wert ändert. Kein neuer Inhalt, additiv trotzdem nachgezogen.
// v523 → v524 (04.09.2026, U2-ADR-251): Ereignis-Achse wird andockbar, das zehnte
// Einlass-Register (ereignisAchseModule, ereignisAchseModulPruefen,
// _ereignisAchseModuleAusDepotAnmelden, ereignisAchseFelderAlle()) — Paket 2b des
// Gerüst-Umbaus, wörtlicher Spiegel von U2-ADR-250.
// v528 → v529 (04.09.2026, NGO-Härtetest): unbekannter Icon-Name wird bei Bereich/Situation/Assistent jetzt benannt verworfen statt still übernommen.
// v528 → v529 (04.09.2026, U2-ADR-253 Nachtrag Teil 1/5, Bereichssatz): bereicheAlle() filtert Registry-Einträge jetzt nach bereichssatz, aber nur wenn ihre ID in BEREICH_IDS_EINGEBAUT steht — echte Dritt-Module bleiben unberührt.
// REBASE-MERGE auf bab7df3c (04.09.2026): die u2-kanon-Seite (Icon-Prüfung) und dieser Zweig (Bereichssatz) trugen beide denselben Ausgangswert v528 — zwei disjunkte Bumps, v528+1+1=v530, nicht v529.
// v530 → v531 (04.09.2026, U2-ADR-253 Nachtrag Teil 2/5, Personen-/Institutions-Verweis): entitaet/rolle/verweisZweck in die Andock-Erlaubnisliste aufgenommen — entitaet geschlossen auf vier Arten, rolle/verweisZweck bleiben offenes Vokabular. Echter neuer Inhalt oben auf v530, kein zweiter Bump auf v528 — v530+1=v531.
// v531 → v532 (04.09.2026, U2-ADR-253 Nachtrag Teil 3/5, gebündelter Rest): 16 restliche
// Schlüssel in die Andock-Erlaubnisliste aufgenommen, mechanisch wie Pro Teil 2.
// v528 → v529 (04.09.2026, U2-ADR-254): der Rechtsraum-Vorschlagswert kommt jetzt vom angedockten Modul statt hart DE, an zwei Instrument-Stellen.
// REBASE-MERGE auf d1166ebc (04.09.2026): dieser Zweig (U2-ADR-254, zuletzt additiv auf v532 aufgelöst) und die u2-kanon-Seite (gebündelter Rest, eigener Bump v531→v532) trugen beide denselben Ausgangswert v531 — v532+1=v533, nicht v532.
// v529 → v530 (04.09.2026, U2-ADR-255): xoev-verwaltung/fim-json erscheinen nur noch beim passenden Rechtsraum-Vorschlagswert.
// REBASE-MERGE auf d1166ebc (04.09.2026): zweiter Commit — nach der bereits erfolgten Aufloesung des ersten (v533) ist v533+1=v534, nicht v530.
// v534 → v535 (04.09.2026, U2-ADR-256): identitaetAnzeigename() ersetzt 21 unabhängige
// Namens-Kompositionskopien durch eine Funktion, Reihenfolge kommt aus dem neuen
// additiven Feld identitaet.familienname_zuerst.
// REBASE-MERGE auf bdefab2d (04.09.2026): dieser Zweig (U2-ADR-254, seither umbenannt auf U2-ADR-256) und die u2-kanon-Seite trugen beide denselben Ausgangswert v528 — nach der bereits erfolgten additiven Aufloesung auf der Kanon-Seite (s. o., v534) ist v534+1=v535, nicht v529.
// v535 → v536 (04.09.2026): U2-ADR-256 umbenannt (Nummernkollision mit zwei vergebenen, noch ungelandeten Nummern; war zuvor unter der Nummer 254 geführt) — keine Verhaltensänderung, nur der Bezeichner.
// v532 → v533 (04.09.2026, U2-ADR-253 Nachtrag Teil 4/5, NGO-Härtetest, DIESER Zweig): vorDepotKonfigurationAnwenden()
// prüft Kanal-B-Bündel zweimal mit Registrierung dazwischen — ein Assistent/Ereignis-Achse-Bündel
// sieht jetzt ein Bereich/Situations-Bündel aus demselben Stapel.
// REBASE-MERGE auf bdefab2d (04.09.2026): die u2-kanon-Seite (U2-ADR-254+255, bereits intern additiv
// v532→v534 aufgelöst, zwei Bumps vom selben Ausgangswert v532) und dieser Zweig (Teil 4, eigener
// Bump v532→v533) trugen beide denselben tieferen Ausgangswert v532 — drei disjunkte Bumps
// insgesamt, v532+1+1+1=v535, nicht v534 und nicht v533.
// REBASE-MERGE auf 4e3d7348 (04.09.2026): die u2-kanon-Seite (Identitaet-Anzeigekomposition U2-ADR-256
// + Umnummerierung, bereits intern additiv v534→v536 aufgeloest, zwei Bumps vom selben Ausgangswert
// v534) und dieser Zweig (Teil 4, eigener Bump v534→v535, s. o.) trugen beide denselben tieferen
// Ausgangswert v534 — drei disjunkte Bumps insgesamt, v534+1+1+1=v537, nicht v536 und nicht v535.
// v537 → v538 (04.09.2026): dieser Rebase loeste den ersten Commit (Teil 4) und den zweiten Commit
// (Korrektur: der additive Merge-Splice liess in vivodepot.html den oeffnenden Blockkommentar von
// heuteLokal mit dem SCHALEN_STAND-Zeilenkommentar verschmelzen, fehlender Zeilenumbruch nach
// „(v535)", die Kommentarprosa lief als Code, ladeKern() brach mit SyntaxError) NACHEINANDER auf —
// die Korrektur ist ein eigener, echter disjunkter Bump zusaetzlich zu den drei oben gezaehlten,
// v537+1=v538, nicht v537.
// v538 → v539 (04.09.2026): U2-ADR-257 — FORMAT_SCHREIBER neben FORMAT_LESER, die Schreibseite der Format-Module. Zwei Schreiber (json@1, xml@1), `schreiber` als optionaler Modul-Schlüssel mit `json@1` als Vorgabe (byte-identisch zum Stand 4e3d7348 belegt), `mime`/`endung` folgen dem Schreiber statt fest JSON zu behaupten; csv@1/vcard-erste@1 bewusst NICHT gebaut, die Lücke steht benannt in `_FORMAT_SCHREIBER_LUECKEN`.
// REBASE-MERGE auf dfe31362 (04.09.2026): die u2-kanon-Seite (U2-ADR-253 Nachtrag Teil 4/5 und die
// Splice-Korrektur, bereits intern additiv v536→v538 aufgeloest, zwei Bumps vom selben Ausgangswert
// v536) und dieser Zweig (U2-ADR-257, eigener Bump v536→v537) trugen beide denselben Ausgangswert
// v536 — drei disjunkte Bumps, v536+1+1+1=v539, nicht v538 und nicht v537.
// v539 → v540 (04.09.2026): U2-ADR-258 — die Herkunft eines Moduls erreicht den Empfaenger.
// Datensatz-Schluessel modulHerkunft, Segment im PDF-Fuss, sichtbarer Block in vier Lese-App-Sichten,
// unbekannt-Stand in der Kern-Anzeige.
// REBASE-MERGE auf a0abbf52 (04.09.2026): gemeinsamer Vorfahr dieses Merges ist dfe31362 mit v538 —
// NICHT v536 (dieser Wert gehoert zum bereits aufgeloesten Merge der Kanon-Seite eine Stufe frueher).
// Die Kanon-Seite (U2-ADR-257, v538→v539) und dieser Zweig (U2-ADR-258, v538→v539) trugen beide
// denselben Ausgangswert v538 — zwei disjunkte Bumps, v538+1+1=v540, nicht v539.
// REBASE-MERGE auf dfe31362 (04.09.2026): gemeinsamer Vorfahr (git merge-base) ist dfe31362 mit
// v538 — fuer den Kanon eine Stufe frueher bereits aufgeloest (v538→v540 oben). Der Kanon (zwei
// dort bereits verrechnete Bumps) und dieser Zweig (U2-ADR-260, eigener Bump v538→v539) trugen
// beide denselben Ausgangswert v538 — macht zusammen drei disjunkte Bumps seit v538,
// v538+1+1+1=v541, nicht v540 und nicht v539.
// v540 → v541 (04.09.2026, U2-ADR-266, dieser Zweig, vor Rebase): nach dem ersten bewussten
// Datei-Sichern erklärt ein zweiter Absatz im bestehenden Rückweg-Hinweis-Modal, dass die Datei
// verschlüsselt ist und das Passwort der einzige Schlüssel dazu ist. Shell-Bytes geändert
// (vivodepot.html).
// REBASE-MERGE auf 8292b457 (04.09.2026): der gemeinsame Vorfahr dieses Rebase ist a0abbf52 mit
// v539 (gemessen mit git merge-base, nicht aus der Nachricht übernommen). Die Kanon-Seite
// (U2-ADR-258, v539→v540) und dieser Zweig (U2-ADR-266, v539→v540) trugen beide denselben
// Ausgangswert v539 — zwei disjunkte Bumps, v539+1+1=v541, nicht v540.
// REBASE-MERGE auf 38de6ebc (04.09.2026, zweiter Rebase-Schritt dieses Zweigs): gemeinsamer
// Vorfahr (git merge-base) ist 8292b457 mit v540 — nicht v539, dieser Wert gehoert zum bereits
// aufgeloesten ersten Rebase-Schritt eine Stufe frueher. Die Kanon-Seite (U2-ADR-260-Landung,
// v540→v541) und dieser Zweig (U2-ADR-266, hier bereits als v540→v541 gefuehrt) trugen beide
// denselben Ausgangswert v540 — zwei disjunkte Bumps, v540+1+1=v542, nicht v541.
// REBASE-MERGE auf 39372460 (04.09.2026): gemeinsamer Vorfahr (git merge-base) ist 8292b457 mit
// v540. Die Kanon-Seite (U2-ADR-260-Landung + U2-ADR-266, bereits additiv v540→v542 aufgeloest,
// zwei disjunkte Bumps) und dieser Zweig (U2-ADR-267: Modul-Einlass unumkehrbar, eigener Bump
// v540→v541) trugen beide denselben Ausgangswert v540 — drei disjunkte Bumps,
// v540+1+1+1=v543, nicht v542 und nicht v541.
// v540 → v541 (04.09.2026, U2-ADR-267, dieser Zweig, vor diesem Rebase): die dauerhafte
// Modul-Zeile in den Einstellungen nennt bei situation, dass Eingaben nicht mehr erreichbar
// sind, wenn die Erweiterung fort ist (_modulTypUnwiederbringlichHinweis). Ein Bestaetigungs-
// Dialog vor dem Einlass war Teil des ersten Entwurfs, angehalten und nicht nachgebaut
// (04.09.2026: Gerüst und Modul werden PROVISIONIERT, nicht eingelassen — Produktentscheidung,
// 04.09. wörtlich; ein Dialog am Hand-Einlass hätte einen Pfad bewacht, den das Produkt nicht
// geht). vivodepot.html-Bytes geändert.
// v540 → v541 (04.09.2026): U2-ADR-269 (Auftrag A1) — Rollen-Vokabular gebaut, vier
// Rollen aus der Rollen-Vokabular-Erhebung vom selben Tag (zwei der ursprünglich sechs, geburts-
// datumFeld/ehepartnerFeld, vor der Landung verworfen — A4-Rechtsformen-Öffnung), geschlossene
// Liste bleibt geschlossen, instrumentTypUnterfeld erstmals in der Listenzeilen-Form.
// REBASE-MERGE auf 39372460 (04.09.2026): gemeinsamer Vorfahr (git merge-base) ist 8292b457 mit
// v540. Die Kanon-Seite trug seither zwei disjunkte Bumps (U2-ADR-260-Landung v540→v541,
// U2-ADR-266 v541→v542, bereits oben aufgeloest) und dieser Zweig einen eigenen (U2-ADR-269,
// v540→v541) — drei disjunkte Bumps insgesamt, v540+1+1+1=v543, nicht v542 und nicht v541.
// Details s. vivodepot.html.
// REBASE-MERGE auf ba826350 (04.09.2026): gemeinsamer Vorfahr (git merge-base) ist 39372460 mit
// v542. Die Kanon-Seite (U2-ADR-267, v542→v543) und dieser Zweig (U2-ADR-269, ebenfalls
// v542→v543, s. o.) trugen beide denselben Ausgangswert v542 — zwei disjunkte Bumps,
// v542+1+1=v544, nicht v543. Details s. vivodepot.html.
// v542 → v543 (05.09.2026, dieser Zweig): U2-ADR-263 — der PDF-Export prueft vor dem Erzeugen,
// ob die eingebettete Schrift jedes vorkommende Zeichen tragen kann (pdfZeichenOhneDeckung),
// sechs PDF-Erzeuger-Wege abgedeckt, kein stiller falscher Ersatz — benannter Abbruch statt
// lautlos verstuemmelter Bytes. vivodepot.html-Bytes geaendert.
// REBASE-MERGE auf eccda35e (05.09.2026): gemeinsamer Vorfahr (git merge-base) ist 39372460 mit
// v542 (echt gegen `git show 39372460:sw.js` nachgemessen, nicht aus einer frueheren Notiz
// uebernommen). Die Kanon-Seite (U2-ADR-267 + U2-ADR-269, bereits additiv v542→v544 aufgeloest,
// zwei disjunkte Bumps) und dieser Zweig (U2-ADR-263, eigener Bump v542→v543) trugen beide
// denselben Ausgangswert v542 — drei disjunkte Bumps insgesamt, v542+1+1+1=v545, nicht v544
// und nicht v543. Details s. vivodepot.html.
// v544 → v545 (05.09.2026, Kanon-Seite, U2-ADR-262 Handkopien-Waechter): in sw.js selbst nicht
// eigens kommentiert (nur der CACHE-Wert geaendert) — bestaetigt gegen `git show
// e097a5da:sw.js` und die SCHALEN_STAND-Zeile in vivodepot.html.
// REBASE-MERGE auf e097a5da (05.09.2026): gemeinsamer Vorfahr (git merge-base) ist eccda35e mit
// v544. Die Kanon-Seite (U2-ADR-262, eigener Bump v544→v545) und dieser Zweig (U2-ADR-278, eigener
// Bump v544→v545) trugen beide denselben Ausgangswert v544 — zwei disjunkte Bumps,
// v544+1+1=v546, nicht v545.
// v544 → v546 (05.09.2026, U2-ADR-278, dieser Zweig): `textsatzRegeln().sprachkennung` folgt
// jetzt dem tatsächlich gefundenen (Sprache, Rechtsraum)-Registry-Fach statt der Sprache allein —
// Details s. vivodepot.html.
// v546 → v547 (05.09.2026, REBASE-NACHZUG auf 9de4aabd): kein neuer Inhalt — reiner
// Rebase-Nachzug, weil der schalen-lockstep-Wächter beim Push gegen den zuletzt auf diesen
// Zweig gepushten Stand prüft (v546, `8f73bfc5`), nicht gegen den Kanon-Ausgangswert; 03s
// Landung (9de4aabd) berührte vivodepot.html/sw.js nicht. Details s. vivodepot.html.
// v544 → v545 (04.09.2026, U2-ADR-259 — Landung von a0s blockierter Arbeit,
// diese Sitzung, zweiter Anlauf nach Auffrischen auf den durch U2-ADR-269 gewachsenen Kanon):
// die zweite Angabe auf demselben Weg wie U2-ADR-258 — moduleVersion statt Herkunft, dieselbe
// EINLASS_REGISTER/MODUL_SLOTS-Leitung, dieselben vier Stationen. a0 hatte vollständig
// gemessen; a0s eigener Arbeitsbaum blieb wegen eines Auto-Mode-Gate-Fehlers auf 8292b457/v540
// stehen und kam nie an die Gate-Reihe. Diese Landung wendet a0s Patch frisch auf den
// aktuellen Kanon (eccda35e/v544) an, kein disjunkter Bump seither: v544+1=v545.
// REBASE auf 1f06067b (05.09.2026): gemeinsamer Vorfahr (git merge-base) ist eccda35e mit v544. Die Kanon-Seite (bereits additiv auf v547 aufgeloest -- U2-ADR-262 v544->545, U2-ADR-278 545->546, REBASE-NACHZUG auf 9de4aabd 546->547 ohne neuen Inhalt, s. o.) und dieser Zweig (U2-ADR-259, eigener Bump v544->v545, s. o.) trugen beide denselben Ausgangswert v544 -- vier disjunkte Bumps insgesamt, v544+1+1+1+1=v548, nicht v547 und nicht v545 (v548)
// // v549 → v550 (05.09.2026): U2-ADR-275: INSTITUTION_ART_EINGEBAUT fest verdrahtet statt aus
// INSTITUTION_ART abgeleitet, wie zuvor bei den vier Registern aus U2-ADR-253 Commit A — Rebase
// auf f7e5b052, dieser Zweig sitzt ohne eigene Commits direkt darauf, kein additiver Fall,
// v549+1=v550
// v545 → v549 (05.09.2026, dieser Zweig, U2-ADR-263): eigener Kern-Bump plus dokumentPdfBlob-
// Korrektur (A253-Fund, keine Aufrufer mehr) — zwei eigene Bumps ab v545, Details s. vivodepot.html.
// REBASE-MERGE auf a93df2a1 (05.09.2026): gemeinsamer Vorfahr (git merge-base) ist 1f06067b mit
// v547 (echt gemessen). Die Kanon-Seite (mehrere Landungen inkl. U2-ADR-259 + Tippfehler-Korrektur,
// zusammen v547→v550) und dieser Zweig (U2-ADR-263, zusammen v547→v549, s. o.) trugen beide
// denselben Ausgangswert v547 — fuenf disjunkte Bumps insgesamt (drei Kanon, zwei dieser Zweig),
// v547+3+2=v552, nicht v550 und nicht v549 + U2-ADR-279 (v553) + U2-ADR-282 (v554, Kanon-Seite)
// + U2-ADR-287 (v554, dieser Zweig) — REBASE-MERGE auf 85ba98cb (05.09.2026): gemeinsamer
// Vorfahr (git merge-base) ist v553, beide Seiten trugen denselben Ausgangswert — zwei
// disjunkte Bumps, v553+1+1=v555 + U2-ADR-285 (v555, Kanon-Seite) — REBASE-MERGE auf 642f335c
// (05.09.2026): gemeinsamer Vorfahr ist v554, beide Seiten trugen denselben Ausgangswert —
// zwei disjunkte Bumps, v554+1+1=v556, nicht v555 + U2-ADR-290 (v557, kein eigener Kommentar
// hier hinterlassen) + U2-ADR-294 (v558, Zehn-Register-Nachlese: renderSektor zieht angedockte
// sektor-zielende Assistenten jetzt selbst) + Rebase auf e0da39ff (05.09.2026): kein Kanon-
// Bump (U2-ADR-289 ließ die Schale bei v557), additiv trotzdem nachgezogen, weil der Push-Gate-
// Wächter strikt höher als den vorherigen Push-Stand dieses Zweigs verlangt (v559). Details s. vivodepot.html.
// REBASE-MERGE auf a773a7e0 (05.09.2026, U2-ADR-293-Zweig): gemeinsamer Vorfahr ist v557
// (U2-ADR-290). Kanon-Seite ging v557->v559 (s. o., zwei Schritte). Dieser Zweig ging isoliert
// v557->v559->v562 (gegen den damaligen Kanon-Stand e0da39ff/v557 gerechnet,
// bevor a773a7e0 landete) — v560/v561/v562 waren zum Zeitpunkt DIESES Rebase bereits von drei
// anderen, noch nicht gelandeten Zweigen beansprucht (-Zuteilung, nicht git-messbar).
// v562 -> v563, von zugewiesen und unmittelbar vor diesem Commit gegen den echten
// Kanon-Stand (a773a7e0/v559) nachgeschlagen, nicht nur übernommen.
// REBASE-MERGE auf 1cb3ae1a (05.09.2026, U2-ADR-293 Struktur-Invarianz-Zweig): v563 -> v565,
// von zugewiesen. Details s. vivodepot.html.
// REBASE-MERGE auf 73383edc (05.09.2026, U2-ADR-291, vierter Rebase-Schritt dieses Zweigs):
// gemeinsamer Vorfahr trug v565, Kanon zog in der Zwischenzeit selbst auf v566. Details s. vivodepot.html.
// Zweitvergabe (05.09.2026): v566 UND v567 zeitgleich von anderen Zweigen beansprucht -
// kollisionsfrei auf v568 gehoben, kein Inhalt geändert. REBASE-MERGE auf 813a2bdd (05.09.2026):
// Kanon zog auf v568, dieser Zweig (interner Nachtrag) auf v567 - v568+1=v569. Details s. vivodepot.html.
// U2-ADR-305 (05.09.2026, umnummeriert wegen Kollision mit dem echten U2-ADR-303 "der Aufrufer
// statt des Riegels"): ADR-301-Korrektur + hinweis-Feld bei Einlass-Ablehnungen — REBASE-MERGE
// auf 66e5e640: gemeinsamer Vorfahr trug v570, Kanon-Seite (U2-ADR-303, v570->v571, kein eigener
// sw.js-Kommentar hinterlassen) und dieser Zweig (v570->v571) — zwei disjunkte Bumps, v572, nicht
// v571. Details s. vivodepot.html.
// U2-ADR-292 E4 (05.09.2026): Cherry-Pick auf 2b142910 (v572 bereits vom obigen Zweig belegt) —
// v573. Details s. vivodepot.html.
// U2-ADR-311 Punkt 1 (05.09.2026): _katalogOptionen-Schnappschuss geschlossen, get optionen()
// statt fester Eigenschaft — v574 (eigener Bump, zeitgleich mit U2-ADR-307 unten beansprucht).
// U2-ADR-307 (05.09.2026): die Rechtsraum-Überlagerung für Feld-Fristen
// — ebenfalls v574, disjunkter Bump. REBASE-MERGE auf 199fc525: zwei disjunkte v574-Bumps,
// v574+1=v575, nicht v574. Details s. vivodepot.html.
// REBASE-MERGE auf c07332a7 (05.09.2026): gemeinsamer Vorfahr 199fc525 trägt v574. Kanon-Seite
// (U2-ADR-311, v574->v575, ein Bump) und dieser Zweig (U2-ADR-308: v574->v575 Bau, v575->v576
// Angleichen-Umbau, zwei Bumps) trugen beide v574 — drei disjunkte Bumps, v574+1+1+1=v577,
// nicht v576 und nicht v575. Details s. vivodepot.html.
// REBASE-MERGE auf 6d057fdc (05.09.2026): gemeinsamer Vorfahr c07332a7 trägt v575. Kanon-Seite
// (U2-ADR-312, WIZARDS/SEKTOREN-Landkarte, v575->v576, ein Bump) und dieser Zweig (bereits
// additiv v575->v577 aufgelöst, zwei eigene Bumps) trugen beide v575 — drei disjunkte Bumps
// insgesamt, v575+1+1+1=v578, nicht v577 und nicht v576. Details s. vivodepot.html.
// REBASE-MERGE auf b642674b (06.09.2026): gemeinsamer Vorfahr 6d057fdc trägt v576. Kanon-Seite
// (U2-ADR-308-Landung, v576->v578, zwei Bumps, s. o.) und dieser Zweig (U2-ADR-313-Nachtrag,
// v576->v577, ein Bump: zwei stille catch-Blöcke um textsatzNeuAnwenden() laut gemacht) trugen
// beide v576 — drei disjunkte Bumps insgesamt, v576+1+1+1=v579, nicht v578 und nicht v577.
// U2-ADR-399 (10.09.2026, Rebase-Landung, vom 06.09.): feld.<feldId>.vorschlaege
// nimmt die Traegerkette auf (feld.<traeger>/<feldId>.vorschlaege) — die UnterFeld-ID `art`
// war katalogweit doppelt vergeben und die flache Form konnte die beiden Vorschlagslisten
// nicht unterscheiden. REBASE-MERGE auf c98c34a8 (10.09.2026): gemeinsamer Vorfahr v650.
// Kanon-Seite („Zwei ungebaute Achsen", v650->v651) und dieser Zweig (v650->v651)
// trugen beide v650 — zwei disjunkte Bumps, v650+1+1=v652, nicht v651.
// U2-ADR-306: der Wizard-Ersetzer (v581). Details s. vivodepot.html.
// U2-ADR-284: Stellensatz — eine rechtsraumgebundene Bezugsstelle (v585).
// U2-ADR-326: generisches Auszugs-Tor + Beratungshilfe-Auszug (v587).
// U2-ADR-335: die Lese-App liest, sie prueft nicht — kein „geprueft" aus einem Depot-Feld (v595).
// U2-ADR-340: Verdeckungs-Zusicherung fuer die vier Zustandsbloecke (v600).
// U2-ADR-341b/c: SITUATIONEN real ins Buendel, Nachtrag Anker-Reparaturen (v604).
// U2-ADR-342: der Beleg bleibt im Depot — logikModule tragen ihn jetzt mit (v605).
// U2-ADR-344: BMJ-Dokumente hinter der Buendel-Anwendung (v607).
// U2-ADR-337/338/343: EN-Sprachmodul-Regelnkopf, VOLLMACHT_BMJ-Schluesselweg, 39 amtlich
// uebernehmbare Wortlaute mechanisch belegt (v608). U2-ADR-345: vier Dokumentmodule +
// STANDARD_VORLAGEN verlassen den nativen Block (v609). U2-ADR-346: fünf WIZARDS real ins
// Buendel (v610), vier rohe C1-Steuerzeichen im Buendel-Merge auf \u-Escape nachgezogen (v611).
// U2-ADR-348: bereichsErsatz — Struktur-Achse, Tausch statt Ergänzung (v613, v612 anderweitig belegt).
// U2-ADR-351: fünf Schriftgrad-Rollen-Token + erscheinungAnwenden, .sektion-titel an allen
// vierzehn Abschnitts-Überschriften (v616, Standzahl provisorisch — löst beim
// final auf).
// U2-ADR-354: „Weitere Bereiche" — eigenes Template-Verzeichnis in der Seitenleiste (v620).
// „blattformat": dreizehntes EINLASS_REGISTER (nach `erscheinung`), fünf
// Blatt-Zeichenfunktionen lesen es (v622).
// U2-ADR-363 (Zug 2, 07.09.2026): textLesen() faellt nicht mehr auf TEXTSATZ_EINGEBAUT zurueck (v623).
// „ohne Feststellung kein Vermerk, kein Vorgabewert" explizit im Kopf-Kommentar (v624).
// PRODID/PDF-Titel nennen das erzeugende Produkt (v625).
// U2-ADR-367 (Zug 3, Besitz-Zug): AB_WERK_TEXTSATZ_DE (vormals TEXTSATZ_EINGEBAUT) wird selbst
// zum deutschen Sprachmodul, Kern/Werkzeuge/Proben lesen nur noch ueber .texte (v629).
// U2-ADR-371 + U2-ADR-374: „Ihres Depots" statt „Ihres Vivodepots", Bestands-Wächter dagegen (v630).
// U2-ADR-375: der zweite Einlass zieht das Intervall nach, ausser die Buergerin hat abgeschaltet (v631).
//, Ab-Werk-Rangfolge (08.09.2026): logikModul bekommt dieselbe Drei-Stufen-
// Rangfolge wie textsatz — _logikModuleAlle(d) als einzige Lesestelle (v631).
// U2-ADR-384: Vivodepots eigene Marke wird Ab-Werk-Saat, brandingModulPruefen ohne Signatur (v632).
// U2-ADR-387 (Ab-Werk-Rangfolge, 08.09.2026): logikModul bekommt dieselbe Drei-Stufen-
// Rangfolge wie textsatz — _logikModuleAlle(d) als einzige Lesestelle (v631). Gemeinsamer,
// tabellengetriebener Wächter über alle Ab-Werk-Mechanismen (v632).
// U2-ADR-382 (Besitz-Zug): RECHTSRAUM_KATALOG wird selbst das deutsche Rechtsraum-Modul, ab Werk
// ohne Signatur gesaet, Weg A unangetastet (v634).
// U2-ADR-382-Nachtrag: umbenannt zu AB_WERK_RECHTSRAUM_DE (e2s Ab-Werk-Wächter-Konvention),
// totes Migrationswerkzeug entfernt (v635).
// U2-ADR-388: UX/Erscheinung gemessen vollstaendig, kein Ab-Werk-Artefakt aus sachlichem Grund
// (v636).
// U2-ADR-387-Nachtrag (08.09.2026, "Antwort ist (d)"): das Einbacken selbst — Sprache/Bereich/
// Logikmodul als markierte Regionen in vivodepot.html gebacken statt als Begleitdatei kopiert (v637).
// "Pro-Achse englisch" (08.09.2026): Konstanten-Ortswechsel gegen eine
// TDZ-ReferenceError im Ab-Werk-Boot-Seed.
// U2-ADR-421-Nachtrag (08.09.2026, "Pro-Produkt ersetzt statt ergänzt"): vierte Ab-Werk-Region
// AB_WERK_BEREICHS_ERSATZ + _abWerkVorlagenInsDepot. Fund im echten Browser:
// _bereichAusBuendelErzeugen braucht einen Label-Rückfall, sonst bricht renderSektor().
// Korrektur: der Rückfall lief vor dem Textsatz-Lauf und traf alle dreizehn nativen Sektoren —
// jetzt danach, nur wenn der Textsatz-Lauf nichts gefüllt hat.
// U2-ADR-398 (08.09.2026, "das gekuendigte Zimmer", kanon-Zweig): data.abWerkMitschrift
// schreibt die eingebackene Struktur beim Anlegen mit, lebendiges Ab-Werk gewinnt immer.
// Rebase-Zusammenführung dieser beiden Zweige (Standzahl-Kollision v639 aufgelöst,
// s. tools/standzahl-frei-pruefen.js).
// Pro-EN-Rubriken-Ruecknahme — bereichsErsatz-Sektoren bekommen den lebendigen
// Beschriftungs-Getter, den der Andock-Weg schon hatte (v641).
// W-8-Doppelerfassung (08.09.2026): finanzen.steuerid.label auf Plural,
// unterscheidet sich jetzt vom Unterfeld finanzen.steuerid/nr.label (v642).
// „Produkt ist eine Datei" (10.09.2026): s. SCHALEN_STAND-Kommentar in
// vivodepot.html (v659, nach dem Rebase auf VD43s gelandeten Stand v658) — dieselbe Sache,
// kein sw.js-eigener Inhalt geändert, nur der Lockstep-Stand nachgezogen.
// „notiz bleibt Notiz" (10.09.2026): vierter Kennung-Prüfer
// _istBereichsErsatzFeldKennung, s. SCHALEN_STAND-Kommentar in vivodepot.html (v650).
// Vorige — (10.09.2026): 56 Pro-Felder in die sieben Pro-Bereiche, dazu VD43s
// „367 ADRs"-Zug (interne Pfad-Verweise aus Kommentaren entfernt). Beide trugen unabhängig
// v648; beim Bündeln zusammengeführt und gemeinsam auf v649 gehoben (v649).
// „Vollimport ist kein Vollimport" (11.09.2026): der Rundlauf trägt jetzt
// 40 statt 3 Depot-Schlüssel, s. SCHALEN_STAND-Kommentar in vivodepot.html (v667 — v666 kollidierte
// beim Rebase mit A576, unabhängig auf demselben Stand vergeben).
// U2-ADR-402 (11.09.2026): die acht draußen bleibenden Vollimport-Schlüssel als eigene
// Entscheidung nachgetragen, s. SCHALEN_STAND-Kommentar in vivodepot.html (v668).
// Räumung Runde 2 (11.09.2026): eine Zurechnungs-Zeile weiter oben in diesem
// Kommentarblock umformuliert ("Entscheidung" → "Produktentscheidung") — kein
// eigener sw.js-Inhalt geändert, nur der Lockstep-Gate nachgezogen. Derselbe Stand v669
// war beim Rebase bereits unabhängig auf origin vergeben; dieser Kommentarzusatz selbst
// zählte danach erneut als Schalen-Änderung — zweiter Bump auf v670 (12.09.2026).
// Nutzer-Rückmeldung v1.0-rc.501 (12.09.2026): Einlesen-Wortlaut, Notfall-Zur-Eingabe-Verweis,
// Home-Signal auf der Marke, Speicher-Hinweis ohne Eigentums-Pathos — v671 kollidierte beim
// Landen mit einer anderen Sitzung, darum direkt auf v673 (12.09.2026).
// Die Palette folgt der Marke (13.09.2026): ein Vor-Depot-Branding-Modul faerbt nicht mehr nur
// die Kopfzeile, sondern die sechzehn Tokens, die Vivodepots Erscheinung tragen — Ton von der
// Marke, Helligkeit und Saettigung von der Rolle, jedes Textpaar durch die WCAG-Rechnung.
// s. SCHALEN_STAND-Kommentar in vivodepot.html (v680 — v679 war an denselben Stand vergeben und
// verbrannte, als die Kopfzeilen-Abweisung nachgebessert wurde: der Lockstep-Waechter vergleicht
// gegen HEAD und sah den ersten, nie gepushten Versuch).
// Lese-App bekommt denselben Branding-CSS-Hook wie der Kern (13.09.2026, KOORD5-Auftrag,
// U2-ADR-400-Nachtrag): _markeFarbeAnwenden() in vivodepot-lesen.html, Kontrast-Primitive
// woertlich aus dem Kern gespiegelt und ueber einen Huellen-Waechter gegen Drift gehalten.
// Nachtrag: die Lese-App-PALETTE folgt jetzt ebenso der Marke (KOORD5-Fund, direkter Nachbar
// U2-ADR-408) — fuenf eigene Rollen (_lesenPaletteAbleiten), nicht die gespiegelte Kern-Tabelle:
// --akzent traegt hier Modus-Bedeutung (anker/sub/notfall), keine Marken-Rolle.
// Nachtrag: KOORD5-Nachfrage zur Render-Reihenfolge beantwortet und als Kommentar festgehalten
// (kein Render-Einstieg zeichnet vor setModusFarbe() — nachgemessen, nicht angenommen).
// Drei Felder fuer die ZVR-Abschrift (13.09.2026): ab 01.10.2026 kann im Zentralen
// Vorsorgeregister der Dokumenttext selbst liegen, hinterlegt von einer Institution.
// s. SCHALEN_STAND-Kommentar in vivodepot.html (v688).
// Hinweis außerhalb des amtlichen Wortlauts ergänzt (15.09.2026, Report-before-Build): toter
// Bayern-Leitfaden-Link im BMJ-Patientenverfügung-Zitat, s. SCHALEN_STAND-Kommentar in
// vivodepot.html (v691).
// Lese-App SEKTOREN generiert statt handgetippt (17.09.2026), s. SCHALEN_STAND-Kommentar in
// vivodepot.html (v731). v731 doppelt vergeben, Sammelzweig zählt eigene Stände auf v734 hoch,
// s. dortiger Kommentar. Schnitt×Verschluss-Merge (18.09.2026): Schnitt (v734) und Verschluss
// (v743) brachten je ihre eigene Erhöhung, hier auf die gemeinsame v744 zusammengeführt —
// s. ausführlicher SCHALEN_STAND-Kommentar in vivodepot.html (v744).
const CACHE = 'vivodepot-shell-v794-k1';
// Feldtyp `verweis` (externe Adresse, nur https:) — Templates können jetzt auf ein amtliches
// Register o. Ä. zeigen (12.09.2026, KOORD5-Auftrag).
// Home-Icon-Abzeichen zurückgebaut, interner Toast entfernt, "Weitere Bereiche" in Klapp-
// Struktur (12.09.2026, KOORD5).
// Regal auf Zeilen umgebaut, Modus._setzeIntern rendert die Sidebar neu, Vorlagen-Generator
// auf Marken-Palette gezogen (12.09.2026, KOORD5).
// Sub-Depot-Akzent öffnet sich für freie White-Label-Hex-Werte, AA zur Laufzeit gerechnet
// statt nur für die acht benannten Töne nachgeschlagen (12.09.2026, Nutzer-Rückmeldung/KOORD5).
// „Zwei ungebaute Achsen" (10.09.2026): zwei neue Ab-Werk-Regionen
// (AB_WERK_BRANDING_PRODUKT, AB_WERK_RECHTSRAUM_PRODUKT), s. SCHALEN_STAND-Kommentar in
// vivodepot.html (v651).
// Vorige — „notiz bleibt Notiz" (10.09.2026): vierter Kennung-Prüfer
// _istBereichsErsatzFeldKennung (v650).

// Die App-Schale. Einzeln & tolerant gecacht (fehlende Einträge brechen den
// Install NICHT — z. B. wenn die Manifest-Entscheidung „inline" lautet und es
// keine separate manifest.webmanifest gibt).
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
  // KEIN automatisches skipWaiting — der Schalen-Wechsel ist ein bewusster Schnitt
  // (kein Datenbruch; IndexedDB bleibt ohnehin unberührt). Aktivierung über activate.
  // U2-ADR-190: die einzige Ausnahme läuft über den `message`-Handler unten, NIE von hier aus.
});

// U2-ADR-190 (2026-09-01) — bedingte Aktivierung: der Worker selbst kennt weder offene Tabs noch
// ungesicherte Änderungen — er gehorcht nur. Die Seite (kennt `_ungespeicherteAenderungen`,
// vivodepot.html) entscheidet, WANN diese Nachricht überhaupt gesendet wird; hier wird sie nur
// noch ausgeführt. Kein anderer Aufrufer als die Seite selbst — nichts im Netz/Cache-Pfad sendet
// diese Nachricht. Berührt weder Cache- noch IndexedDB-Logik.
self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
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
