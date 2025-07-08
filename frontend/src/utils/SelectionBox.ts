import * as THREE from 'three';

export class SelectionBox {
  private camera: THREE.Camera;
  private scene: THREE.Scene;
  private center: THREE.Vector3;
  private vectemp1: THREE.Vector3;

  public startPoint: THREE.Vector3;
  public endPoint: THREE.Vector3;
  public collection: THREE.Object3D[];

  constructor(camera: THREE.Camera, renderer: THREE.WebGLRenderer, scene?: THREE.Scene) {
    this.camera = camera;
    this.scene = scene || new THREE.Scene();
    this.startPoint = new THREE.Vector3();
    this.endPoint = new THREE.Vector3();
    this.collection = [];
    this.center = new THREE.Vector3();
    this.vectemp1 = new THREE.Vector3();
  }

  public select(selectables?: THREE.Object3D[]): THREE.Object3D[] {
    this.collection = [];
    
    // Use a more accurate selection method based on screen bounds
    const objects = selectables || this.scene.children;
    console.log('SelectionBox: Starting selection with', objects.length, 'root objects');
    
    this.searchObjectsInScreenBounds(objects);
    
    console.log('SelectionBox: Selection complete, found', this.collection.length, 'selectable objects');
    return this.collection;
  }

  private searchObjectsInScreenBounds(objects: THREE.Object3D[]): void {
    // Calculate selection bounds in normalized device coordinates (NDC)
    const minX = Math.min(this.startPoint.x, this.endPoint.x);
    const maxX = Math.max(this.startPoint.x, this.endPoint.x);
    const minY = Math.min(this.startPoint.y, this.endPoint.y);
    const maxY = Math.max(this.startPoint.y, this.endPoint.y);

    console.log('SelectionBox: Selection bounds (NDC):', { minX, maxX, minY, maxY });

    for (const object of objects) {
      this.checkObjectInBounds(object, minX, maxX, minY, maxY);
      
      // Always check children regardless of object type
      if (object.children.length > 0) {
        this.searchObjectsInScreenBounds(object.children);
      }
    }
  }

  private checkObjectInBounds(object: THREE.Object3D, minX: number, maxX: number, minY: number, maxY: number): void {
    // Only check selectable objects
    if (!(object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.Points)) {
      return;
    }

    if (!object.geometry) {
      return;
    }

    // Compute bounding box for more accurate selection
    if (object.geometry.boundingBox === null) {
      object.geometry.computeBoundingBox();
    }

    if (!object.geometry.boundingBox) {
      return;
    }

    // Get the 8 corners of the bounding box in world space
    const bbox = object.geometry.boundingBox.clone();
    const corners = [
      new THREE.Vector3(bbox.min.x, bbox.min.y, bbox.min.z),
      new THREE.Vector3(bbox.max.x, bbox.min.y, bbox.min.z),
      new THREE.Vector3(bbox.min.x, bbox.max.y, bbox.min.z),
      new THREE.Vector3(bbox.max.x, bbox.max.y, bbox.min.z),
      new THREE.Vector3(bbox.min.x, bbox.min.y, bbox.max.z),
      new THREE.Vector3(bbox.max.x, bbox.min.y, bbox.max.z),
      new THREE.Vector3(bbox.min.x, bbox.max.y, bbox.max.z),
      new THREE.Vector3(bbox.max.x, bbox.max.y, bbox.max.z)
    ];

    // Transform corners to world space
    corners.forEach(corner => {
      corner.applyMatrix4(object.matrixWorld);
    });

    // Project all corners to screen space and check if any are within bounds
    let anyCornerInside = false;
    
    for (const corner of corners) {
      this.vectemp1.copy(corner);
      this.vectemp1.project(this.camera);
      
      const x = this.vectemp1.x;
      const y = this.vectemp1.y;
      
      // Check if this corner is within the selection bounds
      if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
        anyCornerInside = true;
        break; // Early exit if we find one corner inside
      }
    }

    // Also check if the object's center is within bounds (fallback for very small objects)
    if (!anyCornerInside) {
      // Compute bounding sphere as fallback
      if (object.geometry.boundingSphere === null) {
        object.geometry.computeBoundingSphere();
      }

      if (object.geometry.boundingSphere) {
        this.center.copy(object.geometry.boundingSphere.center);
        this.center.applyMatrix4(object.matrixWorld);
        this.vectemp1.copy(this.center);
        this.vectemp1.project(this.camera);

        const centerInBounds = this.vectemp1.x >= minX && this.vectemp1.x <= maxX && 
                              this.vectemp1.y >= minY && this.vectemp1.y <= maxY;
        
        if (centerInBounds) {
          anyCornerInside = true;
        }
      }
    }

    if (anyCornerInside) {
      this.collection.push(object);
      console.log('SelectionBox: Selected object:', object.type, object.name || 'unnamed', 
                  'hasEntity:', !!object.userData?.entity);
      if (object.userData?.entity) {
        console.log('SelectionBox: Entity name:', object.userData.entity.name);
      }
    }
  }
}