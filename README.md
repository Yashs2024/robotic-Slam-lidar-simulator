<div align="center">

# 🤖 SLAM & LiDAR Simulator

**An interactive, browser-based educational simulator for teaching SLAM, LiDAR raycasting, and autonomous robot navigation.**

[![Built with Vite](https://img.shields.io/badge/Built%20with-Vite-646CFF?style=for-the-badge&logo=vite)](https://vitejs.dev/)
[![Vanilla JS](https://img.shields.io/badge/Vanilla-JavaScript-F7DF1E?style=for-the-badge&logo=javascript)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Chart.js](https://img.shields.io/badge/Chart.js-FF6384?style=for-the-badge&logo=chart.js&logoColor=white)](https://www.chartjs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](./LICENSE)

</div>

---

## 🌐 Unified Landing Page

The suite now features a premium, robotic‑themed **landing page** that introduces all three simulators (SLAM, NEXUS, HIVE) in a single, cohesive UI. Users start at this page, click **Get Started**, and are taken to a mock login (handled centrally). After login, a **hub** lets you choose which simulator to launch.

- **Hero Section** with animated 3‑D robot SVG and glowing orbit rings.
- **Simulator Overview Cards** for SLAM, NEXUS, and HIVE.
- **Glass‑morphism login** that accepts any credentials.
- **Hub** with clean navigation to each simulator.

### NEXUS Engine Direct Load

The NEXUS simulator now skips the previous "Choose your simulator" hero selection. After the loading screen finishes, the engine initializes automatically, presenting the kinematics and swarm modules directly.

---

## 🗺️ What Is This?

SLAM (**Simultaneous Localization and Mapping**) is one of the most important concepts in modern robotics. This project lets students *see* every step of the process in real time — no PhD required.

A differential-drive robot equipped with a 2D LiDAR sensor explores a 2D arena. As it drives, it builds an **occupancy grid map** of its environment from scratch — just using the noisy distance measurements from its rotating laser. You can set goals, watch it navigate autonomously with **A\* pathfinding**, draw your own obstacles, and see everything reflected in live charts and a fog-of-war map.

---

## 🚀 Features

| Feature | Description |
|---|---|
| 🔴 **LiDAR Raycasting** | Up to 360 rays/frame using precise line-line intersection math |
| 🗺️ **Occupancy Grid SLAM** | Builds a "believed" map in real-time from noisy sensor data |
| 🌫️ **Fog of War Vision** | SLAM map starts dark; explored areas are permanently revealed |
| 🤖 **Collision Physics** | Robot cannot pass through walls (circle-line boundary detection) |
| 🧭 **A\* Autonomous Navigation** | Click anywhere on the SLAM map to set a goal; robot drives itself |
| 🏗️ **Interactive Build Mode** | Draw custom walls and obstacles directly on the canvas with your mouse |
| 📊 **Live Sensor Data Chart** | Real-time polar area chart of all 360 LiDAR measurements |
| 🎛️ **Full UI Controls** | Sliders for noise, speed, and ray density; Drive/Build mode toggle |

---

## 🎓 Learning Objectives

This simulator is ideal for **3rd-year robotics and automation students** covering:

- **LiDAR / Range Sensor Fundamentals** — how 2D rotating laser rangefinders work
- **Sensor Noise Modelling** — observe how Gaussian error corrupts measurements
- **Occupancy Grid Mapping** — understand probabilistic free/occupied cell voting
- **SLAM Concepts** — see how a map emerges from sensor data and odometry
- **Path Planning** — visualise A\* searching the robot's own internal map
- **Robot Kinematics** — differential-drive with forward/angular velocity control

---

## 🛠️ Tech Stack

- **[Vite](https://vitejs.dev/)** — Ultra-fast dev server and build tool
- **Vanilla JavaScript (ES Modules)** — Zero front-end framework overhead for maximum performance
- **HTML5 Canvas API** — Multi-layer composited rendering at 60fps
- **[Chart.js](https://www.chartjs.org/)** — Live polar-area sensor data chart
- **CSS Custom Properties** — Premium dark-mode design system

---

## 📦 Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **npm** ≥ 9

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/YOUR_GITHUB_USERNAME/slam-lidar-simulator.git

# 2. Navigate into the project
cd slam-lidar-simulator

# 3. Install dependencies
npm install

# 4. Start the development server
npm run dev
```

Open your browser at **http://localhost:5173** and start exploring!

---

## 🎮 How to Use

### Drive Mode (Default)

| Control | Action |
|---|---|
| `W` | Move Forward |
| `S` | Move Backward |
| `A` | Rotate Left |
| `D` | Rotate Right |
| Click on **SLAM Map** | Set autonomous navigation goal |

### Build Mode

1. Click **"Build Mode"** in the sidebar
2. **Click and drag** on the Real World canvas to draw walls
3. Switch back to **Drive Mode** to interact with the robot
4. Click **"Clear Custom Walls"** to erase your obstacles

### Viewport Toggle

- **Real World** — See the ground truth environment, walls, and LiDAR rays
- **SLAM Map** — See only what the robot *believes* based on its sensor data + fog of war

---

## 🏗️ Project Architecture

```
slam-simulator/
├── index.html              # App shell + Chart.js CDN
├── style.css               # Dark-mode design system (CSS variables)
└── src/
    ├── main.js             # Application bootstrap, game loop, event wiring
    ├── Renderer.js         # Canvas drawing: environment, robot, fog-of-war, paths
    ├── Environment.js      # Wall management (base + user-drawn custom walls)
    ├── Robot.js            # Differential-drive kinematics + collision physics
    ├── Lidar.js            # 2D raycasting + Gaussian noise + ray rendering
    ├── Mapper.js           # Occupancy grid (SLAM memory) + map rendering
    ├── AStar.js            # TypedArray-optimised A* pathfinding on the grid
    └── ChartManager.js     # Chart.js wrapper for live LiDAR data visualisation
```

---

## 🔬 Algorithm Deep Dives

### LiDAR Raycasting
Each ray is cast from the robot's position at a given angle. The simulator checks it for intersection against every wall segment using standard computational geometry (parametric line-line intersection with `t` and `u` coefficients). The closest intersection becomes the sensor reading. Gaussian-like noise is then added.

### Occupancy Grid SLAM
The map is a 2D grid of cells. After each scan, cells along the ray path are marked **free** (known empty), and the cell at the hit point is marked **occupied** (wall detected). This is a simplified Bresenham-line voting scheme — the precursor to probabilistic methods like **Bayesian SLAM** and **Particle Filters**.

### A\* Pathfinding
The A\* implementation uses `Uint8Array` and `Float32Array` typed arrays for the open/closed sets, eliminating JavaScript string key allocations entirely. This keeps search times under **1ms** even on large maps.

### Fog of War (Canvas Compositing)
An off-screen `<canvas>` is filled entirely opaque (the "fog"). Each frame, the LiDAR hit polygon is drawn onto the fog canvas using the `destination-out` composite operation with a soft radial gradient. This **permanently erases** the fog wherever the sensor has swept, giving a smooth game-engine-style exploration effect.

---

## 🚧 Roadmap

- [ ] Particle Filter (Monte Carlo) SLAM
- [ ] Loop Closure detection + map correction
- [ ] 3D Three.js view (bird's eye + 3D perspective split)
- [ ] Exportable SLAM maps (PNG / JSON)
- [ ] Mobile touch support for Build Mode

---

## 📄 License

MIT License — see [LICENSE](./LICENSE) for details.

---

<div align="center">
Built with ❤️ for robotics students everywhere.
</div>
