/**
 * TutorialManager.js
 *
 * Modular guided lessons with checkpoints (user must perform an action
 * before "Next" advances).
 */
export class TutorialManager {
    constructor(options = {}) {
        this.getState =
            typeof options.getState === 'function'
                ? options.getState
                : () => ({});

        this.modules = [
            {
                id: 'intro',
                label: 'Intro',
                steps: [
                    {
                        title: 'Welcome to SLAM',
                        description:
                            '<strong>SLAM</strong> (Simultaneous Localization and Mapping) means the robot builds a map while estimating its pose inside that map. Use the module tabs above to jump between lessons.',
                        highlight: '#realWorldCanvas',
                        position: 'center',
                    },
                    {
                        title: 'How this simulator is organized',
                        description:
                            'You will explore <strong>raycasting</strong> (LiDAR), the <strong>occupancy grid</strong>, <strong>odometry drift</strong>, <strong>loop closure</strong>, and <strong>MCL</strong> (particle filter). Each module ends with a small hands-on checkpoint.',
                        highlight: null,
                        position: 'center',
                    },
                ],
            },
            {
                id: 'raycasting',
                label: 'Raycasting',
                steps: [
                    {
                        title: 'LiDAR raycasting',
                        description:
                            'LiDAR casts rays into the world and measures distances. In <strong>Real World</strong> view you can see each beam: red hits are obstacles; green rays reach max range in free space.',
                        highlight: '#realWorldCanvas',
                        position: 'center',
                    },
                    {
                        title: 'Sensor noise',
                        description:
                            'Move the <strong>LiDAR Noise</strong> slider. Noise perturbs measured ranges so the map becomes less crisp — a core reason SLAM uses probabilistic fusion instead of trusting one scan.',
                        highlight: '#noiseSlider',
                        position: 'right',
                        checkpoint: 'noise_changed',
                        checkpointHint:
                            'Move the LiDAR Noise slider at least once to continue.',
                    },
                    {
                        title: 'Ray density',
                        description:
                            'Change <strong>Ray Density</strong>. More rays give finer angular resolution at higher CPU cost. Fewer rays are faster but can miss thin obstacles.',
                        highlight: '#rayDensitySlider',
                        position: 'right',
                        checkpoint: 'ray_density_changed',
                        checkpointHint:
                            'Adjust the Ray Density slider at least once to continue.',
                    },
                ],
            },
            {
                id: 'occupancy',
                label: 'Occupancy grid',
                steps: [
                    {
                        title: 'Open the SLAM map',
                        description:
                            'The <strong>occupancy grid</strong> stores beliefs about free vs occupied space. Click <strong>SLAM Map</strong> to view the grid and fog-of-war.',
                        highlight: '#btnSlamMap',
                        position: 'right',
                        checkpoint: 'view_slam',
                        checkpointHint:
                            'Switch to the SLAM Map view (button above) to continue.',
                    },
                    {
                        title: 'Reading the grid',
                        description:
                            'Cells become <strong>lighter</strong> when observed as free and <strong>darker</strong> when observed as walls. Unknown areas stay mid-gray until scanned.',
                        highlight: '#slamCanvas',
                        position: 'center',
                    },
                    {
                        title: 'Navigation goal',
                        description:
                            'In Drive mode, <strong>click on the SLAM map</strong> to place a goal. The planner uses the current occupancy grid (A*, Dijkstra, or Bug2).',
                        highlight: '#slamCanvas',
                        position: 'center',
                        checkpoint: 'goal_clicked',
                        checkpointHint:
                            'Click the SLAM map once so a valid path is planned (goal checkpoint).',
                    },
                ],
            },
            {
                id: 'drift',
                label: 'Drift',
                steps: [
                    {
                        title: 'Odometry drift',
                        description:
                            'Wheel odometry integrates motion and accumulates error — <strong>drift</strong>. Raise <strong>Odometry Drift</strong> to see the orange <em>believed</em> pose diverge from the blue true robot.',
                        highlight: '#driftSlider',
                        position: 'right',
                        checkpoint: 'drift_on',
                        checkpointHint:
                            'Set Odometry Drift above zero, then continue.',
                    },
                    {
                        title: 'Why drift matters for SLAM',
                        description:
                            'Mapping uses sensor geometry tied to pose estimates. Drift mis-aligns scans, smearing walls unless the estimator (particles, loop closure, etc.) corrects the trajectory.',
                        highlight: '#driftSlider',
                        position: 'right',
                    },
                ],
            },
            {
                id: 'loop_closure',
                label: 'Loop closure',
                steps: [
                    {
                        title: 'Loop closure idea',
                        description:
                            'When the robot revisits a place, <strong>loop closure</strong> detects similarity between scans and applies a correction so the map stays globally consistent.',
                        highlight: '#btnLoopClosure',
                        position: 'right',
                        checkpoint: 'loop_on',
                        checkpointHint:
                            'Enable Loop Closure (button above), then continue.',
                    },
                    {
                        title: 'What to watch for',
                        description:
                            'Drive a loop around the environment. When a closure triggers, the system nudges the believed trajectory — watch the indicator and the SLAM map tighten up over time.',
                        highlight: '#realWorldCanvas',
                        position: 'center',
                    },
                ],
            },
            {
                id: 'mcl',
                label: 'MCL',
                steps: [
                    {
                        title: 'Monte Carlo Localization',
                        description:
                            'The <strong>particle filter</strong> keeps many pose hypotheses weighted by how well each explains the latest LiDAR scan. Enable it to visualize belief spread and convergence.',
                        highlight: '#btnParticleFilter',
                        position: 'right',
                        checkpoint: 'particle_on',
                        checkpointHint:
                            'Turn on the Particle Filter, then continue.',
                    },
                    {
                        title: 'You are ready to experiment',
                        description:
                            'Try presets, build walls, compare path planners, and toggle drift / particles / loop closure together. Close this panel or press Finish when you are done.',
                        highlight: null,
                        position: 'center',
                    },
                ],
            },
        ];

        this.moduleIndex = 0;
        this.stepIndex = 0;
        this.currentStep = 0;
        this.active = false;
        this.overlay = null;
        this.tooltip = null;
        this.highlightRing = null;

        this._lastStepKey = '';
        this._enterGoalClicks = 0;
        this._enterRayDensityChanges = 0;
        this._enterNoiseChanges = 0;

        this._buildDOM();
        this._buildModuleTabs();
    }

    _buildDOM() {
        this.overlay = document.createElement('div');
        this.overlay.id = 'tutorialOverlay';
        this.overlay.className = 'tutorial-overlay';
        this.overlay.innerHTML = `
            <div class="tutorial-tooltip" id="tutorialTooltip">
                <div class="tutorial-header">
                    <span class="tutorial-step-indicator" id="tutorialStepIndicator"></span>
                    <button class="tutorial-close" id="tutorialClose">✕</button>
                </div>
                <div class="tutorial-module-row" id="tutorialModuleRow"></div>
                <h3 class="tutorial-title" id="tutorialTitle"></h3>
                <p class="tutorial-desc" id="tutorialDesc"></p>
                <div class="tutorial-checkpoint-hint" id="tutorialCheckpointHint"></div>
                <div class="tutorial-nav">
                    <button class="tutorial-nav-btn" id="tutorialPrev">← Prev</button>
                    <button class="tutorial-nav-btn tutorial-nav-next" id="tutorialNext">Next →</button>
                </div>
            </div>
            <div class="tutorial-highlight-ring" id="tutorialHighlight"></div>
        `;
        document.body.appendChild(this.overlay);

        this.tooltip = document.getElementById('tutorialTooltip');
        this.highlightRing = document.getElementById('tutorialHighlight');

        document.getElementById('tutorialClose').addEventListener('click', () => this.end());
        document.getElementById('tutorialPrev').addEventListener('click', () => this.prev());
        document.getElementById('tutorialNext').addEventListener('click', () => this.next());

        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) this.end();
        });
    }

    _buildModuleTabs() {
        const row = document.getElementById('tutorialModuleRow');
        if (!row) return;
        row.innerHTML = '';
        this.modules.forEach((m, idx) => {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'tutorial-module-tab';
            b.textContent = m.label;
            b.addEventListener('click', () => {
                this.moduleIndex = idx;
                this.stepIndex = 0;
                this._lastStepKey = '';
                this._renderStep();
            });
            row.appendChild(b);
        });
    }

    start() {
        this.moduleIndex = 0;
        this.stepIndex = 0;
        this.currentStep = 0;
        this._lastStepKey = '';
        this.active = true;
        this.overlay.classList.add('active');
        this._renderStep();
    }

    end() {
        this.active = false;
        this.overlay.classList.remove('active');
        this.highlightRing.style.display = 'none';
    }

    _currentStepObj() {
        const mod = this.modules[this.moduleIndex];
        return mod.steps[this.stepIndex];
    }

    _stepKey() {
        return `${this.moduleIndex}-${this.stepIndex}`;
    }

    _refreshBaselines() {
        const key = this._stepKey();
        if (this._lastStepKey === key) return;
        this._lastStepKey = key;
        const s = this.getState() || {};
        this._enterGoalClicks = typeof s.goalClicks === 'number' ? s.goalClicks : 0;
        this._enterRayDensityChanges =
            typeof s.rayDensityChanges === 'number' ? s.rayDensityChanges : 0;
        this._enterNoiseChanges =
            typeof s.noiseChanges === 'number' ? s.noiseChanges : 0;
    }

    _checkpointMet(step) {
        if (!step.checkpoint) return true;
        const s = this.getState() || {};
        switch (step.checkpoint) {
            case 'view_slam':
                return s.currentView === 'slam';
            case 'goal_clicked':
                return (
                    typeof s.goalClicks === 'number' &&
                    s.goalClicks > this._enterGoalClicks
                );
            case 'drift_on':
                return typeof s.drift === 'number' && s.drift > 0;
            case 'particle_on':
                return !!s.particleEnabled;
            case 'loop_on':
                return !!s.loopClosureEnabled;
            case 'ray_density_changed':
                return (
                    typeof s.rayDensityChanges === 'number' &&
                    s.rayDensityChanges > this._enterRayDensityChanges
                );
            case 'noise_changed':
                return (
                    typeof s.noiseChanges === 'number' &&
                    s.noiseChanges > this._enterNoiseChanges
                );
            default:
                return true;
        }
    }

    _updateCheckpointHint(step) {
        const el = document.getElementById('tutorialCheckpointHint');
        if (!el) return;
        if (!step.checkpoint) {
            el.textContent = '';
            return;
        }
        if (this._checkpointMet(step)) {
            el.textContent = '';
        } else {
            el.textContent =
                step.checkpointHint ||
                'Complete the highlighted action to continue.';
        }
    }

    next() {
        const step = this._currentStepObj();
        this._refreshBaselines();
        if (step.checkpoint && !this._checkpointMet(step)) {
            this._updateCheckpointHint(step);
            return;
        }

        const mod = this.modules[this.moduleIndex];
        if (this.stepIndex < mod.steps.length - 1) {
            this.stepIndex++;
        } else if (this.moduleIndex < this.modules.length - 1) {
            this.moduleIndex++;
            this.stepIndex = 0;
        } else {
            this.end();
            return;
        }
        this._lastStepKey = '';
        this._renderStep();
    }

    prev() {
        if (this.stepIndex > 0) {
            this.stepIndex--;
        } else if (this.moduleIndex > 0) {
            this.moduleIndex--;
            this.stepIndex = this.modules[this.moduleIndex].steps.length - 1;
        }
        this._lastStepKey = '';
        this._renderStep();
    }

    _executeAction(action) {
        if (!action) return;
        switch (action) {
            case 'clickSlamMap': {
                const btn = document.getElementById('btnSlamMap');
                if (btn) btn.click();
                break;
            }
            case 'clickRealWorld': {
                const btn = document.getElementById('btnRealWorld');
                if (btn) btn.click();
                break;
            }
            case 'clickBuildMode': {
                const btn = document.getElementById('btnBuildMode');
                if (btn) btn.click();
                break;
            }
            case 'clickDriveMode': {
                const btn = document.getElementById('btnDriveMode');
                if (btn) btn.click();
                break;
            }
            default:
                break;
        }
    }

    _syncModuleTabStyles() {
        const row = document.getElementById('tutorialModuleRow');
        if (!row) return;
        const tabs = row.querySelectorAll('button.tutorial-module-tab');
        tabs.forEach((btn, i) => {
            btn.classList.toggle('active', i === this.moduleIndex);
        });
    }

    _renderStep() {
        const step = this._currentStepObj();
        const mod = this.modules[this.moduleIndex];
        const totalSteps = mod.steps.length;

        this._refreshBaselines();
        this._executeAction(step.action);

        document.getElementById('tutorialTitle').textContent = step.title;
        document.getElementById('tutorialDesc').innerHTML = step.description;
        document.getElementById('tutorialStepIndicator').textContent =
            `${mod.label} · ${this.stepIndex + 1} / ${totalSteps}`;

        const prevBtn = document.getElementById('tutorialPrev');
        const nextBtn = document.getElementById('tutorialNext');
        const atStart = this.moduleIndex === 0 && this.stepIndex === 0;
        const atEnd =
            this.moduleIndex === this.modules.length - 1 &&
            this.stepIndex === this.modules[this.moduleIndex].steps.length - 1;
        prevBtn.style.visibility = atStart ? 'hidden' : 'visible';
        nextBtn.textContent = atEnd ? 'Finish ✓' : 'Next →';

        this._syncModuleTabStyles();
        this._updateCheckpointHint(step);

        const target = step.highlight ? document.querySelector(step.highlight) : null;
        if (target) {
            const sidebar = document.querySelector('.sidebar');
            if (sidebar && sidebar.contains(target)) {
                target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }

            requestAnimationFrame(() => {
                const rect = target.getBoundingClientRect();
                this.highlightRing.style.display = 'block';
                this.highlightRing.style.left = `${rect.left - 6}px`;
                this.highlightRing.style.top = `${rect.top - 6}px`;
                this.highlightRing.style.width = `${rect.width + 12}px`;
                this.highlightRing.style.height = `${rect.height + 12}px`;
                this._positionTooltip(rect, step.position);
            });
        } else {
            this.highlightRing.style.display = 'none';
            this._centerTooltip();
        }
    }

    _centerTooltip() {
        const tooltip = this.tooltip;
        tooltip.style.left = '50%';
        tooltip.style.top = '50%';
        tooltip.style.transform = 'translate(-50%, -50%)';
    }

    /** Call from the main loop while the tutorial is open to refresh checkpoint hints live. */
    tick() {
        if (!this.active) return;
        const step = this._currentStepObj();
        if (step.checkpoint) this._updateCheckpointHint(step);
    }

    _positionTooltip(targetRect, position) {
        const tooltip = this.tooltip;
        const margin = 20;

        if (position === 'center') {
            this._centerTooltip();
            return;
        }

        tooltip.style.transform = 'none';

        if (position === 'right') {
            tooltip.style.left = `${targetRect.right + margin}px`;
            tooltip.style.top = `${targetRect.top + targetRect.height / 2}px`;
            tooltip.style.transform = 'translateY(-50%)';
        } else if (position === 'left') {
            tooltip.style.left = `${targetRect.left - margin}px`;
            tooltip.style.top = `${targetRect.top + targetRect.height / 2}px`;
            tooltip.style.transform = 'translate(-100%, -50%)';
        } else if (position === 'bottom') {
            tooltip.style.left = `${targetRect.left + targetRect.width / 2}px`;
            tooltip.style.top = `${targetRect.bottom + margin}px`;
            tooltip.style.transform = 'translateX(-50%)';
        }

        requestAnimationFrame(() => {
            const tooltipRect = tooltip.getBoundingClientRect();
            const vw = window.innerWidth;
            const vh = window.innerHeight;
            const pad = 10;

            if (tooltipRect.left < pad) {
                tooltip.style.left = `${pad}px`;
                tooltip.style.transform = 'none';
            }
            if (tooltipRect.right > vw - pad) {
                tooltip.style.left = `${vw - tooltipRect.width - pad}px`;
                tooltip.style.transform = 'none';
            }

            const newTooltipRect = tooltip.getBoundingClientRect();
            if (newTooltipRect.top < pad) {
                tooltip.style.top = `${pad}px`;
                tooltip.style.transform = 'none';
            }
            if (newTooltipRect.bottom > vh - pad) {
                tooltip.style.top = `${vh - newTooltipRect.height - pad}px`;
                tooltip.style.transform = 'none';
            }
        });
    }
}
