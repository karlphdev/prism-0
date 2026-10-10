# Credits

Open-source work this playground builds on.

- **Fluid simulation** (`src/webgl/Fluid.js`): ported from
  [PavelDoGreat/WebGL-Fluid-Simulation](https://github.com/PavelDoGreat/WebGL-Fluid-Simulation)
  by Pavel Dobryakov. MIT License.
- **Mesh gradient, fluted-glass rib distortion, Bayer dithering matrix**
  (`src/webgl/bg/meshGradient.glsl.js`, `flutedGlass.glsl.js`, `moire.glsl.js`):
  adapted from [Paper Shaders](https://github.com/paper-design/shaders) v0.0.81. Apache License 2.0.
  NOTICE: "Paper Shaders, Copyright 2026 Paper. Powered by Paper Shaders: https://shaders.paper.design"
- **Cosine palettes** (`src/webgl/palette.glsl.js`): technique by Inigo Quilez,
  https://iquilezles.org/articles/palettes/
- **3D simplex noise** (`src/webgl/noise.glsl.js`): Ashima Arts / Stefan Gustavson. MIT License.
- **Optical illusions** (peripheral drift, scintillating grid, moiré, log-polar tunnel):
  procedural GLSL written for this project from the known perceptual principles
  (no third-party images used).
- **Libraries**: three.js (MIT), postprocessing by pmndrs (Zlib), GSAP (Standard
  "no charge" license), Lenis (MIT), lil-gui (MIT).
