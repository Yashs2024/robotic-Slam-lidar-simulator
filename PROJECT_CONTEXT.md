# 🤖 RoboAI Suite — Full Project Context

> **Last Updated:** April 2026  
> **Author:** Yash Surve  
> **Institution:** MESWCOE — Automation & Robotics Engineering (Semester VI Mini Project)  
> **Repository:** [github.com/Yashs2024/Slam-lidar-simulator](https://github.com/Yashs2024/Slam-lidar-simulator)  
> **Live Deployment:** Vercel (static build via `@vercel/static-build`)

---

## 1. Project Overview

**RoboAI Suite** is a unified, browser-based robotics simulation platform containing **three standalone simulator engines** accessible from a single hub. It is designed as an **educational tool** for 3rd-year robotics & automation students. The platform requires zero backend — everything runs in the browser using Vanilla JavaScript, HTML5 Canvas, and Three.js.

### The Three Engines

| # | Engine | Theme Color | Focus Area |
|---|--------|------------|------------|
| 1 | **SLAM Simulator** | Blue (#3b82f6) | LiDAR mapping, occupancy grids, pathfinding, particle filters |
| 2 | **NEXUS Engine** | Violet (#9B5DE5) | 6-DOF robot arm kinematics, DH parameters, swarm intelligence |
| 3 | **HIVE Logistics** | Amber (#F59E0B) | Multi-robot warehouse logistics, isometric 2.5D, task scheduling |

---

## 2. Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| **Build Tool** | Vite 7.3.1 | Dev server + production bundler |
| **Language** | Vanilla JavaScript (ES Modules) | No frameworks (React, Vue, etc.) |
| **2D Rendering** | HTML5 Canvas API | Multi-layer compositing at 60fps |
| **3D Rendering** | Three.js r128 / r183 | Point cloud viewer (SLAM) + robot arm (NEXUS) |
| **Charts** | Chart.js 3.9.1 | Live polar/line charts for sensor data |
| **Animations** | GSAP 3.12.2 | Used in NEXUS loading screen |
| **Joystick** | nipplejs 0.10.1 | Virtual joystick for mobile SLAM |
| **Fonts** | Google Fonts | Orbitron, Inter, JetBrains Mono, Share Tech Mono, Rajdhani |
| **Testing** | Playwright 1.58.2 | E2E smoke tests in `/smoke` |
| **Deployment** | Vercel | Static build → `dist/` |

### Dependencies (package.json)
```json
{
  "dependencies": { "three": "^0.183.1" },
  "devDependencies": { "@playwright/test": "^1.58.2", "vite": "^7.3.1" }
}
```

---

## 3. Project Architecture

### 3.1 Directory Structure

```
slam-simulator/
├── index.html                  # ← Main entry: Landing → Login → Hub (SPA-like)
├── slam.html                   # ← SLAM Simulator (standalone page)
├── nexus.html                  # ← NEXUS Engine (standalone, self-contained)
├── hive.html                   # ← HIVE Logistics Simulator (standalone)
├── style.css                   # ← Shared stylesheet for SLAM + landing pages
├── vite.config.js              # ← Multi-page Vite config
├── vercel.json                 # ← Vercel deployment config
├── package.json
├── out.js                      # ← Legacy/bundled output (1.3MB)
├── swarm_test.png              # ← Test screenshot
│
├── public/
│   ├── donate.jpeg             # ← QR code for donations
│   ├── slam and lidar.png      # ← Marketing image
│   └── vite.svg                # ← Vite logo
│
├── src/
│   ├── main.js                 # ← SLAM app bootstrap, game loop, event wiring
│   ├── Renderer.js             # ← Canvas drawing: environment, robot, fog-of-war
│   ├── Environment.js          # ← Wall management (base + custom + dynamic)
│   ├── Robot.js                # ← Differential/Ackermann/Holonomic kinematics + physics
│   ├── Lidar.js                # ← 2D raycasting + Gaussian noise
│   ├── Mapper.js               # ← Bayesian occupancy grid (SLAM memory)
│   ├── AStar.js                # ← TypedArray-optimized A* pathfinding
│   ├── Dijkstra.js             # ← Dijkstra's shortest path algorithm
│   ├── BugAlgorithm.js         # ← Bug2 reactive wall-following navigation
│   ├── ChartManager.js         # ← Chart.js wrapper for LiDAR polar chart
│   ├── DynamicsChartManager.js # ← Chart.js wrapper for robot velocity plots
│   ├── FrontierExplorer.js     # ← Autonomous frontier-based exploration
│   ├── StatsTracker.js         # ← Performance stats (exploration %, distance, etc.)
│   ├── DynamicObstacles.js     # ← Moving walls, orbiting objects
│   ├── DynamicHumans.js        # ← Moving worker pedestrians
│   ├── SoundManager.js         # ← Web Audio API sound effects
│   ├── ParticleFilter.js       # ← Monte Carlo Localization (MCL)
│   ├── TutorialManager.js      # ← 11-step interactive tutorial system
│   ├── SensorVisualizer.js     # ← Sensor HUD (pose, distances, compass)
│   ├── LoopClosureDetector.js  # ← Scan-matching keyframe loop closure
│   ├── PointCloudViewer.js     # ← Three.js 3D LiDAR point cloud
│   ├── JoystickManager.js      # ← nipplejs mobile joystick integration
│   ├── hive_landing.html       # ← HIVE dedicated landing/marketing page
│   ├── style.css               # ← Source CSS (separate from root style.css)
│   ├── counter.js              # ← Vite template leftover (unused)
│   ├── javascript.svg          # ← Vite template leftover (unused)
│   └── components/             # ← Empty directory (reserved)
│
├── smoke/                      # ← Playwright E2E tests
│   ├── launch.js               # ← Launch test helper
│   ├── launch.spec.js          # ← Launch test spec
│   ├── launch2.js              # ← Alt launch helper
│   ├── smoke.spec.js           # ← Smoke test spec
│   └── donate.js               # ← Donate modal test
│
└── dist/                       # ← Vite production build output
```

### 3.2 Vite Multi-Page Configuration

```js
// vite.config.js
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        slam: resolve(__dirname, 'slam.html'),
        nexus: resolve(__dirname, 'nexus.html'),
        hive: resolve(__dirname, 'hive.html'),
        hive_landing: resolve(__dirname, 'src/hive_landing.html'),
      },
    },
  },
});
```

---

## 4. Navigation Flow

```
index.html (Landing Page)
    │
    ├── "GET STARTED" → Login Screen (mock auth, any credentials work)
    │                       │
    │                       └── Hub Screen (choose simulator)
    │                               ├── SLAM → slam.html
    │                               ├── NEXUS → nexus.html
    │                               └── HIVE → src/hive_landing.html → hive.html
    │
    ├── Simulator Overview Cards (direct links, bypass login)
    │       ├── SLAM → slam.html
    │       ├── NEXUS → nexus.html
    │       └── HIVE → src/hive_landing.html
    │
    └── Donate Modal (QR code overlay)
```

### Authentication
- **Mock authentication only** — any email/password combination works
- Session stored in `sessionStorage` under key `roboai_user`
- No backend, no database, no Supabase (previously attempted and reverted)
- Auto-login check on page load

---

## 5. Engine Details

### 5.1 SLAM Simulator (`slam.html` + `src/main.js`)

**Purpose:** Teach Simultaneous Localization and Mapping (SLAM) concepts interactively.

#### Core Modules (21 ES Modules)

| Module | Responsibility |
|--------|---------------|
| `Renderer.js` | Multi-canvas compositing, fog-of-war, robot/trail/path drawing |
| `Environment.js` | Wall management (random, presets, custom-drawn, dynamic, import/export) |
| `Robot.js` | 3 drive models (differential, Ackermann, holonomic), collision physics, path following |
| `Lidar.js` | 2D raycasting (30-360 rays), Gaussian noise injection, ray visualization |
| `Mapper.js` | Bayesian log-odds occupancy grid, Bresenham ray voting |
| `AStar.js` | TypedArray A* with wall proximity penalties |
| `Dijkstra.js` | Optimal shortest path (no heuristic) |
| `BugAlgorithm.js` | Bug2 reactive wall-following |
| `FrontierExplorer.js` | Autonomous frontier cell detection and targeting |
| `ParticleFilter.js` | Monte Carlo Localization (50-500 particles) |
| `LoopClosureDetector.js` | Scan-matching keyframe system, drift correction |
| `PointCloudViewer.js` | Three.js 3D point cloud with distance coloring |
| `DynamicObstacles.js` | Moving walls, sliding doors, orbital objects |
| `DynamicHumans.js` | Animated walking pedestrians |
| `SoundManager.js` | Web Audio API (sweep tick, collision, goal, exploration complete) |
| `TutorialManager.js` | 11-step guided walkthrough |
| `SensorVisualizer.js` | HUD overlay (pose, min/max distances, compass) |
| `ChartManager.js` | Chart.js live polar-area LiDAR chart |
| `DynamicsChartManager.js` | Chart.js velocity (v, ω) time series |
| `StatsTracker.js` | Exploration %, distance, collisions, time |
| `JoystickManager.js` | nipplejs mobile virtual joystick |

#### Key Features
- **3 Viewports:** Real World, SLAM Map (with fog-of-war), 3D LiDAR Point Cloud
- **3 Pathfinding Algorithms:** A*, Dijkstra, Bug2 (wall-following)
- **3 Drive Models:** Differential (tank), Ackermann (car-like), Holonomic (omni)
- **6 Environment Presets:** Random, Maze, Warehouse, Office, L-Shape, Open Field
- **Map Import/Export:** JSON format
- **Adjustable Parameters:** Sensor noise, speed, ray density, odometry drift, volume, particle count
- **Autonomous Frontier Exploration:** Automatically maps unknown areas
- **Interactive Build Mode:** Draw custom walls on canvas

#### Game Loop (60fps)
```
1. Process keyboard/joystick input
2. Update dynamic obstacles
3. Update robot physics (collision detection)
4. LiDAR raycasting scan
5. Particle filter predict/update/resample
6. Sound effects
7. SLAM occupancy grid update
8. Live chart updates
9. Sensor HUD update
10. Loop closure detection
11. Performance stats update
12. 3D point cloud update
13. Goal reached detection
14. Frontier exploration logic
15. Render full frame
```

---

### 5.2 NEXUS Engine (`nexus.html`)

**Purpose:** Simulate robotic arm kinematics, trajectory planning, and swarm intelligence.

#### Key Features
- **6-DOF Robot Arm** with Three.js 3D visualization
- **Forward Kinematics (FK)** — joint angle sliders driving end-effector position
- **Inverse Kinematics (IK)** — numerical IK solver
- **DH (Denavit-Hartenberg) Parameter Table** — editable, with preset configurations
- **LSPB Trajectory Planning** — Linear Segment with Parabolic Blend
- **Dynamic Torque Analysis** — real-time torque charts per joint
- **Teach Mode** — record waypoints, replay computed trajectories
- **Reynolds Boids Swarm Intelligence** — flocking simulation with separation, alignment, cohesion
- **DOF Selector** — configurable 2-6 joints with live reconfiguration

#### Architecture
- **Fully self-contained** in a single HTML file (2,898 lines)
- All CSS, JS, and HTML in one file
- Uses Three.js r128, Chart.js 3.9.1, GSAP 3.12.2
- Custom loading screen with progress bar
- Tabbed interface: Kinematics | Swarm | DH Config
- Left panel: joint sliders, IK controls, safety zone config
- Right panel: DH readout, FK data, teach mode controls
- Bottom strip: joint angle chart, velocity chart

#### Design System
```
Fonts: Orbitron (display), JetBrains Mono (data)
Colors: Cyan (#00F5FF), Violet (#9B5DE5), Orange (#FF6B35), Green (#00FFB2)
Background: #020509 (near-black)
Panels: glassmorphism with backdrop-filter
```

---

### 5.3 HIVE Logistics (`hive.html` + `src/hive_landing.html`)

**Purpose:** Multi-robot industrial warehouse logistics simulation.

#### Key Features
- **4 Autonomous Robots** (ATLAS, NEXUS, FORGE, ECHO)
- **3 Operational Scenarios:**
  1. **Warehouse** — SKU pick-and-deliver with priority task queue
  2. **Assembly** — Sequential workstation servicing (conveyor line)
  3. **Mapping** — Frontier-based exploration with fog-of-war
- **Isometric 2.5D Rendering Engine** — custom Canvas 2D renderer with depth sorting
- **A* Pathfinding** — grid-based with diagonal movement, robot avoidance
- **Battery Management** — energy drain on movement, auto-charging at ≤20%
- **Collision Avoidance** — dynamic re-routing between robots
- **Task Assignment** — nearest-idle-robot heuristic with urgency override
- **Live Analytics:** Battery levels, task distribution, odometer, state timeline, throughput sparkline
- **Camera Feed Panel** — first-person robot view with CRT scanline effect
- **Heatmap Tracking** — tile visit frequency visualization
- **Event Log** — scrolling live log with export capability
- **Operational Report** — modal with KPIs and stats
- **Wall Placement** — click-to-place walls on isometric grid
- **Camera Controls** — pan, zoom (mouse wheel), auto-follow

#### Architecture
- **Self-contained** in `hive.html` (1,290 lines) — all HTML/CSS/JS inline
- **Landing page** in `src/hive_landing.html` (689 lines) with animated hero, three scenario preview canvases, scroll animations, stat counters
- Grid: 36×36 tiles
- Isometric math: `isoToScreen(gx, gy)` and `screenToGrid(sx, sy)`
- Robot state machine: IDLE → NAVIGATING → PICKING → CARRYING → DEPOSITING → IDLE (+ CHARGING, AVOIDING, ERROR, EXPLORING, WORKING)

#### Design System
```
Fonts: Share Tech Mono (code), Rajdhani (headings)
Colors: Blue (#1E90FF), Cyan (#00E5FF), Green (#00E676), Amber (#FFB300), Red (#FF1744)
Background: #0A0C10 (dark industrial)
```

---

## 6. Design System (Hub/Landing — `index.html`)

### Typography
| Type | Font | Weights |
|------|------|---------|
| Display / Headings | Orbitron | 400, 500, 700, 900 |
| Body text | Inter | 300, 400, 500, 600 |

### Color Tokens
```css
--bg: #050810        /* Deep dark background */
--cyan: #00F5FF      /* Primary accent */
--violet: #9B5DE5    /* Secondary accent */
--amber: #F59E0B     /* Tertiary / donate */
--green: #10B981     /* Status / success */
--text: #E0E6ED      /* Primary text */
--muted: #64748b     /* Muted text */
```

### Design Patterns
- **Glassmorphism** cards with `backdrop-filter: blur()`
- **Gradient glow** on hover states
- **Animated grid overlay** with 3D perspective
- **Floating glow orbs** with blur filters
- **CSS-only robot SVG** with animated eyes, pulse, scan line
- **Three-screen SPA:** Landing → Login → Hub (no page reload)

---

## 7. Deployment

### Vercel Configuration
```json
{
  "builds": [{
    "src": "package.json",
    "use": "@vercel/static-build",
    "config": { "distDir": "dist" }
  }]
}
```

### Build Commands
```bash
npm run dev           # Start Vite dev server (localhost:5173)
npm run build         # Vite production build → dist/
npm run preview       # Preview production build
npm run vercel-build  # Alias for vite build (Vercel hook)
```

---

## 8. Testing

### Smoke Tests (`/smoke`)
- **Playwright-based** E2E tests
- `launch.spec.js` — verifies simulator launches correctly
- `smoke.spec.js` — basic smoke tests
- `donate.js` — donation modal interaction

---

## 9. Key Design Decisions

| Decision | Rationale |
|---------|-----------|
| **No framework** (Vanilla JS) | Maximum performance for real-time 60fps simulation, zero bundle overhead |
| **Self-contained HTML files** | Each simulator is independent — can be loaded directly without build step |
| **Canvas 2D for SLAM/HIVE** | Hardware-accelerated 2D rendering, full pixel control |
| **Three.js for 3D views** | Industry-standard WebGL library for point clouds and robot arms |
| **Mock authentication** | Educational project — no need for real auth complexity |
| **Multi-page Vite build** | Each simulator acts as its own SPA, shared dev server |
| **Inline CSS/JS for NEXUS/HIVE** | Self-containment — each file is a complete application |
| **Session-based login** | `sessionStorage` — clears on tab close, no persistence needed |

---

## 10. Algorithms Implemented

### Navigation & Planning
| Algorithm | Location | Complexity |
|-----------|---------|------------|
| A* Pathfinding | `src/AStar.js`, `hive.html` | O(E log V) |
| Dijkstra's Algorithm | `src/Dijkstra.js` | O(V²) |
| Bug2 Wall-Following | `src/BugAlgorithm.js` | O(n) reactive |
| Frontier Exploration | `src/FrontierExplorer.js`, `hive.html` | Grid scan |

### Localization & Mapping
| Algorithm | Location | Description |
|-----------|---------|------------|
| Bayesian Log-Odds Grid | `src/Mapper.js` | Probabilistic occupancy mapping |
| Particle Filter (MCL) | `src/ParticleFilter.js` | Monte Carlo Localization |
| Loop Closure Detection | `src/LoopClosureDetector.js` | Scan-matching keyframes |
| LiDAR Raycasting | `src/Lidar.js` | Line-line intersection with Gaussian noise |

### Kinematics & Dynamics
| Algorithm | Location | Description |
|-----------|---------|------------|
| Forward Kinematics (FK) | `nexus.html` | DH parameter chain evaluation |
| Inverse Kinematics (IK) | `nexus.html` | Numerical Jacobian solver |
| LSPB Trajectory | `nexus.html` | Linear segment with parabolic blend |
| Torque Analysis | `nexus.html` | Per-joint dynamic torque computation |

### Swarm Intelligence
| Algorithm | Location | Description |
|-----------|---------|------------|
| Reynolds Boids | `nexus.html` | Separation + Alignment + Cohesion |
| Task Assignment | `hive.html` | Nearest-idle-robot with battery gating |
| Collision Avoidance | `hive.html` | Dynamic A* re-routing |

### Robot Kinematics
| Model | Location | Description |
|-------|---------|------------|
| Differential Drive | `src/Robot.js` | Tank-style left/right wheel |
| Ackermann Steering | `src/Robot.js` | Car-like front-wheel steering |
| Holonomic Drive | `src/Robot.js` | Omnidirectional movement |

---

## 11. External Resources & Social Links

| Resource | URL |
|----------|-----|
| GitHub | [github.com/Yashs2024](https://github.com/Yashs2024) |
| LinkedIn | [linkedin.com/in/yash-surve-3b6a72253](https://www.linkedin.com/in/yash-surve-3b6a72253) |
| Email | yashusurve2005@gmail.com |
| Donation | QR code in `/public/donate.jpeg` |

---

## 12. File Sizes Reference

| File | Size | Content |
|------|------|---------|
| `index.html` | 42 KB | Landing + Login + Hub screens |
| `slam.html` | 24 KB | SLAM simulator shell + sidebar |
| `nexus.html` | 135 KB | Complete NEXUS engine (self-contained) |
| `hive.html` | 86 KB | Complete HIVE simulator (self-contained) |
| `src/hive_landing.html` | 37 KB | HIVE marketing landing page |
| `style.css` | 34 KB | Shared SLAM/landing CSS |
| `src/main.js` | 26 KB | SLAM application bootstrap |
| `src/Renderer.js` | 22 KB | Canvas rendering engine |
| `src/TutorialManager.js` | 13 KB | 11-step tutorial system |
| `src/Robot.js` | 11 KB | Robot physics + kinematics |
| `src/Environment.js` | 11 KB | Wall/map management |
| `src/PointCloudViewer.js` | 9 KB | Three.js 3D point cloud |
| `src/LoopClosureDetector.js` | 9 KB | Loop closure system |
| `src/ParticleFilter.js` | 8 KB | MCL implementation |

---

## 13. Future Roadmap

- [ ] Probabilistic Particle Filter SLAM (full SLAM, not just localization)
- [ ] 3D Three.js view (bird's eye + 3D perspective split)
- [ ] Exportable SLAM maps (PNG / JSON with metadata)
- [ ] Mobile touch support for Build Mode
- [ ] Multi-robot SLAM (collaborative mapping)
- [ ] WebSocket-based remote control API

---

## 14. How to Run Locally

```bash
# Clone
git clone https://github.com/Yashs2024/Slam-lidar-simulator.git
cd slam-lidar-simulator

# Install
npm install

# Dev server
npm run dev
# → Open http://localhost:5173

# Production build
npm run build
npm run preview
```

---

## 15. Development History (Summary)

1. **Core SLAM Simulator** — LiDAR raycasting, occupancy grid, A* navigation
2. **Enhanced SLAM** — Particle filter, loop closure, 3D point cloud, multiple algorithms
3. **NEXUS Engine** — 6-DOF robot arm, FK/IK, swarm intelligence
4. **HIVE Logistics** — Isometric warehouse simulation, multi-robot coordination
5. **Unified Platform** — Hub landing page, mock auth, three engines under one roof
6. **DOF Selector** — Dynamic 2-6 joint configuration for NEXUS
7. **Auth Revert** — Removed Supabase, restored mock authentication
