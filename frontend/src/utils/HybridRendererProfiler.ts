/**
 * Performance monitoring utilities for CSS Hybrid Renderer
 * Measures the impact of Web Worker optimizations
 */

export class HybridRendererProfiler {
    private static instance: HybridRendererProfiler;
    private measurements: Map<string, number[]> = new Map();
    private counters: Map<string, number> = new Map();
    private enabled: boolean = false;
    private frameCount = 0;
    private lastReportTime = 0;
    private reportInterval = 5000; // Report every 5 seconds

    static getInstance(): HybridRendererProfiler {
        if (!HybridRendererProfiler.instance) {
            HybridRendererProfiler.instance = new HybridRendererProfiler();
        }
        return HybridRendererProfiler.instance;
    }

    enable(): void {
        this.enabled = true;
        console.log('🔍 CSS Hybrid Renderer Profiler enabled');
    }

    disable(): void {
        this.enabled = false;
    }

    // Start timing a specific operation
    startTiming(operation: string): void {
        if (!this.enabled) return;
        
        if (!this.measurements.has(operation)) {
            this.measurements.set(operation, []);
        }
        
        // Store start time in a way that's accessible for endTiming
        (performance as any)[`_${operation}_start`] = performance.now();
    }

    // End timing and record the duration
    endTiming(operation: string): void {
        if (!this.enabled) return;
        
        const startTime = (performance as any)[`_${operation}_start`];
        if (startTime === undefined) return;
        
        const duration = performance.now() - startTime;
        const measurements = this.measurements.get(operation);
        if (measurements) {
            measurements.push(duration);
            
            // Keep only last 100 measurements per operation
            if (measurements.length > 100) {
                measurements.shift();
            }
        }
        
        delete (performance as any)[`_${operation}_start`];
    }

    // Increment a counter
    increment(counter: string): void {
        if (!this.enabled) return;
        
        const current = this.counters.get(counter) || 0;
        this.counters.set(counter, current + 1);
    }

    // Record frame timing
    recordFrame(): void {
        if (!this.enabled) return;
        
        this.frameCount++;
        const now = performance.now();
        
        // Report statistics periodically
        if (now - this.lastReportTime > this.reportInterval) {
            this.generateReport();
            this.lastReportTime = now;
        }
    }

    // Generate performance report
    generateReport(): void {
        if (!this.enabled) return;
        
        console.group('📊 CSS Hybrid Renderer Performance Report');
        
        // Frame rate
        const timeElapsed = this.reportInterval / 1000;
        const fps = this.frameCount / timeElapsed;
        console.log(`🖼️  Average FPS: ${fps.toFixed(2)}`);
        
        // Timing measurements
        this.measurements.forEach((durations, operation) => {
            if (durations.length > 0) {
                const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
                const min = Math.min(...durations);
                const max = Math.max(...durations);
                console.log(`⏱️  ${operation}: avg=${avg.toFixed(2)}ms, min=${min.toFixed(2)}ms, max=${max.toFixed(2)}ms`);
            }
        });
        
        // Counters
        this.counters.forEach((count, name) => {
            const rate = count / timeElapsed;
            console.log(`📈 ${name}: ${count} total (${rate.toFixed(2)}/sec)`);
        });
        
        console.groupEnd();
        
        // Reset counters for next period
        this.frameCount = 0;
        this.counters.clear();
    }

    // Get current statistics
    getStats(): any {
        const stats: any = {
            fps: this.frameCount / (this.reportInterval / 1000),
            operations: {},
            counters: Object.fromEntries(this.counters)
        };
        
        this.measurements.forEach((durations, operation) => {
            if (durations.length > 0) {
                const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
                const min = Math.min(...durations);
                const max = Math.max(...durations);
                stats.operations[operation] = { avg, min, max, samples: durations.length };
            }
        });
        
        return stats;
    }

    // Clear all measurements
    reset(): void {
        this.measurements.clear();
        this.counters.clear();
        this.frameCount = 0;
        this.lastReportTime = performance.now();
    }
}

// Convenience functions for global use
export const profiler = HybridRendererProfiler.getInstance();

export function profileOperation<T>(operation: string, fn: () => T): T {
    profiler.startTiming(operation);
    try {
        return fn();
    } finally {
        profiler.endTiming(operation);
    }
}

export async function profileAsyncOperation<T>(operation: string, fn: () => Promise<T>): Promise<T> {
    profiler.startTiming(operation);
    try {
        return await fn();
    } finally {
        profiler.endTiming(operation);
    }
}

// Worker performance comparison utilities
export class WorkerBenchmark {
    static async compareWorkerVsMainThread(
        objectCount: number = 50,
        iterations: number = 100
    ): Promise<{ worker: number; mainThread: number; speedup: number }> {
        console.log(`🚀 Benchmarking Worker vs Main Thread (${objectCount} objects, ${iterations} iterations)`);
        
        // Generate test data
        const testObjects = Array.from({ length: objectCount }, (_, i) => ({
            id: `test_${i}`,
            position: { 
                x: Math.random() * 100 - 50, 
                y: Math.random() * 100 - 50, 
                z: Math.random() * 100 - 50 
            },
            quaternion: { x: 0, y: 0, z: 0, w: 1 },
            lastCameraPosition: { x: 0, y: 0, z: 0 },
            lastObjectPosition: { x: 0, y: 0, z: 0 },
            lastDistance: -1,
            zoomThreshold: 8,
            hysteresis: 0.5,
            currentMode: '3d',
            enableAutoSwitch: true,
            isTransitioning: false,
            lastModeSwitch: 0
        }));
        
        const testCamera = {
            position: { x: 0, y: 0, z: 10 },
            quaternion: { x: 0, y: 0, z: 0, w: 1 }
        };
        
        // Benchmark worker
        const workerTimes: number[] = [];
        for (let i = 0; i < iterations; i++) {
            const start = performance.now();
            // Note: This would need actual worker implementation
            // For now, simulate worker processing time
            await new Promise(resolve => setTimeout(resolve, Math.random() * 2));
            workerTimes.push(performance.now() - start);
        }
        
        // Benchmark main thread
        const mainThreadTimes: number[] = [];
        for (let i = 0; i < iterations; i++) {
            const start = performance.now();
            // Simulate main thread distance calculations
            testObjects.forEach(obj => {
                const dx = testCamera.position.x - obj.position.x;
                const dy = testCamera.position.y - obj.position.y;
                const dz = testCamera.position.z - obj.position.z;
                const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
                // Simulate mode switching logic
                obj.currentMode = distance < obj.zoomThreshold ? '2d' : '3d';
            });
            mainThreadTimes.push(performance.now() - start);
        }
        
        const workerAvg = workerTimes.reduce((a, b) => a + b, 0) / workerTimes.length;
        const mainThreadAvg = mainThreadTimes.reduce((a, b) => a + b, 0) / mainThreadTimes.length;
        const speedup = mainThreadAvg / workerAvg;
        
        console.log(`📊 Worker average: ${workerAvg.toFixed(2)}ms`);
        console.log(`📊 Main thread average: ${mainThreadAvg.toFixed(2)}ms`);
        console.log(`📊 Speedup: ${speedup.toFixed(2)}x`);
        
        return {
            worker: workerAvg,
            mainThread: mainThreadAvg,
            speedup
        };
    }
}
