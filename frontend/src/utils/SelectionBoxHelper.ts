import * as THREE from 'three';

export class SelectionHelper {
  private element: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private startPoint: THREE.Vector2;
  private pointTopLeft: THREE.Vector2;
  private pointBottomRight: THREE.Vector2;
  private dragThreshold: number = 5; // Minimum pixels to drag before showing selection box
  private hasDragged: boolean = false;
  public isDown: boolean = false;

  constructor(renderer: THREE.WebGLRenderer, cssClassName: string = 'selectBox') {
    this.renderer = renderer;
    this.element = document.createElement('div');
    this.element.classList.add(cssClassName);
    this.element.style.pointerEvents = 'none';

    this.renderer.domElement.parentElement?.appendChild(this.element);

    this.startPoint = new THREE.Vector2();
    this.pointTopLeft = new THREE.Vector2();
    this.pointBottomRight = new THREE.Vector2();
  }

  public onPointerDown(event: PointerEvent): void;
  public onPointerDown(x: number, y: number): void;
  public onPointerDown(eventOrX: PointerEvent | number, y?: number): void {
    if (typeof eventOrX === 'number' && typeof y === 'number') {
      this.isDown = true;
      this.hasDragged = false;
      this.startPoint.set(eventOrX, y);
      this.element.style.left = eventOrX + 'px';
      this.element.style.top = y + 'px';
      this.element.style.width = '0px';
      this.element.style.height = '0px';
      this.element.style.display = 'none'; // Don't show until we've dragged enough
    } else {
      const event = eventOrX as PointerEvent;
      this.isDown = true;
      this.hasDragged = false;
      this.startPoint.set(event.clientX, event.clientY);
      this.element.style.left = event.clientX + 'px';
      this.element.style.top = event.clientY + 'px';
      this.element.style.width = '0px';
      this.element.style.height = '0px';
      this.element.style.display = 'none'; // Don't show until we've dragged enough
    }
  }

  public onPointerMove(event: PointerEvent): void;
  public onPointerMove(x: number, y: number): void;
  public onPointerMove(eventOrX: PointerEvent | number, y?: number): void {
    if (!this.isDown) return;

    let clientX: number, clientY: number;
    if (typeof eventOrX === 'number' && typeof y === 'number') {
      clientX = eventOrX;
      clientY = y;
    } else {
      const event = eventOrX as PointerEvent;
      clientX = event.clientX;
      clientY = event.clientY;
    }

    // Check if we've dragged enough to show the selection box
    const deltaX = Math.abs(clientX - this.startPoint.x);
    const deltaY = Math.abs(clientY - this.startPoint.y);
    
    if (!this.hasDragged && (deltaX > this.dragThreshold || deltaY > this.dragThreshold)) {
      this.hasDragged = true;
      this.element.style.display = 'block';
    }

    if (this.hasDragged) {
      this.pointTopLeft.x = Math.min(this.startPoint.x, clientX);
      this.pointTopLeft.y = Math.min(this.startPoint.y, clientY);
      this.pointBottomRight.x = Math.max(this.startPoint.x, clientX);
      this.pointBottomRight.y = Math.max(this.startPoint.y, clientY);

      this.element.style.left = this.pointTopLeft.x + 'px';
      this.element.style.top = this.pointTopLeft.y + 'px';
      this.element.style.width = (this.pointBottomRight.x - this.pointTopLeft.x) + 'px';
      this.element.style.height = (this.pointBottomRight.y - this.pointTopLeft.y) + 'px';
    }
  }

  public onPointerUp(event?: PointerEvent): void;
  public onPointerUp(x?: number, y?: number): void;
  public onPointerUp(eventOrX?: PointerEvent | number, y?: number): void {
    this.isDown = false;
    this.element.style.display = 'none';
    this.hasDragged = false;
  }

  public get hasValidSelection(): boolean {
    return this.hasDragged;
  }

  public dispose(): void {
    if (this.element.parentElement) {
      this.element.parentElement.removeChild(this.element);
    }
  }
}