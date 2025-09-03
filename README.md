# 🫧 Liquid Glass Demo - Elastic glassy aesthetic
[Link to the Live Demo](https://afvliquidglass.netlify.app/)

A tiny Next.js app showcasing a “Liquid Glass” effect around text with mouse/touch elasticity, smooth text transitions, and a procedural swirl background 🫧

---

### Table of Contents

- [Features](#features)
- [Screenshots](#screenshots)
- [Installation](#installation)
- [Usage](#usage)
- [Technologies](#technologies)
- [Project Structure](#project_structure)
- [Future Enhancements](#future_enhancements)
- [License](#license)

---
<a id="features"></a>

## ✨ Features

- Liquid glass container that auto-sizes to content and balances multi-line text.
- Smooth transitions between different text contents; responsive sizing using dv units.
- Mouse/touch-driven elasticity when hovering the UI container.
- Procedural swirl background rendered with simplex-noise and additive bloom.
- Completely responsive UI.

---
<a id="screenshots"></a>

## 📷 Screenshots

<p align="center">
	<img src="./images/liquidglass.gif" alt="Desktop demo" />
  
</p>

---
<a id="installation"></a>

## Installation

1. **💾 Clone the repository:**

   ```sh
   git clone https://github.com/ferni2768/liquidglass.git
   ```

2. **📂 Navigate to the project directory:**

   ```sh
   cd liquidglass
   ```

3. **📦 Install dependencies:**

   ```sh
   npm install
   ```

4. **▶️ Start the development server:**

   ```sh
   npm start
   ```

---
<a id="usage"></a>

## Usage

- Click/touch anywhere on the screen to traverse though the different text contents of the app.
- Watch how the liquid glass container refracts and bends light under it.
- Hover the liquid glass container to reveal an elastic effect.
- Learn information about this effect.

---
<a id="technologies"></a>

## 🤖 Technologies

- **Next.js**: App Router, server-side rendering, and modern React features.
- **React & React DOM**: Core libraries for building the UI.
- **TailwindCSS**: Utility-first CSS framework for fast, responsive styling.
- **liquid-glass-react**: Library that allows basic liquid glass behaviour.
- **Simplex-Noise**: Generates smooth noise (used for background).

---
<a id="project_structure"></a>

## 🏗️ Project Structure

```
liquidglass/
├── src/
│   └── app/
│       ├── globals.css                 # Styles + helpers for the effects
│       ├── layout.js                   # Root layout
│       ├── page.js                     # Home page composing the demo
│       ├── components/
│       │   ├── LiquidGlassContainer.js # Glass wrapper, sizing + elasticity
│       │   ├── SwirlBackground.js      # Canvas-based noise background
│       │   └── TextTransition.js       # Click-to-advance text slides
│       └── lib/
│           └── viewport.js             # Visual viewport helpers (dv units)
├── public/                             # Public assets like the app logo
├── images/                             # README images
├── package.json                        # Dependencies & scripts
└── README.md                           # Project docs
```

---
<a id="future_enhancements"></a>

## 🔮 Future Enhancements

- Sandbox: tweak blur, refraction, elasticity, and colors.
- More background animations.
- Additional texts explaining the effect.
- Mobile/perf presets and reduced-motion mode.

---
<a id="license"></a>

## 🔑 License

This project is licensed under the [MIT License](LICENSE).