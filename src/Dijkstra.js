/**
 * Dijkstra.js
 * 
 * Dijkstra's algorithm for shortest path on the occupancy grid.
 * Same interface as AStar but without the heuristic (guaranteed optimal path).
 * Explores more nodes than A* but finds truly shortest path.
 */
export class Dijkstra {
    constructor(mapper) {
        this.mapper = mapper;
        this.name = 'Dijkstra';
    }

    getNeighbors(node) {
        const neighbors = [];
        const directions = [
            { c: 0, r: -1 }, { c: 0, r: 1 },
            { c: -1, r: 0 }, { c: 1, r: 0 },
            { c: -1, r: -1 }, { c: 1, r: -1 },
            { c: -1, r: 1 }, { c: 1, r: 1 },
        ];

        for (const dir of directions) {
            const nextCol = node.col + dir.c;
            const nextRow = node.row + dir.r;

            if (nextCol >= 0 && nextCol < this.mapper.cols && nextRow >= 0 && nextRow < this.mapper.rows) {
                const index = nextCol + nextRow * this.mapper.cols;

                if (this.mapper.grid[index] !== -1) {
                    // Diagonal corner-cutting check
                    if (Math.abs(dir.c) === 1 && Math.abs(dir.r) === 1) {
                        const idxH = (node.col + dir.c) + node.row * this.mapper.cols;
                        const idxV = node.col + (node.row + dir.r) * this.mapper.cols;
                        if (this.mapper.grid[idxH] === -1 || this.mapper.grid[idxV] === -1) continue;
                    }

                    let penalty = 0;
                    const checkRange = 2;
                    for (let r = -checkRange; r <= checkRange; r++) {
                        for (let c = -checkRange; c <= checkRange; c++) {
                            const nc = nextCol + c, nr = nextRow + r;
                            if (nc >= 0 && nc < this.mapper.cols && nr >= 0 && nr < this.mapper.rows) {
                                if (this.mapper.grid[nc + nr * this.mapper.cols] === -1) penalty += 5;
                            }
                        }
                    }

                    neighbors.push({ col: nextCol, row: nextRow, penalty });
                }
            }
        }
        return neighbors;
    }

    findPath(startX, startY, endX, endY) {
        const startCol = Math.floor(startX / this.mapper.cellSize);
        const startRow = Math.floor(startY / this.mapper.cellSize);
        const goalCol = Math.floor(endX / this.mapper.cellSize);
        const goalRow = Math.floor(endY / this.mapper.cellSize);

        if (goalCol < 0 || goalCol >= this.mapper.cols || goalRow < 0 || goalRow >= this.mapper.rows) return [];
        if (this.mapper.grid[goalCol + goalRow * this.mapper.cols] === -1) return [];

        const numNodes = this.mapper.cols * this.mapper.rows;
        const dist = new Float32Array(numNodes).fill(Infinity);
        const visited = new Uint8Array(numNodes);
        const cameFrom = new Array(numNodes);

        // Priority queue (simple sorted array — sufficient for this scale)
        const startIndex = startCol + startRow * this.mapper.cols;
        dist[startIndex] = 0;

        const pq = [{ col: startCol, row: startRow, dist: 0 }];

        while (pq.length > 0) {
            // Extract minimum
            let minIdx = 0;
            for (let i = 1; i < pq.length; i++) {
                if (pq[i].dist < pq[minIdx].dist) minIdx = i;
            }
            const current = pq.splice(minIdx, 1)[0];
            const currIndex = current.col + current.row * this.mapper.cols;

            if (visited[currIndex]) continue;
            visited[currIndex] = 1;

            if (current.col === goalCol && current.row === goalRow) {
                return this._reconstructPath(cameFrom, current);
            }

            const neighbors = this.getNeighbors(current);
            for (const neighbor of neighbors) {
                const neighborIndex = neighbor.col + neighbor.row * this.mapper.cols;
                if (visited[neighborIndex]) continue;

                const moveCost = (Math.abs(neighbor.col - current.col) + Math.abs(neighbor.row - current.row) === 2) ? Math.SQRT2 : 1;
                const newDist = dist[currIndex] + moveCost + neighbor.penalty;

                if (newDist < dist[neighborIndex]) {
                    dist[neighborIndex] = newDist;
                    cameFrom[neighborIndex] = current;
                    pq.push({ col: neighbor.col, row: neighbor.row, dist: newDist });
                }
            }
        }

        return [];
    }

    _reconstructPath(cameFrom, current) {
        const path = [];
        while (current) {
            path.push({
                x: current.col * this.mapper.cellSize + (this.mapper.cellSize / 2),
                y: current.row * this.mapper.cellSize + (this.mapper.cellSize / 2)
            });
            const index = current.col + current.row * this.mapper.cols;
            current = cameFrom[index];
        }
        return path.reverse();
    }
}
