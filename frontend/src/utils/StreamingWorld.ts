import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { ManagedGroup } from './ManagedGroup';
import { LoadingManager } from './LoadingManager';
import { noise2D } from './noise';

const TILE_SIZE = 50;
const TILE_RESOLUTION = 1;
const TILE_RANDOM_OBJECTS = 1;

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

  constructor(physicsWorld: CANNON.World) {
    super();
    this.physicsWorld = physicsWorld;
  }

  dispose() {
    // Remove physics bodies from world
    this.physicsBodies.forEach(body => {
      if (this.physicsWorld) {
        this.physicsWorld.removeBody(body);
      }
    });
    this.physicsBodies = [];

    this.children.forEach((child) => {
      (child as any).dispose();
    });

    this.removeFromParent();
  }

  getState() {
    const bodiesState = [];
    for (const body of this.physicsBodies) {
      bodiesState.push({
        position: body.position.clone(),
        quaternion: body.quaternion.clone(),
        velocity: body.velocity.clone(),
        angularVelocity: body.angularVelocity.clone(),
      });
    }
    return { bodies: bodiesState };
  }

  async load(tilePos: THREE.Vector3, state: any) {
    const groundGeometry = new THREE.PlaneGeometry(
        TILE_SIZE, TILE_SIZE, TILE_RESOLUTION, TILE_RESOLUTION);
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

    for (let i = 0; i < TILE_RANDOM_OBJECTS; i++) {
        const randomAngle = seededRandom.next() * Math.PI * 2;
        const randomRadius = seededRandom.next() * TILE_SIZE * 0.5;
        const x = Math.cos(randomAngle) * randomRadius;
        const z = Math.sin(randomAngle) * randomRadius;

        const box = new THREE.Mesh(
            new THREE.BoxGeometry(2, 2, 2),
            new THREE.MeshStandardMaterial({ color: 0xffffff * seededRandom.next() })
        );
        box.position.set(x, 1, z);
        box.castShadow = true;
        box.receiveShadow = true;

        // Create physics body for the cube
        const boxShape = new CANNON.Box(new CANNON.Vec3(1, 1, 1));
        const boxBody = new CANNON.Body({ 
          mass: 1,
          material: new CANNON.Material(),
          shape: boxShape 
        });
        
        if (state && state.bodies[i]) {
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

const LOAD_DISTANCE = 200;
const NUM_TILES = 5;

class StreamingWorld extends THREE.Group {
  #tiles_: {[key: string]: StreamingTile} = {};
  #tileDataCache_: {[key: string]: any} = {};
  physicsWorld: CANNON.World;
  entityManager: any; // Reference to EntityManager for entity streaming

  constructor(physicsWorld: CANNON.World, entityManager?: any) {
    super();
    this.physicsWorld = physicsWorld;
    this.entityManager = entityManager;
  }

  update(pos: THREE.Vector3) {
    const posXZ = new THREE.Vector3(pos.x, 0, pos.z);

    // Round to the nearest tile
    const baseTilePos = posXZ.clone();
    baseTilePos.divideScalar(TILE_SIZE);
    baseTilePos.round();
    baseTilePos.multiplyScalar(TILE_SIZE);

    const newTiles: {[key: string]: StreamingTile} = {};
    const oldTiles = this.#tiles_;

    for (let x = -NUM_TILES; x <= NUM_TILES; x++) {
        for (let z = -NUM_TILES; z <= NUM_TILES; z++) {
            const offset = new THREE.Vector3(x, 0, z);
            offset.multiplyScalar(TILE_SIZE);

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
                tile.load(tilePos, state);
                this.add(tile);
                newTiles[key] = tile;
            }
        }
    }

    for (let k in oldTiles) {
        this.#tileDataCache_[k] = oldTiles[k].getState();
        oldTiles[k].dispose();
    }

    this.#tiles_ = newTiles;

    this.updateMeshes();
  }

  updateMeshes() {
    for (const key in this.#tiles_) {
      const tile = this.#tiles_[key];
      if (tile.children.length > 0) {
        const group = tile.children[0] as THREE.Group;
        group.children.forEach(child => {
          const mesh = child as THREE.Mesh;
          if (mesh.userData.physicsBody) {
            const body = mesh.userData.physicsBody as CANNON.Body;
            mesh.position.copy(body.position as any).sub(group.position);
            mesh.quaternion.copy(body.quaternion as any);
          }
        });
      }
    }
  }
};

export { StreamingWorld };
