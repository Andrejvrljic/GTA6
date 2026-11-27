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
