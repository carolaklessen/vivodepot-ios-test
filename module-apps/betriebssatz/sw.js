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
// v61 (2026-07-13): Chip-Mechanik für Code-Slot-Felder (E1 Option C, CC-Auftrag Chip-Mechanik).
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
// v68 (2026-07-16): CC-Bauauftrag Service-Worker-Update-Zustellung (Stufe 1+2). Reagiert auf
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
// v482 (2026-08-31): CC-Auftrag Service-Worker-Update-Sackgasse — Geräte-Befund: eine sehr alte
// Installation (vor v68/a3e3fd5, 16.07.2026) trägt den Update-Zustellung-Mechanismus (registration.
// update() bei Fokus + Hinweis-Banner) selbst gar nicht; für so einen Stand kann kein künftiger
// Code mehr etwas tun (er lädt seine eigenen neuen Bytes nie — nur hartes Website-Daten-Löschen
// hilft, s. Bericht). Dieser Bump hilft NICHT dieser Alt-Population, sondern JEDER Installation AB
// dieser Version: ein neuer, gut sichtbarer Sofort-Check-Knopf in den Einstellungen
// ("einst-sw-pruefen" → _swSofortPruefen()) ruft registration.update() auf Zuruf auf, statt nur auf
// den nächsten Fokus-Wechsel zu warten. Kein Zwangs-Reload, keine IndexedDB-Berührung — derselbe
// Hinweis-statt-Zwang-Pfad wie bisher (skipWaiting bleibt aus). Shell-Bytes (vivodepot.html)
// geändert → Lockstep-Bump.
const CACHE = 'vivodepot-shell-v486';

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
