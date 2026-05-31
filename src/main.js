import { Renderer } from './Renderer.js';
import { Environment } from './Environment.js';
import { Robot } from './Robot.js';
import { Lidar } from './Lidar.js';
import { Mapper } from './Mapper.js';
import { AStar } from './AStar.js';
import { ChartManager } from './ChartManager.js';
import { DynamicsChartManager } from './DynamicsChartManager.js';
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

// All state is lazily initialised inside launchSimulator() AFTER #app is
// visible so canvases report their real pixel dimensions.
let sim = null;
let isSimulatorRunning = false;
let lastTime = 0;
const keys = { w: false, a: false, s: false, d: false };
let currentView = 'realWorld';
let interactionMode = 'drive';
let autoExploreActive = false;
let frontierTarget = null;
let isBuilding = false, buildStart = null, buildCurrent = null;
let prevPathActive = false, sweepSoundCounter = 0;
let algoCompareEnabled = false, comparePaths = null;
let frontierCooldown = 0;
let partnerRobots = [], partnerScanHitsCache = [], partnerExplorers = [];
let partnerPathfinders = [], partnerFrontierCooldowns = [];
let partnerDistances = [], partnerLastPositions = [], partnerStatuses = [];
let partnerExploredCells = [], lastDashboardUpdate = 0;
const tutorialSignals = { goalClicks: 0, rayDensityChanges: 0, noiseChanges: 0 };

const PARTNER_TRAIL_COLORS = ['#a855f7','#f97316','#22d3d1'];
const ROBOT_NAMES = ['ALPHA','BETA','GAMMA','DELTA'];
const PARTNER_RAY_STYLES = [
  { strokeHit:'rgba(168,85,247,0.45)', strokeFree:'rgba(168,85,247,0.12)', hitDot:'#d8b4fe' },
  { strokeHit:'rgba(249,115,22,0.45)', strokeFree:'rgba(249,115,22,0.12)', hitDot:'#fdba74' },
  { strokeHit:'rgba(34,211,209,0.45)', strokeFree:'rgba(34,211,209,0.12)', hitDot:'#5eead4' },
];

const el = id => document.getElementById(id);

function computePathLength(path) {
  if (!path || path.length < 2) return 0;
  let len = 0;
  for (let i = 1; i < path.length; i++) {
    const dx = path[i].x-path[i-1].x, dy = path[i].y-path[i-1].y;
    len += Math.sqrt(dx*dx+dy*dy);
  }
  return len;
}

function setCompareRow(etEl, elEl, path, ms) {
  if (!etEl||!elEl) return;
  etEl.textContent = `${ms.toFixed(1)}ms`;
  elEl.textContent = (!path||path.length===0) ? 'No path' : `${(computePathLength(path)/100).toFixed(2)}m`;
}

function computeComparisonPaths(gx, gy) {
  const r = {};
  let t0, path, ms;
  t0=performance.now(); path=sim.astar.findPath(sim.robot.x,sim.robot.y,gx,gy); ms=performance.now()-t0;
  r.astar=path; setCompareRow(el('cmpTimeAStar'),el('cmpLenAStar'),path,ms);
  t0=performance.now(); path=sim.dijkstra.findPath(sim.robot.x,sim.robot.y,gx,gy); ms=performance.now()-t0;
  r.dijkstra=path; setCompareRow(el('cmpTimeDijkstra'),el('cmpLenDijkstra'),path,ms);
  t0=performance.now(); path=sim.bugAlgorithm.findPath(sim.robot.x,sim.robot.y,gx,gy); ms=performance.now()-t0;
  r.bug2=path; setCompareRow(el('cmpTimeBug2'),el('cmpLenBug2'),path,ms);
  return r;
}

function buildDashboardCards(n) {
  const c = el('mrdRobotCards'); if (!c) return; c.innerHTML='';
  for (let i=0;i<n;i++) c.innerHTML+=`<div class="mrd-robot-card r${i}" id="mrdCard${i}"><div class="mrd-robot-header"><span class="mrd-robot-name r${i}">${ROBOT_NAMES[i]}</span><span class="mrd-robot-status idle" id="mrdStatus${i}">IDLE</span></div><div class="mrd-robot-pct-row"><span class="mrd-robot-pct-val r${i}" id="mrdPct${i}">0%</span><div class="mrd-robot-mini-bar"><div class="mrd-robot-mini-fill r${i}" id="mrdBar${i}" style="width:0%"></div></div></div><div class="mrd-robot-dist" id="mrdDist${i}">0.0 m travelled</div></div>`;
}

function updateFleetDashboard(numRobots) {
  const now=performance.now(); if(now-lastDashboardUpdate<300) return; lastDashboardUpdate=now;
  const panel=el('multiRobotDashboard'); if(!panel) return;
  if(numRobots<=1){panel.style.display='none';return;} panel.style.display='block';
  const total=sim.mapper.grid.length; let known=0;
  for(let i=0;i<total;i++) if(sim.mapper.grid[i]!==0) known++;
  const pct=((known/total)*100).toFixed(1);
  const cpEl=el('mrdCombinedPct'); if(cpEl) cpEl.textContent=`${pct}%`;
  const cbEl=el('mrdCombinedBar'); if(cbEl) cbEl.style.width=`${Math.min(100,parseFloat(pct))}%`;
  for(let i=0;i<numRobots;i++){
    const pe=el(`mrdPct${i}`),be=el(`mrdBar${i}`),de=el(`mrdDist${i}`),se=el(`mrdStatus${i}`);
    if(!pe) continue;
    const ip=(partnerExploredCells[i]||0).toFixed(1);
    pe.textContent=`${ip}%`; be.style.width=`${Math.min(100,parseFloat(ip))}%`;
    de.textContent=`${((partnerDistances[i]||0)/100).toFixed(1)} m travelled`;
    const st=partnerStatuses[i]||'idle'; se.textContent=st.toUpperCase(); se.className=`mrd-robot-status ${st}`;
  }
}

function sampleRobotExplored(idx) {
  const totalDist=partnerDistances.reduce((s,v)=>s+(v||0),0);
  if(totalDist>0){
    const tot=sim.mapper.grid.length; let gk=0;
    for(let i=0;i<tot;i++) if(sim.mapper.grid[i]!==0) gk++;
    return ((gk/tot)*100)*((partnerDistances[idx]||0)/totalDist);
  }
  return 0;
}

function rebuildPartnerRobots(){
  partnerRobots=[]; partnerExplorers=[]; partnerPathfinders=[]; partnerFrontierCooldowns=[];
  partnerDistances=[0]; partnerLastPositions=[{x:sim.robot.x,y:sim.robot.y}];
  partnerStatuses=['idle']; partnerExploredCells=[0];
  const sel=el('multiRobotSelect');
  const total=Math.max(1,Math.min(4,parseInt(sel?.value||'1',10)||1));
  const n=total-1;
  for(let i=0;i<n;i++){
    const spawn=sim.environment.findSafeSpawn?sim.environment.findSafeSpawn(20):{x:sim.robot.x+Math.cos((i/Math.max(1,n))*Math.PI*2)*60,y:sim.robot.y+Math.sin((i/Math.max(1,n))*Math.PI*2)*60};
    const pr=new Robot(spawn.x,spawn.y);
    pr.setDriveModel('differential'); pr.setSpeedMultiplier(sim.robot.maxSpeed*0.85); pr.setDrift(0); pr.theta=Math.random()*Math.PI*2;
    partnerRobots.push(pr); partnerExplorers.push(new FrontierExplorer(sim.mapper));
    partnerPathfinders.push(new AStar(sim.mapper)); partnerFrontierCooldowns.push(0);
    partnerDistances.push(0); partnerLastPositions.push({x:spawn.x,y:spawn.y});
    partnerStatuses.push('idle'); partnerExploredCells.push(0);
  }
  buildDashboardCards(total);
}

function computeLidarAvoidance(robot,scanHits){
  if(!scanHits||scanHits.length===0) return 0;
  const D=robot.radius*4.5; let ax=0,ay=0,cnt=0;
  for(const h of scanHits){
    if(!h.hit||h.distance>D) continue;
    const dx=robot.x-h.x,dy=robot.y-h.y,d=Math.max(1,h.distance),f=(D-d)/D;
    ax+=(dx/d)*f; ay+=(dy/d)*f; cnt++;
  }
  if(cnt===0) return 0;
  let diff=Math.atan2(ay,ax)-robot.theta;
  while(diff>Math.PI) diff-=Math.PI*2; while(diff<-Math.PI) diff+=Math.PI*2;
  return diff*0.04;
}

function updatePartnerRobot(pr,pi,scanHits){
  const shouldAuto=!(el('chkPartnerAutoExplore'))||el('chkPartnerAutoExplore').checked;
  const lp=partnerLastPositions[pi+1];
  if(lp){const dx=pr.x-lp.x,dy=pr.y-lp.y,s=Math.sqrt(dx*dx+dy*dy);if(s>0.1)partnerDistances[pi+1]+=s;lp.x=pr.x;lp.y=pr.y;}
  if(!shouldAuto){pr.forwardSpeed=0;pr.turnSpeed=0;partnerStatuses[pi+1]='idle';return pr.update(sim.environment,sim.dynamicHumans);}
  const avoidDelta=computeLidarAvoidance(pr,scanHits);
  const HD=pr.radius*3.0; let hard=false;
  if(scanHits)for(const h of scanHits)if(h.hit&&h.distance<HD){hard=true;break;}
  if(hard){pr.path=null;pr.forwardSpeed=pr.maxSpeed*0.4;pr.turnSpeed=(avoidDelta?Math.sign(avoidDelta):(Math.random()>0.5?1:-1))*pr.maxTurn*0.8;partnerStatuses[pi+1]='navigating';return pr.update(sim.environment,sim.dynamicHumans);}
  if(pr.path&&pr.pathIndex<pr.path.length){partnerStatuses[pi+1]='navigating';pr.turnSpeed+=avoidDelta*0.5;return pr.update(sim.environment,sim.dynamicHumans);}
  partnerFrontierCooldowns[pi]++;
  if(partnerFrontierCooldowns[pi]<40){partnerStatuses[pi+1]='idle';pr.forwardSpeed=0;pr.turnSpeed=0;return pr.update(sim.environment,sim.dynamicHumans);}
  partnerFrontierCooldowns[pi]=0;
  const exp=partnerExplorers[pi],pf=partnerPathfinders[pi];
  let tgt=exp.findBestFrontierExcluding?exp.findBestFrontierExcluding(pr.x,pr.y,sim.robot.x,sim.robot.y,partnerRobots.map(r=>({x:r.x,y:r.y})),pi):null;
  if(!tgt) tgt=exp.findBestFrontier(pr.x,pr.y);
  if(tgt){const p=pf.findPath(pr.x,pr.y,tgt.x,tgt.y);if(p&&p.length>0){pr.setPath(p);partnerStatuses[pi+1]='exploring';}else{pr.forwardSpeed=0;pr.turnSpeed=pr.maxTurn*(Math.random()>0.5?1:-1);partnerFrontierCooldowns[pi]=20;partnerStatuses[pi+1]='idle';}}
  else{pr.forwardSpeed=pr.maxSpeed*0.5;pr.turnSpeed=(Math.random()-0.5)*pr.maxTurn;partnerStatuses[pi+1]='exploring';}
  return pr.update(sim.environment,sim.dynamicHumans);
}

function resetSimulation(){
  sim.mapper.clear(); sim.renderer.resetFog();
  const sp=sim.environment.findSafeSpawn(sim.robot.radius);
  sim.robot.x=sp.x; sim.robot.y=sp.y; sim.robot.theta=0;
  sim.robot.believedX=sp.x; sim.robot.believedY=sp.y; sim.robot.believedTheta=0;
  sim.robot.path=null; sim.robot.resetTrails();
  sim.statsTracker.reset();
  frontierTarget=null; autoExploreActive=false;
  const bae=el('btnAutoExplore'); if(bae){bae.classList.remove('active');bae.textContent='🧭 Auto Explore';}
  prevPathActive=false;
  sim.dynamicObstacles.generate();
  if(sim.dynamicHumans.enabled) sim.dynamicHumans.generate();
  if(sim.particleFilter.enabled) sim.particleFilter.init(sim.robot.x,sim.robot.y,0);
  rebuildPartnerRobots();
}

// ============================================================
// INIT — runs AFTER #app is visible (canvas has real size)
// ============================================================
function initSim(){
  if(sim) return;
  const renderer=new Renderer();
  const w=renderer.realWorldCanvas.width, h=renderer.realWorldCanvas.height;
  const environment=new Environment(w,h);
  environment.generateRandomMap();
  const robot=new Robot(w/2,h/2);
  const mapper=new Mapper(w,h,10);
  const astar=new AStar(mapper);
  const dijkstra=new Dijkstra(mapper);
  const bugAlgorithm=new BugAlgorithm(mapper);
  const lidar=new Lidar();
  const chartManager=new ChartManager('lidarChart',lidar.maxRange);
  const dynamicsChartManager=new DynamicsChartManager('dynamicsChart');
  const frontierExplorer=new FrontierExplorer(mapper);
  const statsTracker=new StatsTracker();
  const dynamicObstacles=new DynamicObstacles(w,h);
  const dynamicHumans=new DynamicHumans(w,h);
  const soundManager=new SoundManager();
  const particleFilter=new ParticleFilter(200);
  const loopClosureDetector=new LoopClosureDetector();
  const tutorialManager=new TutorialManager({
    getState:()=>({currentView,drift:parseInt(el('driftSlider')?.value||'0',10)||0,
      rayDensity:parseInt(el('rayDensitySlider')?.value||'0',10)||0,
      particleEnabled:!!particleFilter.enabled,loopClosureEnabled:!!loopClosureDetector.enabled,
      goalClicks:tutorialSignals.goalClicks,rayDensityChanges:tutorialSignals.rayDensityChanges,noiseChanges:tutorialSignals.noiseChanges}),
  });
  const sensorVisualizer=new SensorVisualizer();
  const pointCloudViewer=new PointCloudViewer();
  const joystickManager=new JoystickManager(keys);

  renderer.initFogCanvas(w,h);
  statsTracker.bindDOM();

  // Find safe robot spawn
  const sp=environment.findSafeSpawn?environment.findSafeSpawn(robot.radius):{x:w/2,y:h/2};
  robot.x=sp.x; robot.y=sp.y; robot.believedX=sp.x; robot.believedY=sp.y;

  sim={renderer,environment,robot,mapper,astar,dijkstra,bugAlgorithm,lidar,
       chartManager,dynamicsChartManager,frontierExplorer,statsTracker,
       dynamicObstacles,dynamicHumans,soundManager,particleFilter,
       loopClosureDetector,tutorialManager,sensorVisualizer,pointCloudViewer,
       joystickManager,currentPathfinder:astar};

  setupEventListeners();
  joystickManager.init();
  lidar.setParameters(parseInt(el('rayDensitySlider').value),parseInt(el('noiseSlider').value));
  robot.setSpeedMultiplier(parseInt(el('speedSlider').value));
  robot.setDrift(parseInt(el('driftSlider').value));
  rebuildPartnerRobots();
}

// ============================================================
// EVENT LISTENERS
// ============================================================
function setupEventListeners(){
  function switchView(view){
    currentView=view;
    el('btnRealWorld')?.classList.toggle('active',view==='realWorld');
    el('btnSlamMap')?.classList.toggle('active',view==='slam');
    el('btn3DView')?.classList.toggle('active',view==='3d');
    el('realWorldCanvas')?.classList.toggle('hidden',view!=='realWorld');
    el('slamCanvas')?.classList.toggle('hidden',view!=='slam');
    el('pointCloudContainer')?.classList.toggle('hidden',view!=='3d');
    sim.pointCloudViewer.setEnabled(view==='3d');
    const badge=el('viewportBadge');
    if(badge) badge.textContent=view==='realWorld'?'REAL WORLD VIEW':view==='slam'?'SLAM OCCUPANCY MAP':'3D LiDAR POINT CLOUD';
  }

  el('btnTutorial')?.addEventListener('click',()=>sim.tutorialManager.start());
  el('btnAlgoCompare')?.addEventListener('click',()=>{
    algoCompareEnabled=!algoCompareEnabled;
    const ap=el('algoComparePanel'); if(ap) ap.style.display=algoCompareEnabled?'block':'none';
    el('btnAlgoCompare').classList.toggle('active',algoCompareEnabled);
    el('btnAlgoCompare').textContent=algoCompareEnabled?'Comparison: ON':'Compare Algorithms';
    comparePaths=null;
  });
  el('btnToggleSidebar')?.addEventListener('click',()=>document.querySelector('.sidebar')?.classList.toggle('collapsed'));
  el('btnToggleMobileUI')?.addEventListener('click',()=>{
    document.body.classList.toggle('mobile-mode');
    setTimeout(()=>{sim.renderer.resizeCanvas();const w=sim.renderer.realWorldCanvas.width,h=sim.renderer.realWorldCanvas.height;sim.environment.resize(w,h);sim.mapper.resize(w,h);sim.dynamicObstacles.resize(w,h);sim.dynamicHumans.resize(w,h);sim.renderer.initFogCanvas(w,h);},400);
  });

  window.addEventListener('keydown',(e)=>{
    if(interactionMode!=='drive') return;
    if(keys.hasOwnProperty(e.key.toLowerCase())){
      keys[e.key.toLowerCase()]=true;
      if(autoExploreActive){autoExploreActive=false;const b=el('btnAutoExplore');if(b){b.classList.remove('active');b.textContent='🧭 Auto Explore';}frontierTarget=null;}
    }
  });
  window.addEventListener('keyup',(e)=>{if(keys.hasOwnProperty(e.key.toLowerCase())) keys[e.key.toLowerCase()]=false;});

  el('noiseSlider')?.addEventListener('input',(e)=>{const v=parseInt(e.target.value);const dv=el('noiseValue');if(dv)dv.textContent=`${v}%`;sim.lidar.setParameters(sim.lidar.numRays,v);tutorialSignals.noiseChanges++;});
  el('speedSlider')?.addEventListener('input',(e)=>{const v=parseInt(e.target.value);const dv=el('speedValue');if(dv)dv.textContent=`${v}x`;sim.robot.setSpeedMultiplier(v);partnerRobots.forEach(pr=>pr.setSpeedMultiplier(v));});
  el('rayDensitySlider')?.addEventListener('input',(e)=>{const v=parseInt(e.target.value);const dv=el('rayDensityValue');if(dv)dv.textContent=`${v} Rays`;sim.lidar.setParameters(v,sim.lidar.noisePercent);tutorialSignals.rayDensityChanges++;});
  el('driftSlider')?.addEventListener('input',(e)=>{const v=parseInt(e.target.value);const dv=el('driftValue');if(dv)dv.textContent=v===0?'Off':`${v}`;sim.robot.setDrift(v);});
  el('volumeSlider')?.addEventListener('input',(e)=>{const v=parseInt(e.target.value);const dv=el('volumeValue');if(dv)dv.textContent=`${v}%`;sim.soundManager.setVolume(v/100);});

  el('btnRealWorld')?.addEventListener('click',()=>switchView('realWorld'));
  el('btnSlamMap')?.addEventListener('click',()=>switchView('slam'));
  el('btn3DView')?.addEventListener('click',()=>switchView('3d'));

  el('btnDriveMode')?.addEventListener('click',()=>{interactionMode='drive';el('btnDriveMode')?.classList.add('active');el('btnBuildMode')?.classList.remove('active');el('instructionsDrive')?.classList.remove('hidden');el('instructionsBuild')?.classList.add('hidden');});
  el('btnBuildMode')?.addEventListener('click',()=>{interactionMode='build';el('btnBuildMode')?.classList.add('active');el('btnDriveMode')?.classList.remove('active');el('instructionsBuild')?.classList.remove('hidden');el('instructionsDrive')?.classList.add('hidden');sim.robot.path=null;sim.robot.forwardSpeed=0;sim.robot.turnSpeed=0;autoExploreActive=false;const b=el('btnAutoExplore');if(b){b.classList.remove('active');b.textContent='🧭 Auto Explore';}frontierTarget=null;el('btnRealWorld')?.click();});

  el('btnAutoExplore')?.addEventListener('click',()=>{
    autoExploreActive=!autoExploreActive;
    const b=el('btnAutoExplore');
    if(autoExploreActive){b.classList.add('active');b.textContent='⏹️ Stop Exploring';el('btnSlamMap')?.click();interactionMode='drive';el('btnDriveMode')?.classList.add('active');el('btnBuildMode')?.classList.remove('active');el('instructionsDrive')?.classList.remove('hidden');el('instructionsBuild')?.classList.add('hidden');}
    else{b.classList.remove('active');b.textContent='🧭 Auto Explore';sim.robot.path=null;sim.robot.forwardSpeed=0;sim.robot.turnSpeed=0;frontierTarget=null;}
  });

  el('btnDynamicObs')?.addEventListener('click',()=>{const on=!sim.dynamicObstacles.enabled;sim.dynamicObstacles.setEnabled(on);const b=el('btnDynamicObs');if(on){b.classList.add('active');b.textContent='⏹️ Stop Obstacles';sim.dynamicObstacles.generate();}else{b.classList.remove('active');b.textContent='🔮 Dynamic Obstacles';sim.environment.setDynamicWalls([]);}});
  el('btnDynamicHumans')?.addEventListener('click',()=>{const on=!sim.dynamicHumans.enabled;sim.dynamicHumans.setEnabled(on);const b=el('btnDynamicHumans');if(on){b.classList.add('active');b.textContent='⏹️ Stop Workers';}else{b.classList.remove('active');b.textContent='👷 Moving Workers';}});
  el('btnParticleFilter')?.addEventListener('click',()=>{const on=!sim.particleFilter.enabled;sim.particleFilter.setEnabled(on);const b=el('btnParticleFilter'),pg=el('particleCountGroup');if(on){b.classList.add('active');b.textContent='⏹️ Stop Particles';if(pg)pg.style.display='flex';sim.particleFilter.init(sim.robot.x,sim.robot.y,sim.robot.theta);}else{b.classList.remove('active');b.textContent='🎯 Particle Filter';if(pg)pg.style.display='none';}});
  el('btnLoopClosure')?.addEventListener('click',()=>{const on=!sim.loopClosureDetector.enabled;sim.loopClosureDetector.setEnabled(on);const b=el('btnLoopClosure');if(on){b.classList.add('active');b.textContent='⏹️ Stop Loop Closure';}else{b.classList.remove('active');b.textContent='🔗 Loop Closure';}});
  el('particleCountSlider')?.addEventListener('input',(e)=>{const v=parseInt(e.target.value);const dv=el('particleCountValue');if(dv)dv.textContent=`${v}`;sim.particleFilter.setCount(v);sim.particleFilter.init(sim.robot.x,sim.robot.y,sim.robot.theta);});

  el('btnSoundOn')?.addEventListener('click',()=>{sim.soundManager.setEnabled(true);el('btnSoundOn')?.classList.add('active');el('btnSoundOff')?.classList.remove('active');const vg=el('volumeGroup');if(vg)vg.style.display='flex';});
  el('btnSoundOff')?.addEventListener('click',()=>{sim.soundManager.setEnabled(false);el('btnSoundOff')?.classList.add('active');el('btnSoundOn')?.classList.remove('active');const vg=el('volumeGroup');if(vg)vg.style.display='none';});

  el('btnReset')?.addEventListener('click',()=>{const ps=el('presetSelect');if(ps)ps.value='random';sim.environment.generateRandomMap();resetSimulation();});
  el('btnClearCustom')?.addEventListener('click',()=>{sim.environment.clearCustomWalls();sim.mapper.clear();});
  el('driveModelSelect')?.addEventListener('change',(e)=>sim.robot.setDriveModel(e.target.value));
  el('algorithmSelect')?.addEventListener('change',(e)=>{switch(e.target.value){case'dijkstra':sim.currentPathfinder=sim.dijkstra;break;case'bug2':sim.currentPathfinder=sim.bugAlgorithm;break;default:sim.currentPathfinder=sim.astar;}const pt=el('pathComputeTime');if(pt)pt.textContent='';sim.robot.path=null;sim.robot.forwardSpeed=0;sim.robot.turnSpeed=0;});
  el('presetSelect')?.addEventListener('change',(e)=>{if(e.target.value==='random')sim.environment.generateRandomMap();else sim.environment.loadPreset(e.target.value);resetSimulation();});
  el('multiRobotSelect')?.addEventListener('change',()=>rebuildPartnerRobots());

  el('btnExportMap')?.addEventListener('click',()=>{const j=sim.environment.exportWalls();const b=new Blob([j],{type:'application/json'});const u=URL.createObjectURL(b);const a=document.createElement('a');a.href=u;a.download='slam-map.json';a.click();URL.revokeObjectURL(u);});
  el('btnImportMap')?.addEventListener('click',()=>el('importFileInput')?.click());
  el('importFileInput')?.addEventListener('change',(e)=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=(ev)=>{if(sim.environment.importWalls(ev.target.result)){resetSimulation();const ps=el('presetSelect');if(ps)ps.value='random';}};r.readAsText(f);e.target.value='';});

  const slamCanvas=el('slamCanvas');
  slamCanvas?.addEventListener('mousedown',(e)=>{
    if(interactionMode!=='drive') return;
    const rect=slamCanvas.getBoundingClientRect();
    const x=e.clientX-rect.left,y=e.clientY-rect.top;
    if(algoCompareEnabled) comparePaths=computeComparisonPaths(x,y);
    const t0=performance.now(); const path=sim.currentPathfinder.findPath(sim.robot.x,sim.robot.y,x,y); const dt=(performance.now()-t0).toFixed(1);
    const pt=el('pathComputeTime'); if(pt) pt.textContent=`${sim.currentPathfinder.name||'A*'} · ${dt}ms`;
    if(path.length>0){tutorialSignals.goalClicks++;sim.robot.setPath(path);if(autoExploreActive){autoExploreActive=false;const b=el('btnAutoExplore');if(b){b.classList.remove('active');b.textContent='🧭 Auto Explore';}frontierTarget=null;}}
  });

  const rwc=el('realWorldCanvas');
  rwc?.addEventListener('mousedown',(e)=>{if(interactionMode!=='build')return;isBuilding=true;const r=rwc.getBoundingClientRect();buildStart={x:e.clientX-r.left,y:e.clientY-r.top};buildCurrent={...buildStart};});
  rwc?.addEventListener('mousemove',(e)=>{if(!isBuilding||interactionMode!=='build')return;const r=rwc.getBoundingClientRect();buildCurrent={x:e.clientX-r.left,y:e.clientY-r.top};});
  const commitWall=()=>{if(!isBuilding)return;isBuilding=false;const dx=buildCurrent.x-buildStart.x,dy=buildCurrent.y-buildStart.y;if(Math.sqrt(dx*dx+dy*dy)>10){sim.environment.addCustomWall(buildStart,buildCurrent);sim.mapper.clear();}buildStart=null;buildCurrent=null;};
  rwc?.addEventListener('mouseup',commitWall); rwc?.addEventListener('mouseleave',commitWall);

  el('btnDonate')?.addEventListener('click',()=>{const m=el('donateModal');if(m)m.style.display='flex';});
  el('btnDonateClose')?.addEventListener('click',()=>{const m=el('donateModal');if(m)m.style.display='none';});
  window.addEventListener('click',(e)=>{const m=el('donateModal');if(m&&e.target===m)m.style.display='none';});
}

// ============================================================
// FRONTIER EXPLORATION
// ============================================================
function handleFrontierExploration(){
  if(!autoExploreActive) return;
  if(sim.robot.path&&sim.robot.pathIndex<sim.robot.path.length) return;
  frontierCooldown++; if(frontierCooldown<30) return; frontierCooldown=0;
  const target=sim.frontierExplorer.findBestFrontier(sim.robot.x,sim.robot.y);
  frontierTarget=target;
  if(target){const p=sim.currentPathfinder.findPath(sim.robot.x,sim.robot.y,target.x,target.y);if(p.length>0)sim.robot.setPath(p);else frontierCooldown=15;}
  else{autoExploreActive=false;const b=el('btnAutoExplore');if(b){b.classList.remove('active');b.textContent='✅ Fully Explored';}sim.soundManager.playExplorationComplete();}
}

// ============================================================
// GAME LOOP
// ============================================================
function gameLoop(timestamp){
  if(!isSimulatorRunning||!sim) return;
  requestAnimationFrame(gameLoop);
  sim.robot.applyInput(keys);
  sim.dynamicObstacles.update();
  sim.environment.setDynamicWalls(sim.dynamicObstacles.getWalls());
  if(sim.dynamicHumans.enabled) sim.dynamicHumans.update(sim.environment);
  const hitWall=sim.robot.update(sim.environment,sim.dynamicHumans);
  {const lp=partnerLastPositions[0];if(lp){const dx=sim.robot.x-lp.x,dy=sim.robot.y-lp.y,s=Math.sqrt(dx*dx+dy*dy);if(s>0.1)partnerDistances[0]+=s;lp.x=sim.robot.x;lp.y=sim.robot.y;}partnerStatuses[0]=(sim.robot.path&&sim.robot.pathIndex<sim.robot.path.length)?'navigating':(autoExploreActive?'exploring':'idle');}
  if(hitWall) sim.soundManager.playCollision();
  const scanHits=sim.lidar.scan(sim.robot,sim.environment,sim.dynamicHumans);
  partnerScanHitsCache=[];
  for(let pi=0;pi<partnerRobots.length;pi++){const pr=partnerRobots[pi];const ph=sim.lidar.scan(pr,sim.environment,sim.dynamicHumans);sim.mapper.updateMap(pr,ph);updatePartnerRobot(pr,pi,ph);partnerScanHitsCache.push(ph);}
  if(sim.particleFilter.enabled){sim.particleFilter.predict(sim.robot.forwardSpeed,sim.robot.turnSpeed);sim.particleFilter.update(scanHits,sim.environment);sim.particleFilter.resample();}
  sweepSoundCounter++; if(sweepSoundCounter>=6){sweepSoundCounter=0;sim.soundManager.playSweepTick();}
  sim.mapper.updateMap(sim.robot,scanHits);
  sim.chartManager.updateData(scanHits);
  sim.dynamicsChartManager.updateData(sim.robot);
  sim.sensorVisualizer.update(sim.robot,scanHits);
  if(sim.loopClosureDetector.enabled){sim.loopClosureDetector.addKeyframe(sim.robot,scanHits);const cr=sim.loopClosureDetector.checkForClosure(sim.robot,scanHits);if(cr.detected)sim.loopClosureDetector.applyCorrection(sim.robot,cr.correction);sim.loopClosureDetector.updateIndicator();}
  sim.statsTracker.update(sim.robot,sim.mapper,hitWall);
  const numRobots=1+partnerRobots.length;
  for(let i=0;i<numRobots;i++) partnerExploredCells[i]=sampleRobotExplored(i);
  updateFleetDashboard(numRobots);
  if(currentView==='3d') sim.pointCloudViewer.update(sim.robot,scanHits,sim.renderer.realWorldCanvas.width,sim.renderer.realWorldCanvas.height);
  const pathActive=!!(sim.robot.path&&sim.robot.pathIndex<sim.robot.path.length);
  if(prevPathActive&&!pathActive&&!autoExploreActive) sim.soundManager.playGoalReached();
  prevPathActive=pathActive;
  handleFrontierExploration();
  if(sim.tutorialManager.active) sim.tutorialManager.tick();

  // Render
  sim.renderer.clear();
  const cpl=el('chkPartnerLidar');
  if(currentView==='realWorld'){
    sim.renderer.drawEnvironment(sim.environment,sim.renderer.realWorldCtx);
    sim.renderer.drawDynamicObstacles(sim.dynamicObstacles,sim.renderer.realWorldCtx);
    sim.renderer.drawHumans(sim.dynamicHumans,sim.renderer.realWorldCtx);
    sim.lidar.drawRays(scanHits,sim.robot,sim.renderer.realWorldCtx);
    partnerRobots.forEach((pr,pi)=>{if(cpl?.checked){const ph=partnerScanHitsCache[pi];if(ph)sim.lidar.drawRays(ph,pr,sim.renderer.realWorldCtx,PARTNER_RAY_STYLES[pi%PARTNER_RAY_STYLES.length]);}sim.renderer.drawTrail(pr.trueTrail,PARTNER_TRAIL_COLORS[pi%PARTNER_TRAIL_COLORS.length],sim.renderer.realWorldCtx);sim.renderer.drawRobot(pr,sim.renderer.realWorldCtx);});
    sim.renderer.drawTrail(sim.robot.trueTrail,'#1E90FF',sim.renderer.realWorldCtx);
    sim.renderer.drawPath(sim.robot.path,sim.renderer.realWorldCtx);
    sim.renderer.drawRobot(sim.robot,sim.renderer.realWorldCtx);
    sim.renderer.drawBelievedRobot(sim.robot,sim.renderer.realWorldCtx);
    if(sim.particleFilter.enabled) sim.renderer.drawParticles(sim.particleFilter.getParticles(),sim.renderer.realWorldCtx);
    if(sim.loopClosureDetector.enabled) sim.loopClosureDetector.drawIndicator(sim.renderer.realWorldCtx,sim.renderer.realWorldCanvas.width);
    if(isBuilding&&buildStart&&buildCurrent) sim.renderer.drawBuildLine(buildStart,buildCurrent,sim.renderer.realWorldCtx);
  } else {
    sim.mapper.drawMap(sim.renderer.slamCtx);
    sim.renderer.drawFogOfWar(scanHits,sim.robot);
    sim.renderer.drawFogOverlay(sim.renderer.slamCtx);
    sim.renderer.drawTrail(sim.robot.believedTrail,'#f59e0b',sim.renderer.slamCtx);
    if(algoCompareEnabled&&comparePaths){sim.renderer.drawPath(comparePaths.astar,sim.renderer.slamCtx,{color:'#10b981',lineWidth:2,dashPattern:[8,8]});sim.renderer.drawPath(comparePaths.dijkstra,sim.renderer.slamCtx,{color:'#06b6d4',lineWidth:2,dashPattern:[4,6]});sim.renderer.drawPath(comparePaths.bug2,sim.renderer.slamCtx,{color:'#f59e0b',lineWidth:2,dashPattern:[2,6]});}
    sim.renderer.drawPath(sim.robot.path,sim.renderer.slamCtx,{color:'#22c55e',lineWidth:3,dashPattern:[10,10]});
    if(autoExploreActive) sim.renderer.drawFrontierTarget(frontierTarget,sim.renderer.slamCtx);
    partnerRobots.forEach((pr,pi)=>{if(cpl?.checked){const ph=partnerScanHitsCache[pi];if(ph)sim.lidar.drawRays(ph,pr,sim.renderer.slamCtx,PARTNER_RAY_STYLES[pi%PARTNER_RAY_STYLES.length]);}sim.renderer.drawTrail(pr.trueTrail,PARTNER_TRAIL_COLORS[pi%PARTNER_TRAIL_COLORS.length],sim.renderer.slamCtx);sim.renderer.drawRobot(pr,sim.renderer.slamCtx);});
    sim.renderer.drawRobot(sim.robot,sim.renderer.slamCtx);
    sim.lidar.drawRays(scanHits,sim.robot,sim.renderer.slamCtx);
  }
}

// ============================================================
// LAUNCH — called by button onclick
// ============================================================
function launchSimulator(){
  const landing=el('landingPage'), simNav=el('sim-nav'), appEl=el('app');
  if(landing) landing.style.display='none';
  if(simNav)  simNav.style.display='flex';
  if(appEl)   appEl.style.display='flex';

  // Canvases are now visible → init everything with real dimensions
  initSim();

  // Reset to real-world view
  currentView='realWorld';
  el('realWorldCanvas')?.classList.remove('hidden');
  el('slamCanvas')?.classList.add('hidden');
  el('pointCloudContainer')?.classList.add('hidden');
  el('btnRealWorld')?.classList.add('active');
  el('btnSlamMap')?.classList.remove('active');
  el('btn3DView')?.classList.remove('active');
  const badge=el('viewportBadge'); if(badge) badge.textContent='REAL WORLD VIEW';

  if(!isSimulatorRunning){
    isSimulatorRunning=true;
    lastTime=performance.now();
    requestAnimationFrame(gameLoop);
  }
}

// Expose globally for the inline onclick AND for DOMContentLoaded
window._launchSim = launchSimulator;
document.addEventListener('DOMContentLoaded',()=>{
  el('btnGetStarted')?.addEventListener('click',launchSimulator);
});
