/**
 * Example usage of the optimized CSS Hybrid Renderer with Web Worker support
 */

import { CSSHybridRenderer, CSSHybridObject } from '../CSSHybrid';
import { profiler, WorkerBenchmark } from '../HybridRendererProfiler';
import * as THREE from 'three';

export class OptimizedHybridExample {
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;
    private hybridRenderer: CSSHybridRenderer;
    private hybridObjects: CSSHybridObject[] = [];

    constructor() {
        this.setupScene();
        this.setupHybridRenderer();
        this.createHybridObjects();
        this.startRenderLoop();
        this.enableProfiling();
    }

    private setupScene(): void {
        // Standard Three.js scene setup
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.z = 20;

        this.renderer = new THREE.WebGLRenderer();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(this.renderer.domElement);
    }

    private setupHybridRenderer(): void {
        // Create hybrid renderer
        this.hybridRenderer = new CSSHybridRenderer();
        this.hybridRenderer.setSize(window.innerWidth, window.innerHeight);
        
        // Add hybrid renderer DOM element to the page
        document.body.appendChild(this.hybridRenderer.domElement);
        
        // Position it over the WebGL canvas
        this.hybridRenderer.domElement.style.position = 'absolute';
        this.hybridRenderer.domElement.style.top = '0';
        this.hybridRenderer.domElement.style.left = '0';
        this.hybridRenderer.domElement.style.pointerEvents = 'none';
    }

    private createHybridObjects(): void {
        const objectCount = 100; // Test with many objects to see worker benefit
        
        console.log(`🚀 Creating ${objectCount} hybrid objects...`);
        
        for (let i = 0; i < objectCount; i++) {
            // Create HTML element
            const element = document.createElement('div');
            element.className = 'hybrid-test-element';
            element.innerHTML = `
                <div style="
                    background: linear-gradient(45deg, hsl(${i * 3.6}, 70%, 50%), hsl(${(i * 3.6 + 60) % 360}, 70%, 70%));
                    padding: 10px;
                    border-radius: 8px;
                    color: white;
                    font-family: Arial, sans-serif;
                    text-align: center;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                    width: 150px;
                    height: 100px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-direction: column;
                ">
                    <div style="font-weight: bold;">Object ${i}</div>
                    <div style="font-size: 12px; opacity: 0.8;">Mode: <span class="mode-indicator">3D</span></div>
                    <div style="font-size: 10px; margin-top: 5px;">
                        Distance: <span class="distance-indicator">--</span>
                    </div>
                </div>
            `;

            // Create hybrid object with optimized settings
            const hybridObject = new CSSHybridObject(element, {
                zoomThreshold: 8 + Math.random() * 4, // Vary thresholds for interesting behavior
                transitionDuration: 300 + Math.random() * 200,
                enableAutoSwitch: true,
                hysteresis: 0.5 + Math.random() * 0.5
            });

            // Position objects in a grid
            const gridSize = Math.ceil(Math.sqrt(objectCount));
            const spacing = 15;
            const x = (i % gridSize - gridSize / 2) * spacing;
            const z = (Math.floor(i / gridSize) - gridSize / 2) * spacing;
            const y = Math.sin(i * 0.1) * 5; // Add some vertical variation

            hybridObject.position.set(x, y, z);
            
            // Add some rotation for variety
            hybridObject.rotation.set(
                Math.random() * 0.2 - 0.1,
                Math.random() * 0.2 - 0.1,
                Math.random() * 0.2 - 0.1
            );

            this.scene.add(hybridObject);
            this.hybridObjects.push(hybridObject);

            // Add mode change callback to update UI
            const modeIndicator = element.querySelector('.mode-indicator');
            if (modeIndicator) {
                const originalSwitchMode = hybridObject.switchMode.bind(hybridObject);
                hybridObject.switchMode = async function(newMode, force = false) {
                    await originalSwitchMode(newMode, force);
                    modeIndicator.textContent = newMode.toUpperCase();
                };
            }
        }

        console.log(`✅ Created ${this.hybridObjects.length} hybrid objects with worker optimization`);
    }

    private enableProfiling(): void {
        // Enable performance profiling
        profiler.enable();

        // Add controls for profiling
        this.addProfilingControls();

        // Run benchmark comparison
        setTimeout(() => {
            this.runBenchmark();
        }, 5000); // Wait 5 seconds for things to settle
    }

    private addProfilingControls(): void {
        const controls = document.createElement('div');
        controls.innerHTML = `
            <div style="
                position: fixed;
                top: 10px;
                right: 10px;
                background: rgba(0,0,0,0.8);
                color: white;
                padding: 15px;
                border-radius: 8px;
                font-family: monospace;
                font-size: 12px;
                z-index: 10000;
                min-width: 250px;
            ">
                <h3 style="margin: 0 0 10px 0;">🚀 Hybrid Renderer Stats</h3>
                <div id="stats-display">Loading...</div>
                <button id="reset-stats" style="margin-top: 10px; padding: 5px 10px;">Reset Stats</button>
                <button id="run-benchmark" style="margin-top: 5px; margin-left: 5px; padding: 5px 10px;">Benchmark</button>
                <button id="toggle-profiling" style="margin-top: 5px; margin-left: 5px; padding: 5px 10px;">Disable Profiling</button>
            </div>
        `;
        document.body.appendChild(controls);

        // Update stats display periodically
        setInterval(() => {
            const statsDisplay = document.getElementById('stats-display');
            if (statsDisplay) {
                const stats = profiler.getStats();
                statsDisplay.innerHTML = `
                    <div>FPS: ${stats.fps.toFixed(1)}</div>
                    <div>Total Objects: ${this.hybridObjects.length}</div>
                    <div>Worker Batches: ${stats.counters.worker_batch_count || 0}</div>
                    <div>Mode Changes: ${stats.counters.worker_mode_changes || 0}</div>
                    <div>Worker Errors: ${stats.counters.worker_errors || 0}</div>
                    ${stats.operations.hybrid_render_total ? 
                        `<div>Render Time: ${stats.operations.hybrid_render_total.avg.toFixed(2)}ms</div>` : ''}
                    ${stats.operations.worker_processing ? 
                        `<div>Worker Time: ${stats.operations.worker_processing.avg.toFixed(2)}ms</div>` : ''}
                `;
            }
        }, 1000);

        // Add event listeners
        document.getElementById('reset-stats')?.addEventListener('click', () => {
            profiler.reset();
        });

        document.getElementById('run-benchmark')?.addEventListener('click', () => {
            this.runBenchmark();
        });

        let profilingEnabled = true;
        document.getElementById('toggle-profiling')?.addEventListener('click', (e) => {
            const button = e.target as HTMLButtonElement;
            if (profilingEnabled) {
                profiler.disable();
                button.textContent = 'Enable Profiling';
                profilingEnabled = false;
            } else {
                profiler.enable();
                button.textContent = 'Disable Profiling';
                profilingEnabled = true;
            }
        });
    }

    private async runBenchmark(): Promise<void> {
        console.log('🏁 Running Worker vs Main Thread benchmark...');
        try {
            const results = await WorkerBenchmark.compareWorkerVsMainThread(this.hybridObjects.length, 50);
            
            // Show results in an alert or console
            const message = `
📊 Benchmark Results:
• Worker: ${results.worker.toFixed(2)}ms
• Main Thread: ${results.mainThread.toFixed(2)}ms  
• Speedup: ${results.speedup.toFixed(2)}x
            `;
            
            console.log(message);
            
            // You could also show this in a modal or notification
            alert(message);
        } catch (error) {
            console.error('Benchmark failed:', error);
        }
    }

    private updateDistanceIndicators(): void {
        // Update distance indicators in the UI
        this.hybridObjects.forEach((obj) => {
            const element = obj.element;
            const distanceIndicator = element.querySelector('.distance-indicator');
            if (distanceIndicator) {
                const distance = this.camera.position.distanceTo(obj.position);
                distanceIndicator.textContent = distance.toFixed(1);
            }
        });
    }

    private startRenderLoop(): void {
        const animate = () => {
            requestAnimationFrame(animate);

            // Animate camera around the objects
            const time = Date.now() * 0.0005;
            this.camera.position.x = Math.cos(time) * 30;
            this.camera.position.z = Math.sin(time) * 30;
            this.camera.position.y = Math.sin(time * 0.7) * 10;
            this.camera.lookAt(0, 0, 0);

            // Animate some objects
            this.hybridObjects.forEach((obj, index) => {
                obj.rotation.y += 0.001 * (index % 3 + 1);
                obj.position.y = Math.sin(Date.now() * 0.001 + index * 0.1) * 2;
            });

            // Update distance indicators periodically
            if (Date.now() % 60 < 16) { // ~60fps update rate
                this.updateDistanceIndicators();
            }

            // Render both WebGL and hybrid scenes
            this.renderer.render(this.scene, this.camera);
            this.hybridRenderer.render(this.scene, this.camera);
        };

        animate();
    }

    // Method to add more objects dynamically for stress testing
    public addMoreObjects(count: number): void {
        console.log(`➕ Adding ${count} more objects...`);
        const startIndex = this.hybridObjects.length;
        
        for (let i = 0; i < count; i++) {
            const element = document.createElement('div');
            element.innerHTML = `
                <div style="
                    background: linear-gradient(45deg, hsl(${(startIndex + i) * 3.6}, 70%, 50%), hsl(${((startIndex + i) * 3.6 + 60) % 360}, 70%, 70%));
                    padding: 8px;
                    border-radius: 6px;
                    color: white;
                    font-family: Arial, sans-serif;
                    text-align: center;
                    font-size: 10px;
                    width: 100px;
                    height: 60px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                ">Dynamic ${startIndex + i}</div>
            `;

            const hybridObject = new CSSHybridObject(element, {
                zoomThreshold: 6 + Math.random() * 6,
                transitionDuration: 200,
                enableAutoSwitch: true,
                hysteresis: 0.3
            });

            // Random position around the existing objects
            hybridObject.position.set(
                (Math.random() - 0.5) * 100,
                (Math.random() - 0.5) * 20,
                (Math.random() - 0.5) * 100
            );

            this.scene.add(hybridObject);
            this.hybridObjects.push(hybridObject);
        }

        // Invalidate cache to recognize new objects
        this.hybridRenderer.invalidateCache();
        
        console.log(`✅ Total objects: ${this.hybridObjects.length}`);
    }

    // Cleanup method
    public dispose(): void {
        profiler.disable();
        this.hybridRenderer.dispose();
        this.renderer.dispose();
    }
}

// Usage example
export function createOptimizedHybridExample(): OptimizedHybridExample {
    return new OptimizedHybridExample();
}

// Export for global access in development
(window as any).OptimizedHybridExample = OptimizedHybridExample;
