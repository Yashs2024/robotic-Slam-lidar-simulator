export class Renderer {
    constructor() {
        this.realWorldCanvas = document.getElementById('realWorldCanvas');
        this.slamCanvas = document.getElementById('slamCanvas');

        // Setting up 2D drawing contexts
        this.realWorldCtx = this.realWorldCanvas.getContext('2d');
        this.slamCtx = this.slamCanvas.getContext('2d');

        // Fog of war canvas — initialised on first call
        this.fogCanvas = null;
        this.fogCtx = null;

        // Handle high-dpi displays and resizing
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    resizeCanvas() {
        const container = document.querySelector('.canvas-container');
        // If container is hidden (display: none), clientWidth/Height are 0.
        // Fall back to window calculations (sidebar is 320px).
        const width = container.clientWidth || (window.innerWidth - 320);
        const height = container.clientHeight || window.innerHeight;

        this.realWorldCanvas.width = width;
        this.realWorldCanvas.height = height;
        this.slamCanvas.width = width;
        this.slamCanvas.height = height;

        // Re-init fog if already created
        if (this.fogCanvas) {
            this.initFogCanvas(width, height);
        }
    }

    clear() {
        this.realWorldCtx.fillStyle = '#0f1115';
        this.realWorldCtx.fillRect(0, 0, this.realWorldCanvas.width, this.realWorldCanvas.height);

        this.slamCtx.fillStyle = '#1e293b';
        this.slamCtx.fillRect(0, 0, this.slamCanvas.width, this.slamCanvas.height);
    }

    drawRobot(robot, ctx = this.realWorldCtx) {
        const { x, y, theta, radius } = robot;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(theta);

        const safeRoundRect = (ctx, x, y, w, h, r) => {
            if (ctx.roundRect) {
                ctx.roundRect(x, y, w, h, r);
            } else {
                ctx.rect(x, y, w, h);
            }
        };

        const model = robot.driveModel || 'differential';

        switch (model) {
            case 'ackermann': {
                // Realistic Autonomous Vehicle (Car shape)
                const w = radius * 2.5;
                const h = radius * 1.4;
                
                // Shadow
                ctx.fillStyle = 'rgba(0,0,0,0.4)';
                ctx.beginPath();
                safeRoundRect(ctx, -w / 2 - 2, -h / 2 + 4, w, h, 6);
                ctx.fill();

                // Chassis Gradient (Metallic Silver)
                const chassisGrad = ctx.createLinearGradient(-w/2, -h/2, w/2, h/2);
                chassisGrad.addColorStop(0, '#e2e8f0');
                chassisGrad.addColorStop(1, '#94a3b8');

                ctx.beginPath();
                safeRoundRect(ctx, -w / 2, -h / 2, w, h, 8);
                ctx.fillStyle = chassisGrad;
                ctx.fill();
                ctx.lineWidth = 2;
                ctx.strokeStyle = '#64748b';
                ctx.stroke();

                // Windows (Dark tinted)
                ctx.beginPath();
                safeRoundRect(ctx, -w * 0.2, -h * 0.35, w * 0.6, h * 0.7, 4);
                ctx.fillStyle = '#0f172a';
                ctx.fill();

                // Roof LiDAR
                ctx.beginPath();
                ctx.arc(w * 0.1, 0, radius * 0.35, 0, Math.PI * 2);
                ctx.fillStyle = '#1e293b';
                ctx.fill();
                ctx.lineWidth = 1;
                ctx.strokeStyle = '#000';
                ctx.stroke();
                
                // Spinning LiDAR eye
                ctx.save();
                ctx.translate(w * 0.1, 0);
                ctx.rotate(Date.now() / 200);
                ctx.beginPath();
                ctx.arc(radius * 0.15, 0, radius * 0.1, 0, Math.PI * 2);
                ctx.fillStyle = '#10b981'; // Green glow
                ctx.shadowColor = '#10b981';
                ctx.shadowBlur = 8;
                ctx.fill();
                ctx.restore();
                ctx.shadowBlur = 0;

                // Wheels (Realistic thick tires)
                const wheelW = h * 0.35, wheelLength = w * 0.3;
                ctx.fillStyle = '#020617';
                
                const tireR = 3;
                // Back Left
                ctx.beginPath(); safeRoundRect(ctx, -w / 2 + 4, -h / 2 - wheelW * 0.6, wheelLength, wheelW, tireR); ctx.fill();
                // Back Right
                ctx.beginPath(); safeRoundRect(ctx, -w / 2 + 4, h / 2 - wheelW * 0.4, wheelLength, wheelW, tireR); ctx.fill();
                
                // Front Left
                ctx.beginPath(); safeRoundRect(ctx, w / 2 - wheelLength - 4, -h / 2 - wheelW * 0.6, wheelLength, wheelW, tireR); ctx.fill();
                // Front Right
                ctx.beginPath(); safeRoundRect(ctx, w / 2 - wheelLength - 4, h / 2 - wheelW * 0.4, wheelLength, wheelW, tireR); ctx.fill();

                break;
            }
            case 'holonomic': {
                // Industrial Warehouse Robot (Octagon)
                const sides = 8;
                
                // Shadow
                ctx.beginPath();
                for (let i = 0; i < sides; i++) {
                    const angle = (i / sides) * Math.PI * 2 + (Math.PI/8);
                    const px = Math.cos(angle) * (radius * 1.05) - 2;
                    const py = Math.sin(angle) * (radius * 1.05) + 4;
                    if (i === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                }
                ctx.closePath();
                ctx.fillStyle = 'rgba(0,0,0,0.4)';
                ctx.fill();

                // Main Body (Vibrant Orange / Industrial style)
                ctx.beginPath();
                for (let i = 0; i < sides; i++) {
                    const angle = (i / sides) * Math.PI * 2 + (Math.PI/8);
                    const px = Math.cos(angle) * radius;
                    const py = Math.sin(angle) * radius;
                    if (i === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                }
                ctx.closePath();
                const holoGrad = ctx.createLinearGradient(-radius, -radius, radius, radius);
                holoGrad.addColorStop(0, '#f97316'); // Orange
                holoGrad.addColorStop(1, '#c2410c');
                ctx.fillStyle = holoGrad;
                ctx.fill();
                ctx.lineWidth = 2;
                ctx.strokeStyle = '#7c2d12';
                ctx.stroke();

                // Top Plate (Dark Octagon)
                ctx.beginPath();
                for (let i = 0; i < sides; i++) {
                    const angle = (i / sides) * Math.PI * 2 + (Math.PI/8);
                    const px = Math.cos(angle) * radius * 0.7;
                    const py = Math.sin(angle) * radius * 0.7;
                    if (i === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                }
                ctx.closePath();
                ctx.fillStyle = '#1e293b';
                ctx.fill();
                ctx.stroke();

                // 4 Omni wheels shown at the diagonals
                ctx.fillStyle = '#111827';
                const dist = radius * 0.85;
                const wheelRad = radius * 0.25;
                for(let i=0; i<4; i++) {
                   const a = (i/4) * Math.PI * 2 + (Math.PI/4);
                   ctx.beginPath();
                   ctx.arc(Math.cos(a) * dist, Math.sin(a) * dist, wheelRad, 0, Math.PI*2);
                   ctx.fill();
                }

                // Center glowing indicator
                ctx.beginPath();
                ctx.arc(0, 0, radius * 0.2, 0, Math.PI * 2);
                ctx.fillStyle = '#38bdf8'; // Cyan glow
                ctx.shadowColor = '#38bdf8';
                ctx.shadowBlur = 10;
                ctx.fill();
                ctx.shadowBlur = 0;

                break;
            }
            default: {
                // Realistic SLAM Robot (Differential Drive / TurtleBot style)
                
                // Shadow
                ctx.beginPath();
                ctx.arc(-2, 4, radius * 1.05, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(0,0,0,0.4)';
                ctx.fill();

                // Chassis Gradient
                const grad = ctx.createLinearGradient(-radius, -radius, radius, radius);
                grad.addColorStop(0, '#334155');
                grad.addColorStop(1, '#0f172a');
                
                ctx.beginPath();
                ctx.arc(0, 0, radius, 0, Math.PI * 2);
                ctx.fillStyle = grad;
                ctx.fill();
                ctx.lineWidth = 2;
                ctx.strokeStyle = '#64748b';
                ctx.stroke();

                // Left Wheel
                ctx.fillStyle = '#020617';
                ctx.beginPath();
                safeRoundRect(ctx, -radius * 0.6, -radius - 2, radius * 1.2, radius * 0.35, 3);
                ctx.fill();
                
                // Right Wheel
                ctx.beginPath();
                safeRoundRect(ctx, -radius * 0.6, radius - radius * 0.35 + 2, radius * 1.2, radius * 0.35, 3);
                ctx.fill();

                // Front LED indicator / Sensor strip
                ctx.beginPath();
                ctx.arc(0, 0, radius * 0.9, -Math.PI / 6, Math.PI / 6);
                ctx.lineWidth = 3;
                ctx.strokeStyle = '#3b82f6'; // Bright blue LED
                ctx.shadowColor = '#3b82f6';
                ctx.shadowBlur = 10;
                ctx.stroke();
                ctx.shadowBlur = 0; // reset

                // Central LiDAR Puck (Spinning)
                ctx.beginPath();
                ctx.arc(0, 0, radius * 0.45, 0, Math.PI * 2);
                ctx.fillStyle = '#1e293b';
                ctx.fill();
                ctx.lineWidth = 2;
                ctx.strokeStyle = '#0f172a';
                ctx.stroke();

                // Spinning LiDAR Eye
                ctx.save();
                ctx.rotate(Date.now() / 150); // fast spin
                ctx.beginPath();
                ctx.arc(radius * 0.25, 0, radius * 0.15, 0, Math.PI * 2);
                ctx.fillStyle = '#ef4444'; // Red laser glow
                ctx.shadowColor = '#ef4444';
                ctx.shadowBlur = 8;
                ctx.fill();
                ctx.restore();
                ctx.shadowBlur = 0;

                break;
            }
        }

        // Draw laser heading indicator (all models)
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(radius * 1.8, 0);
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.8)'; // Red laser
        ctx.lineWidth = 2;
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 5;
        ctx.stroke();
        ctx.shadowBlur = 0;

        ctx.restore();
    }

    /**
     * Draw a ghost robot at the believed position (shown only when drift is active).
     */
    drawBelievedRobot(robot, ctx) {
        if (robot.driftAmount === 0) return;

        const { believedX, believedY, believedTheta, radius } = robot;

        ctx.save();
        ctx.globalAlpha = 0.4;
        ctx.translate(believedX, believedY);
        ctx.rotate(believedTheta);

        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fillStyle = '#f59e0b';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#fbbf24';
        ctx.setLineDash([4, 4]);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(radius + 10, 0);
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.setLineDash([]);
        ctx.stroke();

        ctx.restore();
    }

    drawEnvironment(env, ctx = this.realWorldCtx) {
        ctx.save();
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';

        env.getWalls().forEach(wall => {
            ctx.beginPath();
            ctx.moveTo(wall.start.x, wall.start.y);
            ctx.lineTo(wall.end.x, wall.end.y);
            ctx.stroke();
        });

        ctx.restore();
    }

    /**
     * Draw dynamic/moving obstacles with a distinct pulsing color.
     */
    drawDynamicObstacles(dynamicObstacles, ctx = this.realWorldCtx) {
        if (!dynamicObstacles || !dynamicObstacles.enabled) return;

        const walls = dynamicObstacles.getWalls();
        if (walls.length === 0) return;

        ctx.save();

        // Pulsing glow effect
        const pulse = 0.6 + Math.sin(performance.now() / 300) * 0.4;
        ctx.strokeStyle = `rgba(168, 85, 247, ${pulse})`; // Purple
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.shadowColor = '#a855f7';
        ctx.shadowBlur = 10;

        for (const wall of walls) {
            ctx.beginPath();
            ctx.moveTo(wall.start.x, wall.start.y);
            ctx.lineTo(wall.end.x, wall.end.y);
            ctx.stroke();
        }

        ctx.restore();
    }

    drawHumans(dynamicHumans, ctx) {
        if (!dynamicHumans || !dynamicHumans.enabled) return;

        const colors = [
            { shirt: '#3b82f6', hat: '#facc15' }, // Blue shirt, yellow hardhat
            { shirt: '#ef4444', hat: '#facc15' }, // Red shirt, yellow hardhat
            { shirt: '#10b981', hat: '#facc15' }, // Green shirt, yellow hardhat
        ];

        ctx.save();
        for (const human of dynamicHumans.getHumans()) {
            const { x, y, theta, radius, colorIndex } = human;
            const theme = colors[colorIndex % colors.length];

            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(theta);

            // Draw Shoulders (Shirt)
            ctx.beginPath();
            // Shoulders are wider than they are thick
            ctx.ellipse(0, 0, radius, radius * 0.6, 0, 0, Math.PI * 2);
            ctx.fillStyle = theme.shirt;
            ctx.fill();
            ctx.strokeStyle = '#1e293b';
            ctx.lineWidth = 1;
            ctx.stroke();

            // Draw Head (Hardhat)
            ctx.beginPath();
            ctx.arc(radius * 0.2, 0, radius * 0.5, 0, Math.PI * 2);
            ctx.fillStyle = theme.hat;
            ctx.fill();
            ctx.stroke();

            // Draw arms swinging (animation based on time)
            const swing = Math.sin(Date.now() / 150) * radius * 0.5;
            ctx.strokeStyle = theme.shirt;
            ctx.lineWidth = radius * 0.4;
            ctx.lineCap = 'round';
            
            // Left arm
            ctx.beginPath();
            ctx.moveTo(0, -radius * 0.8);
            ctx.lineTo(swing, -radius * 1.1);
            ctx.stroke();

            // Right arm
            ctx.beginPath();
            ctx.moveTo(0, radius * 0.8);
            ctx.lineTo(-swing, radius * 1.1);
            ctx.stroke();

            ctx.restore();
        }
        ctx.restore();
    }

    drawPath(path, ctx = this.slamCtx) {
        if (!path || path.length === 0) return;

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(path[0].x, path[0].y);
        for (let i = 1; i < path.length; i++) {
            ctx.lineTo(path[i].x, path[i].y);
        }
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 3;
        ctx.setLineDash([10, 10]);
        ctx.stroke();

        // Draw target marker at end
        const target = path[path.length - 1];
        ctx.beginPath();
        ctx.arc(target.x, target.y, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#10b981';
        ctx.fill();
        ctx.restore();
    }

    /**
     * Draw the robot's trajectory trail with a fading effect.
     * @param {Array} trail    - Array of {x, y} points
     * @param {string} color   - CSS color for the trail
     * @param {CanvasRenderingContext2D} ctx
     */
    drawTrail(trail, color, ctx) {
        if (!trail || trail.length < 2) return;

        ctx.save();
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        const len = trail.length;
        for (let i = 1; i < len; i++) {
            // Fade: older points are more transparent
            const alpha = (i / len) * 0.7;
            ctx.globalAlpha = alpha;
            ctx.strokeStyle = color;
            ctx.beginPath();
            ctx.moveTo(trail[i - 1].x, trail[i - 1].y);
            ctx.lineTo(trail[i].x, trail[i].y);
            ctx.stroke();
        }

        ctx.restore();
    }

    drawBuildLine(start, end, ctx = this.realWorldCtx) {
        if (!start || !end) return;
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.setLineDash([15, 10]);
        ctx.stroke();
        ctx.restore();
    }

    /**
     * Draw frontier target marker on the SLAM map.
     */
    drawFrontierTarget(target, ctx = this.slamCtx) {
        if (!target) return;
        ctx.save();

        // Pulsing ring effect
        const time = performance.now() / 500;
        const pulseRadius = 10 + Math.sin(time) * 4;

        ctx.beginPath();
        ctx.arc(target.x, target.y, pulseRadius, 0, Math.PI * 2);
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 3;
        ctx.setLineDash([5, 5]);
        ctx.stroke();

        // Inner dot
        ctx.beginPath();
        ctx.arc(target.x, target.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#fbbf24';
        ctx.fill();

        ctx.restore();
    }

    // ──────────────────────────────────────────
    //  Fog of War
    // ──────────────────────────────────────────

    initFogCanvas(width, height) {
        this.fogCanvas = document.createElement('canvas');
        this.fogCanvas.width = width;
        this.fogCanvas.height = height;
        this.fogCtx = this.fogCanvas.getContext('2d');
        this.resetFog();
    }

    resetFog() {
        if (!this.fogCtx) return;
        this.fogCtx.globalCompositeOperation = 'source-over';
        this.fogCtx.fillStyle = 'rgba(10, 12, 18, 1)';
        this.fogCtx.fillRect(0, 0, this.fogCanvas.width, this.fogCanvas.height);
    }

    drawFogOfWar(scanHits, robot) {
        if (!this.fogCtx || scanHits.length === 0) return;

        const ctx = this.fogCtx;
        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';

        ctx.beginPath();
        ctx.moveTo(robot.x, robot.y);
        for (const hit of scanHits) {
            ctx.lineTo(hit.x, hit.y);
        }
        ctx.closePath();

        const maxRange = 600;
        const gradient = ctx.createRadialGradient(
            robot.x, robot.y, 0,
            robot.x, robot.y, maxRange
        );
        gradient.addColorStop(0, 'rgba(0,0,0,1)');
        gradient.addColorStop(0.80, 'rgba(0,0,0,0.95)');
        gradient.addColorStop(1, 'rgba(0,0,0,0)');

        ctx.fillStyle = gradient;
        ctx.fill();

        ctx.restore();
    }

    drawFogOverlay(ctx = this.slamCtx) {
        if (!this.fogCanvas) return;
        ctx.drawImage(this.fogCanvas, 0, 0);
    }

    // ──────────────────────────────────────────
    //  Particle Filter Visualization
    // ──────────────────────────────────────────

    drawParticles(particles, ctx) {
        if (!particles || particles.length === 0) return;

        ctx.save();

        // Find max weight for normalization
        let maxWeight = 0;
        for (const p of particles) {
            if (p.weight > maxWeight) maxWeight = p.weight;
        }
        if (maxWeight === 0) maxWeight = 1;

        for (const p of particles) {
            const normalizedWeight = p.weight / maxWeight;

            // Color: interpolate from red (low weight) to green (high weight)
            const r = Math.floor(255 * (1 - normalizedWeight));
            const g = Math.floor(255 * normalizedWeight);
            const alpha = 0.3 + normalizedWeight * 0.7;

            ctx.beginPath();
            ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${r}, ${g}, 80, ${alpha})`;
            ctx.fill();

            // Draw tiny heading indicator for top-weighted particles
            if (normalizedWeight > 0.5) {
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(p.x + Math.cos(p.theta) * 8, p.y + Math.sin(p.theta) * 8);
                ctx.strokeStyle = `rgba(${r}, ${g}, 80, ${alpha * 0.6})`;
                ctx.lineWidth = 1;
                ctx.stroke();
            }
        }

        ctx.restore();
    }
}
