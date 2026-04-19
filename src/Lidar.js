export class Lidar {
    constructor() {
        this.numRays = 90;
        this.maxRange = 600; // Simulated sensor range (pixels)
        this.noisePercent = 2; // e.g. 2% error
    }

    // Set from UI Sliders
    setParameters(numRays, noisePercent) {
        this.numRays = numRays;
        this.noisePercent = noisePercent;
    }

    scan(robot, environment, dynamicHumans = null) {
        const hits = [];
        const fov = Math.PI; // 180° field of view
        const angleStep = fov / this.numRays;
        const startAngle = robot.theta - fov / 2; // Center the arc on the robot's heading

        for (let i = 0; i < this.numRays; i++) {
            const rayAngle = startAngle + (i * angleStep);

            // Ray start and max end point
            const p1 = { x: robot.x, y: robot.y };
            const p2 = {
                x: robot.x + Math.cos(rayAngle) * this.maxRange,
                y: robot.y + Math.sin(rayAngle) * this.maxRange
            };

            let closestIntersection = null;
            let minDistance = this.maxRange;

            // Check intersection with all walls
            environment.getWalls().forEach(wall => {
                const intersection = this.getLineIntersection(p1, p2, wall.start, wall.end);
                if (intersection) {
                    const dist = this.distance(p1, intersection);
                    if (dist < minDistance) {
                        minDistance = dist;
                        closestIntersection = { x: intersection.x, y: intersection.y, distance: dist, angle: rayAngle, hit: true, type: 'wall' };
                    }
                }
            });

            // Check intersection with dynamic humans (circles)
            if (dynamicHumans) {
                dynamicHumans.getHumans().forEach(human => {
                    const intersections = this.getLineCircleIntersections(p1, p2, human.x, human.y, human.radius);
                    if (intersections) {
                        intersections.forEach(intersection => {
                            const dist = this.distance(p1, intersection);
                            if (dist < minDistance) {
                                minDistance = dist;
                                closestIntersection = { x: intersection.x, y: intersection.y, distance: dist, angle: rayAngle, hit: true, type: 'human' };
                            }
                        });
                    }
                });
            }

            // If no hit, we return the max range
            if (!closestIntersection) {
                closestIntersection = { x: p2.x, y: p2.y, distance: this.maxRange, angle: rayAngle, hit: false };
            } else {
                // Apply Gaussian-like Noise to the distance measurement if it hit something
                if (this.noisePercent > 0) {
                    const noiseMagnitude = (this.noisePercent / 100) * this.maxRange;
                    const error = (Math.random() * 2 - 1) * noiseMagnitude; // Uniform noise for simplicity
                    closestIntersection.distance += error;
                    // Recompute endpoint with noisy distance
                    closestIntersection.x = p1.x + Math.cos(rayAngle) * closestIntersection.distance;
                    closestIntersection.y = p1.y + Math.sin(rayAngle) * closestIntersection.distance;
                }
            }

            hits.push(closestIntersection);
        }

        return hits;
    }

    drawRays(hits, robot, ctx, style = {}) {
        const strokeHit = style.strokeHit || 'rgba(239, 68, 68, 0.4)';
        const strokeFree = style.strokeFree || 'rgba(16, 185, 129, 0.2)';
        const hitDot = style.hitDot || '#ef4444';

        ctx.save();
        ctx.lineWidth = 1;

        hits.forEach(hit => {
            ctx.beginPath();
            ctx.moveTo(robot.x, robot.y);
            ctx.lineTo(hit.x, hit.y);

            if (hit.hit) {
                ctx.strokeStyle = strokeHit;
            } else {
                ctx.strokeStyle = strokeFree;
            }
            ctx.stroke();

            // Draw little dot where it hits
            if (hit.hit) {
                ctx.beginPath();
                ctx.arc(hit.x, hit.y, 2, 0, Math.PI * 2);
                ctx.fillStyle = hitDot;
                ctx.fill();
            }
        });
        ctx.restore();
    }

    // Math helper for Line-Line Intersection (Ray against Wall)
    // Derived from standard computational geometry
    getLineIntersection(p1, p2, p3, p4) {
        const denom = (p1.x - p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x - p4.x);
        // Lines are parallel
        if (denom === 0) return null;

        const t = ((p1.x - p3.x) * (p3.y - p4.y) - (p1.y - p3.y) * (p3.x - p4.x)) / denom;
        const u = -((p1.x - p2.x) * (p1.y - p3.y) - (p1.y - p2.y) * (p1.x - p3.x)) / denom;

        // Intersect is inside the line segments
        if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
            return {
                x: p1.x + t * (p2.x - p1.x),
                y: p1.y + t * (p2.y - p1.y)
            };
        }
        return null;
    }

    // Math helper for Line-Circle Intersection (Ray against Humans)
    getLineCircleIntersections(p1, p2, cx, cy, r) {
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        
        const A = dx * dx + dy * dy;
        const B = 2 * (dx * (p1.x - cx) + dy * (p1.y - cy));
        const C = (p1.x - cx) * (p1.x - cx) + (p1.y - cy) * (p1.y - cy) - r * r;

        const det = B * B - 4 * A * C;
        if (A <= 0.0000001 || det < 0) {
            return null; // No intersection
        } else if (det === 0) {
            // One intersection tangent
            const t = -B / (2 * A);
            if (t >= 0 && t <= 1) {
                return [{ x: p1.x + t * dx, y: p1.y + t * dy }];
            }
            return null;
        } else {
            // Two intersections (entering and exiting circle)
            const t1 = (-B + Math.sqrt(det)) / (2 * A);
            const t2 = (-B - Math.sqrt(det)) / (2 * A);
            const intersections = [];
            if (t1 >= 0 && t1 <= 1) intersections.push({ x: p1.x + t1 * dx, y: p1.y + t1 * dy });
            if (t2 >= 0 && t2 <= 1) intersections.push({ x: p1.x + t2 * dx, y: p1.y + t2 * dy });
            return intersections.length > 0 ? intersections : null;
        }
    }

    distance(p1, p2) {
        return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
    }
}
