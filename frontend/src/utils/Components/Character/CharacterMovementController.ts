import * as THREE from "three";
import { Entity } from "../../Entity";

export class CharacterMovementController {
  private _entity: Entity;
  public taskintervals: NodeJS.Timeout[] = [];
  public arrows: THREE.ArrowHelper[] = [];

  constructor(entity: Entity) {
    this._entity = entity;
  }

  StepToPosition(locationposition: THREE.Vector3): boolean {
    // Steps to position, if position is reached returns true
    const controlObject = new THREE.Object3D();
    controlObject.position.copy(this._entity.Position);
    controlObject.quaternion.copy(this._entity.Quaternion);
    controlObject.lookAt(locationposition);
    const distance = controlObject.position.distanceTo(locationposition);
    
    // Rotation
    const targetDirection = new THREE.Vector3()
      .subVectors(locationposition, this._entity.Position)
      .normalize();
    const currentDirection = new THREE.Vector3(0, 0, 1).applyQuaternion(
      this._entity.Quaternion
    );
    const crossProduct = new THREE.Vector3().crossVectors(
      currentDirection,
      targetDirection
    );
    const deadZone = 0.05;

    if (distance > 1) {
      try {
        // Set movement keys based on distance and state
        if (distance > 8) {
          // Use shift for faster movement
          return this.handleLongDistanceMovement(crossProduct, deadZone, controlObject, locationposition);
        } else {
          return this.handleShortDistanceMovement(crossProduct, deadZone);
        }
      } catch (error) {
        console.log(error);
        return false;
      }
    } else {
      return this.stopMovement();
    }
  }

  private handleLongDistanceMovement(
    crossProduct: THREE.Vector3, 
    deadZone: number, 
    controlObject: THREE.Object3D, 
    locationposition: THREE.Vector3
  ): boolean {
    if (crossProduct.y < -deadZone) {
      // Needs to turn right
      this.setMovementInput({ right: true, left: false, forward: true });
    } else if (crossProduct.y > deadZone) {
      // Needs to turn left
      this.setMovementInput({ right: false, left: true, forward: true });
    } else {
      // Within the dead zone, maintain current direction
      const deviation = controlObject.quaternion.angleTo(this._entity.Quaternion);
      if (Math.abs(deviation) > 1) {
        this.setMovementInput({ left: true, right: false, forward: true });
      } else {
        this.setMovementInput({ left: false, right: false, forward: true });
        return this.handlePreciseDirection(controlObject, locationposition, deadZone);
      }
    }
    return false;
  }

  private handleShortDistanceMovement(crossProduct: THREE.Vector3, deadZone: number): boolean {
    if (crossProduct.y < -deadZone) {
      this.setMovementInput({ right: true, left: false, forward: true });
    } else if (crossProduct.y > deadZone) {
      this.setMovementInput({ right: false, left: true, forward: true });
    } else {
      this.setMovementInput({ left: false, right: false, forward: true });
    }
    return false;
  }

  private handlePreciseDirection(
    controlObject: THREE.Object3D, 
    locationposition: THREE.Vector3, 
    deadZone: number
  ): boolean {
    const targetDirection = new THREE.Vector3()
      .subVectors(locationposition, controlObject.position)
      .normalize();
    const currentDirection = new THREE.Vector3(0, 0, 1).applyQuaternion(
      this._entity.Quaternion
    );
    const crossProduct = new THREE.Vector3().crossVectors(
      currentDirection,
      targetDirection
    );

    try {
      if (crossProduct.y < -deadZone) {
        this.setMovementInput({ right: true, left: false });
      } else if (crossProduct.y > deadZone) {
        this.setMovementInput({ right: false, left: true });
      } else {
        const deviation = controlObject.quaternion.angleTo(this._entity.Quaternion);
        if (Math.abs(deviation) > 1) {
          this.setMovementInput({ left: true, right: false });
        } else {
          this.setMovementInput({ left: false, right: false });
        }
        return false;
      }
    } catch (error) {
      console.log(error);
    }
    return false;
  }

  private stopMovement(): boolean {
    try {
      this.setMovementInput({ 
        shift: false, 
        forward: false, 
        left: false, 
        right: false 
      });
      return true;
    } catch (error) {
      console.log(error);
      return false;
    }
  }

  private setMovementInput(input: { [key: string]: boolean }) {
    // This will be connected to the main character component's input system
    if (this.onInputUpdate) {
      this.onInputUpdate(input);
    }
  }

  async walkToPos(locationPosition: THREE.Vector3, timeout = 20000): Promise<boolean | string> {
    return new Promise((resolve, _reject) => {
      // Clear any existing intervals
      if (this.taskintervals) {
        for (let i = 0; i < this.taskintervals.length; i++) {
          clearInterval(this.taskintervals[i]);
          // Remove all arrows
          for (let j = 0; j < this.arrows.length; j++) {
            if (this.onRemoveArrow) {
              this.onRemoveArrow(this.arrows[j]);
            }
          }
        }
      }

      // Create visual arrow indicator
      let arrow = new THREE.ArrowHelper(
        new THREE.Vector3(0, -1, 0), 
        locationPosition.clone().add(new THREE.Vector3(0, 1, 0)), 
        1, 
        0xff0000, 
        1.0, 
        0.65
      );

      // Style the arrow
      let material = new THREE.MeshStandardMaterial({
        color: 0xff0000,
        emissive: 0xff0000,
        emissiveIntensity: 0.5,
        roughness: 0.5,
        metalness: 0.5,
      });
      arrow.cone.material = material;
      arrow.castShadow = true;
      arrow.receiveShadow = true;
      this.arrows.push(arrow);

      if (this.onAddArrow) {
        this.onAddArrow(arrow);
      }

      // Setup the interval to check position
      const interval = setInterval(() => {
        locationPosition.y = this._entity.Position.y;
        const controlObject = new THREE.Object3D();
        controlObject.position.copy(this._entity.Position);
        controlObject.quaternion.copy(this._entity.Quaternion);
        controlObject.lookAt(locationPosition);
        const distance = controlObject.position.distanceTo(locationPosition);

        const targetDirection = new THREE.Vector3()
          .subVectors(locationPosition, this._entity.Position)
          .normalize();
        const currentDirection = new THREE.Vector3(0, 0, 1).applyQuaternion(this._entity.Quaternion);
        const crossProduct = new THREE.Vector3().crossVectors(currentDirection, targetDirection);
        const deadZone = 0.05;

        if (distance > 0.1) {
          try {
            const currentState = this.getCurrentState ? this.getCurrentState() : "Ideling";
            const isWalkingOrRunning = (currentState === "Walking" || currentState === "Running");
            
            this.setMovementInput({ shift: isWalkingOrRunning && distance > 8 });

            if (crossProduct.y < -deadZone) {
              this.setMovementInput({ right: true, left: false });
            } else if (crossProduct.y > deadZone) {
              this.setMovementInput({ right: false, left: true });
            } else {
              const deviation = controlObject.quaternion.angleTo(this._entity.Quaternion);
              if (Math.abs(deviation) > 1) {
                this.setMovementInput({ left: true, right: false });
              } else {
                this.setMovementInput({ left: false, right: false });
              }
            }
            this.setMovementInput({ forward: true });
          } catch (error) {
            console.error("Error during walking logic:", error);
          }
        } else {
          // Target reached, stop and resolve
          if (this.onRemoveArrow) {
            this.onRemoveArrow(arrow);
          }

          clearInterval(interval);
          this.setMovementInput({ 
            shift: false, 
            forward: false, 
            left: false, 
            right: false 
          });
          resolve(true);
        }
      }, 5);

      this.taskintervals.push(interval);

      // Setup the timeout
      setTimeout(() => {
        // If it is the last interval; then reset the keys
        if (this.taskintervals.length == 1) {
          this.setMovementInput({ 
            shift: false, 
            forward: false, 
            left: false, 
            right: false 
          });
        }
        clearInterval(interval);
        resolve('Timeout reached before reaching the target position');
      }, timeout);
    });
  }

  clearAllIntervals() {
    if (this.taskintervals) {
      for (let i = 0; i < this.taskintervals.length; i++) {
        clearInterval(this.taskintervals[i]);
      }
      // Remove all arrows
      for (let i = 0; i < this.arrows.length; i++) {
        if (this.onRemoveArrow) {
          this.onRemoveArrow(this.arrows[i]);
        }
      }
      this.taskintervals = [];
      this.arrows = [];
    }
  }

  // Callback hooks for external systems
  public onInputUpdate: (input: { [key: string]: boolean }) => void;
  public onAddArrow: (arrow: THREE.ArrowHelper) => void;
  public onRemoveArrow: (arrow: THREE.ArrowHelper) => void;
  public getCurrentState: () => string;

  destroy() {
    this.clearAllIntervals();
  }
}
