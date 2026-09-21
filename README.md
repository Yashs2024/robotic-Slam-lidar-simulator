# 🤖 VectraSim Suite — Multi-Engine Robotics Simulation Platform

**An interactive, browser-based, high-performance robotics simulation platform containing three standalone engine simulators accessible from a single cyber-themed hub.**

Designed as a modern educational tool for robotics, kinematics, and logistics. The platform operates completely in the browser—leveraging Vanilla JavaScript, HTML5 Canvas 2D, and Three.js WebGL rendering for 60FPS execution with zero backend dependencies.

---

## 🚀 Simulator Engines Overview

VectraSim Suite provides three highly interactive, independent simulation modules:

### 1. 🗺️ SLAM Simulator (`slam.html`)
*Simultaneous Localization and Mapping & Autonomous Navigation*
- **Visual viewports:** Real-world ground truth, SLAM Map with dynamic Fog-of-War, and a Three.js 3D LiDAR point cloud viewer.
- **Pathfinding & Navigation:** Choose between **A\*** (with proximity/wall penalty heuristics), **Dijkstra's** optimal path search, and reactive **Bug2** wall-following.
- **Drive Kinematics:** Select between Differential Drive (tank), Ackermann Steering (car-like), and Holonomic Drive (omnidirectional).
- **Localization:** Real-time localization using a Monte Carlo Localization (MCL) Particle Filter and Scan-Matching Loop Closure drift correction.

### 🦾 NEXUS Kinematics Engine (`nexus.html`)
*6-DOF Robot Arm Kinematics & Trajectory Profiling*
- **Visualizer:** 3D workspace rendering via Three.js with workspace reachability envelope outlines.
- **Kinematics:** Evaluate Denavit-Hartenberg (DH) parameter chains via Forward Kinematics (FK) and compute targets via numeric Cyclic Coordinate Descent (CCD) Inverse Kinematics (IK).
- **Trajectory Planning:** LSPB (Linear Segment with Parabolic Blend) velocity profiling.
- **Dynamic Analysis:** Live per-joint dynamic torque analysis and acceleration charts.
- **Teach Mode:** Waypoint trajectory recording and automated replay.

### 🐝 HIVE Swarm Logistics (`hive.html`)
*Multi-Agent Industrial Warehouse Fleet Operations*
- **Visualizer:** Custom high-performance 2.5D Isometric Canvas rendering with dynamic depth sorting.
- **Fleet Management:** Coordinated operations of 4 autonomous logistics AGVs (ATLAS, NEXUS, FORGE, ECHO).
- **Behavioral Scenarios:** Warehouse picking tasks, assembly workstation conveyor lines, and autonomous frontier mapping.
- **Fleet Coordination:** Battery draining (auto-charging at ≤20%), collision-avoidance routing, and nearest-idle task allocation heuristics.

*Isometric 2.5D Aerial Drone Swarm Dynamics*
- **Visualizer:** Isometric 2.5D canvas rendering showing wind flows and real-time drone states.
- **Swarm Physics & Control:** Cascaded PID loops controlling position and velocity response curves, with active Chart.js tuning plots.
- **Flocking Behaviors:** Adjustable weights for Boid rules: Separation, Alignment, and Cohesion.
- **Formation Controls:** Dispatch drones into structured formations including V-Formation, Circular Rings, Grid Layouts, and Scatter/Boids mode.
- **Leader Mode:** Designate a swarm leader and control it directly using keyboard commands (`W` `A` `S` `D`, `Shift` boost, `Space` brake) with followers tracking in Wedge, columns, or trail formations.
- **Obstacle Avoidance:** Artificial Potential Fields (APF) for threat boundaries and auto-RTB (Return to Base) battery-failsafes.

---

## 🎨 Visual Previews

### SLAM Simulator
![SLAM Simulator](public/slam_simulator.png)

### NEXUS Engine
![NEXUS Engine](public/nexus_simulator.png)

### HIVE Logistics
![HIVE Logistics](public/hive_simulator.png)

---

## 🔬 Implemented Algorithms Matrix

| Category | Algorithm | Core File / Location | Description |
|---|---|---|---|
| **Path Planning** | Dijkstra's Algorithm | `src/Dijkstra.js` | Shortest path searching (no heuristics) |
| **Path Planning** | Bug2 Navigation | `src/BugAlgorithm.js` | Reactive wall-following obstacle navigation |
| **Localization** | Particle Filter (MCL) | `src/ParticleFilter.js` | Monte Carlo Localization with particle resampling |
| **Localization** | Loop Closure | `src/LoopClosureDetector.js` | Scan-matching keyframes to correct drift |
| **Mapping** | Bayesian Log-Odds | `src/Mapper.js` | Occupancy grid probability estimation |
| **Exploration** | Frontier Exploration | `src/FrontierExplorer.js`, `hive.html` | Autonomous mapping of unknown map boundaries |
| **Kinematics** | Forward Kinematics (FK) | `nexus.html` | DH parameter-based transformation chains |
| **Kinematics** | Inverse Kinematics (IK) | `nexus.html` | Cyclic Coordinate Descent (CCD) numerical solver |
| **Dynamics** | Trajectory Planning | `nexus.html` | Linear Segment with Parabolic Blend (LSPB) profiles |
| **Dynamics** | Torque Analysis | `nexus.html` | Real-time joint torque estimation |
| **Swarm** | Task Allocation | `hive.html` | Nearest-idle heuristics with battery gates |
| **Swarm** | Collision Avoidance | `hive.html` | Potential fields and dynamic A* re-routing |

---

## 🏗️ Project Architecture

```
slam-simulator/
├── index.html                   # ← Unified Landing page → Login → Selector Hub SPA
├── slam.html                    # ← Standalone SLAM Simulator page
├── nexus.html                   # ← Standalone NEXUS Kinematics Engine page
├── hive.html                    # ← Standalone HIVE Logistics Simulator page
├── style.css                    # ← Central shared design system (cyberpunk themes)
├── vite.config.js               # ← Multi-page Vite compilation configuration
├── vercel.json                  # ← Production deployment configuration
├── package.json
│
├── public/                      # ← Static asset distribution
│   ├── slam_simulator.png       # ← SLAM Simulator image
│   ├── nexus_simulator.png      # ← NEXUS Engine image
│   ├── hive_simulator.png       # ← HIVE Logistics image
│   ├── donate.jpeg              # ← Support QR code asset
│   └── vite.svg                 # ← Vite icon
│
├── src/                         # ← SLAM modules & Shared assets
│   ├── main.js                  # ← SLAM simulation entry & loop orchestration
│   ├── Renderer.js              # ← SLAM multi-canvas drawing module
│   ├── Environment.js           # ← Arena walls configuration manager
│   ├── Robot.js                 # ← Differential/Ackermann/Holonomic physics
│   ├── Lidar.js                 # ← Raycasting sensor with Gaussian noise modeling
│   ├── Mapper.js                # ← Bayesian occupancy grid mapper
│   ├── AStar.js                 # ← TypedArray performance-optimized A* planner
│   ├── Dijkstra.js              # ← Dijkstra navigation solver
│   ├── BugAlgorithm.js          # ← Wall-following navigation agent
│   ├── SoundManager.js          # ← Web Audio API synthesizer
│   ├── ParticleFilter.js        # ← Monte Carlo Particle Filter
│   ├── LoopClosureDetector.js   # ← Loop closure scanmatcher
│   ├── PointCloudViewer.js      # ← Three.js 3D point cloud renderer
│   ├── FrontierExplorer.js      # ← Autonomous frontier exploration
│   ├── TutorialManager.js       # ← 11-step interactive tutorial workflow
│   ├── SensorVisualizer.js      # ← HUD stats Overlay
│   ├── JoystickManager.js       # ← Mobile nipplejs joystick connector
│   ├── ChartManager.js          # ← LiDAR scan polar chart
│   ├── DynamicsChartManager.js  # ← Robot dynamics plot tracking
│   ├── DynamicObstacles.js      # ← Dynamic moving walls
│   ├── DynamicHumans.js         # ← Moving worker pedestrian models
│   ├── supabase-client.js       # ← Authentication handler
│   ├── slam_landing.html        # ← SLAM marketing page
│   ├── nexus_landing.html       # ← NEXUS marketing page
│   ├── hive_landing.html        # ← HIVE marketing page
│   └── style.css                # ← Source CSS
│
└── smoke/                       # ← Playwright E2E smoke tests
    ├── launch.spec.js           # ← Launch test spec
    └── smoke.spec.js            # ← Simulator functionality tests
```

---

## 🌐 Unified Authentication & Navigation Flow

VectraSim Suite provides a seamless, single-page application (SPA) transition to manage access across all modules:

1. **VectraSim Landing:** Cyberpunk home page displaying active tickers, hero animation, and individual simulator summaries.
2. **Access Gateway (Auth):** Supports mock credentials (any combination) for testing or server-side JWT authentication verification using Supabase. The session state is stored in `localStorage` under `vectrasim_session`.
3. **Control Hub:** Renders a 4-card dashboard that dynamically launches the target simulator.
4. **Bypass Mode:** Users can directly view landing files (e.g., `src/hive_landing.html`) or access standalone modules when logged in, with central nav bars maintaining seamless transitions.

---

## 🛠️ Getting Started & Local Development

### Prerequisites
- **Node.js:** v18+
- **npm:** v9+

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/Yashs2024/Slam-lidar-simulator.git
   cd slam-lidar-simulator
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Launch the development server:
   ```bash
   npm run dev
   ```
   *Vite will host the application at `http://localhost:5173`.*

4. Production Build:
   ```bash
   npm run build
   # Compile output is built into the dist/ directory.
   npm run preview
   ```

---

## 🧪 E2E Smoke Testing

We use [Playwright](https://playwright.dev/) to perform visual verification and functionality checks across simulators:

```bash
# Install Playwright browser engines
npx playwright install

# Run the test suite
npx playwright test
```

---

## ⚙️ Key Engineering Decisions

- **Zero-Framework Architecture (Vanilla JS):** Ensures raw performance without layout/virtual DOM diff overhead, maintaining 60FPS simulation loops even with hundreds of rays and calculations per frame.
- **Canvas 2D vs Three.js WebGL:** Canvas 2D is utilized for mapping grids and warehouse routes for optimized 2D grid rendering. Three.js is deployed where 3D projections are critical, such as 3D robot arm modeling and 3D point cloud structures.
- **TypedArrays for Planners:** The A* implementation uses `Uint8Array` and `Float32Array` buffers to prevent GC (garbage collection) pauses during real-time navigation.

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

<div align="center">
Built with 🦾 for robotics and automation students.
</div>
