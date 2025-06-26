import * as THREE from "three";
import { CharacterAnimationManager } from "./CharacterAnimationManager";
import { CharacterPhysicsController } from "./CharacterPhysicsController";

export class CharacterFSMController {
  private animationManager: CharacterAnimationManager;
  private physicsController: CharacterPhysicsController;

  constructor(animationManager: CharacterAnimationManager, physicsController: CharacterPhysicsController) {
    this.animationManager = animationManager;
    this.physicsController = physicsController;
  }

  updateFSM(input: any): string {
    if (!input._keys || !this.animationManager) {
      return this.animationManager?.getCurrentState() || "Ideling";
    }

    const currentState = this.animationManager.getCurrentState();

    // Jump logic
    if (input._keys.space && currentState == "Ideling" && this.physicsController.canJump) {
      this.animationManager.sendEvent("JUMP");
      this.physicsController.jump(5, 750);
    }

    if (input._keys.space &&
      (currentState == "Walking" || currentState == "SlowWalking") &&
      this.physicsController.canJump) {
      this.animationManager.sendEvent("JUMP");
      this.physicsController.jump(5, 150);
    }

    if (input._keys.space && currentState == "Running" && this.physicsController.canJump) {
      this.animationManager.sendEvent("JUMP");
      this.physicsController.jump(25, 150);
    }

    // Movement logic
    if (input._keys.forward && this.physicsController.isColliding_) {
      this.animationManager.sendEvent("PUSH");
    }
    if (input._keys.left) {
      this.animationManager.sendEvent("TURNLEFT");
    }
    if (input._keys.right) {
      this.animationManager.sendEvent("TURNRIGHT");
    }
    if (!input._keys.left && !input._keys.right &&
      (currentState == "TurningLeft" || currentState == "TurningRight")) {
      this.animationManager.sendEvent("STOP");
    }

    // Running and walking logic
    if (input._keys.forward && input._keys.shift && currentState == "Walking") {
      this.animationManager.sendEvent("RUN");
    }
    if (input._keys.forward && input._keys.shift && currentState == "Ideling") {
      this.animationManager.sendEvent("SLOWWALK");
    }
    if (input._keys.forward &&
      (currentState == "Ideling" || currentState == "SlowWalking" ||
        currentState == "Pushing" || currentState == "Executing") &&
      !input._keys.shift && !this.physicsController.isColliding_) {
      this.animationManager.sendEvent("WALK");
    } else if (input._keys.forward && currentState !== "Pushing" && this.physicsController.isColliding_) {
      this.animationManager.sendEvent("STOP");
    }

    if (input._keys.forward && currentState == "Pushing" && input._keys.shift) {
      this.animationManager.sendEvent("WALK");
    }

    if (!input._keys.forward && currentState == "Pushing") {
      this.animationManager.sendEvent("STAND");
    }

    if (input._keys.forward && currentState == "Running" && !input._keys.shift) {
      this.animationManager.sendEvent("SLOWDOWN");
    }

    if (!input._keys.forward &&
      (currentState == "Walking" || currentState == "Running" ||
        currentState == "SlowWalking" || currentState == "Pushing")) {
      this.animationManager.sendEvent("STOP");
    }

    if (input._keys.backward) {
      this.animationManager.sendEvent("BACKWARDWALK");
    }
    if (!input._keys.backward && currentState == "BackwardWalking") {
      this.animationManager.sendEvent("STOP");
    }
    if (input._keys.forward && currentState == "Executing") {
      this.animationManager.sendEvent("STOP");
    }

    // Return current state
    return this.animationManager.getCurrentState();
  }

  handlePhysicsStateTransitions(input: any, deltaTime: number, webgpuGroup: THREE.Group): void {
    if (!input) return;

    const currentState = this.animationManager.getCurrentState();
    const acceleration = this.animationManager.getAcceleration(currentState);

    // Update physics
    this.physicsController.updatePhysics(deltaTime, webgpuGroup, input, acceleration);

    // Handle state transitions based on physics
    this.handleFallingLandingTransitions();
    this.handleCollisionTransitions();
  }

  private handleFallingLandingTransitions(): void {
    const currentState = this.animationManager.getCurrentState();

    // Check for falling/landing - but NOT while jumping!
    if (!this.physicsController.canJump &&
      currentState !== "Falling" &&
      !this.animationManager.isInJumpingState()) {
      this.animationManager.sendEvent("FALL");
    } else if (this.physicsController.canJump &&
      currentState === "Falling") {
      this.animationManager.sendEvent("LAND");
    }
  }

  private handleCollisionTransitions(): void {
    const currentState = this.animationManager.getCurrentState();

    // Check for collision pushing
    if (this.physicsController.isColliding_ &&
      currentState !== "Pushing" &&
      currentState !== "Executing" &&
      currentState !== "Kicking") {
      this.animationManager.sendEvent("PUSH");
    }
  }

  getCurrentState(): string {
    return this.animationManager?.getCurrentState() || "Ideling";
  }

  destroy() {
    // No cleanup needed - just references
    this.animationManager = null;
    this.physicsController = null;
  }
}
