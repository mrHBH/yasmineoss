import * as THREE from "three";
import { Entity } from "../../Entity";

export class CharacterVehicleController {
  
  // Vehicle related properties
  public isDriving: boolean = false;
  public vehicle: any;
  public carcomponent: any;

  // Callbacks for external systems
  public onMounting: () => void;
  public onUnmounting: () => void;
  public onRemovePhysicsBody: () => void;
  public onAddPhysicsBody: () => void;
  public onSetPosition: (position: THREE.Vector3) => void;
  public onSetPhysicsPosition: (position: THREE.Vector3) => void;
  public onGetAnimationDuration: () => number;

  constructor(_entity: Entity) {
    // Store entity reference for potential future use
  }

  async mountVehicle(vehicle: any): Promise<boolean> {
    if (this.isDriving) {
      console.log("Already driving");
      return false;
    }

    this.vehicle = vehicle;
    this.carcomponent = vehicle;

    try {
      // Remove physics body from world
      if (this.onRemovePhysicsBody) {
        this.onRemovePhysicsBody();
      }

      this.isDriving = true;

      // Get the door and its position
      if (this.vehicle) {
        const door = this.vehicle.carChassis.getObjectByName("DriverDoor");
        const doorPosition = new THREE.Vector3();
        door.updateMatrixWorld(true);
        door.getWorldPosition(doorPosition);

        // Set entity position
        if (this.onSetPosition) {
          this.onSetPosition(new THREE.Vector3(
            doorPosition.x,
            doorPosition.y,
            doorPosition.z
          ));
        }

        // Set physics position (elevated)
        if (this.onSetPhysicsPosition) {
          this.onSetPhysicsPosition(new THREE.Vector3(
            doorPosition.x,
            doorPosition.y + 20,
            doorPosition.z
          ));
        }

        // Handle door animations
        const animationDuration = this.onGetAnimationDuration ? this.onGetAnimationDuration() : 2000;
        
        setTimeout(() => {
          this.vehicle.closeDoor();
        }, animationDuration - 800);

        setTimeout(() => {
          this.vehicle.openDoor();
        }, 400);
      }

      // Trigger mounting callback
      if (this.onMounting) {
        this.onMounting();
      }

      return true;
    } catch (error) {
      console.error("Error mounting vehicle:", error);
      this.isDriving = false;
      return false;
    }
  }

  async unmountVehicle(): Promise<boolean> {
    if (!this.isDriving || !this.vehicle) {
      console.log("Not currently driving");
      return false;
    }

    try {
      const door = this.vehicle.carChassis.getObjectByName("DriverDoor");
      if (door) {
        const doorQuaternion = door.getWorldQuaternion(new THREE.Quaternion());
        doorQuaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), doorQuaternion.y - Math.PI / 2);
        
        const doorPosition = new THREE.Vector3();
        door.updateMatrixWorld(true);
        door.getWorldPosition(doorPosition);

        // Calculate exit position
        const exitPosition = doorPosition.clone().add(
          new THREE.Vector3(2, 0, 0).applyQuaternion(doorQuaternion)
        );

        // Set entity position
        if (this.onSetPosition) {
          this.onSetPosition(exitPosition);
        }

        // Set physics position
        if (this.onSetPhysicsPosition) {
          this.onSetPhysicsPosition(exitPosition);
        }

        // Add physics body back to world
        if (this.onAddPhysicsBody) {
          this.onAddPhysicsBody();
        }

        this.isDriving = false;

        // Handle door animations
        const animationDuration = this.onGetAnimationDuration ? this.onGetAnimationDuration() : 2000;
        
        setTimeout(() => {
          this.vehicle.closeDoor();
        }, animationDuration - 1700);

        setTimeout(() => {
          this.vehicle.openDoor();
        }, 900);
      }

      // Trigger unmounting callback
      if (this.onUnmounting) {
        this.onUnmounting();
      }

      return true;
    } catch (error) {
      console.error("Error unmounting vehicle:", error);
      return false;
    }
  }

  getCurrentVehicle() {
    return this.vehicle;
  }

  isCurrentlyDriving(): boolean {
    return this.isDriving;
  }

  updateVehiclePositioning(animationState: string, entity: any, webgpuGroup: THREE.Group) {
    if (animationState === "Driving" || animationState === "Unmounting") {
      // Position the player on the vehicle
      const offset = new THREE.Vector3(0.1, -0.75, 0.5);
      webgpuGroup.position.copy(this.vehicle._entity.Position);
      webgpuGroup.quaternion.copy(this.vehicle._entity.Quaternion);
      offset.applyQuaternion(this.vehicle._entity.Quaternion);
      webgpuGroup.position.add(offset);
      webgpuGroup.rotateY(-Math.PI / 2);
      entity.Position = webgpuGroup.position;
      entity.Quaternion = webgpuGroup.quaternion;
    }

    if (animationState === "Mounting") {
      const offset = new THREE.Vector3(0.1, -1.25, 0.9);
      webgpuGroup.position.copy(this.vehicle._entity.Position);
      webgpuGroup.quaternion.copy(this.vehicle._entity.Quaternion);
      offset.applyQuaternion(this.vehicle._entity.Quaternion);
      webgpuGroup.position.add(offset);
      webgpuGroup.rotateY(Math.PI);
      entity.Position = webgpuGroup.position;
      entity.Quaternion = webgpuGroup.quaternion;
    }
  }

  checkForMountingInput(input: any, animationState: string): boolean {
    return !!(input._keys.attack1 && this.vehicle &&
      animationState !== "Driving" &&
      animationState !== "Mounting");
  }

  checkForUnmountingInput(input: any): boolean {
    return !!(input?._keys.attack1 && this.vehicle);
  }

  destroy() {
    // Clean up vehicle references
    this.vehicle = null;
    this.carcomponent = null;
    this.isDriving = false;
  }
}
