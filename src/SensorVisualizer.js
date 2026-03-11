/**
 * SensorVisualizer.js
 *
 * HUD overlay showing real-time robot state and sensor data:
 * - True pose vs believed pose
 * - Min/Max/Avg LiDAR distance
 * - Ray hit ratio
 * - Closest obstacle direction
 */
export class SensorVisualizer {
    constructor() {
        this.container = null;
        this.lastUpdate = 0;
        this.updateInterval = 150; // ~7 fps

        this._buildDOM();
    }

    _buildDOM() {
        this.container = document.createElement('div');
        this.container.id = 'sensorHUD';
        this.container.className = 'sensor-hud';
        this.container.innerHTML = `
            <div class="sensor-hud-title">📊 Sensor Data</div>
            <div class="sensor-hud-grid">
                <div class="sensor-hud-section">
                    <div class="sensor-hud-label">TRUE POSE</div>
                    <div class="sensor-hud-row">
                        <span>x:</span> <span id="hudTrueX">—</span>
                    </div>
                    <div class="sensor-hud-row">
                        <span>y:</span> <span id="hudTrueY">—</span>
                    </div>
                    <div class="sensor-hud-row">
                        <span>θ:</span> <span id="hudTrueTheta">—</span>
                    </div>
                </div>
                <div class="sensor-hud-section">
                    <div class="sensor-hud-label">BELIEVED POSE</div>
                    <div class="sensor-hud-row">
                        <span>x:</span> <span id="hudBelX">—</span>
                    </div>
                    <div class="sensor-hud-row">
                        <span>y:</span> <span id="hudBelY">—</span>
                    </div>
                    <div class="sensor-hud-row">
                        <span>θ:</span> <span id="hudBelTheta">—</span>
                    </div>
                </div>
            </div>
            <div class="sensor-hud-divider"></div>
            <div class="sensor-hud-section">
                <div class="sensor-hud-label">LIDAR STATS</div>
                <div class="sensor-hud-row">
                    <span>Min:</span> <span id="hudMinDist">—</span>
                </div>
                <div class="sensor-hud-row">
                    <span>Max:</span> <span id="hudMaxDist">—</span>
                </div>
                <div class="sensor-hud-row">
                    <span>Avg:</span> <span id="hudAvgDist">—</span>
                </div>
                <div class="sensor-hud-row">
                    <span>Hits:</span> <span id="hudHitRatio">—</span>
                </div>
            </div>
            <div class="sensor-hud-divider"></div>
            <div class="sensor-hud-section">
                <div class="sensor-hud-label">NEAREST OBSTACLE</div>
                <div class="sensor-compass" id="hudCompass">
                    <div class="compass-needle" id="hudNeedle"></div>
                    <div class="compass-dist" id="hudCompassDist">—</div>
                </div>
            </div>
        `;

        // Append to canvas container
        const canvasContainer = document.querySelector('.canvas-container');
        if (canvasContainer) {
            canvasContainer.appendChild(this.container);
        }
    }

    update(robot, scanHits) {
        const now = performance.now();
        if (now - this.lastUpdate < this.updateInterval) return;
        this.lastUpdate = now;

        if (!scanHits || scanHits.length === 0) return;

        // True pose
        document.getElementById('hudTrueX').textContent = Math.round(robot.x);
        document.getElementById('hudTrueY').textContent = Math.round(robot.y);
        document.getElementById('hudTrueTheta').textContent = `${(robot.theta * 180 / Math.PI).toFixed(1)}°`;

        // Believed pose
        document.getElementById('hudBelX').textContent = Math.round(robot.believedX);
        document.getElementById('hudBelY').textContent = Math.round(robot.believedY);
        document.getElementById('hudBelTheta').textContent = `${(robot.believedTheta * 180 / Math.PI).toFixed(1)}°`;

        // LiDAR stats
        let minDist = Infinity, maxDist = 0, totalDist = 0, hitCount = 0;
        let closestAngle = 0;

        for (const hit of scanHits) {
            if (hit.distance < minDist) {
                minDist = hit.distance;
                closestAngle = hit.angle;
            }
            if (hit.distance > maxDist) maxDist = hit.distance;
            totalDist += hit.distance;
            if (hit.hit) hitCount++;
        }

        const avgDist = totalDist / scanHits.length;

        document.getElementById('hudMinDist').textContent = `${(minDist / 100).toFixed(1)}m`;
        document.getElementById('hudMaxDist').textContent = `${(maxDist / 100).toFixed(1)}m`;
        document.getElementById('hudAvgDist').textContent = `${(avgDist / 100).toFixed(1)}m`;
        document.getElementById('hudHitRatio').textContent = `${hitCount}/${scanHits.length}`;

        // Compass — rotate needle to point at closest obstacle
        const relAngle = closestAngle - robot.theta;
        const needle = document.getElementById('hudNeedle');
        if (needle) {
            needle.style.transform = `rotate(${relAngle}rad)`;
        }
        document.getElementById('hudCompassDist').textContent = `${(minDist / 100).toFixed(1)}m`;
    }
}
