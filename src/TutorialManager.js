/**
 * TutorialManager.js
 *
 * Interactive step-by-step tutorial that teaches SLAM concepts.
 * Each step highlights a UI element and explains the concept behind it.
 */
export class TutorialManager {
    constructor() {
        this.steps = [
            {
                title: '🤖 Welcome to SLAM!',
                description: 'SLAM stands for <strong>Simultaneous Localization and Mapping</strong>. The robot must build a map of its environment while simultaneously figuring out where it is in that map. Let\'s explore how it works!',
                highlight: '#realWorldCanvas',
                position: 'center'
            },
            {
                title: '📡 LiDAR Sensor',
                description: 'The red rays shooting from the robot are <strong>LiDAR beams</strong>. LiDAR (Light Detection and Ranging) measures distances by casting rays in a forward arc. Where a ray hits a wall, it reports the distance. This is how the robot "sees" its environment.',
                highlight: '#realWorldCanvas',
                position: 'center'
            },
            {
                title: '🗺️ Occupancy Grid Mapping',
                description: 'Switch to the <strong>SLAM Map</strong> view to see the occupancy grid. Each cell is either: <strong>Free</strong> (white — safe to travel), <strong>Occupied</strong> (black — wall detected), or <strong>Unknown</strong> (dark — not yet scanned). The robot builds this map in real-time from LiDAR data.',
                highlight: '#btnSlamMap',
                position: 'right',
                action: 'clickSlamMap'
            },
            {
                title: '🎯 Noise & Uncertainty',
                description: 'Real sensors are never perfect! The <strong>Sensor Noise</strong> slider adds random error to LiDAR readings, simulating real-world conditions. Higher noise = fuzzier map. This is why SLAM algorithms need to handle uncertainty.',
                highlight: '#noiseSlider',
                position: 'right'
            },
            {
                title: '🧭 Autonomous Exploration',
                description: '<strong>Frontier Exploration</strong> is how the robot decides where to go next. A "frontier" is the boundary between known and unknown space. The robot finds the nearest frontier and navigates to it, progressively revealing the entire map.',
                highlight: '#btnAutoExplore',
                position: 'right'
            },
            {
                title: '🛤️ Pathfinding Algorithms',
                description: 'When the robot needs to reach a goal, it uses pathfinding algorithms like <strong>A*</strong>, <strong>Dijkstra</strong>, or <strong>Bug2</strong> to find the shortest obstacle-free path through the occupancy grid. Click anywhere on the SLAM Map to set a goal.',
                highlight: '#algorithmSelect',
                position: 'right'
            },
            {
                title: '📊 Live Sensor Data',
                description: 'This polar chart shows <strong>real-time LiDAR distances</strong> for each ray angle. Short bars = nearby walls, long bars = open space. Adjusting <strong>Ray Density</strong> changes how many measurements the sensor takes per sweep.',
                highlight: '.chart-wrapper',
                position: 'right'
            },
            {
                title: '🎯 Particle Filter (MCL)',
                description: 'Enable the <strong>Particle Filter</strong> to visualize Monte Carlo Localization. Each dot represents a hypothesis of where the robot might be. Green = high confidence, Red = low. Watch them converge as the robot gathers more data!',
                highlight: '#btnParticleFilter',
                position: 'right'
            },
            {
                title: '📈 Odometry Drift',
                description: '<strong>Odometry</strong> estimates position from wheel rotations, but errors accumulate over time — this is called <strong>drift</strong>. Enable the Odometry Drift slider to see the believed position (orange ghost) diverge from the true position.',
                highlight: '#driftSlider',
                position: 'right'
            },
            {
                title: '🏗️ Build Your Own Map',
                description: 'Switch to <strong>Build Mode</strong> to draw custom walls by clicking and dragging. Then switch back to Drive Mode to explore your creation! You can also use <strong>preset maps</strong> like Maze, Warehouse, or Office.',
                highlight: '#btnBuildMode',
                position: 'right'
            },
            {
                title: '✅ You\'re Ready!',
                description: 'You now understand the core concepts of SLAM! Try experimenting with different settings, maps, and features. The best way to learn robotics is by <strong>playing</strong> with it. Happy exploring! 🚀',
                highlight: null,
                position: 'center'
            }
        ];

        this.currentStep = 0;
        this.active = false;
        this.overlay = null;
        this.tooltip = null;
        this.highlightRing = null;

        this._buildDOM();
    }

    _buildDOM() {
        // Overlay backdrop
        this.overlay = document.createElement('div');
        this.overlay.id = 'tutorialOverlay';
        this.overlay.className = 'tutorial-overlay';
        this.overlay.innerHTML = `
            <div class="tutorial-tooltip" id="tutorialTooltip">
                <div class="tutorial-header">
                    <span class="tutorial-step-indicator" id="tutorialStepIndicator"></span>
                    <button class="tutorial-close" id="tutorialClose">✕</button>
                </div>
                <h3 class="tutorial-title" id="tutorialTitle"></h3>
                <p class="tutorial-desc" id="tutorialDesc"></p>
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

        // Bind navigation
        document.getElementById('tutorialClose').addEventListener('click', () => this.end());
        document.getElementById('tutorialPrev').addEventListener('click', () => this.prev());
        document.getElementById('tutorialNext').addEventListener('click', () => this.next());

        // Close on overlay click (outside tooltip)
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) this.end();
        });
    }

    start() {
        this.currentStep = 0;
        this.active = true;
        this.overlay.classList.add('active');
        this._renderStep();
    }

    end() {
        this.active = false;
        this.overlay.classList.remove('active');
        this.highlightRing.style.display = 'none';
    }

    next() {
        if (this.currentStep < this.steps.length - 1) {
            this.currentStep++;
            this._renderStep();
        } else {
            this.end();
        }
    }

    prev() {
        if (this.currentStep > 0) {
            this.currentStep--;
            this._renderStep();
        }
    }

    /** Execute tutorial step actions (like switching views) */
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
        }
    }

    _renderStep() {
        const step = this.steps[this.currentStep];
        const total = this.steps.length;

        // Execute any step action first (e.g. switch to SLAM map view)
        this._executeAction(step.action);

        // Update text
        document.getElementById('tutorialTitle').textContent = step.title;
        document.getElementById('tutorialDesc').innerHTML = step.description;
        document.getElementById('tutorialStepIndicator').textContent = `${this.currentStep + 1} / ${total}`;

        // Update nav buttons
        const prevBtn = document.getElementById('tutorialPrev');
        const nextBtn = document.getElementById('tutorialNext');
        prevBtn.style.visibility = this.currentStep === 0 ? 'hidden' : 'visible';
        nextBtn.textContent = this.currentStep === total - 1 ? 'Finish ✓' : 'Next →';

        // Highlight target element
        const target = step.highlight ? document.querySelector(step.highlight) : null;
        if (target) {
            // Scroll sidebar element into view if needed
            const sidebar = document.querySelector('.sidebar');
            if (sidebar && sidebar.contains(target)) {
                target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }

            // Wait a frame for scroll to settle before positioning
            requestAnimationFrame(() => {
                const rect = target.getBoundingClientRect();

                // Position highlight ring
                this.highlightRing.style.display = 'block';
                this.highlightRing.style.left = `${rect.left - 6}px`;
                this.highlightRing.style.top = `${rect.top - 6}px`;
                this.highlightRing.style.width = `${rect.width + 12}px`;
                this.highlightRing.style.height = `${rect.height + 12}px`;

                // Position tooltip
                this._positionTooltip(rect, step.position);
            });
        } else {
            this.highlightRing.style.display = 'none';
            // Center the tooltip on screen
            this._centerTooltip();
        }
    }

    _centerTooltip() {
        const tooltip = this.tooltip;
        tooltip.style.left = '50%';
        tooltip.style.top = '50%';
        tooltip.style.transform = 'translate(-50%, -50%)';
    }

    _positionTooltip(targetRect, position) {
        const tooltip = this.tooltip;
        const margin = 20;

        // For center position or large elements (like the canvas), center the tooltip on screen
        if (position === 'center') {
            this._centerTooltip();
            return;
        }

        // Reset transform
        tooltip.style.transform = 'none';

        if (position === 'right') {
            // Place to the right of the element, vertically centered
            tooltip.style.left = `${targetRect.right + margin}px`;
            tooltip.style.top = `${targetRect.top + targetRect.height / 2}px`;
            tooltip.style.transform = 'translateY(-50%)';
        } else if (position === 'left') {
            // Place to the left
            tooltip.style.left = `${targetRect.left - margin}px`;
            tooltip.style.top = `${targetRect.top + targetRect.height / 2}px`;
            tooltip.style.transform = 'translate(-100%, -50%)';
        } else if (position === 'bottom') {
            tooltip.style.left = `${targetRect.left + targetRect.width / 2}px`;
            tooltip.style.top = `${targetRect.bottom + margin}px`;
            tooltip.style.transform = 'translateX(-50%)';
        }

        // Clamp to viewport so tooltip never goes off-screen
        requestAnimationFrame(() => {
            const tooltipRect = tooltip.getBoundingClientRect();
            const vw = window.innerWidth;
            const vh = window.innerHeight;
            const pad = 10;

            // Horizontal clamping
            if (tooltipRect.left < pad) {
                tooltip.style.left = `${pad}px`;
                tooltip.style.transform = 'none';
            }
            if (tooltipRect.right > vw - pad) {
                tooltip.style.left = `${vw - tooltipRect.width - pad}px`;
                tooltip.style.transform = 'none';
            }

            // Vertical clamping
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
