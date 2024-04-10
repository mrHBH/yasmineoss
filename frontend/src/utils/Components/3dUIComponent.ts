import { Component } from "../Component";
import * as THREE from "three";
import { Entity } from "../Entity";
import { CSS3DObject } from "../CSS3D";
import { tween } from "shifty";
class threeDUIComponent extends Component {
  private _html: string;
  private _css3dobject: CSS3DObject;
  private _webgpuplane: THREE.Mesh;
  private _htmlElement: HTMLElement;
  private _css3dgroup: THREE.Group = new THREE.Group();
  private _webgpugroup: THREE.Group = new THREE.Group();
  private _size: THREE.Vector2;
  sticky: boolean = false;

  constructor(html: string, size?: THREE.Vector2) {
    super();
    this._componentname = "3dUIComponent";
    this._html = html;
    this._size = size ? size : new THREE.Vector2(1500, 1500);
  }

  get htmlElement() {
    return this._htmlElement;
  }
  get Size() {
    return this._size;
  }

  set Size(size: THREE.Vector2) {
    this._size = size;
    // this._htmlElement.style.height =  this._size.y  + "px"
    // this._htmlElement.style.width =    this._size.x  + "px"
    //  this._webgpuplane?.geometry.scale(2*this._size.x/100, 1.5*this._size.y/100, 1);
    //this._webgpuplane.geometry = new THREE.PlaneGeometry(2*this._size.x/100, 1.5*this._size.y/100);
  }

  async InitComponent(entity: Entity): Promise<void> {
    this._entity = entity;
    this._htmlElement = document.createElement("div");
    this._htmlElement.innerHTML = this._html;
    //opacity and position transitions
    this._htmlElement.style.transition = "opacity 0.5s ";
    this._htmlElement.style.height = this._size.y + "px";
    this._htmlElement.style.width = this._size.x + "px";

    this._css3dobject = new CSS3DObject(this._htmlElement);
    this._css3dobject.scale.set(0.01, 0.01, 0.01);
    this._css3dgroup.add(this._css3dobject);

    const planeMaterial = new THREE.MeshLambertMaterial();
    planeMaterial.color.set("black");
    planeMaterial.opacity = 0;
    planeMaterial.blending = THREE.NoBlending;
    planeMaterial.transparent = false;
    planeMaterial.side = THREE.DoubleSide;
    this._webgpuplane = new THREE.Mesh(
      new THREE.PlaneGeometry(
        ( this._size.x) / 100,
        (  this._size.y) / 100
      ),
      planeMaterial
    );

    this._webgpuplane.userData.component = this;
    this._webgpugroup.add(this._webgpuplane);
  }

  async InitEntity(): Promise<void> {
    this._entity._entityManager._mc.webgpuscene.add(this._webgpugroup);
    this._entity._entityManager._mc.html3dScene.add(this._css3dgroup);
    this._entity._RegisterHandler("zoom", async () => {
      await this.zoom();
    });

    this._entity._RegisterHandler("setSize", async (data: any) => {
      console.log(data);
      await this.setSizeSmoothly(data?.size as THREE.Vector2);
    });
  }

  async zoom(radius =5) {
    
    let p = this._entity.position.clone(); // Make sure to clone so you don't accidentally modify the original position
    let quat = this._entity.rotation.clone();
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
      this._entity.position.x,
      this._entity.position.y,
      this._entity.position.z
    );
    this._webgpugroup?.rotation.set(
      this._entity.rotation.x,
      this._entity.rotation.y,
      this._entity.rotation.z
    );
    this._css3dgroup?.position.set(
      this._entity.position.x,
      this._entity.position.y,
      this._entity.position.z
    );
    this._css3dgroup?.rotation.set(
      this._entity.rotation.x,
      this._entity.rotation.y,
      this._entity.rotation.z
    );

    // const distance = this._entity.position.distanceTo(
    //   this._entity._entityManager._mc.camera.position
    // );
    // //hide the opacity of this._titlebar if the distance is greater than 10
    // if (this.sticky) {
    //   return;
    // }
    // if (distance > 15) {
    //   this._htmlElement.style.opacity = "0";
    //   this._htmlElement.style.pointerEvents = "none";
    // } else {
    //   this._htmlElement.style.opacity = "1";
    //   this._htmlElement.style.pointerEvents = "auto";
    // }
  }
}

export { threeDUIComponent };
