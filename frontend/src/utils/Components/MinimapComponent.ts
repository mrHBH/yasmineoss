import * as THREE from "three";
import { Component } from "../Component";
import { Entity } from "../Entity";

export class MinimapComponent extends Component {
  private minimapContainer: HTMLDivElement;
  private minimapCanvas: HTMLCanvasElement;
  private minimapCtx: CanvasRenderingContext2D;
  private rotatingContainer: HTMLDivElement;
  private minimapSize: number = 220; // Size of the minimap in pixels
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
  
  // New properties for enhanced functionality
  private zoomLevel: number = 1; // Manual zoom level (0.5x - 4x)
  private isDragging: boolean = false;
  private dragStartPos: { x: number; y: number } = { x: 0, y: 0 };
  private cameraViewport: HTMLDivElement; // Rectangle showing camera view in RTS mode
  private minimapBorder: HTMLDivElement; // Decorative border
  private zoomIndicator: HTMLDivElement; // Shows current zoom level
  private mapOffset: THREE.Vector3 = new THREE.Vector3(0, 0, 0); // Manual map offset for dragging

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
    // Create main minimap container - positioned in bottom right
    this.minimapContainer = document.createElement("div");
    this.minimapContainer.id = "minimap-container";
    this.minimapContainer.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: ${this.minimapSize}px;
      height: ${this.minimapSize + 60}px;
      background: linear-gradient(145deg, rgba(0, 0, 0, 0.95), rgba(20, 20, 30, 0.95));
      border: 3px solid #333;
      border-radius: 15px;
      z-index: 1000;
      overflow: hidden;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
      user-select: none;
    `;

    // Create decorative border with GTA-style elements
    this.minimapBorder = document.createElement("div");
    this.minimapBorder.style.cssText = `
      position: absolute;
      top: 35px;
      left: 5px;
      right: 5px;
      bottom: 25px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      pointer-events: none;
      z-index: 5;
      opacity: 0;
      transition: opacity 0.3s ease;
    `;
    this.minimapContainer.appendChild(this.minimapBorder);

    // Create canvas for background grid
    this.minimapCanvas = document.createElement("canvas");
    this.minimapCanvas.width = this.minimapSize;
    this.minimapCanvas.height = this.minimapSize;
    this.minimapCanvas.style.cssText = `
      position: absolute;
      top: 35px;
      left: 5px;
      width: ${this.minimapSize - 10}px;
      height: ${this.minimapSize - 10}px;
      border-radius: 10px;
      cursor: grab;
    `;
    this.minimapCtx = this.minimapCanvas.getContext("2d")!;

    // Create static compass container (doesn't rotate with minimap)
    const compassContainer = document.createElement("div");
    compassContainer.style.cssText = `
      position: absolute;
      top: 35px;
      left: 5px;
      width: ${this.minimapSize - 10}px;
      height: ${this.minimapSize - 10}px;
      z-index: 20;
      pointer-events: none;
      border-radius: 50%;
    `;

    // Create compass labels that stay fixed
    const compassLabels = [
      { text: 'N', x: '50%', y: '8%' },
      { text: 'E', x: '92%', y: '50%' },
      { text: 'S', x: '50%', y: '92%' },
      { text: 'W', x: '8%', y: '50%' }
    ];

    compassLabels.forEach(label => {
      const labelEl = document.createElement('div');
      labelEl.textContent = label.text;
      labelEl.style.cssText = `
        position: absolute;
        left: ${label.x};
        top: ${label.y};
        transform: translate(-50%, -50%);
        color: rgba(255, 255, 255, 0.9);
        font-size: 10px;
        font-weight: bold;
        font-family: 'Courier New', monospace;
        text-shadow: 0 0 3px rgba(0, 0, 0, 0.8), 0 0 6px rgba(0, 255, 68, 0.5);
        z-index: 25;
        display: none;
      `;
      labelEl.id = `compass-${label.text.toLowerCase()}`;
      compassContainer.appendChild(labelEl);
    });

    // Create rotating container for minimap content
    this.rotatingContainer = document.createElement("div");
    this.rotatingContainer.id = "minimap-rotating-container";
    this.rotatingContainer.style.cssText = `
      position: absolute;
      top: 35px;
      left: 5px;
      width: ${this.minimapSize - 10}px;
      height: ${this.minimapSize - 10}px;
      transform-origin: center center;
      border-radius: 10px;
      overflow: hidden;
    `;

    // Create main entity marker (GTA-style triangle)
    this.mainEntityMarker = document.createElement("div");
    this.mainEntityMarker.style.cssText = `
      position: absolute;
      width: 0;
      height: 0;
      border-left: 8px solid transparent;
      border-right: 8px solid transparent;
      border-bottom: 16px solid #00ff44;
      transform: translate(-50%, -50%);
      z-index: 10;
      filter: drop-shadow(0 0 6px rgba(0, 255, 68, 0.8)) drop-shadow(0 0 2px rgba(0, 0, 0, 0.8));
    `;

    // Create view cone (enhanced for better visibility)
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.style.cssText = `
      position: absolute;
      width: 140px;
      height: 140px;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      z-index: 8;
      pointer-events: none;
      overflow: visible;
    `;
    
    const cone = document.createElementNS("http://www.w3.org/2000/svg", "path");
    cone.setAttribute("d", "M 70 70 L 35 15 A 35 35 0 0 1 105 15 Z");
    cone.setAttribute("fill", "rgba(0, 255, 68, 0.25)");
    cone.setAttribute("stroke", "rgba(0, 255, 68, 0.8)");
    cone.setAttribute("stroke-width", "2");
    
    // Enhanced gradient
    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    const gradient = document.createElementNS("http://www.w3.org/2000/svg", "radialGradient");
    gradient.setAttribute("id", "coneGradient");
    gradient.setAttribute("cx", "50%");
    gradient.setAttribute("cy", "90%");
    gradient.setAttribute("r", "60%");
    
    const stop1 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
    stop1.setAttribute("offset", "0%");
    stop1.setAttribute("stop-color", "rgba(0, 255, 68, 0.6)");
    
    const stop2 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
    stop2.setAttribute("offset", "100%");
    stop2.setAttribute("stop-color", "rgba(0, 255, 68, 0.1)");
    
    gradient.appendChild(stop1);
    gradient.appendChild(stop2);
    defs.appendChild(gradient);
    svg.appendChild(defs);
    cone.setAttribute("fill", "url(#coneGradient)");
    svg.appendChild(cone);
    this.viewCone = svg;

    // Create camera viewport indicator for RTS mode
    this.cameraViewport = document.createElement("div");
    this.cameraViewport.style.cssText = `
      position: absolute;
      border: 2px solid rgba(255, 255, 0, 0.8);
      background: rgba(255, 255, 0, 0.1);
      z-index: 9;
      pointer-events: none;
      display: none;
      box-shadow: 0 0 10px rgba(255, 255, 0, 0.5);
    `;

    // Add mode indicator with enhanced styling
    this.modeIndicator = document.createElement("div");
    this.modeIndicator.id = "minimap-mode-indicator";
    this.modeIndicator.style.cssText = `
      position: absolute;
      top: 8px;
      left: 8px;
      right: 8px;
      height: 22px;
      background: linear-gradient(90deg, rgba(0, 150, 255, 0.9), rgba(0, 100, 200, 0.9));
      color: white;
      font-size: 11px;
      font-weight: bold;
      text-align: center;
      line-height: 22px;
      border-radius: 11px;
      z-index: 30;
      font-family: 'Courier New', monospace;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
      border: 1px solid rgba(255, 255, 255, 0.2);
    `;

    // Add zoom indicator
    this.zoomIndicator = document.createElement("div");
    this.zoomIndicator.style.cssText = `
      position: absolute;
      bottom: 5px;
      left: 8px;
      right: 8px;
      height: 16px;
      background: rgba(0, 0, 0, 0.7);
      color: #00ff44;
      font-size: 9px;
      font-weight: bold;
      text-align: center;
      line-height: 16px;
      border-radius: 8px;
      z-index: 30;
      font-family: 'Courier New', monospace;
      border: 1px solid rgba(0, 255, 68, 0.3);
    `;

    // Append elements to containers
    this.rotatingContainer.appendChild(this.minimapCanvas);
    this.rotatingContainer.appendChild(this.viewCone);
    this.rotatingContainer.appendChild(this.mainEntityMarker);
    this.rotatingContainer.appendChild(this.cameraViewport);

    this.minimapContainer.appendChild(this.rotatingContainer);
    this.minimapContainer.appendChild(compassContainer); // Add compass container
    this.minimapContainer.appendChild(this.modeIndicator);
    this.minimapContainer.appendChild(this.zoomIndicator);
    
    // Add event listeners for interaction
    this.setupMinimapInteraction();
    
    document.body.appendChild(this.minimapContainer);
    this.drawBackground();
  }

  private drawBackground(): void {
    const ctx = this.minimapCtx;
    const size = this.minimapSize - 10; // Account for container padding
    
    // Clear canvas
    ctx.clearRect(0, 0, size, size);
    
    // Create radar-style background
    const centerX = size / 2;
    const centerY = size / 2;
    const radius = size / 2;
    
    // Background with subtle gradient
    const bgGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
    bgGradient.addColorStop(0, "rgba(10, 25, 10, 0.95)");
    bgGradient.addColorStop(0.7, "rgba(5, 15, 5, 0.95)");
    bgGradient.addColorStop(1, "rgba(0, 5, 0, 0.95)");
    
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, size, size);
    
    // Draw concentric circles (radar rings) - only for FPS mode
    if (this.isFPSMode) {
      ctx.strokeStyle = "rgba(0, 255, 68, 0.3)";
      ctx.lineWidth = 1;
      
      for (let i = 1; i <= 4; i++) {
        const ringRadius = (radius * 0.9 / 4) * i; // Slightly smaller rings
        ctx.beginPath();
        ctx.arc(centerX, centerY, ringRadius, 0, Math.PI * 2);
        ctx.stroke();
      }
      
      // Draw crosshairs for radar
      ctx.strokeStyle = "rgba(0, 255, 68, 0.4)";
      ctx.lineWidth = 1;
      
      // Vertical line
      ctx.beginPath();
      ctx.moveTo(centerX, centerY - radius * 0.9);
      ctx.lineTo(centerX, centerY + radius * 0.9);
      ctx.stroke();
      
      // Horizontal line
      ctx.beginPath();
      ctx.moveTo(centerX - radius * 0.9, centerY);
      ctx.lineTo(centerX + radius * 0.9, centerY);
      ctx.stroke();
      
      // Show compass labels
      ['n', 'e', 's', 'w'].forEach(dir => {
        const label = document.getElementById(`compass-${dir}`);
        if (label) label.style.display = 'block';
      });
      
    } else {
      // Hide compass labels in non-FPS modes
      ['n', 'e', 's', 'w'].forEach(dir => {
        const label = document.getElementById(`compass-${dir}`);
        if (label) label.style.display = 'none';
      });
    }
    
    // Draw grid in RTS mode
    if (this.isBirdEyeMode) {
      ctx.strokeStyle = "rgba(100, 100, 100, 0.2)";
      ctx.lineWidth = 0.5;
      
      const gridSpacing = size / 16;
      for (let i = 0; i <= 16; i++) {
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
    }
  }

  private setupMinimapInteraction(): void {
    // Mouse wheel zoom
    this.minimapContainer.addEventListener('wheel', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const zoomDelta = e.deltaY > 0 ? 0.9 : 1.1;
      this.zoomLevel = Math.max(0.3, Math.min(5, this.zoomLevel * zoomDelta));
      this.worldSize = this.baseWorldSize * this.zoomLevel;
      this.updateZoomIndicator();
    });

    // Mouse drag for map panning (RTS mode only)
    this.minimapCanvas.addEventListener('mousedown', (e) => {
      if (!this.isBirdEyeMode) return;
      
      this.isDragging = true;
      this.dragStartPos = { x: e.clientX, y: e.clientY };
      this.minimapCanvas.style.cursor = 'grabbing';
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!this.isDragging || !this.isBirdEyeMode) return;
      
      const deltaX = e.clientX - this.dragStartPos.x;
      const deltaY = e.clientY - this.dragStartPos.y;
      
      // Convert screen delta to world coordinates
      const scale = this.worldSize / this.minimapSize;
      this.mapOffset.x += deltaX * scale * 0.5;
      this.mapOffset.z += deltaY * scale * 0.5;
      
      this.dragStartPos = { x: e.clientX, y: e.clientY };
    });

    document.addEventListener('mouseup', () => {
      if (this.isDragging) {
        this.isDragging = false;
        this.minimapCanvas.style.cursor = 'grab';
      }
    });

    // Click to focus camera (RTS mode)
    this.minimapCanvas.addEventListener('click', (e) => {
      if (this.isDragging || !this.isBirdEyeMode) return;
      
      const rect = this.minimapCanvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      // Convert minimap coordinates to world coordinates
      const worldPos = this.minimapToWorld(x, y);
      
      // Move camera to clicked position
      const entityManager = this._entity._entityManager;
      if (entityManager && entityManager._mc) {
        entityManager._mc.zoomTo(worldPos, undefined);
      }
    });

    // Hover effects
    this.minimapContainer.addEventListener('mouseenter', () => {
      if (this.isFPSMode) {
        this.minimapBorder.style.opacity = '1';
        this.minimapContainer.style.transform = 'scale(1.02)';
        this.minimapContainer.style.transition = 'transform 0.2s ease';
      }
    });

    this.minimapContainer.addEventListener('mouseleave', () => {
      if (this.isFPSMode) {
        this.minimapBorder.style.opacity = '0';
        this.minimapContainer.style.transform = 'scale(1)';
      }
    });
  }

  private minimapToWorld(minimapX: number, minimapY: number): THREE.Vector3 {
    const centerPos = this.getCenterPosition();
    const scale = this.worldSize / (this.minimapSize - 10);
    const centerOffset = (this.minimapSize - 10) / 2;
    
    const relativeX = -(minimapX - centerOffset) * scale; // Invert X mapping to match worldToMinimap
    const relativeZ = (minimapY - centerOffset) * scale; // Positive Y maps to positive Z for correct front/back
    
    return new THREE.Vector3(
      centerPos.x + relativeX + this.mapOffset.x,
      centerPos.y,
      centerPos.z + relativeZ + this.mapOffset.z
    );
  }

  private updateZoomIndicator(): void {
    if (this.zoomIndicator) {
      this.zoomIndicator.textContent = `ZOOM: ${this.zoomLevel.toFixed(1)}x`;
    }
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
              entity.getComponent('CharacterComponent') && (
                entity.name.toLowerCase().includes('hamza') || 
                entity.name.toLowerCase().includes('player') ||
                entity.name.toLowerCase().includes('character')
              )
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
    const relativeX = worldPos.x - (centerPos.x + this.mapOffset.x);
    const relativeZ = worldPos.z - (centerPos.z + this.mapOffset.z);
    
    // Scale to minimap size (account for padding)
    const scale = (this.minimapSize - 10) / this.worldSize;
    const centerOffset = (this.minimapSize - 10) / 2;
    
    return {
      x: centerOffset - (relativeX * scale), // Invert X to fix left/right mirroring
      y: centerOffset + (relativeZ * scale) // Forward (positive Z) should map to up (negative Y) on minimap
    };
  }

  private getCenterPosition(): THREE.Vector3 {
    const entityManager = this._entity._entityManager;
    
    if (this.isFPSMode && this.currentMainEntity) {
      // In FPS mode, always center on main entity
      return this.currentMainEntity.Position;
    } else if (this.isBirdEyeMode) {
      // In bird eye/RTS mode, use manual offset for dragging
      if (this.currentMainEntity) {
        return this.currentMainEntity.Position.clone().add(this.mapOffset);
      }
      return new THREE.Vector3(0, 0, 0).add(this.mapOffset);
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
    
    if (this.isFPSMode) {
      // FPS Mode - GTA style: player always at center, minimap rotates
      this.rotatingContainer.style.transform = `rotate(${smoothedRotation}deg)`;
      this.rotatingContainer.style.borderRadius = "50%";
      this.minimapBorder.style.display = "block";
      this.cameraViewport.style.display = "none";
      this.modeIndicator.textContent = "RADAR - FPS";
      this.modeIndicator.style.background = "linear-gradient(90deg, rgba(0, 255, 68, 0.9), rgba(0, 200, 50, 0.9))";
      
      // Player always at center
      this.mainEntityMarker.style.left = "50%";
      this.mainEntityMarker.style.top = "50%";
      // Player marker should always point "up" (counter-rotate to cancel minimap rotation)
      this.mainEntityMarker.style.transform = `translate(-50%, -50%) rotate(${-smoothedRotation}deg)`;
      
      // View cone also points "up" (counter-rotate to cancel minimap rotation)
      this.viewCone.style.left = "50%";
      this.viewCone.style.top = "50%";
      this.viewCone.style.transform = `translate(-50%, -50%) rotate(${-smoothedRotation}deg)`;
      this.viewCone.style.display = 'block';
      
    } else if (this.isBirdEyeMode) {
      // RTS Mode - Age of Empires style: static minimap, camera viewport indicator
      this.rotatingContainer.style.transform = "rotate(0deg)";
      this.rotatingContainer.style.borderRadius = "10px";
      this.minimapBorder.style.display = "none";
      this.cameraViewport.style.display = "block";
      this.modeIndicator.textContent = "TACTICAL - RTS";
      this.modeIndicator.style.background = "linear-gradient(90deg, rgba(255, 165, 0, 0.9), rgba(255, 140, 0, 0.9))";
      
      // Show main entity position on map
      const entityMinimapPos = this.worldToMinimap(this.currentMainEntity.Position, centerPos);
      const isEntityVisible = entityMinimapPos.x >= 0 && entityMinimapPos.x <= (this.minimapSize - 10) &&
                              entityMinimapPos.y >= 0 && entityMinimapPos.y <= (this.minimapSize - 10);
      
      if (isEntityVisible) {
        this.mainEntityMarker.style.left = `${entityMinimapPos.x}px`;
        this.mainEntityMarker.style.top = `${entityMinimapPos.y}px`;
        this.mainEntityMarker.style.display = 'block';
        
        const entityRotation = this.getEntityRotation();
        this.mainEntityMarker.style.transform = `translate(-50%, -50%) rotate(${entityRotation}deg)`;
      } else {
        this.mainEntityMarker.style.display = 'none';
      }
      
      // Update camera viewport rectangle
      this.updateCameraViewport(centerPos);
      
      // Hide view cone in RTS mode
      this.viewCone.style.display = 'none';
      
    } else {
      // Navigation Mode - camera rotates freely around player
      // Minimap rotates with camera direction, player marker shows player's actual facing direction
      this.rotatingContainer.style.transform = `rotate(${smoothedRotation}deg)`;
      this.rotatingContainer.style.borderRadius = "10px";
      this.minimapBorder.style.display = "none";
      this.cameraViewport.style.display = "block"; // Show camera viewport
      this.modeIndicator.textContent = "MAP - NAVIGATION";
      this.modeIndicator.style.background = "linear-gradient(90deg, rgba(0, 150, 255, 0.9), rgba(0, 100, 200, 0.9))";
      
      // Position main entity relative to camera
      const entityMinimapPos = this.worldToMinimap(this.currentMainEntity.Position, centerPos);
      
      const isVisible = entityMinimapPos.x >= 0 && entityMinimapPos.x <= (this.minimapSize - 10) &&
                       entityMinimapPos.y >= 0 && entityMinimapPos.y <= (this.minimapSize - 10);
      
      if (isVisible) {
        this.mainEntityMarker.style.left = `${entityMinimapPos.x}px`;
        this.mainEntityMarker.style.top = `${entityMinimapPos.y}px`;
        this.mainEntityMarker.style.display = 'block';
        
        // In navigation mode, show player's actual facing direction relative to camera view
        // Both entity rotation and minimap rotation now use the same coordinate system
        const entityRotation = this.getEntityRotation();
        let relativeRotation = entityRotation - smoothedRotation;
        
        // Normalize angle to -180 to 180 range
        if (relativeRotation > 180) {
          relativeRotation -= 360;
        } else if (relativeRotation < -180) {
          relativeRotation += 360;
        }
        
        // Player marker points in player's actual facing direction (relative to camera)
        this.mainEntityMarker.style.transform = `translate(-50%, -50%) rotate(${relativeRotation}deg)`;
        
        // View cone shows where player is actually facing (relative to camera view)
        this.viewCone.style.transform = `translate(-50%, -50%) rotate(${relativeRotation}deg)`;
        this.viewCone.style.left = `${entityMinimapPos.x}px`;
        this.viewCone.style.top = `${entityMinimapPos.y}px`;
        this.viewCone.style.display = 'block';
      } else {
        this.mainEntityMarker.style.display = 'none';
        this.viewCone.style.display = 'none';
      }

      // Update camera viewport rectangle
      this.updateCameraViewport(centerPos);
    }
  }

  private updateCameraViewport(centerPos: THREE.Vector3): void {
    const entityManager = this._entity._entityManager;
    if (!entityManager || !entityManager._mc || !entityManager._mc.camera) return;
    
    const camera = entityManager._mc.camera;
    const cameraPos = camera.position;
    
    // Calculate camera aspect ratio
    const aspect = camera.aspect || (window.innerWidth / window.innerHeight);
    
    // Get camera direction and calculate ground intersection
    const cameraDirection = new THREE.Vector3();
    camera.getWorldDirection(cameraDirection);
    
    // Calculate distance from camera to ground plane (assuming ground is at y = 0)
    const groundY = 0;
    
    // Only calculate ground intersection if camera is looking downward
    if (cameraDirection.y >= 0) {
      // Camera is looking up or parallel to ground, can't intersect ground plane
      this.cameraViewport.style.display = 'none';
      return;
    }
    
    this.cameraViewport.style.display = 'block';
    
    // Use a constant viewport size that represents a standard camera view
    const constantViewportSize = 80; // Fixed size in world units
    const visibleWidth = constantViewportSize * aspect;
    const visibleHeight = constantViewportSize;
    
    // Calculate where the camera is looking on the ground plane
    const distanceToIntersection = (cameraPos.y - groundY) / Math.abs(cameraDirection.y);
    const groundIntersection = new THREE.Vector3(
      cameraPos.x + cameraDirection.x * distanceToIntersection,
      groundY,
      cameraPos.z + cameraDirection.z * distanceToIntersection
    );
    
    // Calculate rotation based on camera's horizontal direction
    const forwardOnGround = new THREE.Vector3(cameraDirection.x, 0, cameraDirection.z).normalize();
    const cameraRotation = Math.atan2(forwardOnGround.x, forwardOnGround.z) * (180 / Math.PI);
    
    // Convert to minimap coordinates
    const scale = (this.minimapSize - 10) / this.worldSize;
    const viewportWidth = visibleWidth * scale;
    const viewportHeight = visibleHeight * scale;
    
    // Position viewport on minimap based on ground intersection point
    const viewportMinimapPos = this.worldToMinimap(groundIntersection, centerPos);
    
    this.cameraViewport.style.left = `${viewportMinimapPos.x - viewportWidth / 2}px`;
    this.cameraViewport.style.top = `${viewportMinimapPos.y - viewportHeight / 2}px`;
    this.cameraViewport.style.width = `${viewportWidth}px`;
    this.cameraViewport.style.height = `${viewportHeight}px`;
    
    // Apply rotation with transform origin at center
    this.cameraViewport.style.transformOrigin = 'center center';
    
    // The viewport's rotation should be relative to the minimap's rotation.
    const minimapRotation = this.lastMinimapRotation;
    this.cameraViewport.style.transform = `rotate(${-cameraRotation - minimapRotation}deg)`;
    
    // Enhanced styling for better visibility
    this.cameraViewport.style.border = '2px solid rgba(255, 255, 0, 0.9)';
    this.cameraViewport.style.background = 'rgba(255, 255, 0, 0.15)';
    this.cameraViewport.style.boxShadow = '0 0 10px rgba(255, 255, 0, 0.6)';
    this.cameraViewport.style.cursor = 'move';
    this.cameraViewport.style.pointerEvents = 'all'; // Enable dragging
    this.cameraViewport.style.zIndex = '9';
    
    // Add drag functionality to move camera
    this.setupCameraViewportDragging();
  }

  private updateDynamicZoom(): void {
    const entityManager = this._entity._entityManager;
    if (!entityManager || !entityManager._mc || !entityManager._mc.camera) return;
    
    const camera = entityManager._mc.camera;
    const cameraHeight = camera.position.y;
    
    // In FPS mode, auto-adjust zoom based on camera height
    if (this.isFPSMode) {
      const targetZoomLevel = Math.max(0.5, Math.min(3, cameraHeight / 15));
      
      // Smooth zoom transition
      let zoomDiff = targetZoomLevel - this.currentZoomLevel;
      this.currentZoomLevel += zoomDiff * 0.1; // Smooth interpolation
      
      // Update world size based on automatic zoom level
      this.worldSize = this.baseWorldSize * this.currentZoomLevel;
    } else {
      // In other modes, use manual zoom level
      this.worldSize = this.baseWorldSize * this.zoomLevel;
      this.currentZoomLevel = this.zoomLevel;
    }
    
    // Update zoom indicator
    this.updateZoomIndicator();
    
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
    
    // Convert quaternion to forward direction vector. Use -Z for forward to align with Three.js camera conventions.
    const forward = new THREE.Vector3(0, 0, -1); 
    forward.applyQuaternion(quat);
    
    // Calculate angle from forward vector (atan2 gives us the angle in the XZ plane)
    let rotationDegrees = Math.atan2(forward.x, forward.z) * (180 / Math.PI) + 180;
    
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
    
    if (this.isFPSMode && this.currentMainEntity) {
      // In FPS mode, rotate minimap so player's forward direction points "up"
      const quat = this.currentMainEntity.Quaternion;
      const forward = new THREE.Vector3(0, 0, 1);
      forward.applyQuaternion(quat);
      
      // Calculate rotation to make player's forward direction point "up" on minimap
      let rotationDegrees = Math.atan2(forward.x, forward.z) * (180 / Math.PI);
      
      // Invert rotation to match our coordinate system mapping
      return -rotationDegrees;
    } else if (this.isBirdEyeMode) {
      // In Bird Eye/RTS mode, keep minimap static (north up)
      return 0;
    } else if (entityManager && entityManager._mc && entityManager._mc.camera) {
      // In navigation mode, rotate minimap with camera
      const camera = entityManager._mc.camera;
      const cameraDirection = new THREE.Vector3();
      camera.getWorldDirection(cameraDirection);
      
      let rotationDegrees = Math.atan2(cameraDirection.x, cameraDirection.z) * (180 / Math.PI);
      
      // Invert rotation to match our coordinate system mapping
      return -rotationDegrees;
    }
    
    return 0; // No rotation
  }

  private updateEntityMarkers(): void {
    const entityManager = this._entity._entityManager;
    if (!entityManager || !entityManager.Entities) return;
    
    const centerPos = this.getCenterPosition();
    
    // Update existing markers and create new ones - only for character entities
    for (const entity of entityManager.Entities) {
      if (entity === this.currentMainEntity && this.isFPSMode) continue; // Skip main entity in FPS mode since it's always centered
      if (!entity.alive) continue;
      
      // Only show character entities on the minimap
      const characterComponent = entity.getComponent('CharacterComponent');
      if (!characterComponent) continue;
      
      let markerData = this.entityMarkers.get(entity);
      if (!markerData) {
        // Create new marker for new character entity
        this.createEntityMarker(entity);
        markerData = this.entityMarkers.get(entity);
      }
      
      if (markerData) {
        const minimapPos = this.worldToMinimap(entity.Position, centerPos);
        
        // Check if entity is within minimap bounds (account for padding)
        const isVisible = minimapPos.x >= 0 && minimapPos.x <= (this.minimapSize - 10) &&
                         minimapPos.y >= 0 && minimapPos.y <= (this.minimapSize - 10);
        
        if (isVisible) {
          markerData.element.style.left = `${minimapPos.x}px`;
          markerData.element.style.top = `${minimapPos.y}px`;
          markerData.element.style.display = 'block';
          
          // Scale markers based on zoom level for better visibility
          const scale = Math.max(0.5, Math.min(2, 1 / this.currentZoomLevel));
          markerData.element.style.transform = `translate(-50%, -50%) scale(${scale})`;
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
        const centerX = 70;
        const centerY = 70;
        const radius = 55;
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

  public zoomIn(): void {
    this.zoomLevel = Math.min(5, this.zoomLevel * 1.2);
    this.worldSize = this.baseWorldSize * this.zoomLevel;
    this.updateZoomIndicator();
  }

  public zoomOut(): void {
    this.zoomLevel = Math.max(0.3, this.zoomLevel * 0.8);
    this.worldSize = this.baseWorldSize * this.zoomLevel;
    this.updateZoomIndicator();
  }

  public resetZoom(): void {
    this.zoomLevel = 1;
    this.worldSize = this.baseWorldSize;
    this.mapOffset.set(0, 0, 0);
    this.updateZoomIndicator();
  }

  public centerOnEntity(_entity: Entity): void {
    if (this.isBirdEyeMode) {
      this.mapOffset.set(0, 0, 0);
      // Additional centering logic could be added here
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
        this.modeIndicator.textContent = "◉ FPS RADAR";
        this.modeIndicator.style.background = "linear-gradient(90deg, rgba(255, 140, 0, 0.9), rgba(200, 100, 0, 0.9))";
        // Redraw background for FPS mode
        this.drawBackground();
      } else if (this.isBirdEyeMode) {
        this.modeIndicator.textContent = "⬜ TACTICAL MAP";
        this.modeIndicator.style.background = "linear-gradient(90deg, rgba(0, 200, 100, 0.9), rgba(0, 150, 80, 0.9))";
        // Redraw background for RTS mode
        this.drawBackground();
      } else {
        this.modeIndicator.textContent = "🧭 NAVIGATION";
        this.modeIndicator.style.background = "linear-gradient(90deg, rgba(0, 150, 255, 0.9), rgba(0, 100, 200, 0.9))";
        // Redraw background for navigation mode
        this.drawBackground();
      }
    }
  }

  private setupCameraViewportDragging(): void {
    // Remove any existing event listeners to avoid duplicates
    const existingMouseDown = this.cameraViewport.onmousedown;
    if (existingMouseDown) {
      this.cameraViewport.removeEventListener('mousedown', existingMouseDown);
    }

    let isDraggingViewport = false;
    let dragStartPos = { x: 0, y: 0 };
    let dragStartCameraPos = new THREE.Vector3();

    const handleMouseDown = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      const entityManager = this._entity._entityManager;
      if (!entityManager || !entityManager._mc || !entityManager._mc.camera) return;
      
      isDraggingViewport = true;
      dragStartPos.x = e.clientX;
      dragStartPos.y = e.clientY;
      dragStartCameraPos.copy(entityManager._mc.camera.position);
      
      this.cameraViewport.style.cursor = 'grabbing';
    };

    // const handleMouseMove = (e: MouseEvent) => {
    //   if (!isDraggingViewport) return;
      
    //   const entityManager = this._entity._entityManager;
    //   if (!entityManager || !entityManager._mc || !entityManager._mc.camera) return;
      
    //   e.preventDefault();
      
    //   const deltaX = e.clientX - dragStartPos.x;
    //   const deltaY = e.clientY - dragStartPos.y;
      
    //   // Convert screen delta to world coordinates
    //   const scale = this.worldSize / (this.minimapSize - 10);
    //   const worldDeltaX = -deltaX * scale; // Invert X to match coordinate system
    //   const worldDeltaZ = deltaY * scale; // Y screen maps to Z world
      
    //   // Rotate the delta by the current minimap rotation to align with the world
    //   const minimapRotationRad = -this.lastMinimapRotation * (Math.PI / 180);
    //   const rotatedDeltaX = worldDeltaX * Math.cos(minimapRotationRad) - worldDeltaZ * Math.sin(minimapRotationRad);
    //   const rotatedDeltaZ = worldDeltaX * Math.sin(minimapRotationRad) + worldDeltaZ * Math.cos(minimapRotationRad);

    //   // Move camera position
    //   const newCameraPos = new THREE.Vector3(
    //     dragStartCameraPos.x + rotatedDeltaX,
    //     dragStartCameraPos.y,
    //     dragStartCameraPos.z + rotatedDeltaZ
    //   );
      
    //   entityManager._mc.camera.position.copy(newCameraPos);
    // };

    const handleMouseUp = () => {
      if (isDraggingViewport) {
        isDraggingViewport = false;
        this.cameraViewport.style.cursor = 'move';
      }
    };

    // Add event listeners
    this.cameraViewport.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }
}
