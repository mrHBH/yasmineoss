import * as THREE from "three";
import * as CANNON from "cannon-es";
import { Entity } from "../../Entity";

export class CharacterPhysicsController {
  public body: CANNON.Body;
  public canJump: boolean = true;
  public isColliding_: boolean = false;
  public acceleration_: THREE.Vector3;
  public decceleration_: THREE.Vector3;
  public velocity_: THREE.Vector3;

  private _entity: Entity;

  constructor(entity: Entity) {
    this._entity = entity;
    this.decceleration_ = new THREE.Vector3(-0.005, -0.001, -7.0);
    this.acceleration_ = new THREE.Vector3(1, 0.125, 5.0);
    this.velocity_ = new THREE.Vector3(0, 0, 0);

    this.setupPhysicsBody();
    this.setupCollisionDetection();
  }

  private setupPhysicsBody() {
    const colliderShape = new CANNON.Sphere(0.24);
    const colliderShapeTop = new CANNON.Cylinder(0.1, 0.1, 0.9, 8);

    this.body = new CANNON.Body({
      mass: 50,
      allowSleep: false,
      material: new CANNON.Material({ friction: 336.0, restitution: 0.0 }),
    });
    
    this.body.addShape(colliderShape, new CANNON.Vec3(0, 0.24, 0.2));
    this.body.addShape(colliderShapeTop, new CANNON.Vec3(0, 1.2, 0));
    
    // Set initial position
    this.body.position.set(
      this._entity.Position.x,
      this._entity.Position.y,
      this._entity.Position.z
    );
    this.body.quaternion.setFromEuler(
      this._entity.Quaternion.x,
      this._entity.Quaternion.y,
      this._entity.Quaternion.z
    );

    this.body.linearDamping = 0.9;
    this.body.angularFactor.set(0, 1, 0);
    this.body.fixedRotation = true;
  }

  private setupCollisionDetection(): void {
    this.body.addEventListener("collide", (event) => {
      const contact = event.contact;

      // Ensure we're detecting collision on the character's body
      if (contact.bi === this.body || contact.bj === this.body) {
        // Get the collision normal (like in the original code)
        const contactNormal = new CANNON.Vec3();
        if (contact.bi.id === this.body.id) {
          contact.ni.negate(contactNormal);
        } else {
          contactNormal.copy(contact.ni);
        }
        
        // Check for wall collision
        let forwardDirection: CANNON.Vec3 = new CANNON.Vec3(0, 0, -1);
        this.body.quaternion.vmult(forwardDirection, forwardDirection);
        const angle = contactNormal.dot(forwardDirection);

        if (angle < -0.9) { // Collision is in front if the angle is close to -1
          this.isColliding_ = true;
        } else {
          this.isColliding_ = false;
        }

        // Check if this is a ground collision for jumping (using same logic as original)
        const upAxis = new CANNON.Vec3(0, 1, 0);
        if (contactNormal.dot(upAxis) > 0.7) {
          this.canJump = true;
        }
      }
    });
  }

  updatePhysics(
    deltaTime: number, 
    controlObject: THREE.Object3D, 
    input: any, 
    acceleration: number
  ): void {
    if (!input) return;
    const velocity = this.velocity_;
    const frameDecceleration = new THREE.Vector3(
      velocity.x * this.decceleration_.x,
      velocity.y * this.decceleration_.y,
      velocity.z * this.decceleration_.z
    );
    frameDecceleration.multiplyScalar(deltaTime);
    frameDecceleration.z =
      Math.sign(frameDecceleration.z) *
      Math.min(Math.abs(frameDecceleration.z), Math.abs(velocity.z));

    velocity.add(frameDecceleration);

    const _Q = new THREE.Quaternion();
    const _A = new THREE.Vector3();
    const _R = controlObject.quaternion.clone();

    const acc = this.acceleration_.clone();
    this.body.quaternion.set(
      controlObject.quaternion.x,
      controlObject.quaternion.y,
      controlObject.quaternion.z,
      controlObject.quaternion.w
    );
    acc.multiplyScalar(acceleration);

    if (input._keys.left) {
      _A.set(0, 1, 0);
      _Q.setFromAxisAngle(
        _A,
        4.0 * Math.PI * deltaTime * this.acceleration_.y
      );
      _R.multiply(_Q);
    }

    if (input._keys.right) {
      _A.set(0, 1, 0);
      _Q.setFromAxisAngle(
        _A,
        4.0 * -Math.PI * deltaTime * this.acceleration_.y
      );
      _R.multiply(_Q);
    }

    if (input._keys.forward) {
      velocity.z += acc.z * deltaTime;
    }

    if (input._keys.backward) {
      velocity.z -= acc.z * deltaTime;
    }

    controlObject.quaternion.copy(_R);

    const forward = new THREE.Vector3(0, 0, 1);
    forward.applyQuaternion(controlObject.quaternion);
    forward.normalize();

    const forwardDir = forward.clone().multiplyScalar(Math.sign(velocity.z));

    const sideways = new THREE.Vector3(1, 0, 0);
    sideways.applyQuaternion(controlObject.quaternion);
    sideways.normalize();

    sideways.multiplyScalar(velocity.x * deltaTime);
    forward.multiplyScalar(velocity.z * deltaTime);

    this.body.velocity.x = ((forwardDir.x * acc.z) / this.body.mass) * 10;
    this.body.velocity.z = ((forwardDir.z * acc.z) / this.body.mass) * 10;

    // Check if not current front collision
    if (!this.body.collisionResponse) {
      this.isColliding_ = false;
    }

    // Update entity position from physics body
    controlObject.position.set(
      this.body.position.x,
      this.body.position.y,
      this.body.position.z
    );

    this._entity.Position = controlObject.position;
    this._entity.Quaternion = controlObject.quaternion;
  }

  jump(force: number = 5, delay: number = 750) {
    if (this.canJump) {
      this.canJump = false;
      setTimeout(() => {
        this.body.velocity.y = force;
      }, delay);
    }
  }

  setPosition(position: THREE.Vector3) {
    this.body.position.set(position.x, position.y, position.z);
  }

  setQuaternion(quaternion: THREE.Quaternion) {
    this.body.quaternion.set(quaternion.x, quaternion.y, quaternion.z, quaternion.w);
  }

  addToWorld(world: CANNON.World) {
    world.addBody(this.body);
  }

  removeFromWorld(world: CANNON.World) {
    world.removeBody(this.body);
  }

  destroy() {
    // Cleanup physics body if needed
    if (this.body) {
      // Remove event listeners
      this.body.removeEventListener("collide", this.setupCollisionDetection);
      this.body = null;
    }
  }

  public isInAir(): boolean {
    // Check if character has significant downward velocity and can't jump
    return !this.canJump ;
  }

  public isOnGround(): boolean {
    // Character is on ground if they can jump and have minimal vertical velocity
    return this.canJump 
  }

  resetPhysicsBody(target_position: THREE.Vector3, duration: number = 0.5) {
    console.log("Resetting physics body position to match mesh world position");
    // Reset physics body position to match the mesh's actual world position with lerp

    // Store the starting position
    const startPosition = new THREE.Vector3(
      this.body.position.x,
      this.body.position.y,
      this.body.position.z
    );

    const startTime = performance.now();

    const lerpPosition = () => {
      const elapsedTime = (performance.now() - startTime) / 1000; // Convert to seconds
      const t = Math.min(elapsedTime / duration, 1); // Clamp t between 0 and 1

      // Lerp between start and target positions
      const currentPosition = new THREE.Vector3().lerpVectors(startPosition, target_position, t);

      this.body.position.set(
        currentPosition.x,
        currentPosition.y,
        currentPosition.z
      );

      // Continue lerping if not finished
      if (t < 1) {
        requestAnimationFrame(lerpPosition);
      }
    };

    // Start the lerp animation
    lerpPosition();

    // Also reset velocity to prevent unwanted movement
    // this.body.velocity.set(0, 0, 0);
    // this.body.angularVelocity.set(0, 0, 0);
  }
}
