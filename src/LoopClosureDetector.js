/**
 * LoopClosureDetector.js
 *
 * Detects when the robot revisits a previously explored area by comparing
 * the current LiDAR scan signature against stored keyframes.
 *
 * When a loop closure is detected, the robot's believed pose is corrected
 * toward the ground truth, simulating a real SLAM back-end correction.
 *
 * Uses normalized cross-correlation of distance histograms for matching.
 */
export class LoopClosureDetector {
    constructor() {
        this.enabled = false;
        this.keyframes = [];           // Array of { pose, histogram, timestamp }
        this.keyframeInterval = 60;    // Add a keyframe every N frames
        this.frameCounter = 0;
        this.minTravelDistance = 80;   // Min px between keyframes
        this.lastKeyframePose = null;

        // Matching parameters
        this.histogramBins = 18;       // 18 bins of 10° each for 180° FOV
        this.matchThreshold = 0.82;    // NCC threshold to consider a match
        this.minKeyframeAge = 180;     // Don't match against recent keyframes (frames)
        this.maxSpatialDist = 150;     // Max px between poses to consider a match
        this.closureCooldown = 0;      // Frames to wait after a closure before checking again
        this.cooldownMax = 300;        // ~5 seconds at 60fps

        // State
        this.lastClosureTime = 0;
        this.closureCount = 0;

        // Visual feedback
        this.showIndicator = false;
        this.indicatorTimer = 0;
        this.indicatorDuration = 120; // frames to show "Loop Closed!" indicator
    }

    setEnabled(enabled) {
        this.enabled = enabled;
        if (!enabled) {
            this.keyframes = [];
            this.frameCounter = 0;
            this.lastKeyframePose = null;
            this.closureCount = 0;
            this.showIndicator = false;
        }
    }

    /**
     * Build a normalized distance histogram from LiDAR scan hits.
     * Groups ray distances into angular bins and normalizes.
     */
    _buildHistogram(scanHits) {
        const bins = new Float32Array(this.histogramBins);
        const counts = new Float32Array(this.histogramBins);

        for (const hit of scanHits) {
            // Normalize angle to [0, π] relative to robot heading
            let relAngle = hit.angle;
            // Map to bin index
            const binIndex = Math.floor(((relAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) / (Math.PI * 2) * this.histogramBins);
            const clampedIndex = Math.min(this.histogramBins - 1, Math.max(0, binIndex));
            bins[clampedIndex] += hit.distance;
            counts[clampedIndex]++;
        }

        // Average each bin
        for (let i = 0; i < this.histogramBins; i++) {
            if (counts[i] > 0) bins[i] /= counts[i];
        }

        // Normalize to unit vector for NCC
        let mag = 0;
        for (let i = 0; i < this.histogramBins; i++) mag += bins[i] * bins[i];
        mag = Math.sqrt(mag);
        if (mag > 0) {
            for (let i = 0; i < this.histogramBins; i++) bins[i] /= mag;
        }

        return bins;
    }

    /**
     * Normalized cross-correlation between two histograms.
     * Returns a value between -1 and 1 (1 = perfect match).
     */
    _ncc(hist1, hist2) {
        let dot = 0;
        for (let i = 0; i < this.histogramBins; i++) {
            dot += hist1[i] * hist2[i];
        }
        return dot; // Both already normalized to unit vectors
    }

    /**
     * Try to add a keyframe at the current position.
     * Only adds if enough distance has been traveled since last keyframe.
     */
    addKeyframe(robot, scanHits) {
        if (!this.enabled || !scanHits || scanHits.length === 0) return;

        this.frameCounter++;
        if (this.frameCounter % this.keyframeInterval !== 0) return;

        // Check minimum travel distance
        if (this.lastKeyframePose) {
            const dx = robot.x - this.lastKeyframePose.x;
            const dy = robot.y - this.lastKeyframePose.y;
            if (Math.sqrt(dx * dx + dy * dy) < this.minTravelDistance) return;
        }

        const histogram = this._buildHistogram(scanHits);
        this.keyframes.push({
            pose: { x: robot.x, y: robot.y, theta: robot.theta },
            histogram: histogram,
            timestamp: this.frameCounter
        });

        this.lastKeyframePose = { x: robot.x, y: robot.y };

        // Limit keyframe storage
        if (this.keyframes.length > 200) {
            this.keyframes.shift();
        }
    }

    /**
     * Check current scan against stored keyframes for loop closure.
     * Returns { detected: bool, correction: { dx, dy } } if detected.
     */
    checkForClosure(robot, scanHits) {
        if (!this.enabled || !scanHits || scanHits.length === 0) return { detected: false };
        if (this.keyframes.length < 5) return { detected: false };

        // Cooldown check
        if (this.closureCooldown > 0) {
            this.closureCooldown--;
            return { detected: false };
        }

        const currentHist = this._buildHistogram(scanHits);
        let bestMatch = null;
        let bestScore = 0;

        for (let i = 0; i < this.keyframes.length; i++) {
            const kf = this.keyframes[i];

            // Skip recent keyframes (we expect them to match — that's not a loop closure)
            if (this.frameCounter - kf.timestamp < this.minKeyframeAge) continue;

            // Spatial proximity check — true pose must be close to keyframe pose
            const dx = robot.x - kf.pose.x;
            const dy = robot.y - kf.pose.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > this.maxSpatialDist) continue;

            // Scan matching via NCC
            const score = this._ncc(currentHist, kf.histogram);

            if (score > this.matchThreshold && score > bestScore) {
                bestScore = score;
                bestMatch = kf;
            }
        }

        if (bestMatch) {
            this.closureCooldown = this.cooldownMax;
            this.closureCount++;

            // Show visual indicator
            this.showIndicator = true;
            this.indicatorTimer = this.indicatorDuration;

            // Compute pose correction (pull believed pose toward keyframe pose)
            const correctionStrength = 0.7;
            const correction = {
                dx: (bestMatch.pose.x - robot.believedX) * correctionStrength,
                dy: (bestMatch.pose.y - robot.believedY) * correctionStrength
            };

            return { detected: true, correction, matchScore: bestScore, keyframe: bestMatch };
        }

        return { detected: false };
    }

    /**
     * Apply the pose correction to the robot's believed pose.
     */
    applyCorrection(robot, correction) {
        robot.believedX += correction.dx;
        robot.believedY += correction.dy;
    }

    /**
     * Update the visual indicator timer.
     */
    updateIndicator() {
        if (this.indicatorTimer > 0) {
            this.indicatorTimer--;
            if (this.indicatorTimer <= 0) {
                this.showIndicator = false;
            }
        }
    }

    /**
     * Draw the loop closure indicator on the canvas.
     */
    drawIndicator(ctx, canvasWidth) {
        if (!this.showIndicator) return;

        const alpha = Math.min(1, this.indicatorTimer / 30);

        // Flash border
        ctx.save();
        ctx.strokeStyle = `rgba(34, 211, 153, ${alpha * 0.6})`;
        ctx.lineWidth = 4;
        ctx.strokeRect(2, 2, canvasWidth - 4, ctx.canvas.height - 4);

        // "Loop Closed!" text
        ctx.fillStyle = `rgba(34, 211, 153, ${alpha})`;
        ctx.font = 'bold 18px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`🔗 Loop Closed! (#${this.closureCount})`, canvasWidth / 2, 30);

        // Match confidence bar
        ctx.fillStyle = `rgba(34, 211, 153, ${alpha * 0.3})`;
        ctx.fillRect(canvasWidth / 2 - 60, 38, 120, 4);
        ctx.fillStyle = `rgba(34, 211, 153, ${alpha})`;
        ctx.fillRect(canvasWidth / 2 - 60, 38, 120, 4);

        ctx.restore();
    }

    /**
     * Reset all state.
     */
    reset() {
        this.keyframes = [];
        this.frameCounter = 0;
        this.lastKeyframePose = null;
        this.closureCount = 0;
        this.closureCooldown = 0;
        this.showIndicator = false;
        this.indicatorTimer = 0;
    }
}
