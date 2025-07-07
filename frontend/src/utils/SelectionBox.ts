import * as THREE from 'three';

export class SelectionBox {
  private camera: THREE.Camera;
  private scene: THREE.Scene;
  private frustum: THREE.Frustum;
  private center: THREE.Vector3;
  private vecNear: THREE.Vector3;
  private vecTopLeft: THREE.Vector3;
  private vecTopRight: THREE.Vector3;
  private vecDownRight: THREE.Vector3;
  private vecDownLeft: THREE.Vector3;
  private vecFarTopLeft: THREE.Vector3;
  private vecFarTopRight: THREE.Vector3;
  private vecFarDownRight: THREE.Vector3;
  private vecFarDownLeft: THREE.Vector3;
  private vectemp1: THREE.Vector3;
  private vectemp2: THREE.Vector3;
  private vectemp3: THREE.Vector3;

  public startPoint: THREE.Vector3;
  public endPoint: THREE.Vector3;
  public collection: THREE.Object3D[];

  constructor(camera: THREE.Camera, renderer: THREE.WebGLRenderer, scene?: THREE.Scene) {
    this.camera = camera;
    this.scene = scene || new THREE.Scene();
    this.startPoint = new THREE.Vector3();
    this.endPoint = new THREE.Vector3();
    this.collection = [];
    this.frustum = new THREE.Frustum();
    this.center = new THREE.Vector3();
    this.vecNear = new THREE.Vector3();
    this.vecTopLeft = new THREE.Vector3();
    this.vecTopRight = new THREE.Vector3();
    this.vecDownRight = new THREE.Vector3();
    this.vecDownLeft = new THREE.Vector3();
    this.vecFarTopLeft = new THREE.Vector3();
    this.vecFarTopRight = new THREE.Vector3();
    this.vecFarDownRight = new THREE.Vector3();
    this.vecFarDownLeft = new THREE.Vector3();
    this.vectemp1 = new THREE.Vector3();
    this.vectemp2 = new THREE.Vector3();
    this.vectemp3 = new THREE.Vector3();
  }

  public select(selectables?: THREE.Object3D[]): THREE.Object3D[] {
    this.collection = [];
    this.updateFrustum(this.startPoint, this.endPoint);
    console.log('SelectionBox: Starting selection with', selectables?.length || this.scene.children.length, 'root objects');
    this.searchChildInFrustum(this.frustum, selectables || this.scene.children);
    console.log('SelectionBox: Selection complete, found', this.collection.length, 'selectable objects');
    return this.collection;
  }

  private updateFrustum(startPoint: THREE.Vector3, endPoint: THREE.Vector3): void {
    startPoint = startPoint || this.startPoint;
    endPoint = endPoint || this.endPoint;

    // Ensure we have a proper camera
    if (!this.camera || !(this.camera instanceof THREE.PerspectiveCamera)) {
      console.warn('SelectionBox: Camera must be a PerspectiveCamera');
      return;
    }

    const camera = this.camera as THREE.PerspectiveCamera;
    
    this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld();

    if (startPoint.x !== endPoint.x || startPoint.y !== endPoint.y) {
      this.vecNear.setFromMatrixPosition(this.camera.matrixWorld);
      this.vecTopLeft.copy(startPoint);
      this.vecTopRight.set(endPoint.x, startPoint.y, 0);
      this.vecDownRight.copy(endPoint);
      this.vecDownLeft.set(startPoint.x, endPoint.y, 0);

      this.vecTopLeft.unproject(this.camera);
      this.vecTopRight.unproject(this.camera);
      this.vecDownRight.unproject(this.camera);
      this.vecDownLeft.unproject(this.camera);

      this.vectemp1.copy(this.vecTopLeft).sub(this.vecNear);
      this.vectemp2.copy(this.vecTopRight).sub(this.vecNear);
      this.vectemp3.copy(this.vecDownRight).sub(this.vecNear);
      this.vectemp1.normalize();
      this.vectemp2.normalize();
      this.vectemp3.normalize();

      this.vectemp1.multiplyScalar(camera.far);
      this.vectemp2.multiplyScalar(camera.far);
      this.vectemp3.multiplyScalar(camera.far);
      this.vectemp1.add(this.vecNear);
      this.vectemp2.add(this.vecNear);
      this.vectemp3.add(this.vecNear);

      this.vecFarTopLeft.copy(this.vectemp1);
      this.vecFarTopRight.copy(this.vectemp2);
      this.vecFarDownRight.copy(this.vectemp3);

      this.vectemp1.copy(this.vecDownLeft).sub(this.vecNear);
      this.vectemp1.normalize();
      this.vectemp1.multiplyScalar(camera.far);
      this.vectemp1.add(this.vecNear);
      this.vecFarDownLeft.copy(this.vectemp1);

      this.frustum.setFromProjectionMatrix(
        new THREE.Matrix4().multiplyMatrices(
          camera.projectionMatrix,
          camera.matrixWorldInverse
        )
      );

      // Create selection frustum
      const planes = this.frustum.planes;
      
      // Near plane
      this.vectemp1.copy(this.vecTopLeft).sub(this.vecTopRight);
      this.vectemp2.copy(this.vecTopLeft).sub(this.vecDownLeft);
      this.vectemp1.cross(this.vectemp2).normalize();
      planes[0].setFromNormalAndCoplanarPoint(this.vectemp1, this.vecTopLeft);

      // Right plane
      this.vectemp1.copy(this.vecTopRight).sub(this.vecDownRight);
      this.vectemp2.copy(this.vecTopRight).sub(this.vecNear);
      this.vectemp1.cross(this.vectemp2).normalize();
      planes[1].setFromNormalAndCoplanarPoint(this.vectemp1, this.vecTopRight);

      // Bottom plane
      this.vectemp1.copy(this.vecDownRight).sub(this.vecDownLeft);
      this.vectemp2.copy(this.vecDownRight).sub(this.vecNear);
      this.vectemp1.cross(this.vectemp2).normalize();
      planes[2].setFromNormalAndCoplanarPoint(this.vectemp1, this.vecDownRight);

      // Left plane
      this.vectemp1.copy(this.vecDownLeft).sub(this.vecTopLeft);
      this.vectemp2.copy(this.vecDownLeft).sub(this.vecNear);
      this.vectemp1.cross(this.vectemp2).normalize();
      planes[3].setFromNormalAndCoplanarPoint(this.vectemp1, this.vecDownLeft);

      // Top plane
      this.vectemp1.copy(this.vecTopLeft).sub(this.vecTopRight);
      this.vectemp2.copy(this.vecTopLeft).sub(this.vecNear);
      this.vectemp1.cross(this.vectemp2).normalize();
      planes[4].setFromNormalAndCoplanarPoint(this.vectemp1, this.vecTopLeft);

      // Far plane
      this.vectemp1.copy(this.vecFarTopRight).sub(this.vecFarTopLeft);
      this.vectemp2.copy(this.vecFarTopRight).sub(this.vecFarDownRight);
      this.vectemp1.cross(this.vectemp2).normalize();
      planes[5].setFromNormalAndCoplanarPoint(this.vectemp1, this.vecFarTopRight);
    }
  }

  private searchChildInFrustum(frustum: THREE.Frustum, objects: THREE.Object3D[]): void {
    for (const object of objects) {
      // Check if this object itself is selectable
      if (object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.Points) {
        if (object.geometry) {
          if (object.geometry.boundingSphere === null) {
            object.geometry.computeBoundingSphere();
          }

          if (object.geometry.boundingSphere) {
            this.center.copy(object.geometry.boundingSphere.center);
            this.center.applyMatrix4(object.matrixWorld);

            if (frustum.containsPoint(this.center)) {
              this.collection.push(object);
              console.log('SelectionBox: Selected object:', object.type, object.name || 'unnamed', 'hasEntity:', !!object.userData?.entity);
              if (object.userData?.entity) {
                console.log('SelectionBox: Entity name:', object.userData.entity.name);
              }
            }
          }
        }
      }

      // Always check children regardless of object type
      if (object.children.length > 0) {
        this.searchChildInFrustum(frustum, object.children);
      }
    }
  }
}