import { Component } from "../Component";
import * as THREE from "three";
import { Entity } from "../Entity";
import { CSSHybridObject } from "../CSSHybrid";
import { tween } from "shifty";

class HybridUIComponent extends Component {
  private _html: string;
  private _cssHybridObject: CSSHybridObject;
  private _webgpuplane: THREE.Mesh;
  private _htmlElement: HTMLElement;
  private _hybridGroup: THREE.Group = new THREE.Group();
  private _webgpugroup: THREE.Group = new THREE.Group();
  private _size: THREE.Vector2;
  private _zoomThreshold: number;
  
  sticky: boolean = false;

  constructor(html: string, size?: THREE.Vector2, zoomThreshold?: number) {
    super();
    this._componentname = "HybridUIComponent";
    this._html = html;
    this._size = size ? size : new THREE.Vector2(1500, 1500);
    this._zoomThreshold = zoomThreshold || 8;
  }

  get htmlElement() {
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
  }

  async InitEntity(): Promise<void> {
    // Get or create hybrid renderer
    const mc = this._entity._entityManager._mc;
    
  
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
      await this._cssHybridObject.toggleMode();
    }
  }

  public async forceMode(mode: '2d' | '3d'): Promise<void> {
    if (this._cssHybridObject) {
      await this._cssHybridObject.switchMode(mode, true);
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
    let p = this._entity.Position.clone();
    let quat = this._entity.Quaternion.clone();
    this._entity._entityManager._mc.zoomTo(p, radius, quat);
  }

  async setSizeSmoothly(size: THREE.Vector2) {
    console.log("setSizeSmoothly");
    console.log(size);
    this._size = size;

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

  async Update(_deltaTime: number): Promise<void> {
    // Update positions for all groups
    const position = this._entity.Position;
    const quaternion = this._entity.Quaternion;

    this._webgpugroup?.position.set(position.x, position.y, position.z);
    this._webgpugroup?.quaternion.set(quaternion.x, quaternion.y, quaternion.z, quaternion.w);
    
    this._hybridGroup?.position.set(position.x, position.y, position.z);
    this._hybridGroup?.quaternion.set(quaternion.x, quaternion.y, quaternion.z, quaternion.w);

    // Debug: Log distance occasionally for auto-switching debugging
    if (this._cssHybridObject && Math.random() < 0.005) { // Log 0.5% of the time
      const camera = this._entity._entityManager._mc.camera;
      const distance = position.distanceTo(camera.position);
      console.log(`🎯 HybridUI Debug - Distance: ${distance.toFixed(2)}, Threshold: ${this._zoomThreshold}, Mode: ${this._cssHybridObject.mode}, AutoSwitch: ${this._cssHybridObject.enableAutoSwitch}`);
    }

    // Update mode display periodically
    if (this._cssHybridObject && Math.random() < 0.02) { // Update 2% of the time
      this.updateModeDisplay();
    }

    // Handle opacity based on distance (if not sticky)
    if (!this.sticky && this._cssHybridObject) {
      const camera = this._entity._entityManager._mc.camera;
      const distance = position.distanceTo(camera.position);
      const fadeDistance = this._zoomThreshold * 2.5;
      
      if (distance > fadeDistance) {
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

  private updateModeDisplay(): void {
    if (!this._cssHybridObject) return;

    const autoSwitchStatus = this._cssHybridObject.enableAutoSwitch ? 'ON' : 'OFF';
    const modeText = `Current Mode: ${this._cssHybridObject.mode.toUpperCase()} (Auto-Switch: ${autoSwitchStatus})`;

    // Update main element
    const modeDisplay = this._htmlElement.querySelector('#mode-display');
    if (modeDisplay) {
      modeDisplay.textContent = modeText;
    }
  }

  async Destroy(): Promise<void> {
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
