/**
 * Mapper.js
 *
 * Bayesian Occupancy Grid using Log-Odds representation.
 * Each cell stores a log-odds value that is updated incrementally:
 *   - Free space observations decrease the value (more confident free)
 *   - Occupied observations increase the value (more confident wall)
 *   - Probability is recovered via: p = 1 - 1 / (1 + e^l)
 *
 * This is the standard approach used in GMapping, Cartographer, etc.
 */
export class Mapper {
    constructor(canvasWidth, canvasHeight, cellSize = 10) {
        this.cellSize = cellSize;
        this.cols = Math.ceil(canvasWidth / cellSize);
        this.rows = Math.ceil(canvasHeight / cellSize);

        // Log-odds grid: 0 = unknown (p=0.5), positive = occupied, negative = free
        this.grid = new Float32Array(this.cols * this.rows); // initialized to 0

        // Bayesian update parameters (log-odds increments)
        this.L_OCC = 0.85;   // log-odds increase per occupied observation
        this.L_FREE = -0.4;  // log-odds decrease per free observation
        this.L_MAX = 5.0;    // clamp ceiling (p ≈ 0.993)
        this.L_MIN = -5.0;   // clamp floor   (p ≈ 0.007)

        // Pre-build a color lookup table for fast rendering (256 entries)
        this._colorLUT = this._buildColorLUT();
    }

    /**
     * Build a lookup table mapping 0..255 index to RGBA CSS color string.
     * Index 128 = unknown (mid-gray), 0 = definitely free (white), 255 = definitely occupied (black).
     */
    _buildColorLUT() {
        const lut = new Array(256);
        for (let i = 0; i < 256; i++) {
            // i=0 → free (white), i=255 → occupied (black)
            const brightness = 255 - i;
            lut[i] = `rgb(${brightness},${brightness},${brightness})`;
        }
        return lut;
    }

    clear() {
        this.grid.fill(0);
    }

    resize(canvasWidth, canvasHeight) {
        this.cols = Math.ceil(canvasWidth / this.cellSize);
        this.rows = Math.ceil(canvasHeight / this.cellSize);
        this.grid = new Float32Array(this.cols * this.rows);
    }

    /**
     * Convert log-odds value to probability [0, 1].
     * p = 1 - 1 / (1 + e^l)  →  equivalent to  p = e^l / (1 + e^l)
     */
    _logOddsToProbability(l) {
        return 1.0 - 1.0 / (1.0 + Math.exp(l));
    }

    /**
     * Get the occupancy probability of a cell [0=free, 1=occupied].
     * Returns 0.5 for unknown cells.
     */
    getProbability(col, row) {
        if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return 0.5;
        return this._logOddsToProbability(this.grid[col + row * this.cols]);
    }

    /**
     * Check if a cell has been observed at all (log-odds ≠ 0).
     */
    isKnown(col, row) {
        if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return false;
        return this.grid[col + row * this.cols] !== 0;
    }

    // Core SLAM Concept: Update Grid Beliefs based on Sensor Reading
    updateMap(robot, scanHits) {
        scanHits.forEach(hit => {
            // Ray travels through free space until it hits the endpoint or max range
            const dx = hit.x - robot.x;
            const dy = hit.y - robot.y;
            const steps = Math.max(Math.abs(dx), Math.abs(dy)) / (this.cellSize / 2);

            if (steps === 0) return;

            const xInc = dx / steps;
            const yInc = dy / steps;

            let currX = robot.x;
            let currY = robot.y;

            // Trace the beam — mark cells as free space
            for (let i = 0; i < steps; i++) {
                if (hit.hit && i > steps - 2) break;
                this._updateCell(currX, currY, this.L_FREE);
                currX += xInc;
                currY += yInc;
            }

            // Mark the endpoint as occupied (if a wall was hit)
            if (hit.hit) {
                if (hit.distance > robot.radius) {
                    this._updateCell(hit.x, hit.y, this.L_OCC);
                }
            }
        });
    }

    /**
     * Apply a Bayesian log-odds update to a single cell.
     */
    _updateCell(x, y, logOddsIncrement) {
        const col = Math.floor(x / this.cellSize);
        const row = Math.floor(y / this.cellSize);

        if (col >= 0 && col < this.cols && row >= 0 && row < this.rows) {
            const index = col + row * this.cols;
            this.grid[index] = Math.max(this.L_MIN, Math.min(this.L_MAX, this.grid[index] + logOddsIncrement));
        }
    }

    /** Legacy compatibility — used by AStar, Dijkstra, FrontierExplorer */
    markCell(x, y, state) {
        if (state === 1) {
            this._updateCell(x, y, this.L_FREE);
        } else if (state === -1) {
            this._updateCell(x, y, this.L_OCC);
        }
    }

    /**
     * Get the discrete state of a cell for pathfinding compatibility.
     * Returns: 0 = unknown, 1 = free, -1 = occupied
     */
    getCellState(col, row) {
        if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return 0;
        const l = this.grid[col + row * this.cols];
        if (l === 0) return 0; // never observed
        return l < 0 ? 1 : -1; // negative = free, positive = occupied
    }

    drawMap(ctx) {
        ctx.save();
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const l = this.grid[c + r * this.cols];
                if (l === 0) continue; // Skip unknown cells (not yet observed)

                // Convert log-odds to a 0..255 color index
                // l < 0 → free → lower index (brighter)
                // l > 0 → occupied → higher index (darker)
                const prob = this._logOddsToProbability(l);
                const colorIndex = Math.round(prob * 255);

                ctx.fillStyle = this._colorLUT[colorIndex];
                ctx.fillRect(c * this.cellSize, r * this.cellSize, this.cellSize, this.cellSize);
            }
        }
        ctx.restore();
    }
}
