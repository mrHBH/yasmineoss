import * as THREE from "three";
import { Entity } from "./Entity.js";

export class Minimap {
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
  private isVisible: boolean = true;
  private entityManager: any; // Reference to entity manager
  private mainController: any; // Reference to main controller

  constructor(entityManager: any, mainController: any) {
    this.entityManager = entityManager;
    this.mainController = mainController;
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
      // Vertical lines
      ctx.beginPath();
      ctx.moveTo(i * gridSpacing, 0);
      ctx.lineTo(i * gridSpacing, size);
      ctx.stroke();
      
      // Horizontal lines
      ctx.beginPath();
      ctx.moveTo(0, i * gridSpacing);
      ctx.lineTo(size, i * gridSpacing);
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
      this.updateMainEntityReference();
      this.trackNavigationModes();
    }, 1000); // Wait 1 second for everything to initialize
  }

  private updateMainEntityReference(): void {
    if (this.mainController && this.mainController.MainEntity) {
      this.currentMainEntity = this.mainController.MainEntity;
    }
  }

  private trackNavigationModes(): void {
    if (this.mainController && this.mainController.UIManager) {
      const uiManager = this.mainController.UIManager;
      this.isFPSMode = !!uiManager.fpsnavigation;
      this.isBirdEyeMode = !!uiManager.birdviewnavigation;
    }
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
      y: centerOffset - (relativeZ * scale) // Invert Z for proper minimap orientation
    };
  }

  private getCenterPosition(): THREE.Vector3 {
    if ((this.isBirdEyeMode || this.isFPSMode) && this.currentMainEntity) {
      return this.currentMainEntity.Position.clone();
    } else if (this.mainController && this.mainController.camera) {
      return this.mainController.camera.position.clone();
    }
    
    // Fallback to origin
    return new THREE.Vector3(0, 0, 0);
  }

  private getEntityColor(entity: Entity): string {
    // Generate colors based on entity type or name
    if (entity.name.toLowerCase().includes('bob')) return '#ff6b6b';
    if (entity.name.toLowerCase().includes('hamza')) return '#4ecdc4';
    if (entity.name.toLowerCase().includes('car')) return '#45b7d1';
    if (entity.name.toLowerCase().includes('music')) return '#96ceb4';
    if (entity.name.toLowerCase().includes('ui')) return '#ffeaa7';
    
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
      marker.style.transform = 'translate(-50%, -50%) scale(1.3)';
      nameLabel.style.opacity = '1';
    });
    
    marker.addEventListener('mouseleave', () => {
      marker.style.transform = 'translate(-50%, -50%) scale(1)';
      nameLabel.style.opacity = '0';
    });
    
    marker.addEventListener('click', () => {
      console.log(`Clicked on entity: ${entity.name}`);
      // You can add camera focusing functionality here
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
    if (angleDiff > 180) angleDiff -= 360;
    else if (angleDiff < -180) angleDiff += 360;
    smoothedRotation = this.lastMinimapRotation + angleDiff * 0.8;
    this.lastMinimapRotation = smoothedRotation;
    
    // Apply rotation to the rotating container
    this.rotatingContainer.style.transform = `rotate(${smoothedRotation}deg)`;
    
    if (this.isBirdEyeMode || this.isFPSMode) {
      // Center the main entity marker
      this.mainEntityMarker.style.left = '50%';
      this.mainEntityMarker.style.top = '50%';
    } else {
      // Position main entity marker based on camera position
      const mainPos = this.worldToMinimap(this.currentMainEntity.Position, centerPos);
      this.mainEntityMarker.style.left = `${mainPos.x}px`;
      this.mainEntityMarker.style.top = `${mainPos.y}px`;
    }
    
    // Ensure view cone is visible
    this.viewCone.style.display = 'block';
    
    // Update main entity marker rotation (relative to minimap rotation)
    if (this.isFPSMode || this.isBirdEyeMode) {
      const entityRotation = this.getEntityRotation();
      this.mainEntityMarker.style.transform = `translate(-50%, -50%) rotate(${entityRotation - smoothedRotation}deg)`;
    } else {
      const entityRotation = this.getEntityRotation();
      this.mainEntityMarker.style.transform = `translate(-50%, -50%) rotate(${entityRotation - smoothedRotation}deg)`;
    }
  }

  private updateDynamicZoom(): void {
    if (!this.mainController || !this.mainController.camera) return;
    
    const camera = this.mainController.camera;
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
    if (rotationDegrees < 0) rotationDegrees += 360;
    else if (rotationDegrees >= 360) rotationDegrees -= 360;
    
    // Smooth rotation to avoid jumps
    let angleDiff = rotationDegrees - this.lastRotation;
    if (angleDiff > 180) angleDiff -= 360;
    else if (angleDiff < -180) angleDiff += 360;
    
    // Apply smoothing
    const smoothedRotation = this.lastRotation + angleDiff * 0.8;
    this.lastRotation = smoothedRotation;
    
    return smoothedRotation;
  }

  private getMinimapRotation(): number {
    if (this.isFPSMode || this.isBirdEyeMode) {
      // For FPS and bird eye mode, rotate the minimap based on entity rotation
      return this.getEntityRotation();
    } else if (this.mainController && this.mainController.camera) {
      // For free camera mode, use camera rotation
      const camera = this.mainController.camera;
      const forward = new THREE.Vector3(0, 0, -1);
      forward.applyMatrix4(camera.matrixWorld);
      forward.sub(camera.position).normalize();
      
      return Math.atan2(forward.x, forward.z) * (180 / Math.PI);
    }
    
    return 0; // No rotation
  }

  private updateEntityMarkers(): void {
    if (!this.entityManager || !this.entityManager.Entities) return;
    
    const centerPos = this.getCenterPosition();
    
    // Get all entities except the minimap itself
    const entities = this.entityManager.Entities.filter((e: Entity) => 
      e.name !== 'MinimapSystem' && e.Position
    );
    
    // Remove markers for entities that no longer exist
    for (const [entity, markerData] of this.entityMarkers.entries()) {
      if (!entities.includes(entity)) {
        markerData.element.remove();
        this.entityMarkers.delete(entity);
      }
    }
    
    // Update or create markers for all entities
    entities.forEach((entity: Entity) => {
      if (!this.entityMarkers.has(entity)) {
        this.createEntityMarker(entity);
      }
      
      const markerData = this.entityMarkers.get(entity);
      if (markerData && entity.Position) {
        const pos = this.worldToMinimap(entity.Position, centerPos);
        
        // Check if entity is within minimap bounds
        const margin = 20; // Small margin for visibility
        const isVisible = pos.x >= -margin && pos.x <= this.minimapSize + margin &&
                         pos.y >= -margin && pos.y <= this.minimapSize + margin;
        
        if (isVisible) {
          markerData.element.style.left = `${pos.x}px`;
          markerData.element.style.top = `${pos.y}px`;
          markerData.element.style.display = 'block';
        } else {
          markerData.element.style.display = 'none';
        }
      }
    });
    
    // Update entity name visibility
    this.updateEntityNameVisibility();
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
        // Counter-rotate the text to keep it readable
        markerData.nameLabel.style.transform = `translateX(-50%) rotate(${-minimapRotation}deg)`;
      }
    }
  }

  private updateModeIndicator(): void {
    this.trackNavigationModes();
    
    if (this.isFPSMode) {
      this.modeIndicator.textContent = "FPS Mode";
      this.modeIndicator.style.background = "rgba(200, 100, 0, 0.8)";
    } else if (this.isBirdEyeMode) {
      this.modeIndicator.textContent = "Bird Eye Mode";
      this.modeIndicator.style.background = "rgba(0, 150, 100, 0.8)";
    } else {
      this.modeIndicator.textContent = "Free Camera";
      this.modeIndicator.style.background = "rgba(0, 100, 200, 0.8)";
    }
  }

  // Public methods for customization
  public setWorldSize(size: number): void {
    this.baseWorldSize = size;
    this.worldSize = size * this.currentZoomLevel;
  }

  public setMinimapSize(size: number): void {
    this.minimapSize = size;
    this.minimapContainer.style.width = `${size}px`;
    this.minimapContainer.style.height = `${size + 30}px`;
    this.minimapCanvas.width = size;
    this.minimapCanvas.height = size;
    this.rotatingContainer.style.width = `${size}px`;
    this.rotatingContainer.style.height = `${size}px`;
    this.drawBackground();
  }

  public setViewConeSize(width: number, height: number): void {
    const cone = this.viewCone.querySelector('path');
    if (cone) {
      // Adjust the cone path based on the new size
      cone.setAttribute("d", `M 60 60 L ${60 - width/2} ${60 - height} A ${width/2} ${width/2} 0 0 1 ${60 + width/2} ${60 - height} Z`);
    }
  }

  public setViewConeColor(color: string, opacity: number = 0.2): void {
    const cone = this.viewCone.querySelector('path');
    if (cone) {
      const rgbColor = this.hexToRgb(color);
      cone.setAttribute("fill", `rgba(${rgbColor}, ${opacity})`);
      cone.setAttribute("stroke", `rgba(${rgbColor}, ${opacity * 2})`);
    }
  }

  public setViewConeAngle(degrees: number): void {
    // Convert degrees to a cone path
    const radians = (degrees * Math.PI) / 180;
    const radius = 50;
    const x1 = 60 + radius * Math.sin(-radians / 2);
    const y1 = 60 - radius * Math.cos(-radians / 2);
    const x2 = 60 + radius * Math.sin(radians / 2);
    const y2 = 60 - radius * Math.cos(radians / 2);
    
    const cone = this.viewCone.querySelector('path');
    if (cone) {
      cone.setAttribute("d", `M 60 60 L ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2} Z`);
    }
  }

  private hexToRgb(hex: string): string {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? 
      `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` :
      "0, 255, 0";
  }

  public toggleVisibility(): void {
    this.isVisible = !this.isVisible;
    this.minimapContainer.style.display = this.isVisible ? 'block' : 'none';
  }

  public update(): void {
    if (!this.isVisible) return;
    
    this.updateMainEntityReference();
    this.updateMainEntityMarker();
    this.updateEntityMarkers();
    this.updateModeIndicator();
  }

  public destroy(): void {
    // Clean up DOM elements
    if (this.minimapContainer && this.minimapContainer.parentNode) {
      this.minimapContainer.parentNode.removeChild(this.minimapContainer);
    }
    
    // Clear entity markers
    this.entityMarkers.clear();
  }
}
