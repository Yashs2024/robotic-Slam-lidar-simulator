/**
 * BugAlgorithm.js
 *
 * Bug2 path planning algorithm.
 * Strategy: Head straight toward the goal. If a wall is hit,
 * follow it until the "M-line" (start→goal line) is re-crossed
 * at a point closer to the goal, then resume heading toward goal.
 *
 * This works on the occupancy grid (same interface as AStar/Dijkstra),
 * producing a characteristically "wall-hugging" path.
 */
export class BugAlgorithm {
    constructor(mapper) {
        this.mapper = mapper;
        this.name = 'Bug2';
    }

    findPath(startX, startY, endX, endY) {
        const cellSize = this.mapper.cellSize;
        const cols = this.mapper.cols;
        const rows = this.mapper.rows;
        const grid = this.mapper.grid;

        const startCol = Math.floor(startX / cellSize);
        const startRow = Math.floor(startY / cellSize);
        const goalCol = Math.floor(endX / cellSize);
        const goalRow = Math.floor(endY / cellSize);

        if (goalCol < 0 || goalCol >= cols || goalRow < 0 || goalRow >= rows) return [];
        if (grid[goalCol + goalRow * cols] === -1) return [];

        const path = [];
        let col = startCol;
        let row = startRow;
        const maxIterations = cols * rows * 2; // Safety limit
        let iterations = 0;

        // The M-line is the straight line from start to goal
        const mLineDx = goalCol - startCol;
        const mLineDy = goalRow - startRow;

        const isBlocked = (c, r) => {
            if (c < 0 || c >= cols || r < 0 || r >= rows) return true;
            return grid[c + r * cols] === -1;
        };

        const distToGoal = (c, r) => {
            return Math.sqrt((c - goalCol) ** 2 + (r - goalRow) ** 2);
        };

        // Check if point is on the M-line (within tolerance)
        const onMLine = (c, r) => {
            if (mLineDx === 0 && mLineDy === 0) return true;
            // Cross product to check if point is close to line
            const cross = Math.abs((c - startCol) * mLineDy - (r - startRow) * mLineDx);
            const lineLen = Math.sqrt(mLineDx * mLineDx + mLineDy * mLineDy);
            return (cross / lineLen) < 1.5;
        };

        // 8-directional neighbors
        const dirs = [
            { c: 1, r: 0 }, { c: 1, r: 1 }, { c: 0, r: 1 }, { c: -1, r: 1 },
            { c: -1, r: 0 }, { c: -1, r: -1 }, { c: 0, r: -1 }, { c: 1, r: -1 }
        ];

        // Get direction index toward the goal
        const getDirToGoal = (c, r) => {
            const angle = Math.atan2(goalRow - r, goalCol - c);
            let dirIdx = Math.round(angle / (Math.PI / 4));
            if (dirIdx < 0) dirIdx += 8;
            return dirIdx % 8;
        };

        let mode = 'go_to_goal'; // 'go_to_goal' or 'follow_wall'
        let wallFollowDir = 0; // Which direction we're following the wall
        let hitDist = 0; // Distance to goal when we first hit a wall
        const visited = new Set();

        while (iterations < maxIterations) {
            iterations++;

            // Check if we reached the goal
            if (col === goalCol && row === goalRow) {
                path.push({ x: col * cellSize + cellSize / 2, y: row * cellSize + cellSize / 2 });
                break;
            }

            const key = `${col},${row}`;
            if (visited.has(key) && mode === 'follow_wall' && iterations > 4) {
                // Stuck in a loop — abort
                break;
            }
            visited.add(key);

            path.push({ x: col * cellSize + cellSize / 2, y: row * cellSize + cellSize / 2 });

            if (mode === 'go_to_goal') {
                // Move toward goal
                const dirIdx = getDirToGoal(col, row);
                const nextCol = col + dirs[dirIdx].c;
                const nextRow = row + dirs[dirIdx].r;

                if (!isBlocked(nextCol, nextRow)) {
                    col = nextCol;
                    row = nextRow;
                } else {
                    // Hit a wall — switch to wall following
                    mode = 'follow_wall';
                    hitDist = distToGoal(col, row);
                    wallFollowDir = (dirIdx + 2) % 8; // Turn right to follow wall
                }
            } else {
                // Follow wall (right-hand rule)
                let moved = false;

                // Try turning left first (toward open space), then sweep clockwise
                for (let i = 0; i < 8; i++) {
                    const tryDir = (wallFollowDir - 2 + i + 8) % 8;
                    const nextCol = col + dirs[tryDir].c;
                    const nextRow = row + dirs[tryDir].r;

                    if (!isBlocked(nextCol, nextRow)) {
                        col = nextCol;
                        row = nextRow;
                        wallFollowDir = tryDir;
                        moved = true;
                        break;
                    }
                }

                if (!moved) break; // Completely surrounded — give up

                // Check if we're back on the M-line and closer to goal
                const currDist = distToGoal(col, row);
                if (onMLine(col, row) && currDist < hitDist - 1) {
                    mode = 'go_to_goal';
                }
            }
        }

        return path;
    }
}
