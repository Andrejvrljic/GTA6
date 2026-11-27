# GTA6

## Engine / Tech-Stack

Dieses Projekt wird **nicht mit Unity**, sondern wie `Andrejvrljic/Brawl` (und ECLIPSE) komplett in **JavaScript + three.js** entwickelt:

- Das Spiel läuft als 3D-WebGL-Anwendung direkt im Browser, ohne Installation, ohne separaten Build-Export.
- Die Spielsimulation (Bewegung, Kollisionen, Spielregeln, KI) wird als gemeinsamer JavaScript-Code geschrieben, der **identisch im Browser (Client) und im Cloudflare Durable Object (Server)** läuft.
- Begründung gegen Unity: Cloudflare Durable Objects führen nur JavaScript aus, kein C#. Mit Unity bräuchte man zwei getrennte Code-Basen (Unity/C# im Client, JavaScript im Server), die bei jeder Regeländerung synchron gehalten werden müssten – hohes Risiko für Client/Server-Divergenzen und Exploits. Mit reinem JavaScript entfällt dieses Risiko komplett, die Performance im Browser ist besser (kein schwerer WebGL-Export), und die Architektur passt 1:1 zum gewünschten Cloudflare-Deployment.
- Damit prüft der Server dieselbe Logik wie der Client → serverseitige Autorität möglich, Schummeln im Client bringt nichts (wie bei Brawl beschrieben).

## Qualitätsstandards für jedes neue Spiel/Projekt hier

Von Anfang an einrichten, nicht erst nachträglich:

- **Grafik**: three.js mit vernünftigem Lighting-Setup (nicht nur ein einzelnes Directional Light), Schatten, Post-Processing-Effekten (Bloom, Tonemapping) wo sinnvoll für den Stil.
- **Kamera**: weiche/gefederte Kameraführung (Lerp/Damping), keine starre 1:1-Kamera.
- **Physik/Kollisionen**: realistische, getestete Werte statt Platzhaltern; bei Fahrzeugen ein eigenes, nachvollziehbares Fahrphysik-Modell.
- **Code-Struktur**: gemeinsame Simulation (`shared/`-Code wie bei Brawl) strikt von Darstellung (Rendering, UI) und Netzwerk-Code trennen, damit Client und Server denselben Simulationscode nutzen können.
- **Performance**: Geometrie-/Textur-Wiederverwendung, Frustum/Occlusion-Culling, LOD wo nötig, besonders wichtig für Mobilgeräte im Browser.
- **Input**: einheitliches Input-Handling für Tastatur/Maus, Touch (Mobil) und ggf. Gamepad von Anfang an mitdenken.

## Deployment-Architektur (Vorbereitung – noch nicht umgesetzt)

Status: Nur geplant/dokumentiert. Es wurde noch kein Spiel, kein Workflow und keine Cloudflare-Ressource erstellt.

Ablauf, sobald es losgeht:

1. **Entwicklung**: Claude baut das Spiel im Repo, testet es selbst, erstellt einen Pull Request nach `main`. Der Nutzer merged ihn manuell.
2. **CI/CD**: Bei jedem Merge auf `main` veröffentlicht GitHub Actions automatisch auf Cloudflare (Workflow mit `wrangler`, analog zu `.github/workflows/cloudflare.yml` in `Andrejvrljic/Brawl`).
3. **Cloudflare-Infrastruktur**:
   - **Worker**: liefert die Spielseite (HTML/JS/Assets aus einem `public/`-Ordner) aus und beantwortet die API.
   - **Durable Object**: Multiplayer-Server über WebSocket, nutzt denselben Simulationscode wie der Client.
   - **D1-Datenbank**: Konten, Fortschritt, Rangliste – wird vom Workflow automatisch angelegt, falls nicht vorhanden.
4. **Browser-Link**: `https://[spielname].dinnerboneagg.workers.dev`. Die Subdomain `dinnerboneagg` existiert bereits – **nur lesend verwenden, nie ändern oder löschen**.
5. **Secrets**: Zugangsdaten ausschließlich als GitHub Secrets (Repository ist öffentlich!), niemals im Code.
   - `CLOUDFLARE_API_TOKEN`
   - `ADMIN_CODE` (falls Admin-Funktionen existieren)
   - Weitere Secrets werden dem Nutzer vor dem ersten Deployment klar benannt, bevor sie gebraucht werden.
6. **Live-Test nach Veröffentlichung**: Nach dem Deploy warten, bis die neue Version online ist, dann Seite, Datenbank und Multiplayer prüfen, danach angelegte Test-Konten wieder löschen. Auf „fertig“ vom Nutzer: Status prüfen (alles grün?) und den Link mitteilen.
