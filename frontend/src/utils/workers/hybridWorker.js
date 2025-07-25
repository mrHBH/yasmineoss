/**
 * Web Worker for CSS Hybrid Renderer optimizations
 * Handles distance calculations, mode switching decisions, and transform computations
 */

class HybridWorker {
    constructor() {
        this.objects = new Map();
        this.lastFrameTime = 0;
        this.frameThrottle = 16; // ~60fps throttling
    }

    // Process batch of objects for mode switching decisions
    processBatch(data) {
        const { objects, camera, timestamp } = data;
        
        // Throttle updates to prevent overwhelming the main thread
        if (timestamp - this.lastFrameTime < this.frameThrottle) {
            return { shouldUpdate: false };
        }
        this.lastFrameTime = timestamp;

        const results = [];
        const distanceResults = [];

        for (const objData of objects) {
            const result = this.processObject(objData, camera);
            if (result) {
                results.push(result);
            }
            
            // Also calculate distances for all objects for potential z-ordering
            distanceResults.push({
                id: objData.id,
                distance: result.distance,
                orthogonalDistance: result.orthogonalDistance
            });
        }

        return {
            shouldUpdate: true,
            modeChanges: results,
            distances: distanceResults,
            timestamp
        };
    }

    processObject(objData, camera) {
        const {
            id,
            position,
            quaternion,
            lastCameraPosition,
            lastObjectPosition,
            lastDistance,
            zoomThreshold,
            hysteresis,
            currentMode,
            enableAutoSwitch,
            isTransitioning,
            lastModeSwitch
        } = objData;

        // Skip if not auto-switching or currently transitioning
        if (!enableAutoSwitch || isTransitioning) {
            return null;
        }

        // Optimized distance check with caching
        const shouldUpdate = this.shouldUpdateDistance(
            camera.position,
            position,
            lastCameraPosition,
            lastObjectPosition,
            lastDistance
        );

        if (!shouldUpdate) {
            return null;
        }

        // Calculate optimized distance
        const distanceResult = this.getDistanceToOptimized(camera, objData);
        const { distance, orthogonalDistance, viewingAngleCos } = distanceResult;

        // Check if mode switch is needed with hysteresis
        const threshold = zoomThreshold;
        let shouldBe2D;
        
        if (currentMode === '3d') {
            shouldBe2D = distance < (threshold - hysteresis);
        } else {
            shouldBe2D = distance < (threshold + hysteresis);
        }

        const newMode = shouldBe2D ? '2d' : '3d';
        
        // Only return if mode change is needed
        if (currentMode !== newMode) {
            // Throttle mode switches to prevent rapid flickering
            const now = performance.now();
            if (now - lastModeSwitch < 100) {
                return null;
            }

            return {
                id,
                newMode,
                distance,
                orthogonalDistance,
                viewingAngleCos,
                timestamp: now
            };
        }

        return null;
    }

    shouldUpdateDistance(cameraPos, objectPos, lastCameraPos, lastObjectPos, lastDistance) {
        if (lastDistance === -1) return true;
        
        // Only recalculate if camera or object moved significantly
        const cameraMoved = this.distanceToSquared(lastCameraPos, cameraPos) > 0.01;
        const objectMoved = this.distanceToSquared(lastObjectPos, objectPos) > 0.01;
        
        return cameraMoved || objectMoved;
    }

    getDistanceToOptimized(camera, objData) {
        const { position, quaternion } = objData;
        const cameraPos = camera.position;
        
        // Calculate object normal
        const objectNormal = this.applyQuaternionToVector(
            { x: 0, y: 0, z: 1 },
            quaternion
        );
        this.normalizeVector(objectNormal);
        
        // Calculate vector from object to camera
        const objectToCamera = {
            x: cameraPos.x - position.x,
            y: cameraPos.y - position.y,
            z: cameraPos.z - position.z
        };
        
        // Calculate orthogonal distance (dot product with normal)
        const orthogonalDistance = Math.abs(this.dotProduct(objectToCamera, objectNormal));
        
        // Check viewing angle - camera should be facing the element
        const cameraForward = this.applyQuaternionToVector(
            { x: 0, y: 0, z: -1 },
            camera.quaternion
        );
        this.normalizeVector(cameraForward);
        
        // Calculate angle between camera forward and object normal
        const viewingAngleCos = Math.abs(this.dotProduct(cameraForward, objectNormal));
        const viewingAngleThreshold = 0.9; // cos(25°) ≈ 0.9
        
        // Calculate euclidean distance for fallback
        const euclideanDistance = Math.sqrt(
            objectToCamera.x * objectToCamera.x +
            objectToCamera.y * objectToCamera.y +
            objectToCamera.z * objectToCamera.z
        );
        
        return {
            distance: orthogonalDistance,
            orthogonalDistance,
            euclideanDistance,
            viewingAngleCos
        };
    }

    // Vector math utilities
    distanceToSquared(a, b) {
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dz = a.z - b.z;
        return dx * dx + dy * dy + dz * dz;
    }

    dotProduct(a, b) {
        return a.x * b.x + a.y * b.y + a.z * b.z;
    }

    normalizeVector(v) {
        const length = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
        if (length > 0) {
            v.x /= length;
            v.y /= length;
            v.z /= length;
        }
        return v;
    }

    applyQuaternionToVector(v, q) {
        // Apply quaternion rotation to vector
        const { x, y, z } = v;
        const { x: qx, y: qy, z: qz, w: qw } = q;
        
        // Calculate quat * vector
        const ix = qw * x + qy * z - qz * y;
        const iy = qw * y + qz * x - qx * z;
        const iz = qw * z + qx * y - qy * x;
        const iw = -qx * x - qy * y - qz * z;
        
        // Calculate result * inverse quat
        return {
            x: ix * qw + iw * -qx + iy * -qz - iz * -qy,
            y: iy * qw + iw * -qy + iz * -qx - ix * -qz,
            z: iz * qw + iw * -qz + ix * -qy - iy * -qx
        };
    }

    // Process transform calculations for 2D mode
    calculate2DTransforms(data) {
        const { objects, camera, viewProjectionMatrix, width, height } = data;
        const results = [];
        
        for (const objData of objects) {
            const { id, position } = objData;
            
            // Apply view projection matrix
            const projected = this.applyMatrix4ToVector(position, viewProjectionMatrix);
            
            // Check if visible
            const visible = projected.z >= -1 && projected.z <= 1;
            
            if (visible) {
                const widthHalf = width / 2;
                const heightHalf = height / 2;
                const x = projected.x * widthHalf + widthHalf;
                const y = -projected.y * heightHalf + heightHalf;
                
                results.push({
                    id,
                    x,
                    y,
                    visible: true
                });
            } else {
                results.push({
                    id,
                    visible: false
                });
            }
        }
        
        return { transforms: results };
    }

    applyMatrix4ToVector(v, m) {
        // Apply 4x4 matrix to 3D vector (treating as homogeneous coordinates)
        const x = v.x, y = v.y, z = v.z;
        const w = 1 / (m[3] * x + m[7] * y + m[11] * z + m[15]);
        
        return {
            x: (m[0] * x + m[4] * y + m[8] * z + m[12]) * w,
            y: (m[1] * x + m[5] * y + m[9] * z + m[13]) * w,
            z: (m[2] * x + m[6] * y + m[10] * z + m[14]) * w
        };
    }
}

// Worker message handler
const worker = new HybridWorker();

self.onmessage = function(e) {
    const { type, data } = e.data;
    
    try {
        let result;
        
        switch (type) {
            case 'processBatch':
                result = worker.processBatch(data);
                break;
            case 'calculate2DTransforms':
                result = worker.calculate2DTransforms(data);
                break;
            default:
                result = { error: `Unknown message type: ${type}` };
        }
        
        self.postMessage({
            type: `${type}Result`,
            data: result,
            requestId: e.data.requestId
        });
    } catch (error) {
        self.postMessage({
            type: 'error',
            data: { error: error.message, stack: error.stack },
            requestId: e.data.requestId
        });
    }
};
