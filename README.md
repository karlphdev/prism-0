# PRISM/0 — 3D Playground

Page de test WebGL : objet 3D interactif, scroll infini, effets visuels réagissant à la souris.

## Lancer

```bash
cd ~/Desktop/PRISM-0
npm start          # (si node_modules manque : npm install d'abord)
```

- **v2** (couleurs saturées, fluide, illusions) : http://localhost:5173/
- **v1** (éditoriale, clair/sombre) : http://localhost:5173/v1/

Lien v1 / v2 en haut à droite de chaque page. Ajouter `#debug` à l'URL pour le panneau de réglages.

## Structure

- `src/` : v2 · `v1/src/` : v1
- Couleurs et effets par chapitre : `src/scroll/chapters.js` (et `v1/src/scroll/chapters.js`)
- Sources open source et licences : `CREDITS.md`

Stack : Vite, three.js, postprocessing, GSAP, Lenis.
