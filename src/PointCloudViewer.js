/**
 * PointCloudViewer.js
 *
 * Three.js-based 3D visualization of LiDAR point cloud data.
 * Shows accumulated scan points colored by distance (red=close, blue=far)
 * with an orbitable camera and a robot marker.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export class PointCloudViewer {
    constructor() {
        this.enabled = false;
        this.container = null;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.pointCloud = null;
        this.robotMarker = null;

        // Point accumulation
        this.maxPoints = 3000;
        this.pointPositions = [];
        this.pointColors = [];

        // Scale: 100px = 1m, but we scale down for 3D view
        this.scale = 0.01;
    }

    /**
     * Initialize the Three.js scene. Called when 3D view is enabled.
     */
    init(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) return;

        const width = this.container.clientWidth;
        const height = this.container.clientHeight;

        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0e1a);

        // Camera - top-down perspective
        this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
        this.camera.position.set(0, 8, 5);
        this.camera.lookAt(0, 0, 0);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.container.appendChild(this.renderer.domElement);

        // Orbit controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.08;
        this.controls.maxPolarAngle = Math.PI / 2;
        this.controls.minDistance = 2;
        this.controls.maxDistance = 25;

        // Grid helper
        const gridHelper = new THREE.GridHelper(15, 30, 0x1e293b, 0x1e293b);
        this.scene.add(gridHelper);

        // Axis helper (subtle)
        const axesHelper = new THREE.AxesHelper(1);
        axesHelper.position.set(-7, 0.01, -7);
        this.scene.add(axesHelper);

        // Ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        // Point cloud geometry
        const pointGeometry = new THREE.BufferGeometry();
        pointGeometry.setAttribute('position', new THREE.Float32BufferAttribute([], 3));
        pointGeometry.setAttribute('color', new THREE.Float32BufferAttribute([], 3));

        const pointMaterial = new THREE.PointsMaterial({
            size: 0.08,
            vertexColors: true,
            sizeAttenuation: true,
            transparent: true,
            opacity: 0.85,
        });

        this.pointCloud = new THREE.Points(pointGeometry, pointMaterial);
        this.scene.add(this.pointCloud);

        // Robot marker — a cone pointing in the heading direction
        const coneGeom = new THREE.ConeGeometry(0.15, 0.4, 8);
        coneGeom.rotateX(Math.PI / 2);
        const coneMat = new THREE.MeshBasicMaterial({ color: 0x3b82f6 });
        this.robotMarker = new THREE.Mesh(coneGeom, coneMat);
        this.robotMarker.position.set(0, 0.2, 0);
        this.scene.add(this.robotMarker);

        // Robot trail line
        this.trailGeometry = new THREE.BufferGeometry();
        const trailMaterial = new THREE.LineBasicMaterial({
            color: 0x3b82f6,
            transparent: true,
            opacity: 0.4,
        });
        this.trailLine = new THREE.Line(this.trailGeometry, trailMaterial);
        this.scene.add(this.trailLine);
        this.trailPoints = [];

        // Scan lines (current LiDAR rays)
        this.scanLinesGeometry = new THREE.BufferGeometry();
        const scanLineMaterial = new THREE.LineBasicMaterial({
            color: 0xef4444,
            transparent: true,
            opacity: 0.2,
        });
        this.scanLines = new THREE.LineSegments(this.scanLinesGeometry, scanLineMaterial);
        this.scene.add(this.scanLines);

        // Handle resize
        this._resizeObserver = new ResizeObserver(() => this.resize());
        this._resizeObserver.observe(this.container);
    }

    /**
     * Enable or disable the 3D view.
     */
    setEnabled(enabled) {
        this.enabled = enabled;
        if (enabled && !this.scene) {
            this.init('pointCloudContainer');
        }
        if (this.container) {
            this.container.style.display = enabled ? 'block' : 'none';
        }
    }

    /**
     * Update the point cloud with new scan data.
     */
    update(robot, scanHits, canvasWidth, canvasHeight) {
        if (!this.enabled || !this.scene) return;

        // Center offset (convert from pixel coords to centered 3D coords)
        const cx = canvasWidth / 2;
        const cy = canvasHeight / 2;

        // Update robot marker position and rotation
        const rx = (robot.x - cx) * this.scale;
        const rz = (robot.y - cy) * this.scale;
        this.robotMarker.position.set(rx, 0.2, rz);
        this.robotMarker.rotation.y = -robot.theta + Math.PI / 2;

        // Add scan hit points
        if (scanHits) {
            const scanLinePositions = [];

            for (const hit of scanHits) {
                if (!hit.hit) continue;

                const px = (hit.x - cx) * this.scale;
                const pz = (hit.y - cy) * this.scale;
                const py = 0.05 + Math.random() * 0.05; // Slight height variation for visual interest

                this.pointPositions.push(px, py, pz);

                // Color by distance (red = close, yellow = mid, blue = far)
                const t = Math.min(1, hit.distance / 600);
                const r = 1.0 - t * 0.7;
                const g = t < 0.5 ? t * 2 * 0.8 : (1 - t) * 2 * 0.8;
                const b = t * 0.9;
                this.pointColors.push(r, g, b);

                // Add scan line from robot to hit
                scanLinePositions.push(rx, 0.15, rz, px, py, pz);
            }

            // Update scan lines
            this.scanLinesGeometry.setAttribute(
                'position',
                new THREE.Float32BufferAttribute(scanLinePositions, 3)
            );

            // Trim accumulated points if too many
            while (this.pointPositions.length / 3 > this.maxPoints) {
                this.pointPositions.splice(0, 3);
                this.pointColors.splice(0, 3);
            }

            // Update point cloud geometry
            this.pointCloud.geometry.setAttribute(
                'position',
                new THREE.Float32BufferAttribute(this.pointPositions, 3)
            );
            this.pointCloud.geometry.setAttribute(
                'color',
                new THREE.Float32BufferAttribute(this.pointColors, 3)
            );
        }

        // Update trail
        this.trailPoints.push(rx, 0.05, rz);
        if (this.trailPoints.length / 3 > 500) {
            this.trailPoints.splice(0, 3);
        }
        this.trailGeometry.setAttribute(
            'position',
            new THREE.Float32BufferAttribute(this.trailPoints, 3)
        );

        // Render
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    /**
     * Handle container resize.
     */
    resize() {
        if (!this.container || !this.renderer) return;
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        if (width === 0 || height === 0) return;
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    /**
     * Clear accumulated point cloud data.
     */
    reset() {
        this.pointPositions = [];
        this.pointColors = [];
        this.trailPoints = [];
        if (this.pointCloud) {
            this.pointCloud.geometry.setAttribute('position', new THREE.Float32BufferAttribute([], 3));
            this.pointCloud.geometry.setAttribute('color', new THREE.Float32BufferAttribute([], 3));
        }
        if (this.trailGeometry) {
            this.trailGeometry.setAttribute('position', new THREE.Float32BufferAttribute([], 3));
        }
    }

    /**
     * Destroy the Three.js scene and free resources.
     */
    dispose() {
        if (this._resizeObserver) this._resizeObserver.disconnect();
        if (this.renderer) {
            this.renderer.dispose();
            if (this.container && this.renderer.domElement.parentNode) {
                this.container.removeChild(this.renderer.domElement);
            }
        }
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
    }
}
