export class DynamicHumans {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.humans = [];
        this.enabled = false;
        this.numHumans = 5; // Configurable
    }

    setEnabled(enabled) {
        this.enabled = enabled;
        if (!enabled) {
            this.humans = [];
        } else {
            this.generate();
        }
    }

    resize(width, height) {
        this.width = width;
        this.height = height;
        if (this.enabled) {
            this.generate();
        }
    }

    generate(environment = null) {
        this.humans = [];
        if (!this.enabled) return;

        // Create random wandering workers
        for (let i = 0; i < this.numHumans; i++) {
            // Pick a safe starting spot (simplified, ideally uses environment.findSafeSpawn but we don't always have it here)
            // We'll just scatter them inward from the edges
            const inset = 100;
            const x = inset + Math.random() * (this.width - 2 * inset);
            const y = inset + Math.random() * (this.height - 2 * inset);
            
            // Random initial heading
            const theta = Math.random() * Math.PI * 2;
            
            this.humans.push({
                id: `worker_${i}`,
                x: x,
                y: y,
                radius: 12, // Human body radius (shoulders)
                theta: theta, // Facing direction
                speed: 0.5 + Math.random() * 0.5, // 0.5 to 1.0 px/frame
                turnTimer: 0,
                colorIndex: Math.floor(Math.random() * 3) // For rendering shirt colors
            });
        }
    }

    update(environment) {
        if (!this.enabled) return;

        for (const human of this.humans) {
            // Random wandering logic
            human.turnTimer--;
            if (human.turnTimer <= 0) {
                // Pick a new random turn direction (-0.5 to 0.5 radians over a few frames)
                human.targetTurn = (Math.random() - 0.5) * 1.0;
                human.turnTimer = 30 + Math.random() * 60; // Keep current turn state for 30-90 frames
            }
            
            // Smoothly steer towards target turn
            if (human.targetTurn) {
               human.theta += human.targetTurn * 0.05;
            }

            const nextX = human.x + Math.cos(human.theta) * human.speed;
            const nextY = human.y + Math.sin(human.theta) * human.speed;

            // Simple collision with environmental walls
            let hitWall = false;
            if (environment) {
                for (const wall of environment.getWalls()) {
                    if (this.circleLineIntersect(nextX, nextY, human.radius, wall.start, wall.end)) {
                        hitWall = true;
                        break;
                    }
                }
            }

            // Boundary checks
            if (nextX - human.radius < 0 || nextX + human.radius > this.width ||
                nextY - human.radius < 0 || nextY + human.radius > this.height) {
                hitWall = true;
            }

            if (hitWall) {
                // Bounce: reverse heading heavily
                human.theta += Math.PI + (Math.random() * 1.0 - 0.5); // Turn ~180 degrees
                human.turnTimer = 0; // Force new behavior soon
            } else {
                human.x = nextX;
                human.y = nextY;
            }
        }
    }

    // Returns the array of human objects for rendering or raycasting
    getHumans() {
        if (!this.enabled) return [];
        return this.humans;
    }

    // Helper: Circle-Line segment intersection
    circleLineIntersect(cx, cy, r, p1, p2) {
        let dx = p2.x - p1.x;
        let dy = p2.y - p1.y;

        let lenSq = dx * dx + dy * dy;
        let t = 0;

        if (lenSq !== 0) {
            t = ((cx - p1.x) * dx + (cy - p1.y) * dy) / lenSq;
            t = Math.max(0, Math.min(1, t));
        }

        let closestX = p1.x + t * dx;
        let closestY = p1.y + t * dy;

        let distX = cx - closestX;
        let distY = cy - closestY;

        return (distX * distX + distY * distY) < (r * r);
    }
}
