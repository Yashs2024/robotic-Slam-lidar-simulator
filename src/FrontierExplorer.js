/**
 * FrontierExplorer.js
 * 
 * Detects "frontier" cells on the occupancy grid — cells that are FREE (explored)
 * but sit adjacent to at least one UNKNOWN cell. Clusters nearby frontiers and
 * returns the centroid of the largest cluster as the best exploration target.
 */
export class FrontierExplorer {
    constructor(mapper) {
        this.mapper = mapper;
    }

    /**
     * Find the best frontier target for exploration.
     * @param {number} robotX - Robot's current X position (world coords)
     * @param {number} robotY - Robot's current Y position (world coords)
     * @returns {{ x: number, y: number } | null} Target point or null if fully explored
     */
    findBestFrontier(robotX, robotY) {
        const frontierCells = this._detectFrontiers();

        if (frontierCells.length === 0) return null; // Map fully explored!

        const clusters = this._clusterFrontiers(frontierCells);

        if (clusters.length === 0) return null;

        // Sort clusters: prefer larger clusters, but bias toward closer ones
        const robotCol = Math.floor(robotX / this.mapper.cellSize);
        const robotRow = Math.floor(robotY / this.mapper.cellSize);

        let bestScore = -Infinity;
        let bestTarget = null;

        for (const cluster of clusters) {
            // Centroid of this cluster
            let cx = 0, cy = 0;
            for (const cell of cluster) {
                cx += cell.col;
                cy += cell.row;
            }
            cx /= cluster.length;
            cy /= cluster.length;

            const dist = Math.sqrt((cx - robotCol) ** 2 + (cy - robotRow) ** 2);

            // Score: size gives opportunity, but penalise extreme distance
            // This formula prefers large, moderately close frontiers
            const score = cluster.length / (1 + dist * 0.1);

            if (score > bestScore) {
                bestScore = score;
                bestTarget = {
                    x: cx * this.mapper.cellSize + this.mapper.cellSize / 2,
                    y: cy * this.mapper.cellSize + this.mapper.cellSize / 2
                };
            }
        }

        return bestTarget;
    }

    /**
     * Find the best frontier for a partner robot, penalising targets that are
     * close to other robots (primary + siblings) so each robot explores
     * a distinct sector of the map.
     *
     * @param {number} robotX      - This robot's X
     * @param {number} robotY      - This robot's Y
     * @param {number} primaryX    - Primary robot's X
     * @param {number} primaryY    - Primary robot's Y
     * @param {Array}  siblings    - Array of { x, y } for other partner robots
     * @param {number} partnerIdx  - Index of this partner (for offset seeding)
     * @returns {{ x: number, y: number } | null}
     */
    findBestFrontierExcluding(robotX, robotY, primaryX, primaryY, siblings, partnerIdx) {
        const frontierCells = this._detectFrontiers();
        if (frontierCells.length === 0) return null;

        const clusters = this._clusterFrontiers(frontierCells);
        if (clusters.length === 0) return null;

        const robotCol = Math.floor(robotX / this.mapper.cellSize);
        const robotRow = Math.floor(robotY / this.mapper.cellSize);

        // Build list of other robot positions in grid coords
        const otherPositions = [{ x: primaryX, y: primaryY }, ...siblings]
            .map(p => ({
                col: Math.floor(p.x / this.mapper.cellSize),
                row: Math.floor(p.y / this.mapper.cellSize),
            }));

        let bestScore = -Infinity;
        let bestTarget = null;

        // Add a directional sector bias based on partner index
        // so robots fan out around the map
        const sectorAngle = (partnerIdx / Math.max(1, siblings.length + 1)) * Math.PI * 2;

        for (const cluster of clusters) {
            let cx = 0, cy = 0;
            for (const cell of cluster) { cx += cell.col; cy += cell.row; }
            cx /= cluster.length;
            cy /= cluster.length;

            const dist = Math.sqrt((cx - robotCol) ** 2 + (cy - robotRow) ** 2);

            // Penalty: sum of inverse distances to other robots (closer = higher penalty)
            let otherPenalty = 0;
            for (const op of otherPositions) {
                const od = Math.sqrt((cx - op.col) ** 2 + (cy - op.row) ** 2);
                otherPenalty += 1 / (1 + od * 0.08);
            }

            // Sector bias: reward targets in the direction of this robot's assigned sector
            const mapCenterCol = Math.floor(this.mapper.cols / 2);
            const mapCenterRow = Math.floor(this.mapper.rows / 2);
            const targetAngle = Math.atan2(cy - mapCenterRow, cx - mapCenterCol);
            let angleDiff = Math.abs(targetAngle - sectorAngle);
            if (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;
            const sectorBonus = 1 - angleDiff / Math.PI; // [0, 1]

            // Final score
            const score = (cluster.length + sectorBonus * 8) / (1 + dist * 0.08) - otherPenalty * 2;

            if (score > bestScore) {
                bestScore = score;
                bestTarget = {
                    x: cx * this.mapper.cellSize + this.mapper.cellSize / 2,
                    y: cy * this.mapper.cellSize + this.mapper.cellSize / 2,
                };
            }
        }

        return bestTarget;
    }

    /**
     * Scan the entire grid for frontier cells.
     * A frontier cell is a FREE cell (log-odds < 0) neighbouring at least one UNKNOWN cell (log-odds === 0).
     */
    _detectFrontiers() {
        const { grid, cols, rows } = this.mapper;
        const frontiers = [];

        for (let r = 1; r < rows - 1; r++) {
            for (let c = 1; c < cols - 1; c++) {
                const idx = c + r * cols;
                if (grid[idx] >= 0) continue; // Only consider free cells (negative log-odds)

                // Check 4-connected neighbours for unknown cells
                if (
                    grid[(c - 1) + r * cols] === 0 ||
                    grid[(c + 1) + r * cols] === 0 ||
                    grid[c + (r - 1) * cols] === 0 ||
                    grid[c + (r + 1) * cols] === 0
                ) {
                    frontiers.push({ col: c, row: r });
                }
            }
        }

        return frontiers;
    }

    /**
     * Simple flood-fill clustering of frontier cells.
     * Groups spatially adjacent frontier cells into clusters.
     */
    _clusterFrontiers(frontierCells) {
        // Build a set for O(1) lookup
        const set = new Set();
        for (const f of frontierCells) {
            set.add(`${f.col},${f.row}`);
        }

        const visited = new Set();
        const clusters = [];

        for (const f of frontierCells) {
            const key = `${f.col},${f.row}`;
            if (visited.has(key)) continue;

            // BFS flood fill
            const cluster = [];
            const queue = [f];
            visited.add(key);

            while (queue.length > 0) {
                const cell = queue.shift();
                cluster.push(cell);

                // Check 4-connected neighbours
                const neighbors = [
                    { col: cell.col - 1, row: cell.row },
                    { col: cell.col + 1, row: cell.row },
                    { col: cell.col, row: cell.row - 1 },
                    { col: cell.col, row: cell.row + 1 },
                ];

                for (const n of neighbors) {
                    const nKey = `${n.col},${n.row}`;
                    if (set.has(nKey) && !visited.has(nKey)) {
                        visited.add(nKey);
                        queue.push(n);
                    }
                }
            }

            // Only keep clusters with at least 3 cells (filter noise)
            if (cluster.length >= 3) {
                clusters.push(cluster);
            }
        }

        return clusters;
    }
}
