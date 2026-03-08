/**
 * ParticleFilter.js
 *
 * Monte Carlo Localization (MCL) — a particle filter for robot pose estimation.
 *
 * Each particle represents a hypothesis of where the robot might be.
 * Particles are weighted by how well their predicted sensor readings
 * match the actual LiDAR scan, then resampled so good hypotheses survive.
 */
export class ParticleFilter {
    constructor(numParticles = 200) {
        this.numParticles = numParticles;
        this.particles = [];
        this.enabled = false;

        // How many LiDAR rays to sample for weight computation (performance)
        this.raySampleCount = 8;
    }

    /** Scatter particles around an initial pose */
    init(x, y, theta = 0, spread = 60) {
        this.particles = [];
        for (let i = 0; i < this.numParticles; i++) {
            this.particles.push({
                x: x + (Math.random() - 0.5) * spread * 2,
                y: y + (Math.random() - 0.5) * spread * 2,
                theta: theta + (Math.random() - 0.5) * Math.PI * 0.5,
                weight: 1 / this.numParticles
            });
        }
    }

    /** Set particle count (re-initializes if already running) */
    setCount(count) {
        this.numParticles = count;
    }

    /** Apply motion model with noise to every particle */
    predict(forwardSpeed, turnSpeed) {
        const motionNoise = 0.15;
        const turnNoise = 0.08;

        for (const p of this.particles) {
            // Add noise to the control inputs
            const noisySpeed = forwardSpeed + (Math.random() - 0.5) * motionNoise * Math.abs(forwardSpeed) * 2;
            const noisyTurn = turnSpeed + (Math.random() - 0.5) * turnNoise * 2;

            p.theta += noisyTurn;
            p.x += Math.cos(p.theta) * noisySpeed;
            p.y += Math.sin(p.theta) * noisySpeed;

            // Small random drift to keep diversity
            p.x += (Math.random() - 0.5) * 0.5;
            p.y += (Math.random() - 0.5) * 0.5;
            p.theta += (Math.random() - 0.5) * 0.01;
        }
    }

    /**
     * Weight particles by comparing expected vs actual sensor readings.
     * We sample a subset of rays for performance.
     */
    update(scanHits, environment) {
        if (scanHits.length === 0) return;

        const stride = Math.max(1, Math.floor(scanHits.length / this.raySampleCount));

        // Collect actual distances for sampled rays
        const sampledHits = [];
        for (let i = 0; i < scanHits.length; i += stride) {
            sampledHits.push(scanHits[i]);
        }

        let totalWeight = 0;
        const maxRange = 600;
        const walls = environment.getWalls();

        for (const p of this.particles) {
            let logLikelihood = 0;

            for (const hit of sampledHits) {
                // Compute expected distance from this particle's pose
                const rayAngle = hit.angle - 0 + p.theta - (scanHits[0] ? scanHits[0].angle : 0) + (hit.angle);
                // Simplified: use the hit angle relative to first ray, then apply particle's theta
                const relAngle = hit.angle;
                const expectedDist = this._rayCast(p.x, p.y, relAngle - 0 + p.theta - scanHits[0].angle + scanHits[0].angle, walls, maxRange);

                // Use the actual angle from the scan hit but offset by particle heading
                const particleRayAngle = relAngle + (p.theta - scanHits[0].angle + scanHits[0].angle - relAngle);

                // Actually, let's simplify: the ray angle relative to the robot
                // scanHits angles are absolute (robot.theta + offset)
                // So the ray offset from robot heading = hit.angle - robot.theta (which we don't have)
                // We'll use the index to get the angular offset
            }

            // Better approach: use ray index to reconstruct relative angle
            logLikelihood = 0;
            for (const hit of sampledHits) {
                const idx = scanHits.indexOf(hit);
                const numRays = scanHits.length;
                const relativeAngle = (idx / numRays) * Math.PI * 2; // angle offset from heading
                const absAngle = p.theta + relativeAngle;

                const expectedDist = this._rayCast(p.x, p.y, absAngle, walls, maxRange);
                const actualDist = hit.distance;

                // Gaussian likelihood
                const sigma = 30; // tolerance in pixels
                const diff = expectedDist - actualDist;
                logLikelihood += -(diff * diff) / (2 * sigma * sigma);
            }

            p.weight = Math.exp(logLikelihood);
            totalWeight += p.weight;
        }

        // Normalize weights
        if (totalWeight > 0) {
            for (const p of this.particles) {
                p.weight /= totalWeight;
            }
        }
    }

    /** Cast a single ray from (x, y) at angle, return distance to nearest wall */
    _rayCast(x, y, angle, walls, maxRange) {
        const endX = x + Math.cos(angle) * maxRange;
        const endY = y + Math.sin(angle) * maxRange;

        let minDist = maxRange;

        for (const wall of walls) {
            const intersection = this._lineIntersect(
                x, y, endX, endY,
                wall.start.x, wall.start.y, wall.end.x, wall.end.y
            );
            if (intersection !== null) {
                const dx = intersection.x - x;
                const dy = intersection.y - y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < minDist) minDist = dist;
            }
        }

        return minDist;
    }

    /** Line-line intersection (same algorithm as Lidar.js) */
    _lineIntersect(x1, y1, x2, y2, x3, y3, x4, y4) {
        const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
        if (denom === 0) return null;

        const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
        const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

        if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
            return {
                x: x1 + t * (x2 - x1),
                y: y1 + t * (y2 - y1)
            };
        }
        return null;
    }

    /** Stochastic Universal Resampling (SUS) */
    resample() {
        const N = this.particles.length;
        if (N === 0) return;

        const newParticles = [];
        const step = 1 / N;
        let r = Math.random() * step;
        let cumWeight = this.particles[0].weight;
        let j = 0;

        for (let i = 0; i < N; i++) {
            const target = r + i * step;
            while (cumWeight < target && j < N - 1) {
                j++;
                cumWeight += this.particles[j].weight;
            }

            newParticles.push({
                x: this.particles[j].x,
                y: this.particles[j].y,
                theta: this.particles[j].theta,
                weight: 1 / N
            });
        }

        // Add small jitter to avoid particle depletion
        for (const p of newParticles) {
            p.x += (Math.random() - 0.5) * 2;
            p.y += (Math.random() - 0.5) * 2;
            p.theta += (Math.random() - 0.5) * 0.02;
        }

        this.particles = newParticles;
    }

    /** Weighted mean estimate of robot pose */
    getEstimate() {
        let sumX = 0, sumY = 0;
        let sumSin = 0, sumCos = 0;
        let sumW = 0;

        for (const p of this.particles) {
            sumX += p.x * p.weight;
            sumY += p.y * p.weight;
            sumCos += Math.cos(p.theta) * p.weight;
            sumSin += Math.sin(p.theta) * p.weight;
            sumW += p.weight;
        }

        if (sumW === 0) return { x: 0, y: 0, theta: 0 };

        return {
            x: sumX / sumW,
            y: sumY / sumW,
            theta: Math.atan2(sumSin / sumW, sumCos / sumW)
        };
    }

    getParticles() {
        return this.particles;
    }

    setEnabled(enabled) {
        this.enabled = enabled;
    }
}
