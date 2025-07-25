import { Component } from "../Component";
import * as THREE from "three";
import { Entity } from "../Entity";
import { CSSHybridObject } from "../CSSHybrid";
import { tween } from "shifty";
import * as CANNON from "cannon-es";

class HybridUIComponent extends Component {
  private _html: string;
  private _cssHybridObject: CSSHybridObject;
  private _webgpuplane: THREE.Mesh;
  private _htmlElement: HTMLElement;
  private _hybridGroup: THREE.Group = new THREE.Group();
  private _webgpugroup: THREE.Group = new THREE.Group();
  private _size: THREE.Vector2;
  private _zoomThreshold: number;
  private _physicsBody: CANNON.Body | null = null;
  
  sticky: boolean = false;

  constructor(html: string, size?: THREE.Vector2, zoomThreshold?: number) {
    super();
    this._componentname = "HybridUIComponent";
    this._html = html;
    this._size = size ? size : new THREE.Vector2(1500, 1500);
    this._zoomThreshold = zoomThreshold || 8;
  }

  get HtmlElement() {
    return this._htmlElement;
  }
  
  get Size() {
    return this._size;
  }

  get zoomThreshold() {
    return this._zoomThreshold;
  }

  get isIn2DMode() {
    return this._cssHybridObject?.mode === '2d';
  }

  get physicsBody() {
    return this._physicsBody;
  }

  set zoomThreshold(value: number) {
    this._zoomThreshold = value;
    if (this._cssHybridObject) {
      this._cssHybridObject.setZoomThreshold(value);
    }
  }

  set Size(size: THREE.Vector2) {
    this._size = size;
    if (this._htmlElement) {
      this._htmlElement.style.height = this._size.y + "px";
      this._htmlElement.style.width = this._size.x + "px";
    }
    if (this._webgpuplane) {
      this._webgpuplane.geometry = new THREE.PlaneGeometry(
        this._size.x / 100,
        this._size.y / 100
      );
    }
    
    // Update physics body size to match new plane size
    if (this._physicsBody) {
      const physicsWidth = this._size.x / 100;
      const physicsHeight = this._size.y / 100;
      const physicsThickness = 0.1;
      
      const mc = this._entity?._entityManager?._mc;
      if (mc?.physicsmanager) {
        mc.physicsmanager.World.removeBody(this._physicsBody);
        
        // Create new shape with correct dimensions
        const shape = new CANNON.Box(new CANNON.Vec3(
          physicsWidth / 2,   // X-axis (width)
          physicsHeight / 2,  // Y-axis (height)
          physicsThickness / 2 // Z-axis (thickness)
        ));
        
        this._physicsBody.shapes = [shape];
        this.updatePhysicsBodyTransform();
        mc.physicsmanager.World.addBody(this._physicsBody);
      }
    }
  }

  async InitComponent(entity: Entity): Promise<void> {
    this._entity = entity;
    this._htmlElement = document.createElement("div");
    this._htmlElement.innerHTML = this._html;
    
    // Styling
    this._htmlElement.style.height = this._size.y + "px";
    this._htmlElement.style.width = this._size.x + "px";

    // Create hybrid object
    this._cssHybridObject = new CSSHybridObject(this._htmlElement, {
      zoomThreshold: this._zoomThreshold,
      transitionDuration: 1,
      enableAutoSwitch: true // Always enable auto-switch, can be controlled via setAutoSwitch
    });
    
    // Scale for 3D mode
    this._cssHybridObject.scale.set(0.01, 0.01, 0.01);
    this._hybridGroup.add(this._cssHybridObject);

    // Create WebGL plane for depth testing
    const planeMaterial = new THREE.MeshLambertMaterial();
    planeMaterial.color.set("black");
    planeMaterial.opacity = 0;
    planeMaterial.blending = THREE.NoBlending;
    planeMaterial.transparent = false;
    planeMaterial.side = THREE.DoubleSide;
    
    this._webgpuplane = new THREE.Mesh(
      new THREE.PlaneGeometry(
        this._size.x / 100,
        this._size.y / 100
      ),
      planeMaterial
    );

    this._webgpuplane.userData.component = this;
    this._webgpugroup.add(this._webgpuplane);

    // Create physics body aligned with the plane
    this.createPhysicsBody();
  }

  async InitEntity(): Promise<void> {
    // Get or create hybrid renderer
    const mc = this._entity._entityManager._mc;
    
    // Add physics body to world
    if (this._physicsBody && mc.physicsmanager) {
      mc.physicsmanager.World.addBody(this._physicsBody);
    }
  
    // Add to scenes
    mc.webglscene.add(this._webgpugroup);
    mc.htmlScene.add(this._hybridGroup);
    
    // Register event handlers
    this._entity._RegisterHandler("zoom", async () => {
      await this.zoom();
    });

    this._entity._RegisterHandler("setSize", async (data: any) => {
      if (data?.size) {
        await this.setSizeSmoothly(data.size as THREE.Vector2);
      }
    });

    this._entity._RegisterHandler("doubleClick", async () => {
      await this.toggleMode();
    });

    this._entity._RegisterHandler("toggleMode", async () => {
      await this.toggleMode();
    });
  }

  public async toggleMode(): Promise<void> {
    if (this._cssHybridObject) {
      const oldMode = this._cssHybridObject.mode;
      await this._cssHybridObject.toggleMode();
      const newMode = this._cssHybridObject.mode;
      
      console.log(`🔄 HybridUIComponent mode switched: ${oldMode} → ${newMode}`);
      if (newMode === '2d') {
        console.log('📺 2D mode is now DOMINANT - all 3D elements will be frozen');
      } else {
        console.log('🎮 3D mode active - normal 3D rendering when no 2D elements exist');
      }
      
      // Update HTML element size after mode change
      setTimeout(() => this.updateHtmlElementSize(), 100);
    }
  }

  public async forceMode(mode: '2d' | '3d'): Promise<void> {
    if (this._cssHybridObject) {
      const oldMode = this._cssHybridObject.mode;
      await this._cssHybridObject.switchMode(mode, true);
      
      console.log(`🎯 HybridUIComponent mode forced: ${oldMode} → ${mode}`);
      if (mode === '2d') {
        console.log('📺 2D mode is now DOMINANT - all 3D elements will be frozen');
      } else if (mode === '3d') {
        console.log('🎮 3D mode forced - normal 3D rendering when no 2D elements exist');
      }
      
      // Update HTML element size after mode change
      setTimeout(() => this.updateHtmlElementSize(), 100);
    }
  }

  public getCurrentMode(): string {
    return this._cssHybridObject?.mode || '3d';
  }

  public getAutoSwitchEnabled(): boolean {
    return this._cssHybridObject?.enableAutoSwitch || false;
  }

  public getCloneElement(): HTMLElement | null {
    return this._cssHybridObject?.element || null;
  }

  public syncElementContent(): void {
    // No longer needed with a single element
  }

  public setAutoSwitch(enabled: boolean): void {
    if (this._cssHybridObject) {
      this._cssHybridObject.setAutoSwitch(enabled);
    }
  }

  async zoom(radius = 5) {
    await this.zoomTo(this._entity.Position.clone(), radius, this._entity.Quaternion.clone());
  }

  async zoomTo(
    p: THREE.Vector3,
    newRadius?: number,
    quat?: THREE.Quaternion
  ): Promise<void> {
    const _centerPosition = new THREE.Vector3();
    const _normal = new THREE.Vector3();
    const _cameraPosition = new THREE.Vector3();

    if (newRadius && quat) {
      const rectCenterPosition = _centerPosition.copy(p);
      const rectNormal = _normal.set(0, 0, 1).applyQuaternion(quat);
      const distance = newRadius;
      const cameraPosition = _cameraPosition
        .copy(rectNormal)
        .multiplyScalar(distance)
        .add(rectCenterPosition);

      this._entity._entityManager._mc.CameraControls.setLookAt(
        cameraPosition.x,
        cameraPosition.y,
        cameraPosition.z,
        rectCenterPosition.x,
        rectCenterPosition.y,
        rectCenterPosition.z,
        true
      );
    } else {
      this._entity._entityManager._mc.CameraControls.moveTo(p.x, p.y, p.z, true);
    }
  }

  async setSizeSmoothly(size: THREE.Vector2) {
    console.log("setSizeSmoothly");
    console.log(size);
    this._size = size;

    // Update physics body size
    if (this._physicsBody) {
      const physicsWidth = this._size.x / 100;
      const physicsHeight = this._size.y / 100;
      const physicsThickness = 0.1;
      
      // Remove old body and create new one with new size
      const mc = this._entity._entityManager._mc;
      if (mc.physicsmanager) {
        mc.physicsmanager.World.removeBody(this._physicsBody);
        
        // Create new shape with correct axis mapping (X=width, Y=height, Z=thickness)
        const shape = new CANNON.Box(new CANNON.Vec3(
          physicsWidth / 2,   // X-axis (width)
          physicsHeight / 2,  // Y-axis (height)
          physicsThickness / 2 // Z-axis (thickness)
        ));
        
        this._physicsBody.shapes = [shape];
        this.updatePhysicsBodyTransform();
        mc.physicsmanager.World.addBody(this._physicsBody);
      }
    }

    // Animate both elements
    const animate3D = tween({
      from: {
        x: this._htmlElement.clientWidth,
        y: this._htmlElement.clientHeight,
      },
      to: { x: size.x, y: size.y },
      duration: 1500,
      easing: "easeOutQuad",
      render: (state: any) => {
        this._htmlElement.style.height = state.y + "px";
        this._htmlElement.style.width = state.x + "px";
      },
    });

    // Animate WebGL plane
    tween({
      from: { x: this._webgpuplane.scale.x, y: this._webgpuplane.scale.y },
      to: { x: this._size.x / 100, y: this._size.y / 100 },
      duration: 1500,
      easing: "easeOutQuad",
      render: (state: any) => {
        this._webgpuplane.scale.set(state.x, state.y, 1);
      },
    });

    await animate3D;
  }

  private createPhysicsBody(): void {
    // Create a physics box that matches the plane dimensions
    const physicsWidth = this._size.x / 100; // Same as plane width
    const physicsHeight = this._size.y / 100; // Same as plane height
    const physicsThickness = 0.1; // Small thickness for the ground
    
    // Create box shape (half extents) - match Three.js plane orientation
    // Three.js plane is in XY plane, so physics box should be: width(X), height(Y), thickness(Z)
    const shape = new CANNON.Box(new CANNON.Vec3(
      physicsWidth / 2,   // X-axis (width)
      physicsHeight / 2,  // Y-axis (height) 
      physicsThickness / 2 // Z-axis (thickness)
    ));
    
    // Create static body
    this._physicsBody = new CANNON.Body({
      mass: 0, // Static body
      shape: shape,
      type: CANNON.Body.STATIC,
      material: new CANNON.Material('hybridUIMaterial')
    });
    
    // Set initial position and rotation to match entity
    this.updatePhysicsBodyTransform();
  }

  private updatePhysicsBodyTransform(): void {
    if (!this._physicsBody) return;
    
    const position = this._entity.Position;
    const quaternion = this._entity.Quaternion;
    
    // Set physics body position and rotation to match entity
    this._physicsBody.position.set(position.x, position.y, position.z);
    this._physicsBody.quaternion.set(quaternion.x, quaternion.y, quaternion.z, quaternion.w);
  }

  private calculateVisiblePlaneSize(): { width: number, height: number } {
    if (!this._entity || !this._entity._entityManager) {
      return { width: this._size.x, height: this._size.y };
    }

    const camera = this._entity._entityManager._mc.camera;
    const renderer = this._entity._entityManager._mc.webglrenderer;
    
    if (!camera || !renderer) {
      return { width: this._size.x, height: this._size.y };
    }

    // Get screen dimensions
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;

    // Get the plane's actual 3D size
    const planeWidth3D = this._size.x / 100; // Convert from pixels to 3D units
    const planeHeight3D = this._size.y / 100;

    // Project 3D plane size to screen space
    const tempVector = new THREE.Vector3();
    const tempVector2 = new THREE.Vector3();
    
    // Calculate the screen-space size of the plane
    // Use the plane's corner points to determine screen coverage
    const planeCorner1 = new THREE.Vector3(-planeWidth3D/2, -planeHeight3D/2, 0)
      .applyQuaternion(this._entity.Quaternion)
      .add(this._entity.Position);
    const planeCorner2 = new THREE.Vector3(planeWidth3D/2, planeHeight3D/2, 0)
      .applyQuaternion(this._entity.Quaternion)
      .add(this._entity.Position);

    // Project to screen coordinates
    tempVector.copy(planeCorner1).project(camera);
    tempVector2.copy(planeCorner2).project(camera);

    // Convert normalized device coordinates to screen pixels
    const screenX1 = (tempVector.x + 1) * screenWidth / 2;
    const screenY1 = (-tempVector.y + 1) * screenHeight / 2;
    const screenX2 = (tempVector2.x + 1) * screenWidth / 2;
    const screenY2 = (-tempVector2.y + 1) * screenHeight / 2;

    // Calculate screen-space dimensions
    const screenSpaceWidth = Math.abs(screenX2 - screenX1);
    const screenSpaceHeight = Math.abs(screenY2 - screenY1);

    // Clamp to screen dimensions to prevent overflow
    const maxWidth = screenWidth * 0.95; // Leave 5% margin
    const maxHeight = screenHeight * 0.95;

    return {
      width: Math.min(screenSpaceWidth, maxWidth),
      height: Math.min(screenSpaceHeight, maxHeight)
    };
  }

  private updateHtmlElementSize(): void {
    if (!this._cssHybridObject || !this._htmlElement) return;

    // Only dynamically resize in 2D mode
    if (this._cssHybridObject.mode === '2d') {
      const visibleSize = this.calculateVisiblePlaneSize();
      
      // Only update if there's a significant change to avoid constant resizing
      const currentWidth = parseInt(this._htmlElement.style.width) || this._size.x;
      const currentHeight = parseInt(this._htmlElement.style.height) || this._size.y;
      
      const widthDiff = Math.abs(visibleSize.width - currentWidth);
      const heightDiff = Math.abs(visibleSize.height - currentHeight);
      
      // Update only if change is significant (more than 10 pixels)
      if (widthDiff > 10 || heightDiff > 10) {
        // Ensure minimum size to maintain usability
        const minWidth = Math.min(this._size.x * 0.5, 300);
        const minHeight = Math.min(this._size.y * 0.5, 200);
        
        const finalWidth = Math.max(visibleSize.width, minWidth);
        const finalHeight = Math.max(visibleSize.height, minHeight);
        
        // Update HTML element size to match visible plane size
        this._htmlElement.style.width = `${finalWidth}px`;
        this._htmlElement.style.height = `${finalHeight}px`;
        
        // Ensure the element maintains its visual quality
        this._htmlElement.style.transformOrigin = 'center center';
        
        // Add a subtle transition for smoother resizing
        this._htmlElement.style.transition = 'width 0.2s ease-out, height 0.2s ease-out';
      }
    } else {
      // In 3D mode, use the original size and remove transitions
      this._htmlElement.style.width = `${this._size.x}px`;
      this._htmlElement.style.height = `${this._size.y}px`;
      this._htmlElement.style.transition = '';
    }
  }

  async Update(_deltaTime: number): Promise<void> {
    // Update positions for all groups
    const position = this._entity.Position;
    const quaternion = this._entity.Quaternion;

    this._webgpugroup?.position.set(position.x, position.y, position.z);
    this._webgpugroup?.quaternion.set(quaternion.x, quaternion.y, quaternion.z, quaternion.w);
    
    // Don't set transform on the hybrid group since CSSHybridObject handles its own transform
    this._hybridGroup?.position.set(0, 0, 0);
    this._hybridGroup?.quaternion.set(0, 0, 0, 1);

    // IMPORTANT: Update the CSSHybridObject's position and quaternion to match the entity
    if (this._cssHybridObject) {
      this._cssHybridObject.position.set(position.x, position.y, position.z);
      this._cssHybridObject.quaternion.set(quaternion.x, quaternion.y, quaternion.z, quaternion.w);
      this._cssHybridObject.updateMatrixWorld(false); // Force matrix update
    }

    // Update physics body transform to match entity
    this.updatePhysicsBodyTransform();

    // Update HTML element size based on camera distance and mode
    this.updateHtmlElementSize();

    // Handle opacity based on distance (if not sticky)
    if (!this.sticky && this._cssHybridObject) {
      const camera = this._entity._entityManager._mc.camera;
      
      // Calculate orthogonal distance for consistency with mode switching
      const cameraPos = new THREE.Vector3().setFromMatrixPosition(camera.matrixWorld);
      const objectPos = position.clone();
      const objectNormal = new THREE.Vector3(0, 0, 1).applyQuaternion(quaternion).normalize();
      const objectToCamera = cameraPos.clone().sub(objectPos);
      const orthogonalDistance = Math.abs(objectToCamera.dot(objectNormal));
      
      const fadeDistance = this._zoomThreshold * 2.5;
      
      if (orthogonalDistance > fadeDistance) {
        const activeElement = this._cssHybridObject.element;
        activeElement.style.opacity = "0";
        activeElement.style.pointerEvents = "none";
      } else {
        const activeElement = this._cssHybridObject.element;
        if (!this._cssHybridObject.isTransitioning) {
          activeElement.style.opacity = "1";
          activeElement.style.pointerEvents = "auto";
        }
      }
    }

    // Render hybrid scene
    const mc = this._entity._entityManager._mc;
    if (mc.htmlRenderer && mc.htmlScene) {
      mc.htmlRenderer.render(mc.htmlScene, mc.camera);
    }
  }

 

  async Destroy(): Promise<void> {
    // Remove physics body from world
    if (this._physicsBody && this._entity._entityManager._mc.physicsmanager) {
      this._entity._entityManager._mc.physicsmanager.World.removeBody(this._physicsBody);
      this._physicsBody = null;
    }

    // Clean up all elements and groups
    if (this._hybridGroup.parent) {
      this._hybridGroup.parent.remove(this._hybridGroup);
    }
    if (this._webgpugroup.parent) {
      this._webgpugroup.parent.remove(this._webgpugroup);
    }

    // Remove HTML elements
    if (this._htmlElement.parentNode) {
      this._htmlElement.parentNode.removeChild(this._htmlElement);
    }
  }
}

export { HybridUIComponent };
