import * as THREE from 'three';

class InfiniteGridHelper extends THREE.LineSegments {
    private camera: THREE.Camera;
    private gridSize: number;
    private maxDetailLevel: number;
    private colorCenter: THREE.Color;
    private colorGrid: THREE.Color;
    private lastZoom: number;

    constructor(camera: THREE.Camera, gridSize = 1000, maxDetailLevel = 100,  colorCenter = new THREE.Color(0x888888),  colorGrid = new THREE.Color(0x444444)) {
        super(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ vertexColors: true }));
        this.camera = camera;
        this.gridSize = gridSize;
        this.maxDetailLevel = maxDetailLevel;
        this.colorCenter = colorCenter;
        this.colorGrid = colorGrid;
        this.lastZoom = 0; // Initial zoom level for comparison

        this.updateGrid(1); // Initialize with base detail level
    }

    private updateGrid(detailLevel: number): void {
        const divisions = Math.round(this.gridSize * detailLevel);
        const step = this.gridSize / divisions;
        const halfSize = this.gridSize / 2;

        const vertices = [];
        const colors = [];

        for (let i = -halfSize; i <= halfSize; i += step) {
            vertices.push(-halfSize, 0, i, halfSize, 0, i);
            vertices.push(i, 0, -halfSize, i, 0, halfSize);
            const colorArray = Math.abs(i) < step ? this.colorCenter.toArray() : this.colorGrid.toArray();
            for (let j = 0; j < 4; j++) colors.push(...colorArray);
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices.flat(), 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors.flat(), 3));
        this.geometry.dispose();
        this.geometry = geometry;
    }

    public update(): void {
        // Determine the level of detail based on camera zoom
        let detailLevel;
        if (this.camera instanceof THREE.OrthographicCamera) {
            detailLevel = THREE.MathUtils.clamp(this.camera.zoom, 1, this.maxDetailLevel);
        } else {
            // For perspective camera, you might want to base on field of view or a fixed value
            // since perspective camera does not have a 'zoom' attribute in Three.js
            detailLevel = 1; // Adjust if necessary for perspective cameras
        }

        // Only update the grid if the zoom level has changed significantly
        if (Math.abs(this.lastZoom - detailLevel) > 0.01) {
            this.lastZoom = detailLevel; // Update stored zoom level
            this.updateGrid(detailLevel); // Rebuild the grid with adjusted density
        }
    }
}

export { InfiniteGridHelper };
