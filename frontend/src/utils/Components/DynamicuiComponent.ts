import { Component } from "../Component";
import * as THREE from "three";
import { Entity } from "../Entity";
import { CSS2DObject } from "../CSS2D";
import { tween } from "shifty";
import { watch } from "fs";
import { StaticCLI } from "../../SimpleCLI";
class DynamicuiComponent extends Component {
  
  private _html: string;
  private _css2dobject: CSS2DObject;
  private _webgpuplane: THREE.Mesh;
  private _htmlElement: HTMLElement;
  private _css2dgroup: THREE.Group = new THREE.Group();
  private _webgpugroup: THREE.Group = new THREE.Group();
  private _size: THREE.Vector2;
  sticky: boolean = true;
  flat: boolean;
  wrapper: HTMLDivElement;

  constructor() {
    super();
     this._size = new THREE.Vector2(window.innerWidth, window.innerHeight);
    this._htmlElement = document.createElement("div");
    this.flat = true;

  }

  get HtmlElement() {
    return this._htmlElement;
  }
  get Size() {
    return this._size;
  }

  set Size(size: THREE.Vector2) {
    this.setSizeSmoothly(size); 
  }

  set HtmlElement (htmlElement: HTMLElement) {
    this._htmlElement = htmlElement;
  }
  async InitComponent(entity: Entity): Promise<void> {
    this._entity = entity;
    this.wrapper= document.createElement("div");
    this.wrapper.appendChild(this._htmlElement);
    this._css2dobject = new CSS2DObject(this.wrapper);
    this._css2dgroup.add(this._css2dobject);
     

    const planeMaterial = new THREE.MeshLambertMaterial();
    planeMaterial.color.set("black");
    planeMaterial.opacity = 0;
    planeMaterial.blending = THREE.NoBlending;
    planeMaterial.transparent = false;
    planeMaterial.side = THREE.DoubleSide;
    this._webgpuplane = new THREE.Mesh(
      new THREE.PlaneGeometry(
        (   this._size.x) / 10,
        (   this._size.y) / 10
      ),
      planeMaterial
    );

    this._webgpuplane.userData.component = this;
    this._webgpugroup.add(this._webgpuplane);

   
  }

 


  async InitEntity(): Promise<void> {
 
    this._entity._entityManager._mc.webgpuscene.add(this._webgpugroup);
    this._entity._entityManager._mc.html2dScene.add(this._css2dgroup);
     this._entity._RegisterHandler("zoom", async (data: any) => {
      if (data?.value) {
         await this.zoom(data?.value);
      
        }
        else {
          await this.zoom();
        }
      }
  );

    this._entity._RegisterHandler("setSize", async (data: any) => {
      console.log(data);
      await this.setSizeSmoothly(data?.size as THREE.Vector2);
    });

    this._entity._RegisterHandler("reset", async (data: any) => {
       
      await this.Reload();
    });

   
 
  }

  async Reload() {
 
    
  }


  async zoom(radius = 20) {

     // this._entity._entityManager._mc.zoomTo(p, radius, this._entity.Quaternion);
    //create 5 points for the camera to move to , starting from top of the entity to the bottom
    let startpos = new THREE.Vector3(
      this._entity.Position.x ,
      this._entity.Position.y  ,
      this._entity.Position.z 
    );


    let contactFlow = [
      startpos,   
      startpos.clone().add( new THREE.Vector3 (0, 0, -5) ),


      
    ];

    let lookatFlow = [
      new THREE.Vector3 ( 0, -1, 0)


     
      // new THREE.Vector3(25, -100, 0),

     
    ];
     this._entity._entityManager._mc.UIManager.splinePath.points = contactFlow;   
     this._entity._entityManager._mc.UIManager.lookatPath = lookatFlow;
     this._entity._entityManager._mc.UIManager.updateSplineObject();
     this._entity._entityManager._mc.UIManager.cubePosition =  0.001;

     this._entity._entityManager._mc.UIManager.updateScrollbarPosition();
  
    this._entity._entityManager._mc.UIManager.toggleScrollmode();
      const _centerPosition = new THREE.Vector3();
      const _normal = new THREE.Vector3();
      const _cameraPosition = new THREE.Vector3();



      const rectCenterPosition = _centerPosition.copy(   this._entity.Position );
      const rectNormal = _normal.set( 0, 0, 1 ).applyQuaternion(  this._entity.Quaternion );
      const distance =  radius;
      const cameraPosition = _cameraPosition.copy( rectNormal ).multiplyScalar( - distance ).add( rectCenterPosition );
    
      // this._entity._entityManager._mc.CameraControls.setLookAt(
      //   cameraPosition.x, cameraPosition.y, cameraPosition.z,
      //   rectCenterPosition.x, rectCenterPosition.y, rectCenterPosition.z,
      //   true,
      // );  
  
     
  }

  async setSizeSmoothly(size: THREE.Vector2) {
 
    this._size = size;
 
    tween({
      from: { x: this._webgpuplane.scale.x, y: this._webgpuplane.scale.y },
      to: { x: (1 * this._size.x) / 100, y: (1 * this._size.y) / 100 },
      duration: 1500,
      easing: "easeOutQuad",
      render: (state: any) => {
        this._webgpuplane.scale.set(state.x, state.y, 1);
         
      },
    });
  }

  async Update(deltaTime: number): Promise<void> {
    this._webgpugroup?.position.set(
      this._entity.Position.x,
      this._entity.Position.y,
      this._entity.Position.z
    );
    this._webgpugroup?.quaternion.set(
      this._entity.Quaternion.x,
      this._entity.Quaternion.y,
      this._entity.Quaternion.z,
      this._entity.Quaternion.w
    );
    this._css2dgroup?.position.set(
      this._entity.Position.x,
      this._entity.Position.y,
      this._entity.Position.z
    );
    this._css2dgroup?.quaternion.set(
      this._entity.Quaternion.x,
      this._entity.Quaternion.y,
      this._entity.Quaternion.z,
      this._entity.Quaternion.w
    );

    const distance = this._entity.Position.distanceTo(
      this._entity._entityManager._mc.camera.position
    );
    //hide the opacity of this._titlebar if the distance is greater than 10
    if (this.sticky) {
      return;
    }
     if (distance > 15) {
      this._htmlElement.style.opacity = "0";
      this._htmlElement.style.pointerEvents = "none";
        tween({
        from: { x: this._webgpuplane.scale.x, y: this._webgpuplane.scale.y },
        to: { x: (0.1 ) / 100, y: (0.1 ) / 100 },
        duration: 500,
        easing: "easeOutQuad",
        render: (state: any) => {
          this._webgpuplane.scale.set(state.x, state.y, 1);
        },
      });
    
    } else {
        tween({
        from: { x: this._webgpuplane.scale.x, y: this._webgpuplane.scale.y },
        to: { x: (0.1 * this._size.x) / 100, y: (0.1 * this._size.y ) / 100 },
        duration: 500,
        easing: "easeOutQuad",
        render: (state: any) => {
          this._webgpuplane.scale.set(state.x, state.y, 1);
        },
      });
      
      this._htmlElement.style.opacity = "1";
      this._htmlElement.style.pointerEvents = "auto";
    }
  }

   async Destroy(): Promise<void> {
    this._entity._entityManager._mc.webgpuscene.remove(this._webgpugroup);
    this._entity._entityManager._mc.html2dScene.remove(this._css2dgroup);
    this._htmlElement.remove();
    

  }


  async typeinelement(element: HTMLElement, text: string, speed: number = 50) {
    await StaticCLI.typeInside(element, "uk-card-title", text, speed, false); 
}
}

export { DynamicuiComponent  };
