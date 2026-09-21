# 🤖 VectraSim Suite — Autonomous Robotics & Swarm Simulation Platform

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)]()
[![Runtime](https://img.shields.io/badge/runtime-Browser%20WebGL%20%2F%20Canvas%202D-blue.svg)]()
[![Three.js](https://img.shields.io/badge/Three.js-r184-orange.svg)]()
[![Architecture](https://img.shields.io/badge/architecture-Vanilla%20JS%20(Zero%20Framework)-yellow.svg)]()
[![Testing](https://img.shields.io/badge/tests-Playwright%20E2E-purple.svg)]()
[![License](https://img.shields.io/badge/license-MIT-green.svg)]()

> **An interactive, browser-based, high-performance robotics simulation suite featuring three independent, industrial-grade simulation engines accessible from a unified cyber-themed mission hub.**
> Designed as an advanced educational and research tool for robotics, kinematics, and swarm automation students and engineers. Completely client-side with zero backend dependencies—running at 60 FPS using Vanilla JavaScript, HTML5 Canvas, and Three.js WebGL.

---

## 📑 Table of Contents
1. [Platform Architecture & Navigation](#-platform-architecture--navigation)
2. [Simulator 1: SLAM Simulator Engine](#1--slam-simulator-engine-slamhtml--src)
3. [Simulator 2: NEXUS Kinematics Engine](#2--nexus-kinematics-engine-nexushtml)
4. [Simulator 3: HIVE Swarm Logistics Engine](#3--hive-swarm-logistics-engine-hivehtml)
5. [Interactive Guidance: What to Try First](#-interactive-guidance-what-to-try-first)
6. [Comprehensive Algorithms & Mathematics Matrix](#-comprehensive-algorithms--mathematics-matrix)
7. [Repository File Structure](#-repository-file-structure)
8. [Local Development & Testing](#-local-development--testing)
9. [Core Engineering Decisions](#-core-engineering-decisions)

---

## 🌐 Platform Architecture & Navigation

VectraSim Suite integrates three standalone simulation engines into a cohesive multi-page application with a cyber-themed mission hub:

```
                      ┌────────────────────────────────────────┐
                      │    index.html (Cyberpunk Mission Hub)  │
                      └───────────────────┬────────────────────┘
                                          │
                  ┌───────────────────────┼───────────────────────┐
                  ▼                       ▼                       ▼
       ┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐
       │   slam.html (SLAM)  │ │ nexus.html (NEXUS)  │ │   hive.html (HIVE)  │
       │  LiDAR, EKF, MCL &  │ │ 6-DOF Arm, Jacobian,│ │ 3D High-Bay Swarm, │
       │  Occupancy Mapping  │ │ DLS/CCD IK, LSPB    │ │ Space-Time A*, Alloc│
       └─────────────────────┘ └─────────────────────┘ └─────────────────────┘
```

- **Landing & Auth Gateway:** High-performance cyberpunk gateway with animated perspective grid, glowing status chips, live telemetry ticker, and simulated credentials authentication (`sessionStorage`).
- **Control Hub:** Instant single-click routing into any of the 3 standalone engines or direct landing pages (`src/hive_landing.html`).
- **Zero-Dependency Execution:** Entirely runs in modern web browsers without external servers, Python bridges, or container requirements.

---

## 1. 🗺️ SLAM Simulator Engine (`slam.html` + `src/`)
*Simultaneous Localization and Mapping, Sensor Fusion, and Autonomous Navigation*

The SLAM Simulator teaches and visualizes the mathematical foundations of autonomous mobile robot perception, mapping, and state estimation.

### 1.1 Viewports & Sensor Simulation
- **Triple Synchronized Viewports:**
  - **Real World (Ground Truth):** Complete environment visibility showing true robot pose, physical walls, dynamic moving obstacles, and pedestrians.
  - **SLAM Map (Belief State):** Occupancy grid map updated solely through noisy sensor readings, covered with dynamic fog-of-war in unmapped areas.
  - **3D LiDAR Point Cloud (Three.js WebGL):** Real-time 3D point cloud reconstructed from 2D range scans with distance-based false coloring and interactive OrbitControls.
- **2D LiDAR Sensor (`src/Lidar.js`):**
  - High-performance raycasting with line-line segment intersection.
  - Configurable ray count ($30$ to $360$ rays over a $360^\circ$ FOV).
  - Configurable maximum detection range ($20$ to $400$ px).
  - Realistic **Gaussian Noise** injection ($\sigma$) and simulated dropout rates.

### 1.2 Bayesian Occupancy Grid Mapping (`src/Mapper.js`)
- Probabilistic cell updates using the **Log-Odds formulation**:
  $$\mathcal{L}(m_i \mid z_{1:t}) = \mathcal{L}(m_i \mid z_{1:t-1}) + \log \frac{P(m_i \mid z_t)}{1 - P(m_i \mid z_t)} - \mathcal{L}_0$$
- Bresenham ray traversal decrementing log-odds for free space cells and incrementing log-odds for ray endpoint obstacle hits.
- Log-odds clamping limits preventing certainty saturation and enabling dynamic adaptation to moving obstacles.

### 1.3 State Estimation Comparison Mode
A real-time evaluation panel that benchmarks three concurrent localization estimators:
1. **Ground Truth:** Exact kinematic state vector $(x, y, \theta)$ from the physical engine.
2. **Dead-Reckoning Odometry:** Forward integration of wheel encoders subject to systematic scale drift and Gaussian white noise:
   $$\Delta x = v \Delta t \cos\theta + \mathcal{N}(0, \sigma_d^2), \quad \Delta \theta = \omega \Delta t + \mathcal{N}(0, \sigma_\theta^2)$$
3. **Extended Kalman Filter (EKF-SLAM / `EKFEstimator`):**
   - Non-linear motion propagation with error covariance matrix $\mathbf{P}_{t|t-1} = \mathbf{F}_x \mathbf{P}_{t-1} \mathbf{F}_x^T + \mathbf{Q}$.
   - Landmark measurement correction via Kalman Gain $\mathbf{K} = \mathbf{P} \mathbf{H}^T (\mathbf{H}\mathbf{P}\mathbf{H}^T + \mathbf{R})^{-1}$.
   - Renders dynamic $2\sigma$ ($95.4\%$ confidence) uncertainty covariance ellipses with orientation indicators.

### 1.4 Advanced Telemetry Metrics
- **Root Mean Square Error (RMSE):**
  $$\text{RMSE} = \sqrt{\frac{1}{N}\sum_{k=1}^N \left[(x_k^{\text{est}} - x_k^{\text{true}})^2 + (y_k^{\text{est}} - y_k^{\text{true}})^2\right]}$$
  Maintained across a rolling 100-sample ring buffer with live dual-line sparkline plotting.
- **Map Shannon Entropy ($H(m)$ in bits):**
  $$H(m) = -\sum_{i=1}^M \left[ p_i \log_2(p_i) + (1 - p_i) \log_2(1 - p_i) \right]$$
  Quantifies total information uncertainty across all mapped grid cells.
- **Particle Filter Degeneracy (Effective Sample Size $\text{ESS}$):**
  $$N_{\text{eff}} = \frac{1}{\sum_{i=1}^{N_p} (w_i)^2}$$
  Tracks particle weight dispersion; triggers low-variance systematic resampling when $N_{\text{eff}} < N_p / 2$.
- **Resampling Event Counter:** Logs live particle replenishment events.

### 1.5 Localization & Navigation Algorithms
- **Monte Carlo Localization (MCL / `src/ParticleFilter.js`):** 50 to 500 particles updated through odometry prediction, LiDAR likelihood field weighting, and roulette/systematic resampling.
- **Scan-Matching Loop Closure (`src/LoopClosureDetector.js`):** Keyframe pose-graph scan matching with correlation thresholds to eliminate cumulative dead-reckoning drift.
- **Autonomous Frontier Exploration (`src/FrontierExplorer.js`):** Wavefront flood-fill boundary detection identifying frontier cells between known-free and unknown regions, autonomously routing the robot to achieve 100% map coverage.
- **Path Planners:**
  - **A\* Pathfinding (`src/AStar.js`):** 8-directional TypedArray (`Uint8Array`, `Float32Array`) A* search with Euclidean heuristic and proximity safety distance penalties from walls.
  - **Dijkstra's Algorithm (`src/Dijkstra.js`):** Optimal shortest path search with uniform cost expansion.
  - **Bug2 Navigation (`src/BugAlgorithm.js`):** Reactive obstacle wall-following along the goal m-line.
- **Drive Kinematics (`src/Robot.js`):**
  - **Differential Drive:** Dual independent wheel drive ($\dot{x} = v\cos\theta, \dot{y} = v\sin\theta, \dot{\theta} = \omega$).
  - **Ackermann Steering:** Car-like front-wheel steering model ($\dot{\theta} = \frac{v}{L}\tan\phi$).
  - **Holonomic Drive:** Omnidirectional Mecanum drive ($v_x, v_y, \omega$).

---

## 2. 🦾 NEXUS Kinematics Engine (`nexus.html`)
*6-DOF Articulated Robot Arm Kinematics, Analytical Jacobian, and Dynamics*

The NEXUS Engine simulates industrial articulated serial manipulators, providing real-time mathematical analysis of reachability, singularities, and joint dynamics.

### 2.1 3D Visualizer & Kinematic Model (Three.js)
- PBR metallic materials with joint coordinate frame gizmos ($\mathbf{x}$ red, $\mathbf{y}$ green, $\mathbf{z}$ blue).
- End-effector industrial gripper with status laser and dynamic workspace reachability envelope point cloud.
- Reconfigurable serial topology supporting **2-DOF, 3-DOF, 4-DOF, 5-DOF, and 6-DOF** configurations on the fly.

### 2.2 Forward Kinematics (Denavit-Hartenberg Formulation)
Computes homogeneous transformation matrix chains using standard DH parameters:
$$T_i^{i-1} = \begin{bmatrix} \cos\theta_i & -\sin\theta_i\cos\alpha_i & \sin\theta_i\sin\alpha_i & a_i\cos\theta_i \\ \sin\theta_i & \cos\theta_i\cos\alpha_i & -\cos\theta_i\sin\alpha_i & a_i\sin\theta_i \\ 0 & \sin\alpha_i & \cos\alpha_i & d_i \\ 0 & 0 & 0 & 1 \end{bmatrix}$$
$$T_n^0 = T_1^0 T_2^1 T_3^2 \dots T_n^{n-1}$$

### 2.3 Geometric Jacobian & Dexterity Analysis
- **Positional Jacobian $\mathbf{J}_v(\mathbf{q}) \in \mathbb{R}^{3 \times N}$:**
  $$\mathbf{J}_{v, i} = \mathbf{z}_{i-1} \times (\mathbf{p}_e - \mathbf{p}_{i-1})$$
  Relates joint velocity vectors $\mathbf{\dot{q}}$ to Cartesian linear end-effector velocity $\mathbf{\dot{p}}_e = \mathbf{J}_v \mathbf{\dot{q}}$.
- **Yoshikawa Manipulability Index ($w$):**
  $$w = \sqrt{\det\left(\mathbf{J}_v \mathbf{J}_v^T\right)}$$
  Measures the volume of the velocity ellipsoid; drops toward $0$ at kinematic singularities.
- **Singularity Warning & Condition Number ($\kappa$):**
  $$\kappa = \frac{\sigma_{\max}(\mathbf{J})}{\sigma_{\min}(\mathbf{J})}$$
  Detects boundary and interior singularities, alerting the user before joint velocity explosions occur.

### 2.4 Dual Inverse Kinematics (IK) Solvers
1. **Damped Least Squares (DLS / Levenberg-Marquardt):**
   Robust against kinematic singularities by adding an analytical damping factor $\lambda^2$:
   $$\Delta\mathbf{q} = \mathbf{J}^T \left(\mathbf{J}\mathbf{J}^T + \lambda^2 \mathbf{I}\right)^{-1} \mathbf{e}$$
2. **Cyclic Coordinate Descent (CCD):**
   Heuristic numeric solver iteratively rotating each joint link to align the current end-effector vector toward the desired target.

### 2.5 Trajectory Profiling & Dynamic Torque Estimation
- **LSPB Trajectory Planning:** Linear Segment with Parabolic Blend generating smooth trapezoidal velocity profiles with bounded acceleration.
- **Dynamic Torque Estimation:** Evaluates static gravitational and inertial torques per joint:
  $$\tau_i = \sum_{k=i}^N m_k g \, r_{k, \text{proj}}$$
- **Chart.js Dynamics Plots:** Live multi-channel streaming of Joint Velocities ($\dot{q}_1 - \dot{q}_3$) and Joint Accelerations ($\ddot{q}_1 - \ddot{q}_3$).
- **Teach Mode:** Interactive 3D waypoint recording, trajectory interpolation, and cyclic playback.

---

## 3. 🐝 HIVE Swarm Logistics Engine (`hive.html`)
*Industrial 3D Multi-Robot Swarm Warehouse Simulation (Three.js WebGL & ROS 2 Nav2)*

HIVE 3D simulates an industrial smart warehouse with multi-robot fleet coordination, dynamic human obstacle avoidance, and intelligent task scheduling.

### 3.1 3D High-Bay Warehouse World
- High-performance Three.js WebGL industrial floor with perimeter hazard markings.
- 8 high-bay pallet racking aisles (Aisle A through Aisle H) with orange load beams, Euro-pallets, and colored SKU inventory totes.
- Outbound dispatch shipping zone with 3 motorized roller conveyors and optical barcode scanner laser curtain.
- 4 inductive fast-charging docking pads with vertical power pylons and glowing LED docking rings.

### 3.2 Autonomous Mobile Robots (AMRs)
Fleet of 4 industrial AGVs: **R-01 ATLAS** (Blue), **R-02 NEXUS** (Green), **R-03 FORGE** (Orange), and **R-04 ECHO** (Violet).
- 360° spinning LiDAR puck turret (600 RPM).
- Forward-facing stereo RGB-D camera mast.
- Ground-projected dynamic underglow status LEDs reflecting active state.
- **Active 3D Scissor-Lift Mechanism:** Smooth physical scissor elevation raising and lowering inventory crates from shelf tiers and delivering them onto the outbound dispatch conveyor.

### 3.3 4D Space-Time A\* Pathfinding (MAPF)
- Multi-Agent Path Finding in discrete 4D space $(x, y, t)$ backed by a centralized **Reservation Table**.
- Guarantees complete elimination of:
  - **Vertex Conflicts:** Two AMRs claiming the same cell $(x, y)$ at time step $t$.
  - **Edge Swaps:** Two AMRs traversing the same edge in opposite directions between $t$ and $t+1$.
- **Right-of-Way Corridor Resolver:** AMRs carrying cargo yield priority over unloaded AMRs; urgent orders yield priority over normal tasks; ties broken by AMR ID.

### 3.4 ISO 3691-4 Safety Compliance & Human Avoidance
- Animated 3D walking warehouse workers wearing safety hardhats and high-visibility neon vests patrolling aisles.
- **Dual-Zone Safety Braking:**
  - *Caution Zone ($d \le 3.5$m):* Robot reduces speed by 50% and emits caution alert.
  - *Emergency Halt ($d \le 1.8$m):* Full safety brake, hazard alarm, state switched to `YIELDING`, and dynamic Space-Time A* detour recalculation.

### 3.5 Task Allocation Strategy Comparison Engine
A real-time benchmarking system that allows dynamic switching between 4 scheduling algorithms with live performance telemetry:

| Strategy | Mathematical Formulation | Operational Behavior |
| :--- | :--- | :--- |
| **📍 Nearest-Robot** | $\text{Cost} = \|r_x - t_x\| + \|r_y - t_y\|$ | Greedy Manhattan/Euclidean distance minimization. Assigns the closest idle AMR ($>22\%$ battery). Fast baseline but does not balance energy or prioritize urgent shipments. |
| **⚡ Battery-Aware** | $\text{Cost} = d \times \left(1 + 3.0 \cdot \left(\frac{100 - \text{SOC}}{100}\right)^2\right) + \text{buffer}_{\text{low}}$ | State-of-Charge (SOC) optimization. Heavily penalizes robots with $<35\%$ battery, eliminating mid-mission stranding and balancing fleet battery levels. |
| **⭐ Priority-Aware** | Urgent: $1.5d - (\text{SOC} - 50) \cdot 0.4$; Normal: $d + \text{res}_{\text{buf}}$ | Strict SLA urgency tiers. Urgent shipments immediately seize high-charge ($>40\%$) AMRs with zero detour risk; normal tasks utilize remaining capacity. |
| **🏷️ Auction-Based** | $\text{Bid}_i = w_d \cdot d + w_b \cdot (100 - \text{SOC}) + w_l \cdot \text{load} - \text{urgency}_{\text{disc}}$ | **Contract Net Protocol (CNP)** market bidding. Available AMRs submit private cost bids based on distance, battery, and completed orders; lowest bidder wins contract. |

#### Live Telemetry Metrics Tracked:
- **Throughput (tasks/min):** Instantaneous rolling 60-second throughput and cumulative strategy rate.
- **Fleet Idle Time (%):** Fraction of active time spent by the fleet in `IDLE` state.
- **Deadlock Resolution Counts:** Number of corridor conflicts resolved via right-of-way arbitration.
- **Yield Counts:** Human worker safety halts plus peer-to-peer corridor yields.
- **AMR Breakdown:** Per-robot idle %, yields, and completed orders for ATLAS, NEXUS, FORGE, and ECHO.
- **UI Views:** Left-panel strategy switchers, right-panel comparative scorecard table with best-performer badges (`★`), visual horizontal bar meters, continuous auto-orders dispatcher (`⚡ AUTO-ORDERS`), and full-screen benchmark modal (`⚖ STRATEGIES`).

### 3.6 Multi-Camera System
- `CHASE`: Smooth 3rd-person follower camera with orientation lerping behind the active AMR.
- `SENSOR`: 1st-person forward camera with reticle and YOLO-style AI bounding box detections.
- `FREE`: 6-DOF OrbitControls warehouse inspection.
- `TOP`: Overhead macro dispatcher view.
- `QUAD-CAM`: Floating acrylic drop-down drawer streaming real-time onboard cameras for all 4 AMRs simultaneously with interactive click-to-follow.
- `PIP`: Floating draggable sensor PiP monitor with CRT scanlines.

---

## 💡 Interactive Guidance: What to Try First

Each simulator includes an in-scene interactive **"What to Try First"** guidance panel:

### SLAM Simulator (`slam.html`)
1. **Launch Autonomous Exploration:** Click `AUTO EXPLORE` to watch the frontier explorer map unmapped areas.
2. **Sensor Noise Injection:** Increase `Sensor Noise (σ)` to $15$ px to observe particle filter dispersion.
3. **Compare Pathfinding:** Switch algorithms between A*, Dijkstra, and Bug2 to observe route differences.
4. **Test Estimation Comparison:** Open the Comparison panel to observe Ground Truth vs Odometry vs EKF RMSE and Shannon entropy.
5. **Draw Custom Obstacles:** Enter `BUILD MODE` and draw custom walls directly onto the canvas.
6. **Trigger Loop Closure:** Drive a wide circle with high odometry drift and watch the scan-matcher correct drift upon return.

### NEXUS Kinematics (`nexus.html`)
1. **Manipulate Joint Sliders:** Adjust $J_1 - J_6$ sliders to observe 3D forward kinematics.
2. **Test Dual IK Solvers:** Click anywhere in the 3D workspace to compare DLS vs CCD solving speed.
3. **Observe Singularity Warning:** Fully stretch the arm horizontally to watch the Yoshikawa Manipulability index drop to near-zero.
4. **Teach Waypoints:** Click `Record Waypoint`, pose the arm at 3 positions, and hit `Play Trajectory`.
5. **Reconfigure DOF:** Switch from 6-DOF to 3-DOF or 4-DOF on the fly.

### HIVE Swarm Logistics (`hive.html`)
1. **Switch Allocation Strategies:** Toggle between `NEAREST`, `BATTERY`, `PRIORITY`, and `AUCTION` to observe task distribution differences.
2. **Open Strategy Comparison:** Click `STRATEGIES` in the right panel or hit `⚖ STRATEGIES` in the topbar for the scorecard table.
3. **Stream Quad-Cam Fleet:** Click `⊞ 4-CAM GRID` to stream onboard cameras for all 4 AMRs simultaneously.
4. **Simulate Pedestrian Emergency Brake:** Enable workers and observe AMR emergency halts ($1.8$m) and Space-Time A* detours.
5. **Trigger Urgent Dispatch:** Press `Space` to queue an urgent order and observe priority preemption.
6. **Run Multi-Strategy Sweep:** Click `⚡ TEST ALL` to execute an automated 4-algorithm benchmark sweep.

---

## 🔬 Comprehensive Algorithms & Mathematics Matrix

| Category | Algorithm / Feature | Implementation File | Mathematical / Computational Formulation |
|---|---|---|---|
| **Mapping** | Bayesian Log-Odds Grid | `src/Mapper.js` | $\mathcal{L}(m_i \mid z_{1:t}) = \mathcal{L}(m_i \mid z_{1:t-1}) + \log \frac{P(m_i \mid z_t)}{1-P(m_i \mid z_t)} - \mathcal{L}_0$ |
| **Mapping** | Shannon Map Entropy | `slam.html` | $H(m) = -\sum_{i=1}^M [p_i \log_2 p_i + (1-p_i)\log_2(1-p_i)]$ |
| **Localization** | Monte Carlo (MCL) | `src/ParticleFilter.js` | $p(x_t \mid z_{1:t}) \approx \sum_{i=1}^N w_t^{[i]} \delta(x_t - x_t^{[i]})$ |
| **Localization** | Particle ESS Tracking | `slam.html` | $N_{\text{eff}} = \frac{1}{\sum (w_i)^2}$ |
| **Estimation** | Extended Kalman Filter (EKF) | `src/main.js`, `slam.html` | $\mathbf{P}_{t\|t-1} = \mathbf{F}_x\mathbf{P}_{t-1}\mathbf{F}_x^T + \mathbf{Q}, \quad \mathbf{K} = \mathbf{P}\mathbf{H}^T(\mathbf{H}\mathbf{P}\mathbf{H}^T+\mathbf{R})^{-1}$ |
| **Estimation** | Estimation RMSE | `slam.html` | $\text{RMSE} = \sqrt{\frac{1}{N}\sum \| \mathbf{p}_k^{\text{est}} - \mathbf{p}_k^{\text{true}} \|^2}$ |
| **Localization** | Scan-Matching Loop Closure | `src/LoopClosureDetector.js` | $\arg\max_{\mathbf{T}} \sum_{i} \exp\left(-\frac{\|\mathbf{T} p_i - q_{\text{nearest}}\|^2}{2\sigma^2}\right)$ |
| **Navigation** | Heuristic A\* Search | `src/AStar.js` | $f(n) = g(n) + h(n) + \text{cost}_{\text{wall}}(n)$ |
| **Navigation** | Dijkstra Shortest Path | `src/Dijkstra.js` | $f(n) = g(n) \quad (h(n) = 0)$ |
| **Navigation** | Bug2 Wall-Following | `src/BugAlgorithm.js` | Reactive boundary-following with m-line intersection checks |
| **Exploration** | Frontier Exploration | `src/FrontierExplorer.js` | Flood-fill edge detection: $\{c \in \text{Free} \mid \exists n \in \text{Neighbor}(c), n \in \text{Unknown}\}$ |
| **Kinematics** | Forward Kinematics (DH) | `nexus.html` | $T_n^0 = \prod_{i=1}^n \text{Rot}_z(\theta_i)\text{Trans}_z(d_i)\text{Trans}_x(a_i)\text{Rot}_x(\alpha_i)$ |
| **Kinematics** | Positional Jacobian | `nexus.html` | $\mathbf{J}_v = [\mathbf{z}_0 \times (\mathbf{p}_e-\mathbf{p}_0) \quad \dots \quad \mathbf{z}_{n-1} \times (\mathbf{p}_e-\mathbf{p}_{n-1})]$ |
| **Kinematics** | Yoshikawa Manipulability | `nexus.html` | $w = \sqrt{\det(\mathbf{J}_v\mathbf{J}_v^T)}$ |
| **Kinematics** | Damped Least Squares IK | `nexus.html` | $\Delta\mathbf{q} = \mathbf{J}^T(\mathbf{J}\mathbf{J}^T + \lambda^2 \mathbf{I})^{-1}\mathbf{e}$ |
| **Kinematics** | CCD Inverse Kinematics | `nexus.html` | $\theta_i \leftarrow \theta_i + \text{atan2}(\|\mathbf{u}\times\mathbf{v}\|, \mathbf{u}\cdot\mathbf{v})$ |
| **Dynamics** | LSPB Trajectory Blend | `nexus.html` | Parabolic blend with constant acceleration $a_{\max}$ and linear cruise segment |
| **MAPF** | Space-Time A\* (4D) | `hive.html` | Min-heap search in $(x, y, t)$ over dynamic reservation table |
| **Allocation** | Nearest-Robot | `hive.html` | $\arg\min_{r \in \text{Idle}} \|r_x - t_x\| + \|r_y - t_y\|$ |
| **Allocation** | Battery-Aware (SOC) | `hive.html` | $\arg\min_{r} d(r, t) \cdot \left(1 + 3.0 \cdot \left(\frac{100-\text{SOC}}{100}\right)^2\right) + \text{pen}$ |
| **Allocation** | Priority-Aware | `hive.html` | Preemptive priority queue: $1.5d - (\text{SOC}-50)\cdot 0.4$ for urgent orders |
| **Allocation** | Auction-Based (CNP) | `hive.html` | Sealed-bid auction: $Bid = w_d d + w_b (100-\text{SOC}) + w_l \text{load} - \text{urgency}$ |
| **Safety** | ISO 3691-4 Safety Zones | `hive.html` | Caution slowdown ($d \le 3.5$m), Emergency halt ($d \le 1.8$m) + dynamic detour |

---

## 🏗️ Repository File Structure

```
slam-simulator/
├── index.html                   # ← Unified Landing page → Login → Selector Hub SPA
├── slam.html                    # ← Standalone SLAM Simulator page & estimation comparison
├── nexus.html                   # ← Standalone NEXUS Kinematics Engine (self-contained)
├── hive.html                    # ← Standalone HIVE 3D Logistics Simulator (self-contained)
├── style.css                    # ← Central shared design system (cyberpunk aesthetic)
├── vite.config.js               # ← Multi-page Vite compilation configuration
├── vercel.json                  # ← Production deployment configuration
├── package.json
│
├── public/                      # ← Static asset distribution
│   ├── slam_simulator.png       # ← SLAM Simulator preview
│   ├── nexus_simulator.png      # ← NEXUS Engine preview
│   ├── hive_simulator.png       # ← HIVE Logistics preview
│   ├── donate.jpeg              # ← Donation support QR code
│   └── vite.svg                 # ← Vite icon
│
├── src/                         # ← SLAM core modules & Shared assets
│   ├── main.js                  # ← SLAM simulation entry & loop orchestration
│   ├── Renderer.js              # ← SLAM multi-canvas compositing engine
│   ├── Environment.js           # ← Arena walls configuration manager
│   ├── Robot.js                 # ← Differential/Ackermann/Holonomic physics
│   ├── Lidar.js                 # ← Raycasting sensor with Gaussian noise modeling
│   ├── Mapper.js                # ← Bayesian occupancy grid mapper
│   ├── AStar.js                 # ← TypedArray performance-optimized A* planner
│   ├── Dijkstra.js              # ← Dijkstra navigation solver
│   ├── BugAlgorithm.js          # ← Bug2 wall-following navigation agent
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
│   ├── DynamicObstacles.js      # ← Dynamic moving walls & sliding barriers
│   ├── DynamicHumans.js         # ← Moving pedestrian models
│   ├── hive_landing.html        # ← HIVE dedicated marketing page
│   └── style.css                # ← Source CSS
│
└── smoke/                       # ← Playwright E2E automated test suite
    ├── launch.spec.js           # ← Launch test spec
    └── smoke.spec.js            # ← Simulator functionality tests
```

---

## 🛠️ Local Development & Testing

### Prerequisites
- **Node.js:** v18.0.0 or higher
- **npm:** v9.0.0 or higher

### Installation & Launch
```bash
# 1. Clone the repository
git clone https://github.com/Yashs2024/Slam-lidar-simulator.git
cd slam-lidar-simulator

# 2. Install dependencies
npm install

# 3. Start local development server
npm run dev
# Server accessible at http://localhost:5173 (or next open port)

# 4. Create production build
npm run build
npm run preview
```

### Automated End-to-End Testing
```bash
# Install Playwright browser binaries
npx playwright install

# Run the full test suite
npx playwright test
```

---

## ⚙️ Core Engineering Decisions

1. **Zero-Framework Architecture (Vanilla JS):**
   Avoiding frameworks like React or Vue eliminates virtual DOM diffing overhead and ensures raw 60 FPS animation loops when raycasting hundreds of LiDAR beams and calculating multi-joint kinematics.
2. **Multi-Layer Canvas 2D + Three.js WebGL Compositing:**
   Canvas 2D provides unmatched rasterization speed for cell-based occupancy grids and 2D arenas, while Three.js WebGL handles 3D point clouds, robot arm kinematics, and high-bay warehouse environments.
3. **TypedArray Memory Layouts:**
   Heavy real-time planners (A* and Space-Time A*) utilize pre-allocated `Uint8Array`, `Int32Array`, and `Float32Array` buffers to eliminate runtime garbage collection pauses.
4. **Modular & Self-Contained Design:**
   Both `nexus.html` and `hive.html` are architected as self-contained applications with zero external CSS/JS file dependencies—allowing them to run independently or embed seamlessly.
5. **Standardized Coordinate Transforms:**
   Discrete grid cells $(g_x, g_y) \in [0, 35]$ in HIVE 3D map cleanly to continuous world coordinates $(w_x, w_z) = ((g - \frac{N-1}{2}) \cdot \text{tileSize})$ with full orientation alignment.

---

<div align="center">
  <sub>VectraSim Suite • Engineered with 🦾 for robotics students and researchers worldwide.</sub>
</div>
