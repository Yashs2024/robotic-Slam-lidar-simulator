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
const tutorialManager = new TutorialManager();
const sensorVisualizer = new SensorVisualizer();
const loopClosureDetector = new LoopClosureDetector();
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

const instructionsDrive = document.getElementById('instructionsDrive');
const instructionsBuild = document.getElementById('instructionsBuild');

const realWorldCanvas = document.getElementById('realWorldCanvas');
const slamCanvas = document.getElementById('slamCanvas');

const btnToggleSidebar = document.getElementById('btnToggleSidebar');
const btnToggleMobileUI = document.getElementById('btnToggleMobileUI');
const sidebarPanel = document.querySelector('.sidebar');
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
}


function setupEventListeners() {
  // Tutorial
  btnTutorial.addEventListener('click', () => {
    tutorialManager.start();
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
  });

  speedSlider.addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    speedValue.textContent = `${val}x`;
    robot.setSpeedMultiplier(val);
  });

  rayDensitySlider.addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    rayDensityValue.textContent = `${val} Rays`;
    lidar.setParameters(val, lidar.noisePercent);
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

    const t0 = performance.now();
    const path = currentPathfinder.findPath(robot.x, robot.y, x, y);
    const dt = (performance.now() - t0).toFixed(1);
    pathComputeTime.textContent = `${currentPathfinder.name || 'A*'} · ${dt}ms`;
    if (path.length > 0) {
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

  // 4. Sound: collision bump
  if (hitWall) {
    soundManager.playCollision();
  }

  // 5. Sensor Update (LiDAR Raycasting)
  const scanHits = lidar.scan(robot, environment, dynamicHumans);

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

  // 9b. Update 3D Point Cloud
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

  // 12. Draw Frame
  renderer.clear();

  if (currentView === 'realWorld') {
    renderer.drawEnvironment(environment, renderer.realWorldCtx);
    renderer.drawDynamicObstacles(dynamicObstacles, renderer.realWorldCtx);
    renderer.drawHumans(dynamicHumans, renderer.realWorldCtx);
    lidar.drawRays(scanHits, robot, renderer.realWorldCtx);
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
    // 5. Draw path
    renderer.drawPath(robot.path, renderer.slamCtx);
    // 6. Draw frontier target
    if (autoExploreActive) {
      renderer.drawFrontierTarget(frontierTarget, renderer.slamCtx);
    }
    // 7. Draw robot
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
