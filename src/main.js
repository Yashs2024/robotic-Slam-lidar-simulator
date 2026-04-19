import { Renderer } from './Renderer.js';
import { Environment } from './Environment.js';
import { Robot } from './Robot.js';
import { Lidar } from './Lidar.js';
import { Mapper } from './Mapper.js';
import { AStar } from './AStar.js';
import { ChartManager } from './ChartManager.js';
import { DynamicsChartManager } from './DynamicsChartManager.js'; // Added
import { FrontierExplorer } from './FrontierExplorer.js';
import { StatsTracker } from './StatsTracker.js';
import { DynamicObstacles } from './DynamicObstacles.js';
import { SoundManager } from './SoundManager.js';
import { ParticleFilter } from './ParticleFilter.js';
import { TutorialManager } from './TutorialManager.js';
import { Dijkstra } from './Dijkstra.js';
import { BugAlgorithm } from './BugAlgorithm.js';
import { SensorVisualizer } from './SensorVisualizer.js';
import { LoopClosureDetector } from './LoopClosureDetector.js';
import { PointCloudViewer } from './PointCloudViewer.js';
import { JoystickManager } from './JoystickManager.js';
import { DynamicHumans } from './DynamicHumans.js';

// ---- Application State ----
const keys = { w: false, a: false, s: false, d: false };
let currentView = 'realWorld';
let interactionMode = 'drive';
let autoExploreActive = false;
let frontierTarget = null;

// Build Mode State
let isBuilding = false;
let buildStart = null;
let buildCurrent = null;

// Track previous path state for goal-reached detection
let prevPathActive = false;

// LiDAR sweep sound throttle
let sweepSoundCounter = 0;

// ---- Core Components ----
const renderer = new Renderer();
const environment = new Environment(renderer.realWorldCanvas.width, renderer.realWorldCanvas.height);
const robot = new Robot(renderer.realWorldCanvas.width / 2, renderer.realWorldCanvas.height / 2);
const mapper = new Mapper(renderer.realWorldCanvas.width, renderer.realWorldCanvas.height, 10);
const astar = new AStar(mapper);
const dijkstra = new Dijkstra(mapper);
const bugAlgorithm = new BugAlgorithm(mapper);
let currentPathfinder = astar;
const lidar = new Lidar();
const chartManager = new ChartManager('lidarChart', lidar.maxRange);
const dynamicsChartManager = new DynamicsChartManager('dynamicsChart'); // Added
const frontierExplorer = new FrontierExplorer(mapper);
const statsTracker = new StatsTracker();
const dynamicObstacles = new DynamicObstacles(renderer.realWorldCanvas.width, renderer.realWorldCanvas.height);
const dynamicHumans = new DynamicHumans(renderer.realWorldCanvas.width, renderer.realWorldCanvas.height);
const soundManager = new SoundManager();
const particleFilter = new ParticleFilter(200);
const loopClosureDetector = new LoopClosureDetector();
// Tutorial checkpoints / signals (lightweight “did the user do it?” tracking)
const tutorialSignals = {
  goalClicks: 0,
  rayDensityChanges: 0,
  noiseChanges: 0,
};
const tutorialManager = new TutorialManager({
  getState: () => ({
    currentView,
    drift: parseInt(driftSlider?.value || '0', 10) || 0,
    rayDensity: parseInt(rayDensitySlider?.value || '0', 10) || 0,
    particleEnabled: !!particleFilter.enabled,
    loopClosureEnabled: !!loopClosureDetector.enabled,
    goalClicks: tutorialSignals.goalClicks,
    rayDensityChanges: tutorialSignals.rayDensityChanges,
    noiseChanges: tutorialSignals.noiseChanges,
  }),
});
const sensorVisualizer = new SensorVisualizer();
const pointCloudViewer = new PointCloudViewer();
const joystickManager = new JoystickManager(keys);

// Initialise the Fog of War canvas
renderer.initFogCanvas(renderer.slamCanvas.width, renderer.slamCanvas.height);

// Bind stats to DOM
statsTracker.bindDOM();

// ---- UI Bindings ----
const noiseSlider = document.getElementById('noiseSlider');
const noiseValue = document.getElementById('noiseValue');
const speedSlider = document.getElementById('speedSlider');
const speedValue = document.getElementById('speedValue');
const rayDensitySlider = document.getElementById('rayDensitySlider');
const rayDensityValue = document.getElementById('rayDensityValue');
const driftSlider = document.getElementById('driftSlider');
const driftValue = document.getElementById('driftValue');
const volumeSlider = document.getElementById('volumeSlider');
const volumeValue = document.getElementById('volumeValue');
const volumeGroup = document.getElementById('volumeGroup');

const btnRealWorld = document.getElementById('btnRealWorld');
const btnSlamMap = document.getElementById('btnSlamMap');
const btnDriveMode = document.getElementById('btnDriveMode');
const btnBuildMode = document.getElementById('btnBuildMode');
const btnAutoExplore = document.getElementById('btnAutoExplore');
const btnDynamicObs = document.getElementById('btnDynamicObs');
const btnDynamicHumans = document.getElementById('btnDynamicHumans');
const btnParticleFilter = document.getElementById('btnParticleFilter');
const particleCountSlider = document.getElementById('particleCountSlider');
const particleCountValue = document.getElementById('particleCountValue');
const particleCountGroup = document.getElementById('particleCountGroup');
const btnSoundOff = document.getElementById('btnSoundOff');
const btnSoundOn = document.getElementById('btnSoundOn');

const btnReset = document.getElementById('btnReset');
const btnClearCustom = document.getElementById('btnClearCustom');

const presetSelect = document.getElementById('presetSelect');
const btnExportMap = document.getElementById('btnExportMap');
const btnImportMap = document.getElementById('btnImportMap');
const importFileInput = document.getElementById('importFileInput');
const btnTutorial = document.getElementById('btnTutorial');
const algorithmSelect = document.getElementById('algorithmSelect');
const pathComputeTime = document.getElementById('pathComputeTime');
const driveModelSelect = document.getElementById('driveModelSelect');
const btnAlgoCompare = document.getElementById('btnAlgoCompare');
const algoComparePanel = document.getElementById('algoComparePanel');
const cmpTimeAStar = document.getElementById('cmpTimeAStar');
const cmpLenAStar = document.getElementById('cmpLenAStar');
const cmpTimeDijkstra = document.getElementById('cmpTimeDijkstra');
const cmpLenDijkstra = document.getElementById('cmpLenDijkstra');
const cmpTimeBug2 = document.getElementById('cmpTimeBug2');
const cmpLenBug2 = document.getElementById('cmpLenBug2');
const multiRobotSelect = document.getElementById('multiRobotSelect');
const chkPartnerLidar = document.getElementById('chkPartnerLidar');

const instructionsDrive = document.getElementById('instructionsDrive');
const instructionsBuild = document.getElementById('instructionsBuild');

const realWorldCanvas = document.getElementById('realWorldCanvas');
const slamCanvas = document.getElementById('slamCanvas');

const btnToggleSidebar = document.getElementById('btnToggleSidebar');
const btnToggleMobileUI = document.getElementById('btnToggleMobileUI');
const sidebarPanel = document.querySelector('.sidebar');

// ---- Algorithm Comparison Mode State ----
let algoCompareEnabled = false;
let comparePaths = null; // { astar, dijkstra, bug2 }

function computePathLength(path) {
  if (!path || path.length < 2) return 0;
  let len = 0;
  for (let i = 1; i < path.length; i++) {
    const dx = path[i].x - path[i - 1].x;
    const dy = path[i].y - path[i - 1].y;
    len += Math.sqrt(dx * dx + dy * dy);
  }
  return len;
}

function setCompareRow(elTime, elLen, name, path, ms) {
  if (!elTime || !elLen) return;
  if (!path || path.length === 0) {
    elTime.textContent = `${ms.toFixed(1)}ms`;
    elLen.textContent = 'No path';
    return;
  }
  const meters = computePathLength(path) / 100;
  elTime.textContent = `${ms.toFixed(1)}ms`;
  elLen.textContent = `${meters.toFixed(2)}m`;
}

function computeComparisonPaths(goalX, goalY) {
  const results = {};

  // A*
  {
    const t0 = performance.now();
    const path = astar.findPath(robot.x, robot.y, goalX, goalY);
    const ms = performance.now() - t0;
    results.astar = path;
    setCompareRow(cmpTimeAStar, cmpLenAStar, 'A*', path, ms);
  }
  // Dijkstra
  {
    const t0 = performance.now();
    const path = dijkstra.findPath(robot.x, robot.y, goalX, goalY);
    const ms = performance.now() - t0;
    results.dijkstra = path;
    setCompareRow(cmpTimeDijkstra, cmpLenDijkstra, 'Dijkstra', path, ms);
  }
  // Bug2
  {
    const t0 = performance.now();
    const path = bugAlgorithm.findPath(robot.x, robot.y, goalX, goalY);
    const ms = performance.now() - t0;
    results.bug2 = path;
    setCompareRow(cmpTimeBug2, cmpLenBug2, 'Bug2', path, ms);
  }

  return results;
}

const PARTNER_TRAIL_COLORS = ['#a855f7', '#f97316', '#22d3d1'];
const PARTNER_COLORS = ['#3B82F6', '#a855f7', '#f97316', '#22d3d1']; // Robot 0 = main (blue)
const ROBOT_NAMES = ['ALPHA', 'BETA', 'GAMMA', 'DELTA'];
const PARTNER_RAY_STYLES = [
  { strokeHit: 'rgba(168, 85, 247, 0.45)', strokeFree: 'rgba(168, 85, 247, 0.12)', hitDot: '#d8b4fe' },
  { strokeHit: 'rgba(249, 115, 22, 0.45)', strokeFree: 'rgba(249, 115, 22, 0.12)', hitDot: '#fdba74' },
  { strokeHit: 'rgba(34, 211, 209, 0.45)', strokeFree: 'rgba(34, 211, 209, 0.12)', hitDot: '#5eead4' },
];

/** Secondary robots: collaborative mapping into the same occupancy grid */
let partnerRobots = [];
/** Latest partner scans (aligned with partnerRobots indices) for rendering only */
let partnerScanHitsCache = [];
/** Per-partner frontier explorer instances */
let partnerExplorers = [];
/** Per-partner A* pathfinder instances */
let partnerPathfinders = [];
/** Per-partner cooldown counters */
let partnerFrontierCooldowns = [];
/** Per-partner distance tracking */
let partnerDistances = [];
let partnerLastPositions = [];
/** Per-partner status: 'idle' | 'navigating' | 'exploring' */
let partnerStatuses = [];
/** Per-partner cells explored at last sample (for individual %) */
let partnerExploredCells = [];
/** Last DOM update time for dashboard */
let lastDashboardUpdate = 0;

// Dashboard DOM refs (populated lazily)
const elCombinedPct  = () => document.getElementById('mrdCombinedPct');
const elCombinedBar  = () => document.getElementById('mrdCombinedBar');
const elRobotCards   = () => document.getElementById('mrdRobotCards');
const elMRDPanel     = () => document.getElementById('multiRobotDashboard');
const chkPartnerAutoExplore = () => document.getElementById('chkPartnerAutoExplore');

/** Build/rebuild the per-robot card elements inside the dashboard */
function buildDashboardCards(numRobots) {
  const container = elRobotCards();
  if (!container) return;
  container.innerHTML = '';
  for (let i = 0; i < numRobots; i++) {
    const rIdx = i; // 0 = main robot, 1..n = partners
    container.innerHTML += `
      <div class="mrd-robot-card r${rIdx}" id="mrdCard${rIdx}">
        <div class="mrd-robot-header">
          <span class="mrd-robot-name r${rIdx}">${ROBOT_NAMES[rIdx]}</span>
          <span class="mrd-robot-status idle" id="mrdStatus${rIdx}">IDLE</span>
        </div>
        <div class="mrd-robot-pct-row">
          <span class="mrd-robot-pct-val r${rIdx}" id="mrdPct${rIdx}">0%</span>
          <div class="mrd-robot-mini-bar"><div class="mrd-robot-mini-fill r${rIdx}" id="mrdBar${rIdx}" style="width:0%"></div></div>
        </div>
        <div class="mrd-robot-dist" id="mrdDist${rIdx}">0.0 m travelled</div>
      </div>`;
  }
}

/** Update (or hide) the Fleet Status dashboard */
function updateFleetDashboard(numRobots, allScanHits) {
  const now = performance.now();
  if (now - lastDashboardUpdate < 300) return; // Update at ~3fps
  lastDashboardUpdate = now;

  const panel = elMRDPanel();
  if (!panel) return;

  if (numRobots <= 1) {
    panel.style.display = 'none';
    return;
  }
  panel.style.display = 'block';

  // Combined explored %
  const total = mapper.grid.length;
  let known = 0;
  for (let i = 0; i < total; i++) { if (mapper.grid[i] !== 0) known++; }
  const combinedPct = ((known / total) * 100).toFixed(1);
  const cpEl = elCombinedPct();
  if (cpEl) cpEl.textContent = `${combinedPct}%`;
  const cbEl = elCombinedBar();
  if (cbEl) cbEl.style.width = `${Math.min(100, parseFloat(combinedPct))}%`;

  // Per-robot updates
  for (let i = 0; i < numRobots; i++) {
    const pctEl   = document.getElementById(`mrdPct${i}`);
    const barEl   = document.getElementById(`mrdBar${i}`);
    const distEl  = document.getElementById(`mrdDist${i}`);
    const statEl  = document.getElementById(`mrdStatus${i}`);
    if (!pctEl) continue;

    // Individual explored pct = cells this robot has covered (we track via scan footprint)
    const indivPct = (partnerExploredCells[i] || 0).toFixed(1);
    pctEl.textContent = `${indivPct}%`;
    barEl.style.width  = `${Math.min(100, parseFloat(indivPct))}%`;

    // Distance
    const dist = ((partnerDistances[i] || 0) / 100).toFixed(1);
    distEl.textContent = `${dist} m travelled`;

    // Status badge
    const rawStatus = partnerStatuses[i] || 'idle';
    statEl.textContent = rawStatus.toUpperCase();
    statEl.className = `mrd-robot-status ${rawStatus}`;
  }
}

/** Count individual cells explored approx from scan hits */
function sampleRobotExplored(robotIndex, scanHits) {
  // Approximate individual contribution as fraction of grid cells near this robot's scanned rays
  const total = mapper.grid.length;
  let known = 0;
  // Simple heuristic: count known cells in a 180px radius of the robot
  // For performance we use a cheap sampled scan over the whole grid once combined already
  // Instead track a per-robot "known delta" set — lightweight approach:
  // We reuse the mapper grid (shared). For per-robot % we track cells each robot personally updates.
  // Simple approximation: each robot's % = its distance contribution relative to all robots.
  if (partnerDistances[0] !== undefined) {
    const totalDist = partnerDistances.reduce((s, v) => s + (v || 0), 0);
    if (totalDist > 0) {
      const total = mapper.grid.length;
      let globalKnown = 0;
      for (let i = 0; i < total; i++) { if (mapper.grid[i] !== 0) globalKnown++; }
      const globalPct = (globalKnown / total) * 100;
      // Weight each robot's % by dist share
      const myShare = (partnerDistances[robotIndex] || 0) / totalDist;
      return (globalPct * myShare);
    }
  }
  return 0;
}

function rebuildPartnerRobots() {
  partnerRobots = [];
  partnerExplorers = [];
  partnerPathfinders = [];
  partnerFrontierCooldowns = [];
  partnerDistances = [0]; // index 0 = main robot
  partnerLastPositions = [{ x: robot.x, y: robot.y }];
  partnerStatuses = ['idle']; // index 0 = main robot
  partnerExploredCells = [0];

  const total = Math.max(1, Math.min(4, parseInt(multiRobotSelect?.value || '1', 10) || 1));
  const n = total - 1;
  const cx = robot.x;
  const cy = robot.y;

  for (let i = 0; i < n; i++) {
    const a = (i / Math.max(1, n)) * Math.PI * 2;
    const spawnX = cx + Math.cos(a) * 60;
    const spawnY = cy + Math.sin(a) * 60;
    // Find safe spawn — try nearby offsets if colliding
    const spawn = environment.findSafeSpawn ? environment.findSafeSpawn(20) : { x: spawnX, y: spawnY };
    const pr = new Robot(spawn.x, spawn.y);
    pr.setDriveModel('differential');
    pr.setSpeedMultiplier(robot.maxSpeed * 0.85);
    pr.setDrift(0);
    pr.theta = Math.random() * Math.PI * 2;
    partnerRobots.push(pr);
    partnerExplorers.push(new FrontierExplorer(mapper));
    partnerPathfinders.push(new AStar(mapper));
    partnerFrontierCooldowns.push(0);
    partnerDistances.push(0);
    partnerLastPositions.push({ x: spawn.x, y: spawn.y });
    partnerStatuses.push('idle');
    partnerExploredCells.push(0);
  }

  // Rebuild dashboard cards
  buildDashboardCards(total);
}

/** Reactive LiDAR-based wall avoidance: returns a steering delta angle */
function computeLidarAvoidance(robot, scanHits) {
  if (!scanHits || scanHits.length === 0) return 0;
  const DANGER_DIST = robot.radius * 4.5;
  let avoidX = 0, avoidY = 0;
  let dangerCount = 0;
  for (const hit of scanHits) {
    if (!hit.hit) continue;
    if (hit.distance > DANGER_DIST) continue;
    // Repulsion force from the hit point
    const dx = robot.x - hit.x;
    const dy = robot.y - hit.y;
    const d = Math.max(1, hit.distance);
    const force = (DANGER_DIST - d) / DANGER_DIST;
    avoidX += (dx / d) * force;
    avoidY += (dy / d) * force;
    dangerCount++;
  }
  if (dangerCount === 0) return 0;
  const avoidAngle = Math.atan2(avoidY, avoidX);
  let diff = avoidAngle - robot.theta;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return diff * 0.04; // gentle correction
}

/** Main per-frame update for a single partner robot */
function updatePartnerRobot(pr, pi, scanHits) {
  const autoExplore = chkPartnerAutoExplore();
  const shouldAutoExplore = !autoExplore || autoExplore.checked;

  // Track distance
  const lp = partnerLastPositions[pi + 1]; // +1 offset (index 0 = main)
  if (lp) {
    const dx = pr.x - lp.x;
    const dy = pr.y - lp.y;
    const step = Math.sqrt(dx * dx + dy * dy);
    if (step > 0.1) partnerDistances[pi + 1] += step;
    lp.x = pr.x;
    lp.y = pr.y;
  }

  // If autonomous explore is OFF — just sit still
  if (!shouldAutoExplore) {
    pr.forwardSpeed = 0;
    pr.turnSpeed = 0;
    partnerStatuses[pi + 1] = 'idle';
    return pr.update(environment, dynamicHumans);
  }

  // Reactive LiDAR wall avoidance (override path if too close)
  const avoidDelta = computeLidarAvoidance(pr, scanHits);
  const DANGER_DIST_HARD = pr.radius * 3.0;
  let hardDanger = false;
  if (scanHits) {
    for (const h of scanHits) {
      if (h.hit && h.distance < DANGER_DIST_HARD) { hardDanger = true; break; }
    }
  }

  if (hardDanger) {
    // Emergency: drop path and turn away
    pr.path = null;
    pr.forwardSpeed = pr.maxSpeed * 0.4;
    pr.turnSpeed = (avoidDelta !== 0 ? Math.sign(avoidDelta) : (Math.random() > 0.5 ? 1 : -1)) * pr.maxTurn * 0.8;
    partnerStatuses[pi + 1] = 'navigating';
    return pr.update(environment, dynamicHumans);
  }

  // If following a path, apply gentle avoidance bias
  if (pr.path && pr.pathIndex < pr.path.length) {
    partnerStatuses[pi + 1] = 'navigating';
    pr.turnSpeed += avoidDelta * 0.5;
    return pr.update(environment, dynamicHumans);
  }

  // Frontier exploration logic
  partnerFrontierCooldowns[pi]++;
  if (partnerFrontierCooldowns[pi] < 40) {
    partnerStatuses[pi + 1] = 'idle';
    pr.forwardSpeed = 0;
    pr.turnSpeed = 0;
    return pr.update(environment, dynamicHumans);
  }
  partnerFrontierCooldowns[pi] = 0;

  const explorer = partnerExplorers[pi];
  const pathfinder = partnerPathfinders[pi];

  let target = explorer.findBestFrontierExcluding(pr.x, pr.y, robot.x, robot.y, partnerRobots.map(r => ({ x: r.x, y: r.y })), pi);
  if (!target) {
    target = explorer.findBestFrontier(pr.x, pr.y);
  }

  if (target) {
    const path = pathfinder.findPath(pr.x, pr.y, target.x, target.y);
    if (path && path.length > 0) {
      pr.setPath(path);
      partnerStatuses[pi + 1] = 'exploring';
    } else {
      // No path — spin and retry
      pr.forwardSpeed = 0;
      pr.turnSpeed = pr.maxTurn * (Math.random() > 0.5 ? 1 : -1);
      partnerFrontierCooldowns[pi] = 20;
      partnerStatuses[pi + 1] = 'idle';
    }
  } else {
    // Fully explored — wander
    pr.forwardSpeed = pr.maxSpeed * 0.5;
    pr.turnSpeed = (Math.random() - 0.5) * pr.maxTurn;
    partnerStatuses[pi + 1] = 'exploring';
  }

  return pr.update(environment, dynamicHumans);
}

function updatePartnerPatrol(timestamp) {
  // Legacy stub — real logic moved to updatePartnerRobot
}

function resetSimulation() {
  mapper.clear();
  renderer.resetFog();

  // Find a spawn position that doesn't collide with walls
  const spawn = environment.findSafeSpawn(robot.radius);
  robot.x = spawn.x;
  robot.y = spawn.y;
  robot.theta = 0;
  robot.believedX = robot.x;
  robot.believedY = robot.y;
  robot.believedTheta = 0;
  robot.path = null;
  robot.resetTrails();
  statsTracker.reset();
  frontierTarget = null;
  autoExploreActive = false;
  btnAutoExplore.classList.remove('active');
  btnAutoExplore.textContent = '🧭 Auto Explore';
  prevPathActive = false;

  // Regenerate dynamic obstacles for the new map
  dynamicObstacles.generate();
  if (dynamicHumans.enabled) {
    dynamicHumans.generate();
  }

  // Reset particle filter if active
  if (particleFilter.enabled) {
    particleFilter.init(robot.x, robot.y, 0);
  }

  rebuildPartnerRobots();
}


function setupEventListeners() {
  // Tutorial
  btnTutorial.addEventListener('click', () => {
    tutorialManager.start();
  });

  // Algorithm Compare Toggle
  btnAlgoCompare?.addEventListener('click', () => {
    algoCompareEnabled = !algoCompareEnabled;
    if (algoComparePanel) {
      algoComparePanel.style.display = algoCompareEnabled ? 'block' : 'none';
    }
    btnAlgoCompare.classList.toggle('active', algoCompareEnabled);
    btnAlgoCompare.textContent = algoCompareEnabled ? 'Comparison: ON' : 'Compare Algorithms';
    comparePaths = null;
  });

  // Sidebar Toggle
  btnToggleSidebar.addEventListener('click', () => {
    sidebarPanel.classList.toggle('collapsed');
    btnToggleSidebar.classList.toggle('open');
  });

  // Mobile UI Toggle
  btnToggleMobileUI.addEventListener('click', () => {
    document.body.classList.toggle('mobile-mode');
    btnToggleMobileUI.classList.toggle('active');

    // Resize canvasses after CSS transition
    setTimeout(() => {
      if (renderer && renderer.resizeCanvas) {
        renderer.resizeCanvas();
        const w = renderer.realWorldCanvas.width;
        const h = renderer.realWorldCanvas.height;
        environment.resize(w, h);
        mapper.resize(w, h);
        dynamicObstacles.resize(w, h);
        dynamicHumans.resize(w, h);
        renderer.initFogCanvas(w, h);
      }
    }, 400); // Wait for 0.4s sidebar animation
  });

  // Keyboard
  window.addEventListener('keydown', (e) => {
    if (interactionMode !== 'drive') return;
    if (keys.hasOwnProperty(e.key.toLowerCase())) {
      keys[e.key.toLowerCase()] = true;
      // Manual input cancels auto-explore
      if (autoExploreActive) {
        autoExploreActive = false;
        btnAutoExplore.classList.remove('active');
        btnAutoExplore.textContent = '🧭 Auto Explore';
        frontierTarget = null;
      }
    }
  });

  window.addEventListener('keyup', (e) => {
    if (keys.hasOwnProperty(e.key.toLowerCase())) {
      keys[e.key.toLowerCase()] = false;
    }
  });

  // Sliders
  noiseSlider.addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    noiseValue.textContent = `${val}%`;
    lidar.setParameters(lidar.numRays, val);
    tutorialSignals.noiseChanges++;
  });

  speedSlider.addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    speedValue.textContent = `${val}x`;
    robot.setSpeedMultiplier(val);
    partnerRobots.forEach((pr) => pr.setSpeedMultiplier(val));
  });

  rayDensitySlider.addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    rayDensityValue.textContent = `${val} Rays`;
    lidar.setParameters(val, lidar.noisePercent);
    tutorialSignals.rayDensityChanges++;
  });

  driftSlider.addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    driftValue.textContent = val === 0 ? 'Off' : `${val}`;
    robot.setDrift(val);
  });

  volumeSlider.addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    volumeValue.textContent = `${val}%`;
    soundManager.setVolume(val / 100);
  });

  // View Toggles
  const btn3DView = document.getElementById('btn3DView');
  const pointCloudContainer = document.getElementById('pointCloudContainer');

  function switchView(view) {
    currentView = view;
    btnRealWorld.classList.toggle('active', view === 'realWorld');
    btnSlamMap.classList.toggle('active', view === 'slam');
    btn3DView.classList.toggle('active', view === '3d');
    realWorldCanvas.classList.toggle('hidden', view !== 'realWorld');
    slamCanvas.classList.toggle('hidden', view !== 'slam');
    pointCloudContainer.classList.toggle('hidden', view !== '3d');
    pointCloudViewer.setEnabled(view === '3d');
  }

  btnRealWorld.addEventListener('click', () => switchView('realWorld'));
  btnSlamMap.addEventListener('click', () => switchView('slam'));
  btn3DView.addEventListener('click', () => switchView('3d'));

  btnDriveMode.addEventListener('click', () => {
    interactionMode = 'drive';
    btnDriveMode.classList.add('active');
    btnBuildMode.classList.remove('active');
    instructionsDrive.classList.remove('hidden');
    instructionsBuild.classList.add('hidden');
  });

  btnBuildMode.addEventListener('click', () => {
    interactionMode = 'build';
    btnBuildMode.classList.add('active');
    btnDriveMode.classList.remove('active');
    instructionsBuild.classList.remove('hidden');
    instructionsDrive.classList.add('hidden');
    robot.path = null;
    robot.forwardSpeed = 0;
    robot.turnSpeed = 0;
    autoExploreActive = false;
    btnAutoExplore.classList.remove('active');
    btnAutoExplore.textContent = '🧭 Auto Explore';
    frontierTarget = null;
    btnRealWorld.click();
  });

  // Auto Explore Toggle
  btnAutoExplore.addEventListener('click', () => {
    autoExploreActive = !autoExploreActive;
    if (autoExploreActive) {
      btnAutoExplore.classList.add('active');
      btnAutoExplore.textContent = '⏹️ Stop Exploring';
      btnSlamMap.click();
      interactionMode = 'drive';
      btnDriveMode.classList.add('active');
      btnBuildMode.classList.remove('active');
      instructionsDrive.classList.remove('hidden');
      instructionsBuild.classList.add('hidden');
    } else {
      btnAutoExplore.classList.remove('active');
      btnAutoExplore.textContent = '🧭 Auto Explore';
      robot.path = null;
      robot.forwardSpeed = 0;
      robot.turnSpeed = 0;
      frontierTarget = null;
    }
  });

  // Dynamic Obstacles Toggle
  btnDynamicObs.addEventListener('click', () => {
    const nowEnabled = !dynamicObstacles.enabled;
    dynamicObstacles.setEnabled(nowEnabled);
    if (nowEnabled) {
      btnDynamicObs.classList.add('active');
      btnDynamicObs.textContent = '⏹️ Stop Obstacles';
      dynamicObstacles.generate();
    } else {
      btnDynamicObs.classList.remove('active');
      btnDynamicObs.textContent = '🔮 Dynamic Obstacles';
      environment.setDynamicWalls([]);
    }
  });

  // Dynamic Humans Toggle
  if (btnDynamicHumans) {
    btnDynamicHumans.addEventListener('click', () => {
      const nowEnabled = !dynamicHumans.enabled;
      dynamicHumans.setEnabled(nowEnabled);
      if (nowEnabled) {
        btnDynamicHumans.classList.add('active');
        btnDynamicHumans.textContent = '⏹️ Stop Workers';
      } else {
        btnDynamicHumans.classList.remove('active');
        btnDynamicHumans.textContent = '👷‍♂️ Moving Workers';
      }
    });
  }

  // Particle Filter Toggle
  btnParticleFilter.addEventListener('click', () => {
    const nowEnabled = !particleFilter.enabled;
    particleFilter.setEnabled(nowEnabled);
    if (nowEnabled) {
      btnParticleFilter.classList.add('active');
      btnParticleFilter.textContent = '⏹️ Stop Particles';
      particleCountGroup.style.display = 'flex';
      particleFilter.init(robot.x, robot.y, robot.theta);
    } else {
      btnParticleFilter.classList.remove('active');
      btnParticleFilter.textContent = '🎯 Particle Filter';
      particleCountGroup.style.display = 'none';
    }
  });

  // Loop Closure Toggle
  const btnLoopClosure = document.getElementById('btnLoopClosure');
  btnLoopClosure.addEventListener('click', () => {
    const nowEnabled = !loopClosureDetector.enabled;
    loopClosureDetector.setEnabled(nowEnabled);
    if (nowEnabled) {
      btnLoopClosure.classList.add('active');
      btnLoopClosure.textContent = '⏹️ Stop Loop Closure';
    } else {
      btnLoopClosure.classList.remove('active');
      btnLoopClosure.textContent = '🔗 Loop Closure';
    }
  });

  particleCountSlider.addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    particleCountValue.textContent = `${val}`;
    particleFilter.setCount(val);
    particleFilter.init(robot.x, robot.y, robot.theta);
  });

  // Sound Toggle
  btnSoundOn.addEventListener('click', () => {
    soundManager.setEnabled(true);
    btnSoundOn.classList.add('active');
    btnSoundOff.classList.remove('active');
    volumeGroup.style.display = 'flex';
  });

  btnSoundOff.addEventListener('click', () => {
    soundManager.setEnabled(false);
    btnSoundOff.classList.add('active');
    btnSoundOn.classList.remove('active');
    volumeGroup.style.display = 'none';
  });

  // Reset Map
  btnReset.addEventListener('click', () => {
    presetSelect.value = 'random';
    environment.generateRandomMap();
    resetSimulation();
  });

  btnClearCustom.addEventListener('click', () => {
    environment.clearCustomWalls();
    mapper.clear();
  });

  // ── Drive Model Selector ──
  driveModelSelect.addEventListener('change', (e) => {
    robot.setDriveModel(e.target.value);
    // Update instructions per model
    const drives = {
      differential: 'W/S: Forward/Back · A/D: Turn Left/Right',
      ackermann: 'W/S: Accelerate/Brake · A/D: Steer Left/Right',
      holonomic: 'W/S: Forward/Back · A/D: Strafe Left/Right'
    };
    instructionsDrive.textContent = drives[e.target.value] || drives.differential;
  });

  // ── Algorithm Selector ──
  algorithmSelect.addEventListener('change', (e) => {
    const algo = e.target.value;
    switch (algo) {
      case 'dijkstra': currentPathfinder = dijkstra; break;
      case 'bug2': currentPathfinder = bugAlgorithm; break;
      default: currentPathfinder = astar; break;
    }
    pathComputeTime.textContent = '';
    robot.path = null;
    robot.forwardSpeed = 0;
    robot.turnSpeed = 0;
  });

  // ── Environment Presets ──
  presetSelect.addEventListener('change', (e) => {
    const preset = e.target.value;
    if (preset === 'random') {
      environment.generateRandomMap();
    } else {
      environment.loadPreset(preset);
    }
    resetSimulation();
  });

  multiRobotSelect?.addEventListener('change', () => {
    rebuildPartnerRobots();
  });

  // ── Map Export ──
  btnExportMap.addEventListener('click', () => {
    const json = environment.exportWalls();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'slam-map.json';
    a.click();
    URL.revokeObjectURL(url);
  });

  // ── Map Import ──
  btnImportMap.addEventListener('click', () => {
    importFileInput.click();
  });

  importFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const success = environment.importWalls(evt.target.result);
      if (success) {
        resetSimulation();
        presetSelect.value = 'random';
      }
    };
    reader.readAsText(file);
    importFileInput.value = '';
  });

  // Mouse Click for Autonomous Pathfinding
  slamCanvas.addEventListener('mousedown', (e) => {
    if (interactionMode !== 'drive') return;

    const rect = slamCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (algoCompareEnabled) {
      comparePaths = computeComparisonPaths(x, y);
    }

    const t0 = performance.now();
    const path = currentPathfinder.findPath(robot.x, robot.y, x, y);
    const dt = (performance.now() - t0).toFixed(1);
    pathComputeTime.textContent = `${currentPathfinder.name || 'A*'} · ${dt}ms`;
    if (path.length > 0) {
      tutorialSignals.goalClicks++;
      robot.setPath(path);
      if (autoExploreActive) {
        autoExploreActive = false;
        btnAutoExplore.classList.remove('active');
        btnAutoExplore.textContent = '🧭 Auto Explore';
        frontierTarget = null;
      }
    }
  });

  // Mouse Drag for Building Custom Walls
  realWorldCanvas.addEventListener('mousedown', (e) => {
    if (interactionMode !== 'build') return;
    isBuilding = true;
    const rect = realWorldCanvas.getBoundingClientRect();
    buildStart = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    buildCurrent = { ...buildStart };
  });

  realWorldCanvas.addEventListener('mousemove', (e) => {
    if (!isBuilding || interactionMode !== 'build') return;
    const rect = realWorldCanvas.getBoundingClientRect();
    buildCurrent = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  });

  const commitWall = () => {
    if (!isBuilding) return;
    isBuilding = false;

    const dx = buildCurrent.x - buildStart.x;
    const dy = buildCurrent.y - buildStart.y;
    if (Math.sqrt(dx * dx + dy * dy) > 10) {
      environment.addCustomWall(buildStart, buildCurrent);
      mapper.clear();
    }
    buildStart = null;
    buildCurrent = null;
  };

  realWorldCanvas.addEventListener('mouseup', commitWall);
  realWorldCanvas.addEventListener('mouseleave', commitWall);
}


// ---- Frontier Exploration Logic ----
let frontierCooldown = 0;

function handleFrontierExploration() {
  if (!autoExploreActive) return;

  if (robot.path && robot.pathIndex < robot.path.length) return;

  frontierCooldown++;
  if (frontierCooldown < 30) return;
  frontierCooldown = 0;

  const target = frontierExplorer.findBestFrontier(robot.x, robot.y);
  frontierTarget = target;

  if (target) {
    const path = currentPathfinder.findPath(robot.x, robot.y, target.x, target.y);
    if (path.length > 0) {
      robot.setPath(path);
    } else {
      frontierCooldown = 15;
    }
  } else {
    // No more frontiers — map fully explored!
    autoExploreActive = false;
    btnAutoExplore.classList.remove('active');
    btnAutoExplore.textContent = '✅ Fully Explored';
    soundManager.playExplorationComplete();
  }
}


// ---- Page Transition Logic ----
const landingPage = document.getElementById('landingPage');
const appSimulator = document.getElementById('app');
const btnGetStarted = document.getElementById('btnGetStarted');

let isSimulatorRunning = false;

function launchSimulator() {
  if (landingPage) landingPage.style.display = 'none';
  const simNav = document.getElementById('sim-nav');
  if (simNav) simNav.style.display = 'flex';
  appSimulator.style.display = 'flex'; // Use flex to maintain sidebar/canvas layout

  // Now that #app is visible, resize canvases to fit the actual container
  renderer.resizeCanvas();

  // Re-initialize environment and robot with the correct canvas dimensions
  const w = renderer.realWorldCanvas.width;
  const h = renderer.realWorldCanvas.height;
  environment.resize(w, h);
  mapper.resize(w, h);
  dynamicObstacles.resize(w, h);
  renderer.initFogCanvas(w, h);
  robot.x = w / 2;
  robot.y = h / 2;
  robot.believedX = robot.x;
  robot.believedY = robot.y;

  // Start the simulator loop only now
  if (!isSimulatorRunning) {
    isSimulatorRunning = true;
    lastTime = performance.now();
    requestAnimationFrame(gameLoop);
  }
}

if (btnGetStarted) {
  btnGetStarted.addEventListener('click', () => {
    launchSimulator();
  });
}

const btnDonate = document.getElementById('btnDonate');
const donateModal = document.getElementById('donateModal');
const btnDonateClose = document.getElementById('btnDonateClose');

if (btnDonate) {
  btnDonate.addEventListener('click', () => {
    donateModal.style.display = 'flex';
  });
}

if (btnDonateClose) {
  btnDonateClose.addEventListener('click', () => {
    donateModal.style.display = 'none';
  });
}

// Close if clicked outside
window.addEventListener('click', (e) => {
  if (e.target === donateModal) {
    donateModal.style.display = 'none';
  }
});

// ---- Main Loop ----
let lastTime = 0;
function gameLoop(timestamp) {
  if (!isSimulatorRunning) return;
  requestAnimationFrame(gameLoop); // Changed from animate to gameLoop

  // 1. Process Input
  robot.applyInput(keys);

  // 2. Update Dynamic Obstacles
  dynamicObstacles.update();
  environment.setDynamicWalls(dynamicObstacles.getWalls());

  // 3. Update Physics (returns true if wall collision)
  if (dynamicHumans.enabled) dynamicHumans.update(environment);
  const hitWall = robot.update(environment, dynamicHumans);

  // Track main robot distance for fleet dashboard
  {
    const lp = partnerLastPositions[0];
    if (lp) {
      const dx = robot.x - lp.x;
      const dy = robot.y - lp.y;
      const step = Math.sqrt(dx * dx + dy * dy);
      if (step > 0.1) partnerDistances[0] += step;
      lp.x = robot.x;
      lp.y = robot.y;
    }
    partnerStatuses[0] = (robot.path && robot.pathIndex < robot.path.length) ? 'navigating' : (autoExploreActive ? 'exploring' : 'idle');
  }

  updatePartnerPatrol(timestamp);

  // 4. Sound: collision bump
  if (hitWall) {
    soundManager.playCollision();
  }

  // 5. Sensor Update (LiDAR Raycasting)
  const scanHits = lidar.scan(robot, environment, dynamicHumans);

  partnerScanHitsCache = [];
  for (let pi = 0; pi < partnerRobots.length; pi++) {
    const pr = partnerRobots[pi];
    const ph = lidar.scan(pr, environment, dynamicHumans);
    mapper.updateMap(pr, ph);
    // Run autonomous exploration logic for this partner
    updatePartnerRobot(pr, pi, ph);
    partnerScanHitsCache.push(ph);
  }

  // 5b. Particle Filter update
  if (particleFilter.enabled) {
    particleFilter.predict(robot.forwardSpeed, robot.turnSpeed);
    particleFilter.update(scanHits, environment);
    particleFilter.resample();
  }

  // 6. Sound: sweep tick (every 6 frames for subtle effect)
  sweepSoundCounter++;
  if (sweepSoundCounter >= 6) {
    sweepSoundCounter = 0;
    soundManager.playSweepTick();
  }

  // 7. SLAM Mapping
  mapper.updateMap(robot, scanHits);

  // 8. Update Live Charts
  chartManager.updateData(scanHits);
  dynamicsChartManager.updateData(robot);

  // 8b. Update Sensor HUD
  sensorVisualizer.update(robot, scanHits);

  // 8c. Loop Closure Detection
  if (loopClosureDetector.enabled) {
    loopClosureDetector.addKeyframe(robot, scanHits);
    const closureResult = loopClosureDetector.checkForClosure(robot, scanHits);
    if (closureResult.detected) {
      loopClosureDetector.applyCorrection(robot, closureResult.correction);
    }
    loopClosureDetector.updateIndicator();
  }

  // 9. Update Stats
  statsTracker.update(robot, mapper, hitWall);

  // 9b. Update per-robot explored %
  const numRobots = 1 + partnerRobots.length;
  for (let i = 0; i < numRobots; i++) {
    partnerExploredCells[i] = sampleRobotExplored(i);
  }

  // 9c. Fleet dashboard
  updateFleetDashboard(numRobots, partnerScanHitsCache);

  // 9d. Update 3D Point Cloud
  if (currentView === '3d') {
    pointCloudViewer.update(robot, scanHits, renderer.realWorldCanvas.width, renderer.realWorldCanvas.height);
  }

  // 10. Detect goal reached (path was active, now it's null)
  const pathActive = !!(robot.path && robot.pathIndex < robot.path.length);
  if (prevPathActive && !pathActive && !autoExploreActive) {
    soundManager.playGoalReached();
  }
  prevPathActive = pathActive;

  // 11. Frontier Exploration
  handleFrontierExploration();

  if (tutorialManager.active) {
    tutorialManager.tick();
  }

  // 12. Draw Frame
  renderer.clear();

  if (currentView === 'realWorld') {
    renderer.drawEnvironment(environment, renderer.realWorldCtx);
    renderer.drawDynamicObstacles(dynamicObstacles, renderer.realWorldCtx);
    renderer.drawHumans(dynamicHumans, renderer.realWorldCtx);
    lidar.drawRays(scanHits, robot, renderer.realWorldCtx);
    partnerRobots.forEach((pr, pi) => {
      if (chkPartnerLidar?.checked) {
        const ph = partnerScanHitsCache[pi];
        if (ph) {
          lidar.drawRays(ph, pr, renderer.realWorldCtx, PARTNER_RAY_STYLES[pi % PARTNER_RAY_STYLES.length]);
        }
      }
      renderer.drawTrail(pr.trueTrail, PARTNER_TRAIL_COLORS[pi % PARTNER_TRAIL_COLORS.length], renderer.realWorldCtx);
      renderer.drawRobot(pr, renderer.realWorldCtx);
    });
    renderer.drawTrail(robot.trueTrail, '#1E90FF', renderer.realWorldCtx);
    renderer.drawPath(robot.path, renderer.realWorldCtx);
    renderer.drawRobot(robot, renderer.realWorldCtx);
    renderer.drawBelievedRobot(robot, renderer.realWorldCtx);

    // Draw particle cloud
    if (particleFilter.enabled) {
      renderer.drawParticles(particleFilter.getParticles(), renderer.realWorldCtx);
    }

    // Draw loop closure indicator
    if (loopClosureDetector.enabled) {
      loopClosureDetector.drawIndicator(renderer.realWorldCtx, renderer.realWorldCanvas.width);
    }

    if (isBuilding && buildStart && buildCurrent) {
      renderer.drawBuildLine(buildStart, buildCurrent, renderer.realWorldCtx);
    }
  } else {
    // 1. Draw the discovered occupancy grid
    mapper.drawMap(renderer.slamCtx);
    // 2. Update fog
    renderer.drawFogOfWar(scanHits, robot);
    // 3. Composite fog
    renderer.drawFogOverlay(renderer.slamCtx);
    // 4. Draw believed trajectory trail
    renderer.drawTrail(robot.believedTrail, '#f59e0b', renderer.slamCtx);
    // 5. Draw paths (comparison overlays first)
    if (algoCompareEnabled && comparePaths) {
      renderer.drawPath(comparePaths.astar, renderer.slamCtx, { color: '#10b981', lineWidth: 2, dashPattern: [8, 8] });
      renderer.drawPath(comparePaths.dijkstra, renderer.slamCtx, { color: '#06b6d4', lineWidth: 2, dashPattern: [4, 6] });
      renderer.drawPath(comparePaths.bug2, renderer.slamCtx, { color: '#f59e0b', lineWidth: 2, dashPattern: [2, 6] });
    }
    renderer.drawPath(robot.path, renderer.slamCtx, { color: '#22c55e', lineWidth: 3, dashPattern: [10, 10] });
    // 6. Draw frontier target
    if (autoExploreActive) {
      renderer.drawFrontierTarget(frontierTarget, renderer.slamCtx);
    }
    // 7. Draw robot
    partnerRobots.forEach((pr, pi) => {
      if (chkPartnerLidar?.checked) {
        const ph = partnerScanHitsCache[pi];
        if (ph) {
          lidar.drawRays(ph, pr, renderer.slamCtx, PARTNER_RAY_STYLES[pi % PARTNER_RAY_STYLES.length]);
        }
      }
      renderer.drawTrail(pr.trueTrail, PARTNER_TRAIL_COLORS[pi % PARTNER_TRAIL_COLORS.length], renderer.slamCtx);
      renderer.drawRobot(pr, renderer.slamCtx);
    });
    renderer.drawRobot(robot, renderer.slamCtx);
    // 8. Draw noisy rays
    lidar.drawRays(scanHits, robot, renderer.slamCtx);
  }
}

// Bootstrap
setupEventListeners();
joystickManager.init();
lidar.setParameters(parseInt(rayDensitySlider.value), parseInt(noiseSlider.value));
robot.setSpeedMultiplier(parseInt(speedSlider.value));
robot.setDrift(parseInt(driftSlider.value));
rebuildPartnerRobots();
