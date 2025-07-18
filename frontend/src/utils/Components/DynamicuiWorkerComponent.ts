import { Component } from "../Component";
import * as THREE from "three";
import { Entity } from "../Entity";
import { CSS2DObject } from "../CSS2D";
import { tween } from "shifty";
import { StaticCLI } from "../../SimpleCLI";
import {
  animate,
  
} from 'animejs';

// Prevent unused import from being cleared
const _ = animate;

class DynamicuiWorkerComponent extends Component {
  
  private _html: string;
  private _css2dobject: CSS2DObject;
  private _webgpuplane: THREE.Mesh;
  private _htmlElement: HTMLElement;
  private _titleBar: HTMLElement;
  private _contentContainer: HTMLElement;
  private _css2dgroup: THREE.Group = new THREE.Group();
  private _webgpugroup: THREE.Group = new THREE.Group();
  private _size: THREE.Vector2;
  sticky: boolean = false;
  uiWorker: Worker;
  pagescriptpath: string;
  flat: boolean;
  name: string = "Dynamic UI";

  constructor(pagescriptpath: string, name: string = "Dynamic UI") {
    super();
    this.pagescriptpath = pagescriptpath;
    this.name = name;
    this._size = new THREE.Vector2( window.innerWidth, window.innerHeight);
    this._htmlElement = document.createElement("div");
    this.flat = true;
    this.createTitleBar();
  }

  get HtmlElement() {
    return this._contentContainer || this._htmlElement;
  }
  get Size() {
    return this._size;
  }

  set Size(size: THREE.Vector2) {
    this.setSizeSmoothly(size);
    // this._htmlElement.style.height =  this._size.y  + "px"
    // this._htmlElement.style.width =    this._size.x  + "px"
    //  this._webgpuplane?.geometry.scale(2*this._size.x/100, 1.5*this._size.y/100, 1);
    //this._webgpuplane.geometry = new THREE.PlaneGeometry(2*this._size.x/100, 1.5*this._size.y/100);
  }

  set HtmlElement (htmlElement: HTMLElement) {
    this._contentContainer = htmlElement;
  }

  createTitleBar() {
    // Create main container
    this._htmlElement.style.display = "flex";
    this._htmlElement.style.flexDirection = "column";
    this._htmlElement.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
    this._htmlElement.style.borderRadius = "5px";
    this._htmlElement.style.overflow = "hidden";

    // Create title bar
    this._titleBar = document.createElement("div");
    this._titleBar.style.display = "flex";
    this._titleBar.style.alignItems = "center";
    this._titleBar.style.justifyContent = "space-between";
    this._titleBar.style.padding = "5px 10px";
    this._titleBar.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
    this._titleBar.style.borderBottom = "1px solid rgba(255, 255, 255, 0.2)";
    this._titleBar.style.minHeight = "30px";

    // Create title text
    const titleText = document.createElement("span");
    titleText.textContent = this.name;
    titleText.style.color = "white";
    titleText.style.fontSize = "12px";
    titleText.style.fontWeight = "bold";

    // Create buttons container
    const buttonsContainer = document.createElement("div");
    buttonsContainer.style.display = "flex";
    buttonsContainer.style.gap = "5px";

    // Create reload button
    const reloadBtn = document.createElement("span");
    reloadBtn.className = "uk-icon";
    reloadBtn.setAttribute("uk-icon", "icon: refresh; ratio: 0.8");
    reloadBtn.style.cursor = "pointer";
    reloadBtn.style.color = "#4a90e2";
    reloadBtn.title = "Reload component";
    reloadBtn.addEventListener("click", () => this.handleReload());

    // Create sticky toggle button
    const stickyBtn = document.createElement("span");
    stickyBtn.className = "uk-icon";
    stickyBtn.setAttribute("uk-icon", this.sticky ? "icon: lock; ratio: 0.8" : "icon: unlock; ratio: 0.8");
    stickyBtn.style.cursor = "pointer";
    stickyBtn.style.color = this.sticky ? "#ffa500" : "#666";
    stickyBtn.title = this.sticky ? "Make non-sticky" : "Make sticky";
    stickyBtn.addEventListener("click", () => this.toggleSticky(stickyBtn));

    // Create close button
    const closeBtn = document.createElement("span");
    closeBtn.className = "uk-icon";
    closeBtn.setAttribute("uk-icon", "icon: close; ratio: 0.8");
    closeBtn.style.cursor = "pointer";
    closeBtn.style.color = "#ff4444";
    closeBtn.title = "Close component";
    closeBtn.addEventListener("click", () => this.handleClose());

    // Assemble buttons
    buttonsContainer.appendChild(reloadBtn);
    buttonsContainer.appendChild(stickyBtn);
    buttonsContainer.appendChild(closeBtn);

    // Assemble title bar
    this._titleBar.appendChild(titleText);
    this._titleBar.appendChild(buttonsContainer);

    // Create content container
    this._contentContainer = document.createElement("div");
    this._contentContainer.style.flex = "1";
    this._contentContainer.style.overflow = "auto";
    this._contentContainer.style.padding = "10px";

    // Assemble main element
    this._htmlElement.appendChild(this._titleBar);
    this._htmlElement.appendChild(this._contentContainer);
  }

  private handleReload() {
    this.Reload();
  }

  private toggleSticky(stickyBtn: HTMLElement) {
    this.sticky = !this.sticky;
    stickyBtn.setAttribute("uk-icon", this.sticky ? "icon: lock; ratio: 0.8" : "icon: unlock; ratio: 0.8");
    stickyBtn.style.color = this.sticky ? "#ffa500" : "#666";
    stickyBtn.title = this.sticky ? "Make non-sticky" : "Make sticky";
  }

  private handleClose() {
    if (this._entity) {
      // Trigger entity destruction or removal
      this.Destroy();
    }
  }

  public setName(name: string) {
    this.name = name;
    if (this._titleBar) {
      const titleText = this._titleBar.querySelector("span");
      if (titleText) {
        titleText.textContent = name;
      }
    }
  }
  async InitComponent(entity: Entity): Promise<void> {
    this._entity = entity;
    this._css2dobject = new CSS2DObject(this._htmlElement);
    this._css2dgroup.add(this._css2dobject);

    const planeMaterial = new THREE.MeshLambertMaterial();
    planeMaterial.color.set("black");
    planeMaterial.opacity = 0.2;
    planeMaterial.blending = THREE.NoBlending;
    planeMaterial.transparent = false;
    planeMaterial.side = THREE.DoubleSide;
    this._webgpuplane = new THREE.Mesh(
      new THREE.PlaneGeometry(
        (1  * this._size.x) / 10,
        (1 * this._size.y) / 10
      ),
      planeMaterial
    );

    this._webgpuplane.userData.component = this;
    this._webgpugroup.add(this._webgpuplane);

   
  }

  async InitEntity(): Promise<void> {
 
    this._entity._entityManager._mc.webglscene.add(this._webgpugroup);
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

    this._entity._RegisterHandler("reset", async (_data: any) => {
       
      await this.Reload();
    });

    this.uiWorker = new Worker("./workers/dynamicloader.js?" + Date.now());

    this.uiWorker.onmessage = (e) => {
      //	console.log("Message received from worker", e.data);
      if (e.data.type === "boot") {
        this.uiWorker.postMessage({
          type: "init",
          filename:    this.pagescriptpath ,
          watch : true
        });
      }
      if (e.data.type === "freshhtml") {
        
        this._contentContainer.innerHTML = e.data.html;
      }
      if (e.data.type ==="jssetup"){
        eval(e.data.js).bind(this)();
      }
      if (e.data.type === "tick") {
        //	console.log(e.data.data);
        //this._entity.Position = new THREE.Vector3(e.data.data.x, e.data.data.y, e.data.data.z);
        //this._entity.Quaternion = new THREE.Quaternion(e.data.data.qx, e.data.data.qy, e.data.data.qz, e.data.data.qw);
      }

      if (e.data.type ==="size"){
        this._size = new THREE.Vector2(e.data.width, e.data.height);
    
      }
 
    };
 
  }

  async Reload() {
    this.uiWorker.terminate();
    this.uiWorker = new Worker("./workers/dynamicloader.js?" + Date.now());

    this.uiWorker.onmessage = (e) => {
      //	console.log("Message received from worker", e.data);
      if (e.data.type === "boot") {
        this.uiWorker.postMessage({
          type: "init",
          filename:    this.pagescriptpath ,
          watch : true
        });
      }
      if (e.data.type === "freshhtml") {
        
        this._contentContainer.innerHTML = e.data.html;
      }
      if (e.data.type ==="jssetup"){
        eval(e.data.js).bind(this)();
      }
      if (e.data.type === "tick") {
        //	console.log(e.data.data);
        //this._entity.Position = new THREE.Vector3(e.data.data.x, e.data.data.y, e.data.data.z);
        //this._entity.Quaternion = new THREE.Quaternion(e.data.data.qx, e.data.data.qy, e.data.data.qz, e.data.data.qw);
      }

      if (e.data.type ==="size"){
        this._size = new THREE.Vector2(e.data.width, e.data.height);
    
      }
 
    };
    
  }
  async zoom(radius =8) {

     // this._entity._entityManager._mc.zoomTo(p, radius, this._entity.Quaternion);

  
      let startpos = new THREE.Vector3(
      this._entity.Position.x ,
      this._entity.Position.y + radius,
      this._entity.Position.z 
    );



    //  let contactFlow = [
    //    startpos.clone().add( new THREE.Vector3 (0, 0, -0.25* this._size.y/100 ) ), 
    //    startpos.clone().add( new THREE.Vector3 (0, 0,0.25* this._size.y/100 ) ),
  

       
    //  ];

    //  let lookatFlow = [
    //    new THREE.Vector3 ( 0, -1, 0)
 

      
    //    // new THREE.Vector3(25, -100, 0),

      
    //  ];
    //  this._entity._entityManager._mc.UIManager.splinePath.points = contactFlow;   
    //  this._entity._entityManager._mc.UIManager.lookatPath = lookatFlow;
    //  this._entity._entityManager._mc.UIManager.updateSplineObject();
    //  this._entity._entityManager._mc.UIManager.cubePosition =  0.4;

    //  this._entity._entityManager._mc.UIManager.updateScrollbarPosition();


    if (this._entity._entityManager._mc.UIManager.scrollmodenavigation == false) {
      this._entity._entityManager._mc.UIManager.toggleScrollmode();
    }
  
    // this._entity._entityManager._mc.UIManager.toggleScrollmode();
  //  this._entity._entityManager._mc.CameraControls.zoom(10*radius  , true )
      const _centerPosition = new THREE.Vector3();
      const _normal = new THREE.Vector3();
      const _cameraPosition = new THREE.Vector3();



      // const rectCenterPosition = _centerPosition.copy(   this._entity.Position );
      // const rectNormal = _normal.set( 0, 0, 1 ).applyQuaternion(  this._entity.Quaternion );
      // const distance =  radius;
      // const cameraPosition = _cameraPosition.copy( rectNormal ).multiplyScalar( - distance ).add( rectCenterPosition );
    
      // this._entity._entityManager._mc.CameraControls.setLookAt(
      //   cameraPosition.x, cameraPosition.y, cameraPosition.z,
      //   rectCenterPosition.x, rectCenterPosition.y, rectCenterPosition.z,
      //   true,
      // );  
  
     
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
    this._entity._entityManager._mc.webglscene.remove(this._webgpugroup);
    this._entity._entityManager._mc.html2dScene.remove(this._css2dgroup);
    
    // Clean up UI elements
    if (this._titleBar) {
      // Remove event listeners by cloning elements
      const buttons = this._titleBar.querySelectorAll("span.uk-icon");
      buttons.forEach(button => {
        const newButton = button.cloneNode(true);
        if (button.parentNode) {
          button.parentNode.replaceChild(newButton, button);
        }
      });
    }
    
    if (this.uiWorker) {
      this.uiWorker.terminate();
    }
    
    this._htmlElement.remove();
  }

  findCursor() {
    // Find the span element with the data attribute data-cli-cursor
    let cursor = this._contentContainer.querySelector('span[data-cli-cursor]');
    let rect = cursor.getBoundingClientRect();

    // Calculate normalized device coordinates (NDC)
    let ndcX = (rect.left + rect.width / 2) / window.innerWidth * 2 - 1;
    let ndcY = -(rect.top + rect.height / 2) / window.innerHeight * 2 + 1;

    // Create a vector for NDC
    let ndcVector = new THREE.Vector3(ndcX, ndcY, 0.5); // z = 0.5 for the unprojection from screen space

    // Unproject the NDC to world coordinates
    ndcVector.unproject(this._entity._entityManager._mc.camera);

    // Create a ray from the camera to the unprojected point
    let ray = new THREE.Raycaster(
        this._entity._entityManager._mc.camera.position, 
        ndcVector.sub(this._entity._entityManager._mc.camera.position).normalize()
    );

    // Define the plane using its position and rotation
    let planeY = this._webgpuplane.position.y; // Assuming the plane is horizontal at y = 0
    let planeNormal = new THREE.Vector3(0, 1, 0); // Plane normal for horizontal plane

    // Calculate the intersection of the ray with the horizontal plane
    let t = (planeY - ray.ray.origin.y) / ray.ray.direction.y;
    let intersection = ray.ray.origin.clone().add(ray.ray.direction.clone().multiplyScalar(t));

    return intersection;
}

getElementPosition( htmlElement: HTMLElement) {
  // Find the span element with the data attribute data-cli-cursor

  //
   let cursor =  htmlElement
  let rect = cursor.getBoundingClientRect();

  // Calculate normalized device coordinates (NDC)
  let ndcX = (rect.left + rect.width / 2) / window.innerWidth * 2 - 1;
  let ndcY = -(rect.top + rect.height / 2) / window.innerHeight * 2 + 1;

  // Create a vector for NDC
  let ndcVector = new THREE.Vector3(ndcX, ndcY, 0.5); // z = 0.5 for the unprojection from screen space

  // Unproject the NDC to world coordinates
  ndcVector.unproject(this._entity._entityManager._mc.camera);

  // Create a ray from the camera to the unprojected point
  let ray = new THREE.Raycaster(
      this._entity._entityManager._mc.camera.position, 
      ndcVector.sub(this._entity._entityManager._mc.camera.position).normalize()
  );

  // Define the plane using its position and rotation
  let planeY = this._webgpuplane.position.y; // Assuming the plane is horizontal at y = 0
 
  // Calculate the intersection of the ray with the horizontal plane
  let t = (planeY - ray.ray.origin.y) / ray.ray.direction.y;
  let intersection = ray.ray.origin.clone().add(ray.ray.direction.clone().multiplyScalar(t));

  return intersection;
}
 
  async typeinelement(element: HTMLElement, text: string, speed: number = 50) {
    await StaticCLI.typeInside(element, "uk-card-title", text, speed, false); 
}
}

export { DynamicuiWorkerComponent  };
