import * as THREE from "three";
import { Component } from "../Component";
import { Entity } from "../Entity";

export class MinimapComponent extends Component {
  private minimapContainer: HTMLDivElement;
  private minimapCanvas: HTMLCanvasElement;
  private minimapCtx: CanvasRenderingContext2D;
  private rotatingContainer: HTMLDivElement;
  private minimapSize: number = 200; // Size of the minimap in pixels
  private worldSize: number = 100; // Size of the world area to show in world units
  private baseWorldSize: number = 100; // Base world size for zoom calculations
  private entityMarkers: Map<Entity, { element: HTMLDivElement; color: string; nameLabel?: HTMLDivElement }> = new Map();
  private mainEntityMarker: HTMLDivElement;
  private viewCone: SVGElement;
  private modeIndicator: HTMLDivElement;
  private currentMainEntity: Entity | null = null;
  private lastRotation: number = 0; // Track last rotation to smooth transitions
  private isBirdEyeMode: boolean = false; // Track if we're in bird eye mode
  private isFPSMode: boolean = false; // Track if we're in FPS mode
  private lastMinimapRotation: number = 0; // Track minimap rotation for smoothing
  private currentZoomLevel: number = 1; // Current zoom level for smooth transitions
  private lastCameraHeight: number = 10; // Track camera height for zoom

  constructor() {
    super();
    this._componentname = "MinimapComponent";
  }

  async InitComponent(entity: Entity): Promise<void> {
    await super.InitComponent(entity);
    this.createMinimapUI();
    this.setupEntityTracking();
  }

  private createMinimapUI(): void {
    // Create minimap container
    this.minimapContainer = document.createElement("div");
    this.minimapContainer.id = "minimap-container";
    this.minimapContainer.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      width: ${this.minimapSize}px;
      height: ${this.minimapSize + 30}px;
      background: rgba(0, 0, 0, 0.8);
      border: 2px solid #444;
      border-radius: 10px;
      z-index: 1000;
      overflow: hidden;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
    `;

    // Create canvas for background grid (offset by mode indicator height)
    this.minimapCanvas = document.createElement("canvas");
    this.minimapCanvas.width = this.minimapSize;
    this.minimapCanvas.height = this.minimapSize;
    this.minimapCanvas.style.cssText = `
      position: absolute;
      top: 30px;
      left: 0;
      width: 100%;
      height: ${this.minimapSize}px;
    `;
    this.minimapCtx = this.minimapCanvas.getContext("2d")!;

    // Create rotating container for minimap content
    this.rotatingContainer = document.createElement("div");
    this.rotatingContainer.id = "minimap-rotating-container";
    this.rotatingContainer.style.cssText = `
      position: absolute;
      top: 30px;
      left: 0;
      width: ${this.minimapSize}px;
      height: ${this.minimapSize}px;
      transform-origin: center center;
    `;

    // Create main entity marker (triangle pointing forward)
    this.mainEntityMarker = document.createElement("div");
    this.mainEntityMarker.style.cssText = `
      position: absolute;
      width: 0;
      height: 0;
      border-left: 6px solid transparent;
      border-right: 6px solid transparent;
      border-bottom: 12px solid #00ff00;
      transform: translate(-50%, -50%);
      z-index: 10;
      filter: drop-shadow(0 0 3px rgba(0, 255, 0, 0.8));
    `;

    // Create view cone to show where the player is looking
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.style.cssText = `
      position: absolute;
      width: 120px;
      height: 120px;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      z-index: 8;
      pointer-events: none;
      overflow: visible;
    `;
    
    const cone = document.createElementNS("http://www.w3.org/2000/svg", "path");
    // Fixed cone path: pointing upward (forward direction) instead of downward
    cone.setAttribute("d", "M 60 60 L 30 10 A 30 30 0 0 1 90 10 Z");
    cone.setAttribute("fill", "rgba(0, 255, 0, 0.3)");
    cone.setAttribute("stroke", "rgba(0, 255, 0, 0.6)");
    cone.setAttribute("stroke-width", "2");
    
    // Add a gradient for better visibility
    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    const gradient = document.createElementNS("http://www.w3.org/2000/svg", "radialGradient");
    gradient.setAttribute("id", "coneGradient");
    gradient.setAttribute("cx", "50%");
    gradient.setAttribute("cy", "100%");
    gradient.setAttribute("r", "50%");
    
    const stop1 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
    stop1.setAttribute("offset", "0%");
    stop1.setAttribute("stop-color", "rgba(0, 255, 0, 0.4)");
    
    const stop2 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
    stop2.setAttribute("offset", "100%");
    stop2.setAttribute("stop-color", "rgba(0, 255, 0, 0.1)");
    
    gradient.appendChild(stop1);
    gradient.appendChild(stop2);
    defs.appendChild(gradient);
    
    svg.appendChild(defs);
    cone.setAttribute("fill", "url(#coneGradient)");
    
    svg.appendChild(cone);
    this.viewCone = svg;

    // Append rotating elements to the rotating container
    this.rotatingContainer.appendChild(this.minimapCanvas);
    this.rotatingContainer.appendChild(this.viewCone);
    this.rotatingContainer.appendChild(this.mainEntityMarker);

    // Append containers to main minimap container
    this.minimapContainer.appendChild(this.rotatingContainer);
    
    // Add mode indicator at the top
    this.modeIndicator = document.createElement("div");
    this.modeIndicator.id = "minimap-mode-indicator";
    this.modeIndicator.style.cssText = `
      position: absolute;
      top: 5px;
      left: 5px;
      right: 5px;
      height: 20px;
      background: rgba(0, 100, 200, 0.8);
      color: white;
      font-size: 10px;
      text-align: center;
      line-height: 20px;
      border-radius: 3px;
      z-index: 30;
      font-family: monospace;
    `;
    this.modeIndicator.textContent = "Entity Mode";
    this.minimapContainer.appendChild(this.modeIndicator);
    
    document.body.appendChild(this.minimapContainer);

    this.drawBackground();
  }

  private drawBackground(): void {
    const ctx = this.minimapCtx;
    const size = this.minimapSize;
    
    // Clear canvas
    ctx.clearRect(0, 0, size, size);
    
    // Draw background
    ctx.fillStyle = "rgba(20, 30, 40, 0.9)";
    ctx.fillRect(0, 0, size, size);
    
    // Draw grid
    ctx.strokeStyle = "rgba(100, 100, 100, 0.3)";
    ctx.lineWidth = 1;
    
    const gridSpacing = size / 10; // 10x10 grid
    for (let i = 0; i <= 10; i++) {
      const pos = i * gridSpacing;
      
      // Vertical lines
      ctx.beginPath();
      ctx.moveTo(pos, 0);
      ctx.lineTo(pos, size);
      ctx.stroke();
      
      // Horizontal lines
      ctx.beginPath();
      ctx.moveTo(0, pos);
      ctx.lineTo(size, pos);
      ctx.stroke();
    }
    
    // Draw center cross
    ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
    ctx.lineWidth = 2;
    const center = size / 2;
    
    // Vertical center line
    ctx.beginPath();
    ctx.moveTo(center, center - 10);
    ctx.lineTo(center, center + 10);
    ctx.stroke();
    
    // Horizontal center line
    ctx.beginPath();
    ctx.moveTo(center - 10, center);
    ctx.lineTo(center + 10, center);
    ctx.stroke();
  }

  private setupEntityTracking(): void {
    // Track when main entity changes - use a safer approach
    setTimeout(() => {
      const entityManager = this._entity._entityManager;
      if (entityManager && entityManager._mc) {
        // Poll for main entity changes and camera mode
        setInterval(() => {
          const mainEntity = entityManager._mc.MainEntity;
          if (mainEntity !== this.currentMainEntity) {
            this.currentMainEntity = mainEntity;
            // Reset smoothing when entity changes
            this.lastRotation = 0;
            this.lastMinimapRotation = 0;
            this.updateMainEntityMarker();
          }
          
          // Check camera modes more frequently for better responsiveness
          const uiManager = entityManager._mc.UIManager;
          const newBirdEyeMode = uiManager && uiManager.birdviewnavigation;
          const newFPSMode = uiManager && uiManager.fpsnavigation;
          
          // Reset smoothing when mode changes
          if (newBirdEyeMode !== this.isBirdEyeMode || newFPSMode !== this.isFPSMode) {
            this.lastRotation = 0;
            this.lastMinimapRotation = 0;
          }
          
          this.isBirdEyeMode = newBirdEyeMode;
          this.isFPSMode = newFPSMode;
        }, 50); // More frequent updates for better responsiveness
      } else {
        // Fallback: try to find the main entity from existing entities
        setInterval(() => {
          if (entityManager && entityManager.Entities) {
            // Look for the first character entity as main entity
            const characterEntity = entityManager.Entities.find(entity => 
              entity.name.toLowerCase().includes('hamza') || 
              entity.getComponent('CharacterComponent')
            );
            if (characterEntity && characterEntity !== this.currentMainEntity) {
              this.currentMainEntity = characterEntity;
              // Reset smoothing when entity changes
              this.lastRotation = 0;
              this.lastMinimapRotation = 0;
              this.updateMainEntityMarker();
            }
          }
        }, 100);
      }
    }, 1000); // Wait 1 second for everything to initialize
  }

  private worldToMinimap(worldPos: THREE.Vector3, centerPos: THREE.Vector3): { x: number; y: number } {
    // Convert world coordinates to minimap coordinates relative to center position
    const relativeX = worldPos.x - centerPos.x;
    const relativeZ = worldPos.z - centerPos.z;
    
    // Scale to minimap size
    const scale = this.minimapSize / this.worldSize;
    const centerOffset = this.minimapSize / 2;
    
    return {
      x: centerOffset + (relativeX * scale),
      y: centerOffset - (relativeZ * scale) // Invert Z for top-down view
    };
  }

  private getCenterPosition(): THREE.Vector3 {
    const entityManager = this._entity._entityManager;
    
    if ((this.isBirdEyeMode || this.isFPSMode) && this.currentMainEntity) {
      // In bird eye mode and FPS mode, center on main entity
      return this.currentMainEntity.Position;
    } else if (entityManager && entityManager._mc && entityManager._mc.camera) {
      // In navigation mode, center on camera position
      return entityManager._mc.camera.position;
    }
    
    // Fallback to origin
    return new THREE.Vector3(0, 0, 0);
  }

  private getEntityColor(entity: Entity): string {
    // Generate colors based on entity type or name
    if (entity.name.toLowerCase().includes('bob')) return '#4a90e2';
    if (entity.name.toLowerCase().includes('hamza')) return '#e24a4a';
    if (entity.name.toLowerCase().includes('car')) return '#ffa500';
    if (entity.name.toLowerCase().includes('music')) return '#9a4ae2';
    if (entity.name.toLowerCase().includes('ui')) return '#4ae29a';
    
    // Default random color based on entity ID
    const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#dda0dd', '#98d8c8'];
    return colors[entity.id % colors.length];
  }

  private createEntityMarker(entity: Entity): HTMLDivElement {
    const marker = document.createElement("div");
    const color = this.getEntityColor(entity);
    
    marker.style.cssText = `
      position: absolute;
      width: 8px;
      height: 8px;
      background: ${color};
      border: 1px solid rgba(255, 255, 255, 0.8);
      border-radius: 50%;
      transform: translate(-50%, -50%);
      z-index: 5;
      transition: all 0.1s ease;
      cursor: pointer;
      filter: drop-shadow(0 0 2px ${color});
    `;
    
    // Create name label for the entity
    const nameLabel = document.createElement("div");
    nameLabel.textContent = entity.name;
    nameLabel.style.cssText = `
      position: absolute;
      bottom: 12px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 10px;
      white-space: nowrap;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.3s ease;
      z-index: 20;
      font-family: monospace;
    `;
    marker.appendChild(nameLabel);
    
    // Add hover effect and click functionality
    marker.addEventListener('mouseenter', () => {
      marker.style.transform = 'translate(-50%, -50%) scale(1.5)';
      marker.style.zIndex = '15';
      
      // Show entity name tooltip
      const tooltip = document.createElement('div');
      tooltip.textContent = entity.name;
      tooltip.style.cssText = `
        position: absolute;
        bottom: 120%;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.9);
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        white-space: nowrap;
        pointer-events: none;
        z-index: 20;
      `;
      marker.appendChild(tooltip);
    });
    
    marker.addEventListener('mouseleave', () => {
      marker.style.transform = 'translate(-50%, -50%) scale(1)';
      marker.style.zIndex = '5';
      
      // Remove tooltip
      const tooltip = marker.querySelector('div');
      if (tooltip) {
        marker.removeChild(tooltip);
      }
    });
    
    marker.addEventListener('click', () => {
      // Focus camera on this entity
      const entityManager = this._entity._entityManager;
      if (entityManager && entityManager._mc) {
        const characterComponent = entity.getComponent('CharacterComponent');
        if (characterComponent && typeof (characterComponent as any).face === 'function') {
          (characterComponent as any).face();
        } else {
          entityManager._mc.zoomTo(entity.Position.clone(), 10);
        }
      }
    });
    
    this.entityMarkers.set(entity, { element: marker, color, nameLabel });
    this.rotatingContainer.appendChild(marker);
    
    return marker;
  }

  private updateMainEntityMarker(): void {
    if (!this.currentMainEntity) return;
    
    const centerPos = this.getCenterPosition();
    
    // Update dynamic zoom based on camera height
    this.updateDynamicZoom();
    
    // Apply minimap rotation
    const minimapRotation = this.getMinimapRotation();
    let smoothedRotation = minimapRotation;
    
    // Smooth rotation to avoid jumps
    let angleDiff = minimapRotation - this.lastMinimapRotation;
    if (angleDiff > 180) {
      angleDiff -= 360;
    } else if (angleDiff < -180) {
      angleDiff += 360;
    }
    smoothedRotation = this.lastMinimapRotation + angleDiff * 0.8;
    this.lastMinimapRotation = smoothedRotation;
    
    // Apply rotation to the rotating container
    this.rotatingContainer.style.transform = `rotate(${smoothedRotation}deg)`;
    
    if (this.isBirdEyeMode || this.isFPSMode) {
      // In bird eye mode and FPS mode, main entity is always at center
      this.mainEntityMarker.style.left = "50%";
      this.mainEntityMarker.style.top = "50%";
      
      // Position view cone at the same location as the marker (center)
      this.viewCone.style.left = "50%";
      this.viewCone.style.top = "50%";
      
      // Let player marker and cone rotate to show facing direction (no minimap rotation)
      const entityRotation = this.getEntityRotation();
      this.mainEntityMarker.style.transform = `translate(-50%, -50%) rotate(${entityRotation}deg)`;
      this.viewCone.style.transform = `translate(-50%, -50%) rotate(${entityRotation}deg)`;
    } else {
      // In navigation mode, position main entity relative to camera
      const entityMinimapPos = this.worldToMinimap(this.currentMainEntity.Position, centerPos);
      
      // Check if entity is within minimap bounds
      const isVisible = entityMinimapPos.x >= 0 && entityMinimapPos.x <= this.minimapSize &&
                       entityMinimapPos.y >= 0 && entityMinimapPos.y <= this.minimapSize;
      
      if (isVisible) {
        this.mainEntityMarker.style.left = `${entityMinimapPos.x}px`;
        this.mainEntityMarker.style.top = `${entityMinimapPos.y}px`;
        this.mainEntityMarker.style.display = 'block';
        
        // Position view cone at entity location with relative rotation
        const entityRotation = this.getEntityRotation();
        let relativeRotation = entityRotation - smoothedRotation;
        
        // Normalize angle to -180 to 180 range
        if (relativeRotation > 180) {
          relativeRotation -= 360;
        } else if (relativeRotation < -180) {
          relativeRotation += 360;
        }
        
        this.viewCone.style.transform = `translate(-50%, -50%) rotate(${relativeRotation}deg)`;
        this.viewCone.style.left = `${entityMinimapPos.x}px`;
        this.viewCone.style.top = `${entityMinimapPos.y}px`;
      } else {
        this.mainEntityMarker.style.display = 'none';
        this.viewCone.style.display = 'none';
        return;
      }
    }
    
    // Ensure view cone is visible
    this.viewCone.style.display = 'block';
    
    // Update main entity marker rotation (relative to minimap rotation)
    if (this.isFPSMode || this.isBirdEyeMode) {
      // Rotation already applied above for FPS and Bird Eye modes
    } else {
      const entityRotation = this.getEntityRotation();
      let relativeEntityRotation = entityRotation - smoothedRotation;
      
      // Normalize angle to -180 to 180 range
      if (relativeEntityRotation > 180) {
        relativeEntityRotation -= 360;
      } else if (relativeEntityRotation < -180) {
        relativeEntityRotation += 360;
      }
      
      this.mainEntityMarker.style.transform = `translate(-50%, -50%) rotate(${relativeEntityRotation}deg)`;
    }
  }

  private updateDynamicZoom(): void {
    const entityManager = this._entity._entityManager;
    if (!entityManager || !entityManager._mc || !entityManager._mc.camera) return;
    
    const camera = entityManager._mc.camera;
    const cameraHeight = camera.position.y;
    
    // Calculate zoom level based on camera height (higher = zoom out more)
    // Base zoom: height 10 = zoom 1x, height 50 = zoom 5x, etc.
    const targetZoomLevel = Math.max(0.5, Math.min(10, cameraHeight / 10));
    
    // Smooth zoom transition
    let zoomDiff = targetZoomLevel - this.currentZoomLevel;
    this.currentZoomLevel += zoomDiff * 0.1; // Smooth interpolation
    
    // Update world size based on zoom level
    this.worldSize = this.baseWorldSize * this.currentZoomLevel;
    
    // Store last camera height for reference
    this.lastCameraHeight = cameraHeight;
  }

  private updateEntityNameVisibility(): void {
    // Show/hide entity names based on zoom level
    const showNames = this.currentZoomLevel <= 2; // Show names when zoomed in
    const nameOpacity = Math.max(0, Math.min(1, (2 - this.currentZoomLevel) / 1.5));
    
    // Get current minimap rotation to counter-rotate text
    const minimapRotation = this.lastMinimapRotation;
    
    for (const [_entity, markerData] of this.entityMarkers.entries()) {
      if (markerData.nameLabel) {
        markerData.nameLabel.style.opacity = showNames ? nameOpacity.toString() : '0';
        // Counter-rotate the text to keep it upright
        markerData.nameLabel.style.transform = `translateX(-50%) rotate(${-minimapRotation}deg)`;
      }
    }
  }

  private getEntityRotation(): number {
    if (!this.currentMainEntity) return 0;
    
    // Get rotation from quaternion - using a more stable approach
    const quat = this.currentMainEntity.Quaternion;
    
    // Convert quaternion to forward direction vector
    const forward = new THREE.Vector3(0, 0, 1);
    forward.applyQuaternion(quat);
    
    // Calculate angle from forward vector (atan2 gives us the angle in the XZ plane)
    let rotationDegrees = Math.atan2(forward.x, forward.z) * (180 / Math.PI);
    
    // Only add 180 degrees for navigation mode to fix the opposite direction issue
    // In FPS mode, don't add the offset since the cone should point in the actual forward direction
    if (!this.isFPSMode && !this.isBirdEyeMode) {
      rotationDegrees += 180;
    }
    
    // Ensure angle is positive (0-360 range)
    if (rotationDegrees < 0) {
      rotationDegrees += 360;
    } else if (rotationDegrees >= 360) {
      rotationDegrees -= 360;
    }
    
    // Smooth rotation to avoid jumps
    let angleDiff = rotationDegrees - this.lastRotation;
    if (angleDiff > 180) {
      angleDiff -= 360;
    } else if (angleDiff < -180) {
      angleDiff += 360;
    }
    
    // Apply smoothing
    const smoothedRotation = this.lastRotation + angleDiff * 0.8;
    this.lastRotation = smoothedRotation;
    
    return smoothedRotation;
  }

  private getMinimapRotation(): number {
    const entityManager = this._entity._entityManager;
    
    if (this.isFPSMode || this.isBirdEyeMode) {
      // In FPS and Bird Eye modes, don't rotate the minimap - keep it static
      return 0;
    } else if (entityManager && entityManager._mc && entityManager._mc.camera) {
      // In navigation mode, rotate minimap with camera
      const camera = entityManager._mc.camera;
      const cameraDirection = new THREE.Vector3();
      camera.getWorldDirection(cameraDirection);
      
      let rotationDegrees = Math.atan2(cameraDirection.x, cameraDirection.z) * (180 / Math.PI);
      
      // Invert rotation so camera direction points up on minimap
      return -rotationDegrees;
    }
    
    return 0; // No rotation
  }

  private updateEntityMarkers(): void {
    const entityManager = this._entity._entityManager;
    if (!entityManager || !entityManager.Entities) return;
    
    const centerPos = this.getCenterPosition();
    
    // Update existing markers and create new ones
    for (const entity of entityManager.Entities) {
      if (entity === this.currentMainEntity && (this.isBirdEyeMode || this.isFPSMode)) continue; // Skip main entity in bird eye and FPS modes since it's always centered
      if (!entity.alive) continue;
      
      let markerData = this.entityMarkers.get(entity);
      if (!markerData) {
        // Create new marker for new entity
        this.createEntityMarker(entity);
        markerData = this.entityMarkers.get(entity);
      }
      
      if (markerData) {
        const minimapPos = this.worldToMinimap(entity.Position, centerPos);
        
        // Check if entity is within minimap bounds
        const isVisible = minimapPos.x >= 0 && minimapPos.x <= this.minimapSize &&
                         minimapPos.y >= 0 && minimapPos.y <= this.minimapSize;
        
        if (isVisible) {
          markerData.element.style.left = `${minimapPos.x}px`;
          markerData.element.style.top = `${minimapPos.y}px`;
          markerData.element.style.display = 'block';
        } else {
          markerData.element.style.display = 'none';
        }
      }
    }
    
    // Update entity name visibility based on zoom
    this.updateEntityNameVisibility();
    
    // Remove markers for destroyed entities
    for (const [entity, markerData] of this.entityMarkers.entries()) {
      if (!entity.alive || !entityManager.Entities.includes(entity)) {
        markerData.element.remove();
        this.entityMarkers.delete(entity);
      }
    }
  }

  async Update(_deltaTime: number): Promise<void> {
    this.updateMainEntityMarker();
    this.updateEntityMarkers();
    this.updateModeIndicator();
  }

  async Destroy(): Promise<void> {
    // Clean up all markers
    for (const [_entity, markerData] of this.entityMarkers.entries()) {
      markerData.element.remove();
    }
    this.entityMarkers.clear();
    
    // Remove minimap container
    if (this.minimapContainer && this.minimapContainer.parentNode) {
      this.minimapContainer.parentNode.removeChild(this.minimapContainer);
    }
    
    await super.Destroy();
  }

  // Public methods for customization
  public setWorldSize(size: number): void {
    this.worldSize = size;
  }

  public setMinimapSize(size: number): void {
    this.minimapSize = size;
    if (this.minimapContainer) {
      this.minimapContainer.style.width = `${size}px`;
      this.minimapContainer.style.height = `${size}px`;
      this.minimapCanvas.width = size;
      this.minimapCanvas.height = size;
      this.drawBackground();
    }
  }

  public setViewConeSize(width: number, height: number): void {
    if (this.viewCone) {
      const cone = this.viewCone.querySelector('path');
      if (cone) {
        // Update the SVG path to create a cone with specified width and height
        const centerX = 60;
        const centerY = 60;
        const halfWidth = width / 2;
        const pathData = `M ${centerX} ${centerY} L ${centerX - halfWidth} ${centerY - height} A ${halfWidth} ${halfWidth} 0 0 1 ${centerX + halfWidth} ${centerY - height} Z`;
        cone.setAttribute("d", pathData);
      }
    }
  }

  public setViewConeColor(color: string, opacity: number = 0.2): void {
    if (this.viewCone) {
      const cone = this.viewCone.querySelector('path');
      if (cone) {
        cone.setAttribute("fill", `rgba(${this.hexToRgb(color)}, ${opacity})`);
        cone.setAttribute("stroke", `rgba(${this.hexToRgb(color)}, ${Math.min(opacity * 2, 1)})`);
      }
    }
  }

  public setViewConeAngle(degrees: number): void {
    if (this.viewCone) {
      const cone = this.viewCone.querySelector('path');
      if (cone) {
        const centerX = 60;
        const centerY = 60;
        const radius = 50;
        const halfAngle = (degrees * Math.PI) / 360; // Convert to radians and halve
        
        const leftX = centerX - Math.sin(halfAngle) * radius;
        const leftY = centerY - Math.cos(halfAngle) * radius;
        const rightX = centerX + Math.sin(halfAngle) * radius;
        const rightY = centerY - Math.cos(halfAngle) * radius;
        
        const largeArcFlag = degrees > 180 ? 1 : 0;
        const pathData = `M ${centerX} ${centerY} L ${leftX} ${leftY} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${rightX} ${rightY} Z`;
        cone.setAttribute("d", pathData);
      }
    }
  }

  private hexToRgb(hex: string): string {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (result) {
      return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
    }
    return "0, 255, 0"; // Default to green
  }

  public toggleVisibility(): void {
    if (this.minimapContainer) {
      const isVisible = this.minimapContainer.style.display !== 'none';
      this.minimapContainer.style.display = isVisible ? 'none' : 'block';
    }
  }

  private updateModeIndicator(): void {
    if (this.modeIndicator) {
      if (this.isFPSMode) {
        this.modeIndicator.textContent = "FPS Mode";
        this.modeIndicator.style.background = "rgba(200, 100, 0, 0.8)"; // Orange for FPS mode
      } else if (this.isBirdEyeMode) {
        this.modeIndicator.textContent = "Bird Eye Mode";
        this.modeIndicator.style.background = "rgba(0, 150, 0, 0.8)"; // Green for bird eye mode
      } else {
        this.modeIndicator.textContent = "Navigation Mode";
        this.modeIndicator.style.background = "rgba(0, 100, 200, 0.8)"; // Blue for navigation mode
      }
    }
  }
}
