# GTA6

## Engine

Dieses Projekt verwendet die **Unity Engine** für die Spieleentwicklung. Bei allen Aufgaben rund um Gameplay, Grafik, Physik, UI, Audio usw. die passenden Unity-Skills (`unity:*`) nutzen und Unity-Konventionen (C#, Assets-Struktur, ProjectSettings) befolgen.

## Qualitätsstandards für jedes neue Spiel/Projekt hier

Sobald ein konkretes Spiel/Projekt entsteht, von Anfang an folgendes einrichten statt die Unity-Standardeinstellungen zu belassen:

- **Render Pipeline**: URP (Universal Render Pipeline) als Standard für gute Grafik bei breiter Plattformunterstützung; HDRP nur wenn explizit High-End-PC/Konsole als Zielplattform gewünscht ist.
- **Kamera**: Cinemachine für flüssige, filmische Kameraführung statt einer starren Standardkamera.
- **Post-Processing**: Volume-Profile mit sinnvollem Bloom, Color Grading, Ambient Occlusion, Tonemapping als Basis-Setup.
- **Physik**: Unity Physics/Rigidbody-Setup mit realistischen Masse-/Reibungswerten statt Default-Werten; bei Fahrzeugen eine dedizierte Vehicle-Physik-Lösung (z. B. WheelCollider-Setup) statt einfacher Rigidbody-Kräfte.
- **Beleuchtung**: Baked/Mixed Lighting + Lightprobes statt nur einem einzelnen Directional Light ohne Schatten-/GI-Konfiguration.
- **Input**: Unity Input System (neues Paket) statt des alten Input-Managers.
- **Performance**: Occlusion Culling, LOD Groups und Sprite-/Texture-Atlasing von Anfang an mitdenken, nicht erst nachträglich.

Diese Punkte gelten als Mindeststandard, bevor an Feinschliff oder zusätzlichen Features gearbeitet wird.

## Deployment-Architektur (Vorbereitung – noch nicht umgesetzt)

Status: Nur geplant/dokumentiert. Es wurde noch kein Spiel, kein Workflow und keine Cloudflare-Ressource erstellt.

Ablauf, sobald es losgeht:

1. **Entwicklung**: Claude baut das Spiel im Repo, testet es selbst, erstellt einen Pull Request nach `main`. Der Nutzer merged ihn manuell.
2. **CI/CD**: Bei jedem Merge auf `main` veröffentlicht GitHub Actions automatisch auf Cloudflare (Workflow mit `wrangler`, analog zu `.github/workflows/cloudflare.yml` in `Andrejvrljic/Brawl`).
3. **Cloudflare-Infrastruktur**:
   - **Worker**: liefert die Spielseite (z. B. Unity-WebGL-Build) aus und beantwortet die API.
   - **Durable Object**: Multiplayer-Server über WebSocket.
   - **D1-Datenbank**: Konten, Fortschritt, Rangliste – wird vom Workflow automatisch angelegt, falls nicht vorhanden.
4. **Browser-Link**: `https://[spielname].dinnerboneagg.workers.dev`. Die Subdomain `dinnerboneagg` existiert bereits – **nur lesend verwenden, nie ändern oder löschen**.
5. **Secrets**: Zugangsdaten ausschließlich als GitHub Secrets (Repository ist öffentlich!), niemals im Code.
   - `CLOUDFLARE_API_TOKEN`
   - `ADMIN_CODE` (falls Admin-Funktionen existieren)
   - Weitere Secrets werden dem Nutzer vor dem ersten Deployment klar benannt, bevor sie gebraucht werden.
6. **Live-Test nach Veröffentlichung**: Nach dem Deploy warten, bis die neue Version online ist, dann Seite, Datenbank und Multiplayer prüfen, danach angelegte Test-Konten wieder löschen. Auf „fertig“ vom Nutzer: Status prüfen (alles grün?) und den Link mitteilen.

Hinweis zur Kombination Unity + Cloudflare: Für den Multiplayer-Teil braucht die Unity-WebGL-Build einen eigenen WebSocket-Client, der sich mit dem Durable Object verbindet (kein fertiges Unity-Netcode-Paket spricht nativ mit Durable Objects). Datenbankzugriffe (D1) laufen ausschließlich über die Worker-API, nie direkt vom Client aus.

### Entscheidung: Unity-Client + separater JS-Server (nicht wie Brawl)

Anders als bei `Andrejvrljic/Brawl` (dort ist das komplette Spiel in JavaScript/three.js geschrieben, Client und Durable-Object-Server teilen sich denselben Code) gilt hier:

- **Unity (WebGL-Build)** ist der Client: Grafik, Gameplay, Steuerung, Physik laufen in Unity/C#.
- **Durable Object** kann kein Unity/C# ausführen (Cloudflare Workers Runtime = JavaScript/V8). Die autoritative Multiplayer-Logik (Positionsvalidierung, Spielzustand, Matchmaking, Anti-Cheat-Prüfungen) muss deshalb **separat in JavaScript** für das Durable Object nachgebaut werden – es gibt keine gemeinsame Code-Basis wie bei Brawl.
- Konsequenz: Spielregeln/Berechnungen, die server-seitig autoritativ geprüft werden sollen, existieren **zweimal** – einmal in C# (Unity-Client) und einmal in JavaScript (Durable Object). Bei Änderungen an Spielregeln müssen **beide Seiten synchron gehalten werden**, sonst drohen Client/Server-Divergenzen (z. B. unterschiedliche Schadenswerte) oder Exploits.
- Die Unity-WebGL-Build spricht mit dem Durable Object über einen selbstgebauten WebSocket-Client (kein fertiges Netcode-Paket).
- D1-Datenbankzugriffe weiterhin ausschließlich über die Worker-API.
