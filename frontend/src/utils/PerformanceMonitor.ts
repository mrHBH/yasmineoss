import { Pane } from "tweakpane";
import * as EssentialsPlugin from "@tweakpane/plugin-essentials";
import * as THREE from "three";
import { ThreePerf } from 'three-perf';
import { PhysicsManager } from "./PhysicsManager";

interface PerformanceStats {
  fps: number;
  memory: {
    used: number;
    total: number;
    limit: number;
  };
  physics: {
    bodies: number;
    dynamicBodies: number;
    staticBodies: number;
    constraints: number;
    contacts: number;
  };
}

export class PerformanceMonitor {
  private pane: Pane;
  private fpsGraph: any;
  private memoryGraph: any;
  private physicsGraph: any;
  private threePerf: ThreePerf | null = null;
  
  private container: HTMLElement;
  private collapseState: 'minimized' | 'expanded' | 'full' = 'minimized';
  private collapseButton: HTMLElement;
  
  // Graph data arrays
  private memoryPoints: number[] = [];
  private physicsPoints: number[] = [];
  
  // Configuration
  private readonly maxPoints = 70;
  private readonly updateInterval = 1000; // ms
  private readonly graphHeight = 20;
  private readonly graphWidth = 120;
  
  // References
  private renderer: THREE.WebGLRenderer;
  private physicsManager: PhysicsManager;
  private domElement?: HTMLElement;
  
  // Update timer
  private updateTimer: number;
  private fps: number = 60;
  
  constructor(renderer: THREE.WebGLRenderer, physicsManager: PhysicsManager, domElement?: HTMLElement) {
    this.renderer = renderer;
    this.physicsManager = physicsManager;
    this.domElement = domElement;
    
    // Don't initialize ThreePerf until needed
    
    this.initializePane();
    this.createGraphs();
    this.startUpdating();
  }
  
  private initializePane(): void {
    this.pane = new Pane({});
    this.pane.registerPlugin(EssentialsPlugin as any);
    
    // Style the main container
    this.container = this.pane.element;
    this.container.style.position = "fixed";
    this.container.style.zIndex = "1000";
    this.container.style.bottom = "20px";
    this.container.style.left = "20px";
    this.container.style.width = "150px";
    this.container.style.background = "rgba(0, 0, 0, 0.8)";
    this.container.style.borderRadius = "8px";
    this.container.style.padding = "8px";
    this.container.style.transition = "all 0.3s ease";
    this.container.style.backdropFilter = "blur(5px)";
    this.container.style.border = "1px solid rgba(255, 255, 255, 0.1)";
    
    // Create collapse button
    this.createCollapseButton();
  }
  
  private createCollapseButton(): void {
    this.collapseButton = document.createElement("div");
    this.collapseButton.innerHTML = "📊";
    this.collapseButton.style.position = "absolute";
    this.collapseButton.style.top = "-5px";
    this.collapseButton.style.right = "-5px";
    this.collapseButton.style.width = "20px";
    this.collapseButton.style.height = "20px";
    this.collapseButton.style.background = "rgba(255, 255, 255, 0.1)";
    this.collapseButton.style.borderRadius = "50%";
    this.collapseButton.style.display = "flex";
    this.collapseButton.style.alignItems = "center";
    this.collapseButton.style.justifyContent = "center";
    this.collapseButton.style.cursor = "pointer";
    this.collapseButton.style.fontSize = "10px";
    this.collapseButton.style.transition = "all 0.2s ease";
    this.collapseButton.style.userSelect = "none";
    
    this.collapseButton.addEventListener("click", () => this.toggleCollapse());
    this.collapseButton.addEventListener("mouseenter", () => {
      this.collapseButton.style.background = "rgba(255, 255, 255, 0.2)";
    });
    this.collapseButton.addEventListener("mouseleave", () => {
      this.collapseButton.style.background = "rgba(255, 255, 255, 0.1)";
    });
    
    this.container.appendChild(this.collapseButton);
  }
  
  private toggleCollapse(): void {
    // Cycle through: minimized -> expanded -> full -> minimized
    switch (this.collapseState) {
      case 'minimized':
        this.collapseState = 'expanded';
        this.collapseButton.innerHTML = "�";
        break;
      case 'expanded':
        this.collapseState = 'full';
        this.collapseButton.innerHTML = "⚡";
        break;
      case 'full':
        this.collapseState = 'minimized';
        this.collapseButton.innerHTML = "📊";
        break;
    }
    
    this.updateVisibility();
  }
  
  private updateVisibility(): void {
    const fpsElement = this.fpsGraph?.element;
    const memoryElement = this.memoryGraph;
    const physicsElement = this.physicsGraph;
    
    switch (this.collapseState) {
      case 'minimized':
        // Show only FPS
        if (fpsElement) fpsElement.style.display = 'flex';
        if (memoryElement) memoryElement.style.display = 'none';
        if (physicsElement) physicsElement.style.display = 'none';
        this.disposeThreePerf();
        break;
        
      case 'expanded':
        // Show FPS + Memory + Physics
        if (fpsElement) fpsElement.style.display = 'flex';
        if (memoryElement) memoryElement.style.display = 'flex';
        if (physicsElement) physicsElement.style.display = 'flex';
        this.disposeThreePerf();
        break;
        
      case 'full':
        // Show FPS + Memory + Physics + ThreePerf
        if (fpsElement) fpsElement.style.display = 'flex';
        if (memoryElement) memoryElement.style.display = 'flex';
        if (physicsElement) physicsElement.style.display = 'flex';
        this.createThreePerf();
        break;
    }
  }
  
  private createThreePerf(): void {
    if (!this.threePerf) {
      this.threePerf = new ThreePerf({
        anchorX: 'right',
        anchorY: 'top',
        domElement: this.domElement,
        renderer: this.renderer,
        showGraph: true,
      });
      
 
  }
}
  
  private disposeThreePerf(): void {
    if (this.threePerf) {
      // More aggressive cleanup
      this.threePerf.dispose();
      this.threePerf = null;
    }
  }
  
  private createGraphs(): void {
    // FPS Graph
    this.fpsGraph = this.pane.addBlade({
      view: "fpsgraph",
      lineCount: 8,
      min: 0,
      max: 244,
    });
    this.styleGraph(this.fpsGraph.element, "#808080", "FPS");
    
    // Memory Graph
    this.memoryGraph = this.createCustomGraph("#ff7d7d", "MEM", "MB");
    
    // Physics Graph  
    this.physicsGraph = this.createCustomGraph("#7d7dff", "PHY", "OBJ");
    
    // Set initial visibility
    this.updateVisibility();
  }
  
  private createCustomGraph(color: string, label: string, unit: string): HTMLElement {
    const container = document.createElement("div");
    container.className = "perf-graph";
    container.style.display = "flex";
    container.style.alignItems = "center";
    container.style.marginBottom = "4px";
    container.style.transition = "all 0.3s ease";
    
    // SVG
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", this.graphWidth.toString());
    svg.setAttribute("height", this.graphHeight.toString());
    svg.style.flexShrink = "0";
    svg.style.marginRight = "8px";
    
    // Background
    const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    bg.setAttribute("width", "100%");
    bg.setAttribute("height", "100%");
    bg.setAttribute("fill", "#1a1a1a");
    svg.appendChild(bg);
    
    // Grid lines
    for (let i = 0; i < 8; i++) {
      const lineY = (i + 1) * (this.graphHeight / 8);
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", "0");
      line.setAttribute("y1", lineY.toString());
      line.setAttribute("x2", "100%");
      line.setAttribute("y2", lineY.toString());
      line.setAttribute("stroke", "#333333");
      line.setAttribute("stroke-width", "0.5");
      svg.appendChild(line);
    }
    
    // Gradient
    const gradient = document.createElementNS("http://www.w3.org/2000/svg", "linearGradient");
    gradient.setAttribute("id", `${label}Gradient`);
    gradient.setAttribute("x1", "0%");
    gradient.setAttribute("y1", "0%");
    gradient.setAttribute("x2", "100%");
    gradient.setAttribute("y2", "0%");
    gradient.innerHTML = `
      <stop offset="70%" stop-color="${color}" stop-opacity="1"/>
      <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
    `;
    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    defs.appendChild(gradient);
    svg.appendChild(defs);
    
    // Line
    const line = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
    line.setAttribute("fill", "none");
    line.setAttribute("stroke", `url(#${label}Gradient)`);
    line.setAttribute("stroke-width", "1");
    svg.appendChild(line);
    
    // Label container
    const labelContainer = document.createElement("div");
    labelContainer.style.display = "flex";
    labelContainer.style.flexDirection = "column";
    labelContainer.style.alignItems = "flex-start";
    labelContainer.style.fontSize = "10px";
    labelContainer.style.lineHeight = "1";
    
    // Value
    const value = document.createElement("span");
    value.style.color = color;
    value.style.fontWeight = "bold";
    value.textContent = "0.0";
    
    // Unit
    const unitSpan = document.createElement("span");
    unitSpan.style.color = color;
    unitSpan.style.opacity = "0.7";
    unitSpan.style.fontSize = "8px";
    unitSpan.textContent = unit;
    
    labelContainer.appendChild(value);
    labelContainer.appendChild(unitSpan);
    container.appendChild(svg);
    container.appendChild(labelContainer);
    
    // Store references
    (container as any).svg = svg;
    (container as any).line = line;
    (container as any).value = value;
    
    this.container.appendChild(container);
    return container;
  }
  
  private styleGraph(element: HTMLElement, color: string, label: string): void {
    element.style.transition = "all 0.3s ease";
    
    const svg = element.querySelector("svg");
    if (svg) {
      svg.style.width = this.graphWidth + "px";
      svg.style.height = this.graphHeight + "px";
      
      // Apply gradient to existing line
      const line = svg.querySelector("polyline");
      if (line) {
        const gradient = document.createElementNS("http://www.w3.org/2000/svg", "linearGradient");
        gradient.setAttribute("id", `${label}Gradient`);
        gradient.setAttribute("x1", "0%");
        gradient.setAttribute("y1", "0%");
        gradient.setAttribute("x2", "100%");
        gradient.setAttribute("y2", "0%");
        gradient.innerHTML = `
          <stop offset="70%" stop-color="${color}" stop-opacity="1"/>
          <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
        `;
        const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
        defs.appendChild(gradient);
        svg.insertBefore(defs, svg.firstChild);
        line.setAttribute("stroke", `url(#${label}Gradient)`);
      }
    }
  }
  
  private updateGraph(container: HTMLElement, points: number[], value: number, maxValue: number): void {
    const line = (container as any).line;
    const valueElement = (container as any).value;
    
    if (!line || !valueElement) return;
    
    // Calculate scaled Y position (inverted)
    const scaledY = this.graphHeight - ((Math.max(0, Math.min(maxValue, value)) / maxValue) * this.graphHeight);
    
    // Update points array
    points.push(scaledY);
    if (points.length > this.maxPoints) points.shift();
    
    // Create points string
    const pointsStr = points.map((y, i) => `${i * (this.graphWidth / this.maxPoints)},${y}`).join(" ");
    line.setAttribute("points", pointsStr);
    
    // Update label
    valueElement.textContent = value.toFixed(1);
  }
  private collectStats(): PerformanceStats {
    const stats: PerformanceStats = {
      fps: this.fps, // Use calculated FPS
      memory: {
        used: 0,
        total: 0,
        limit: 0
      },
      physics: {
        bodies: 0,
        dynamicBodies: 0,
        staticBodies: 0,
        constraints: 0,
        contacts: 0
      }
    };
    
    // Memory stats
    if ((performance as any).memory) {
      stats.memory.used = (performance as any).memory.usedJSHeapSize / (1024 * 1024);
      stats.memory.total = (performance as any).memory.totalJSHeapSize / (1024 * 1024);
      stats.memory.limit = (performance as any).memory.jsHeapSizeLimit / (1024 * 1024);
    }
    
    // Physics stats
    if (this.physicsManager?.World) {
      const world = this.physicsManager.World;
      stats.physics.bodies = world.bodies.length;
      stats.physics.constraints = world.constraints.length;
      stats.physics.contacts = world.contacts.length;
      
      world.bodies.forEach(body => {
        if (body.type === 1) { // CANNON.Body.DYNAMIC
          stats.physics.dynamicBodies++;
        } else {
          stats.physics.staticBodies++;
        }
      });
    }

    return stats;
  }
  
  private startUpdating(): void {
    this.updateTimer = window.setInterval(() => {
      if (this.collapseState === 'expanded' || this.collapseState === 'full') {
        const stats = this.collectStats();
        
        // Update memory graph
        this.updateGraph(this.memoryGraph, this.memoryPoints, stats.memory.used, 250);
        
        // Update physics graph
        this.updateGraph(this.physicsGraph, this.physicsPoints, stats.physics.bodies, 500);
      }
    }, this.updateInterval);
  }

  public beginFrame(): void {
    if (this.threePerf) {
      this.threePerf.begin();
    }
    if (this.fpsGraph) {
      // Let the tweakpane FPS graph handle its own updates
      this.fpsGraph.begin();
 
    }
  }

  public endFrame(): void {
    if (this.threePerf) {
      this.threePerf.end();
    }
    if (this.fpsGraph) {
      this.fpsGraph.end();
    }
}

 
  
  public getStats(): PerformanceStats {
    return this.collectStats();
  }
  
  public destroy(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
    }

    if (this.threePerf) {
        this.threePerf.dispose();
        this.threePerf = null;
    }
 
    this.pane.dispose();
  }
  
  public setPosition(x: number, y: number): void {
    this.container.style.left = `${x}px`;
    this.container.style.bottom = `${y}px`;
  }
  
  public toggle(): void {
    this.container.style.display = this.container.style.display === 'none' ? 'block' : 'none';
  }
}