import { Component } from "../Component";
import * as THREE from "three";
import { Entity } from "../Entity";
import { CSS2DObject } from "../CSS2D";
import { tween } from "shifty";
import { max } from "three/webgpu";
import { StaticCLI } from "../../SimpleCLI";
import SimpleBar from "simplebar";
 class twoDUIComponent extends Component {
  private _html: string;
  private _css2dobject: CSS2DObject;
  private _webgpuplane: THREE.Mesh;
  private _htmlElement: HTMLElement;
  private _css2dgroup: THREE.Group = new THREE.Group();
  private _webgpugroup: THREE.Group = new THREE.Group();
  private _size: THREE.Vector2;
  sticky: boolean = false;
   maximized: boolean;
   typed: boolean;

  constructor(html: string, size?: THREE.Vector2) {
    super();
    this._html = html;
    this._size = size ? size : new THREE.Vector2(500, 500);
    
  }

  get HtmlElement() {
    return this._htmlElement;
  }
  get Size() {
    return this._size;
  }

  set Size(size: THREE.Vector2) {
    this._size = size;
     this._htmlElement.style.height =  this._size.y  + "px"
     this._htmlElement.style.width =    this._size.x  + "px"
   //   this._webgpuplane?.geometry.scale(2*this._size.x/100, 1.5*this._size.y/100, 1);
    this._webgpuplane.geometry = new THREE.PlaneGeometry(2*this._size.x/100, 1.5*this._size.y/100);
  }

  set HtmlElement (htmlElement: HTMLElement) {
    this._htmlElement = htmlElement;
  }
  async InitComponent(entity: Entity): Promise<void> {
    this._entity = entity;
    this._htmlElement = document.createElement("div");
 
    this._htmlElement.innerHTML = this._html;
 
    //opacity and position transitions
    this._htmlElement.style.transition = " opacity 0.5s ";
    this._htmlElement.style.height = this._size.y + "px";
    this._htmlElement.style.width = this._size.x + "px";

    this._css2dobject = new CSS2DObject(this._htmlElement);
    this._css2dgroup.add(this._css2dobject);

    new SimpleBar( this._htmlElement);


    const planeMaterial = new THREE.MeshLambertMaterial();
    planeMaterial.color.set("black");
    planeMaterial.opacity = 0;
    planeMaterial.blending = THREE.NoBlending;
    planeMaterial.transparent = false;
    planeMaterial.side = THREE.DoubleSide;
    this._webgpuplane = new THREE.Mesh(
      new THREE.PlaneGeometry(
        (1.5 * this._size.x) / 100,
        (1.5 * this._size.y) / 100
      ),
      planeMaterial
    );

    this._webgpuplane.userData.component = this;
    this._webgpugroup.add(this._webgpuplane);
  }


  async AnimateType(text: string, delay: number = 100) {
      
          StaticCLI.typeSync(this._htmlElement, text, delay, true);
  
  }

  async InitEntity(): Promise<void> {
    this._entity._entityManager._mc.webgpuscene.add(this._webgpugroup);
    this._entity._entityManager._mc.html2dScene.add(this._css2dgroup);
    this._entity._RegisterHandler("zoom", async () => {
      await this.zoom();
    });

    this._entity._RegisterHandler("setSize", async (data: any) => {
      console.log(data);
      await this.setSizeSmoothly(data?.size as THREE.Vector2);
    });
  }

  async zoom(radius =5) {
    
    let p = this._entity.Position.clone(); // Make sure to clone so you don't accidentally modify the original position
    let quat = this._entity.Quaternion.clone();
    this._entity._entityManager._mc.zoomTo(p, radius, quat);
  }

  async setSizeSmoothly(size: THREE.Vector2) {
    console.log("setSizeSmoothly");
    console.log(size);
    this._size = size;

    tween({
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

    // this._htmlElement.style.height = this._size.y + "px";
    // this._htmlElement.style.width = this._size.x + "px";
    // this._webgpuplane.geometry = new THREE.PlaneGeometry(
    //   (2 * this._size.x) / 100,
    //   (1.5 * this._size.y) / 100
    // );
    tween({
      from: { x: this._webgpuplane.scale.x, y: this._webgpuplane.scale.y },
      to: { x: (1.5 * this._size.x) / 100, y: (1.5 * this._size.y) / 100 },
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

    if (this.maximized    &&  (this._size.x !== window.innerWidth || this._size.y !== window.innerHeight)) {

      console.log("maximized");
      this.Size = new THREE.Vector2( window.innerWidth, window.innerHeight);
    }
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
    //apply a transition to the opacity of the html element
    // this._htmlElement.style.transition = "opacity 0.5s";
    // this._htmlElement.style.opacity = "0";
    //check if a scroll bar is present , if yes hide it

      this._htmlElement.style.overflow = "hidden";
      this._htmlElement.style.overflowY = "hidden";
      this._htmlElement.style.overflowX = "hidden";
     this._webgpuplane.material.transparent = true;
     tween({
      from: { x:  1},
      to: { x: 0 },
      duration: 1000,
      easing: "easeOutQuad",
      render: (state: any) => {
        this._webgpuplane.material.opacity = 0;
        this._htmlElement.style.opacity = state.x;
      },
      finish: () => {
        this._entity._entityManager._mc.webgpuscene.remove(this._webgpugroup);
        this._entity._entityManager._mc.html2dScene.remove(this._css2dgroup);
        this._htmlElement.remove();
      }
      
    });
 
    // setTimeout(() => {
    // this._entity._entityManager._mc.webgpuscene.remove(this._webgpugroup);
    // this._entity._entityManager._mc.html2dScene.remove(this._css2dgroup);
    // this._htmlElement.remove();

    // }
    

  }
}

export { twoDUIComponent };
