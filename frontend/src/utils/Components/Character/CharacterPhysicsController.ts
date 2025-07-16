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

  // Left leg physics tracking
  private leftLegPhysicsBox: CANNON.Body;
  private leftLegBone: THREE.Bone;

  private _entity: Entity;
  private _model: THREE.Object3D;

  constructor(entity: Entity, model: THREE.Object3D = null) {
    this._entity = entity;
    this._model = model;
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

  setupLeftLegPhysicsBox() {
    if (!this._model) {
      console.log("Model not available for left leg physics box setup");
      return;
    }

 

    // Find the mixamorigLeftLeg bone
    this._model.traverse((child: any) => {
      if (child.isSkinnedMesh && child.skeleton) {
        child.skeleton.bones.forEach((bone: THREE.Bone) => {
          if (bone.name === "mixamorigRightToeBase") {
            this.leftLegBone = bone;
            console.log("Found mixamorigLeftLeg bone:", bone.name);
          }
        });
      }
    });

    if (!this.leftLegBone) {
      console.warn("mixamorigLeftLeg bone not found!");
      return;
    }

    // Create physics box shape
    const boxSize = new CANNON.Vec3(0.1, 0.2, 0.1); // width, height, depth
    const boxShape = new CANNON.Box(boxSize);

    // Create physics body
    this.leftLegPhysicsBox = new CANNON.Body({
      mass: 0,
      material: new CANNON.Material({ friction: 0.3, restitution: 0.1 }),
    });
    this.leftLegPhysicsBox.addShape(boxShape);
    //disable collision with the character body
    this.leftLegPhysicsBox.collisionFilterGroup = 0; // Disable collision with everything
    this.leftLegPhysicsBox.collisionFilterMask = 0; // Disable collision with everything
    this.leftLegPhysicsBox.allowSleep = true; // Allow the box to sleep when not in use

    // Get bone world position and set physics box position
    const boneWorldPosition = new THREE.Vector3();
    this.leftLegBone.getWorldPosition(boneWorldPosition);
    this.leftLegPhysicsBox.position.set(
      boneWorldPosition.x,
      boneWorldPosition.y,
      boneWorldPosition.z
    );



     if (this.body.world) {
       this.body.world.addBody(this.leftLegPhysicsBox);
     } else {
       console.warn("World not available to add left leg physics box");
     }
  }

  updateLeftLegPhysicsBox() {
    if (!this.leftLegPhysicsBox || !this.leftLegBone) {
      return;
    }

    // Update physics box position to follow the bone
    const boneWorldPosition = new THREE.Vector3();
    this.leftLegBone.getWorldPosition(boneWorldPosition);

    this.leftLegPhysicsBox.position.set(
      boneWorldPosition.x,
      boneWorldPosition.y,
      boneWorldPosition.z
    );

    // Update rotation to match bone
    const boneWorldQuaternion = new THREE.Quaternion();
    this.leftLegBone.getWorldQuaternion(boneWorldQuaternion);
    this.leftLegPhysicsBox.quaternion.set(
      boneWorldQuaternion.x,
      boneWorldQuaternion.y,
      boneWorldQuaternion.z,
      boneWorldQuaternion.w
    );
  }

  private isRotationDisabled(currentState?: string): boolean {
    if (!currentState) return false;
    
    // Disable rotation during landing and falling states
    const disabledStates = ['Landing', 'Falling'];
    return disabledStates.includes(currentState);
  }

  updatePhysics(
    deltaTime: number, 
    controlObject: THREE.Object3D, 
    input: any, 
    acceleration: number,
    currentState?: string
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

    // Check if character is in a state where rotation should be disabled
    const canRotate = !this.isRotationDisabled(currentState);

    if (input._keys.left && canRotate) {
      _A.set(0, 1, 0);
      _Q.setFromAxisAngle(
        _A,
        4.0 * Math.PI * deltaTime * this.acceleration_.y
      );
      _R.multiply(_Q);
    }

    if (input._keys.right && canRotate) {
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
    // Update left leg physics box if it exists
    if (this.leftLegPhysicsBox) {
      this.updateLeftLegPhysicsBox();
    }
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
    // Cleanup left leg physics box
    if (this.leftLegPhysicsBox && this._entity._entityManager?._mc?.physicsmanager?.world) {
      this._entity._entityManager._mc.physicsmanager.world.removeBody(this.leftLegPhysicsBox);
      this.leftLegPhysicsBox = null;
    }
    this.leftLegBone = null;

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

  // Public method to get the left leg physics box for external access
  public getLeftLegPhysicsBox(): CANNON.Body | null {
    return this.leftLegPhysicsBox || null;
  }
}
