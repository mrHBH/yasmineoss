import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { ManagedGroup } from './ManagedGroup';
import { LoadingManager } from './LoadingManager';
import { noise2D } from './noise';
import { STREAMING_CONSTANTS } from './StreamingConstants';

// Simple seeded random number generator
class SeededRandom {
  private seed: number;
  
  constructor(seed: number) {
    this.seed = seed;
  }
  
  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }
}

class StreamingTile extends THREE.Group {
  physicsWorld: CANNON.World;
  physicsBodies: CANNON.Body[] = [];
  
  // Shared resources to prevent memory waste
  private static sharedBoxGeometry: THREE.BoxGeometry | null = null;
  private static sharedBoxShape: CANNON.Box | null = null;

  constructor(physicsWorld: CANNON.World) {
    super();
    this.physicsWorld = physicsWorld;
  } 

  private static getSharedBoxGeometry(): THREE.BoxGeometry {
    if (!this.sharedBoxGeometry) {
      this.sharedBoxGeometry = new THREE.BoxGeometry(2, 2, 2);
    }
    return this.sharedBoxGeometry;
  }
  
  private static getSharedBoxShape(): CANNON.Box {
    if (!this.sharedBoxShape) {
      this.sharedBoxShape = new CANNON.Box(new CANNON.Vec3(1, 1, 1));
    }
    return this.sharedBoxShape;
  }

  static disposeSharedResources() {
    if (this.sharedBoxGeometry) {
      this.sharedBoxGeometry.dispose();
      this.sharedBoxGeometry = null;
    }
    this.sharedBoxShape = null;
  }

  dispose() {
    // Remove physics bodies from world BEFORE clearing the array
    this.physicsBodies.forEach(body => {
      if (this.physicsWorld && this.physicsWorld.bodies.includes(body)) {
        this.physicsWorld.removeBody(body);
      }
    });
    this.physicsBodies.length = 0; // More efficient than = []

    // Properly dispose of Three.js objects
    this.children.forEach((child) => {
      if (child instanceof THREE.Group) {
        child.traverse((obj) => {
          if (obj instanceof THREE.Mesh) {
            // Dispose geometry (only if not shared)
            if (obj.geometry && obj.geometry !== StreamingTile.getSharedBoxGeometry()) {
              obj.geometry.dispose();
            }
            // Dispose materials
            if (obj.material) {
              if (Array.isArray(obj.material)) {
                obj.material.forEach(mat => mat.dispose());
              } else {
                obj.material.dispose();
              }
            }
          }
        });
      }
      if ((child as any).dispose) {
        (child as any).dispose();
      }
    });

    this.removeFromParent();
  }

  getState() {
    const bodiesState = [];
    for (const body of this.physicsBodies) {
      // Only save state if body is still in the world and has valid position
      if (this.physicsWorld.bodies.includes(body) && this.isValidPosition(body.position)) {
        bodiesState.push({
          position: body.position.clone(),
          quaternion: body.quaternion.clone(),
          velocity: body.velocity.clone(),
          angularVelocity: body.angularVelocity.clone(),
        });
      }
    }
    return { bodies: bodiesState };
  }

  private isValidPosition(position: CANNON.Vec3): boolean {
    return !isNaN(position.x) && !isNaN(position.y) && !isNaN(position.z) &&
           isFinite(position.x) && isFinite(position.y) && isFinite(position.z);
  }

  async load(tilePos: THREE.Vector3, state: any) {
    const groundGeometry = new THREE.PlaneGeometry(
        STREAMING_CONSTANTS.TILE_SIZE, STREAMING_CONSTANTS.TILE_SIZE, STREAMING_CONSTANTS.TILE_RESOLUTION, STREAMING_CONSTANTS.TILE_RESOLUTION);
    groundGeometry.rotateX(-Math.PI / 2);

    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x808080,
      metalness: 0.0,
      roughness: 0.8,
    });
    groundMaterial.color.setHSL(noise2D(tilePos.x, tilePos.z), 1.0, 0.5);

    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.castShadow = false;
    ground.receiveShadow = true;

    const models: THREE.Object3D[] = [];

    // Create seeded random generator based on tile position for consistent results
    const seed = Math.floor(tilePos.x * 1000 + tilePos.z * 1000) + 12345;
    const seededRandom = new SeededRandom(seed);

    for (let i = 0; i < STREAMING_CONSTANTS.TILE_RANDOM_OBJECTS; i++) {
        const randomAngle = seededRandom.next() * Math.PI * 2;
        const randomRadius = seededRandom.next() * STREAMING_CONSTANTS.TILE_SIZE * 0.5;
        const x = Math.cos(randomAngle) * randomRadius;
        const z = Math.sin(randomAngle) * randomRadius;

        const box = new THREE.Mesh(
            StreamingTile.getSharedBoxGeometry(),
            new THREE.MeshStandardMaterial({ color: 0xffffff * seededRandom.next() })
        );
        box.position.set(x, 1, z);
        box.castShadow = true;
        box.receiveShadow = true;

        // Create physics body for the cube with shared shape
        const boxBody = new CANNON.Body({ 
          mass: 1,
          material: new CANNON.Material(),
          shape: StreamingTile.getSharedBoxShape()
        });
        
        if (state && state.bodies && state.bodies[i] && this.isValidPosition(state.bodies[i].position)) {
          boxBody.position.copy(state.bodies[i].position);
          boxBody.quaternion.copy(state.bodies[i].quaternion);
          boxBody.velocity.set(0, 0, 0);
          boxBody.angularVelocity.set(0, 0, 0);
        } else {
          boxBody.position.set(tilePos.x + x, 1, tilePos.z + z);
        }
        
        // Store reference to physics body in mesh userData
        box.userData.physicsBody = boxBody;
        
        // Add body to physics world and track it
        if (this.physicsWorld) {
          this.physicsWorld.addBody(boxBody);
          this.physicsBodies.push(boxBody);
        }

        models.push(box);
    }

    const group = new ManagedGroup(false);
    group.add(...models);
    group.add(ground);
    group.position.copy(tilePos);

    this.add(group);
  }
};

const LOAD_DISTANCE = STREAMING_CONSTANTS.LOAD_DISTANCE;
const NUM_TILES = STREAMING_CONSTANTS.NUM_TILES;

class StreamingWorld extends THREE.Group {
  #tiles_: {[key: string]: StreamingTile} = {};
  #tileDataCache_: {[key: string]: any} = {};
  #cacheAccessTime_: {[key: string]: number} = {}; // Track when cache entries were last accessed
  #cacheCleanupInterval_: number = STREAMING_CONSTANTS.CACHE_CLEANUP_INTERVAL;
  #lastCacheCleanup_: number = 0;
  #maxCacheEntries_: number = STREAMING_CONSTANTS.MAX_CACHE_ENTRIES;
  physicsWorld: CANNON.World;
  entityManager: any; // Reference to EntityManager for entity streaming

  constructor(physicsWorld: CANNON.World, entityManager?: any) {
    super();
    this.physicsWorld = physicsWorld;
    this.entityManager = entityManager;
  }

  update(pos: THREE.Vector3) {
    // Monitor performance
    const startTime = performance.now();
    
    const posXZ = new THREE.Vector3(pos.x, 0, pos.z);

    // Round to the nearest tile
    const baseTilePos = posXZ.clone();
    baseTilePos.divideScalar(STREAMING_CONSTANTS.TILE_SIZE);
    baseTilePos.round();
    baseTilePos.multiplyScalar(STREAMING_CONSTANTS.TILE_SIZE);

    const newTiles: {[key: string]: StreamingTile} = {};
    const oldTiles = this.#tiles_;

    for (let x = -NUM_TILES; x <= NUM_TILES; x++) {
        for (let z = -NUM_TILES; z <= NUM_TILES; z++) {
            const offset = new THREE.Vector3(x, 0, z);
            offset.multiplyScalar(STREAMING_CONSTANTS.TILE_SIZE);

            const tilePos = baseTilePos.clone().add(offset);
            const key = tilePos.x + '/' + tilePos.z;

            if (pos.distanceTo(tilePos) > LOAD_DISTANCE) {
                continue;
            }

            if (key in oldTiles) {
                newTiles[key] = oldTiles[key];
                delete oldTiles[key];
            } else {
                const tile = new StreamingTile(this.physicsWorld);
                const state = this.#tileDataCache_[key];
                
                // Track cache access time
                if (state) {
                  this.#cacheAccessTime_[key] = Date.now();
                }
                
                tile.load(tilePos, state);
                this.add(tile);
                newTiles[key] = tile;
            }
        }
    }

    for (let k in oldTiles) {
        this.#tileDataCache_[k] = oldTiles[k].getState();
        this.#cacheAccessTime_[k] = Date.now(); // Track when we cached this data
        oldTiles[k].dispose();
    }

    this.#tiles_ = newTiles;

    // Perform cache cleanup periodically
    this.cleanupCache();
    
    // Detect when returning to previously visited areas
    this.detectReturnToArea(pos);
    
    // Check if we should purge distant cache entries
    if (this.shouldPurgeCache(pos)) {
      console.log('Purging distant cache entries...');
      this.#tileDataCache_ = {};
      this.#cacheAccessTime_ = {};
    }

    this.updateMeshes();
    
    // Check for memory leaks
    const memStats = this.getMemoryStats();
    if (memStats.totalPhysicsBodies > STREAMING_CONSTANTS.MAX_PHYSICS_BODIES_WARNING) { // Adjust threshold as needed
      console.warn('StreamingWorld: High physics body count detected:', memStats);
    }
    
    const updateTime = performance.now() - startTime;
    if (updateTime > STREAMING_CONSTANTS.SLOW_UPDATE_WARNING_MS) { // More than one frame at 60fps
      console.warn('StreamingWorld: Slow update detected:', updateTime + 'ms');
    }
  }

  updateMeshes() {
    for (const key in this.#tiles_) {
      const tile = this.#tiles_[key];
      if (tile.children.length > 0) {
        const group = tile.children[0] as THREE.Group;
        
        // Cache the group position to avoid repeated access
        const groupPos = group.position;
        
        group.children.forEach(child => {
          const mesh = child as THREE.Mesh;
          if (mesh.userData.physicsBody) {
            const body = mesh.userData.physicsBody as CANNON.Body;
            
            // Only update if the body is still active and position has changed significantly
            if (body.sleepState === CANNON.Body.AWAKE || !mesh.userData.lastPosition || 
                body.position.distanceTo(mesh.userData.lastPosition) > STREAMING_CONSTANTS.MESH_UPDATE_DISTANCE_THRESHOLD) {
              
              mesh.position.copy(body.position as any).sub(groupPos);
              mesh.quaternion.copy(body.quaternion as any);
              
              // Cache the last position
              if (!mesh.userData.lastPosition) {
                mesh.userData.lastPosition = new CANNON.Vec3();
              }
              mesh.userData.lastPosition.copy(body.position);
            }
          }
        });
      }
    }
  }

  dispose() {
    // Clean up all tiles
    for (const key in this.#tiles_) {
      this.#tiles_[key].dispose();
    }
    this.#tiles_ = {};
    
    // Clear tile data cache
    this.#tileDataCache_ = {};
    this.#cacheAccessTime_ = {};
    
    // Clean up shared resources
    StreamingTile.disposeSharedResources();
  }
  
  // Add this to monitor memory usage
  getMemoryStats() {
    const stats = {
      activeTiles: Object.keys(this.#tiles_).length,
      cachedTiles: Object.keys(this.#tileDataCache_).length,
      totalPhysicsBodies: 0
    };
    
    for (const tile of Object.values(this.#tiles_)) {
      stats.totalPhysicsBodies += tile.physicsBodies.length;
    }
    
    return stats;
  }

  // Cache management methods
  private cleanupCache(): void {
    const now = Date.now();
    
    // Don't cleanup too frequently
    if (now - this.#lastCacheCleanup_ < this.#cacheCleanupInterval_) {
      return;
    }
    
    const cacheEntries = Object.keys(this.#tileDataCache_).length;
    
    // Force cleanup if we have too many entries
    const forceCleanup = cacheEntries > this.#maxCacheEntries_;
    
    if (forceCleanup || now - this.#lastCacheCleanup_ > this.#cacheCleanupInterval_) {
      this.purgeOldCacheEntries(now, forceCleanup);
      this.#lastCacheCleanup_ = now;
    }
  }

  private purgeOldCacheEntries(now: number, aggressive: boolean = false): void {
    const maxAge = aggressive ? STREAMING_CONSTANTS.CACHE_MAX_AGE_AGGRESSIVE : STREAMING_CONSTANTS.CACHE_MAX_AGE_NORMAL; // 1 or 2 minutes
    const keysToRemove: string[] = [];
    
    // Find old cache entries
    for (const [key, accessTime] of Object.entries(this.#cacheAccessTime_)) {
      if (now - accessTime > maxAge) {
        keysToRemove.push(key);
      }
    }
    
    // If aggressive cleanup and we still have too many, remove oldest entries
    if (aggressive && Object.keys(this.#tileDataCache_).length > this.#maxCacheEntries_) {
      const sortedEntries = Object.entries(this.#cacheAccessTime_)
        .sort(([,a], [,b]) => a - b) // Sort by access time (oldest first)
        .slice(0, Math.max(0, Object.keys(this.#tileDataCache_).length - this.#maxCacheEntries_));
      
      for (const [key] of sortedEntries) {
        if (!keysToRemove.includes(key)) {
          keysToRemove.push(key);
        }
      }
    }
    
    // Remove old entries
    for (const key of keysToRemove) {
      delete this.#tileDataCache_[key];
      delete this.#cacheAccessTime_[key];
    }
    
    if (keysToRemove.length > 0) {
      console.log(`StreamingWorld: Purged ${keysToRemove.length} old cache entries. Remaining: ${Object.keys(this.#tileDataCache_).length}`);
    }
  }

  // Enhanced cache management - purge cache when returning to areas
  private shouldPurgeCache(currentPos: THREE.Vector3): boolean {
    const PURGE_DISTANCE = STREAMING_CONSTANTS.PURGE_DISTANCE; // If player moves far from cached areas, purge old cache
    const cachedTileCount = Object.keys(this.#tileDataCache_).length;
    
    // If cache is getting large, check if we're far from cached areas
    if (cachedTileCount > 20) {
      let nearCachedArea = false;
      
      for (const tileKey in this.#tileDataCache_) {
        const [x, z] = tileKey.split('/').map(Number);
        const tilePos = new THREE.Vector3(x, 0, z);
        if (currentPos.distanceTo(tilePos) < PURGE_DISTANCE) {
          nearCachedArea = true;
          break;
        }
      }
      
      // If we're far from all cached areas, purge the cache
      if (!nearCachedArea) {
        return true;
      }
    }
    
    return false;
  }

  // Method to detect when player returns to a previously visited area
  private detectReturnToArea(currentPos: THREE.Vector3): void {
    const RETURN_THRESHOLD = STREAMING_CONSTANTS.RETURN_THRESHOLD; // Distance threshold to consider "returning"
    
    // Check if we're returning to a cached area
    for (const tileKey in this.#tileDataCache_) {
      const [x, z] = tileKey.split('/').map(Number);
      const tilePos = new THREE.Vector3(x, 0, z);
      
      if (currentPos.distanceTo(tilePos) < RETURN_THRESHOLD) {
        // We're returning to this area, refresh its cache access time
        this.#cacheAccessTime_[tileKey] = Date.now();
        
        // Also purge very old cache entries when returning to an area
        this.purgeStaleCache();
        break;
      }
    }
  }

  private purgeStaleCache(): void {
    const now = Date.now();
    const STALE_THRESHOLD = STREAMING_CONSTANTS.CACHE_STALE_THRESHOLD; // 5 minutes
    const keysToRemove: string[] = [];
    
    for (const [key, accessTime] of Object.entries(this.#cacheAccessTime_)) {
      if (now - accessTime > STALE_THRESHOLD) {
        keysToRemove.push(key);
      }
    }
    
    for (const key of keysToRemove) {
      delete this.#tileDataCache_[key];
      delete this.#cacheAccessTime_[key];
    }
    
    if (keysToRemove.length > 0) {
      console.log(`StreamingWorld: Purged ${keysToRemove.length} stale cache entries on area return`);
    }
  }

  // Method to force cache cleanup (useful for debugging or manual cleanup)
  public forceCacheCleanup(): void {
    console.log('Forcing cache cleanup...');
    this.purgeOldCacheEntries(Date.now(), true);
    this.#lastCacheCleanup_ = Date.now();
  }

  // Method to completely clear cache
  public clearCache(): void {
    console.log('Clearing all cache...');
    this.#tileDataCache_ = {};
    this.#cacheAccessTime_ = {};
    this.#lastCacheCleanup_ = Date.now();
  }
};

export { StreamingWorld };
