import { Component } from "../Component";
import * as THREE from "three";
import { Entity } from "../Entity";
import { CSS2DObject } from "../CSS2D";
import { tween } from "shifty";
import { abs, max } from "three/webgpu";
import { StaticCLI } from "../../SimpleCLI";
import SimpleBar from "simplebar";
import { mapContext } from "xstate/lib/utils";
import * as monaco from 'monaco-editor';
import { init } from "xstate/lib/actionTypes";


 class twoDUIComponent extends Component {
  private _html: string;
  private _css2dobject: CSS2DObject;
  private _webgpuplane: THREE.Mesh;
  private _htmlElement: HTMLElement;
  private _css2dgroup: THREE.Group = new THREE.Group();
  private _webgpugroup: THREE.Group = new THREE.Group();
  private _size: THREE.Vector2;
  sticky: boolean = false;
   fittoscroll: boolean;
   typed: boolean;
   lastdistance: number;
   private cameraheight: number;
   editor: monaco.editor.IStandaloneCodeEditor;

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

  set FitToScroll(value: boolean) {
    
    if (value) {

      //dispatch resize event with current window size
      this.makescrollable(new THREE.Vector2(window.innerWidth , window.innerHeight)).then(() => {
      this.fittoscroll = value;
      
      }
      );
    }
    if (!value) {
       // this.setSizeSmoothly(new THREE.Vector2(window.innerWidth , window.innerHeight*4.5));
       this.fittoscroll = value;
       this.setSizeSmoothly(new THREE.Vector2(window.innerWidth , window.innerHeight));

    }
  }


  set Quaterion(quaternion: THREE.Quaternion) {
    this._webgpugroup.quaternion.set(
      quaternion.x,
      quaternion.y,
      quaternion.z,
      quaternion.w
    );
    this._css2dgroup.quaternion.set(
      quaternion.x,
      quaternion.y,
      quaternion.z,
      quaternion.w
    );
  }


  


  set Size(size: THREE.Vector2) {
    this._size = size;
     this._htmlElement.style.height =  this._size.y  + "px"
     this._htmlElement.style.width =    this._size.x  + "px"
   //  this._webgpuplane?.geometry.scale( this._size.x/100, 1.5*this._size.y/100, 1);
      this._webgpuplane.geometry = new THREE.PlaneGeometry(this._size.x/100,this._size.y/100);
  }

  set HtmlElement (htmlElement: HTMLElement) {
    this._htmlElement = htmlElement;
  }

  initMonacoEditor(container: HTMLElement) {
    console.log("initMonacoEditor");
    console.log(container);
    this.editor =    monaco.editor.create(  container, {
      value: 'console.log("Hello, world")',
      language: 'javascript',
      theme: 'vs-dark',
      contextmenu: false,
      automaticLayout: true,
    });

 

    //select line 8 in the editor


  }
  assignsave(   cb) {
    if (this.editor) {
      this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, cb);
    }
 
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
   //  this._css2dgroup.scale.set(0.1, 0.1, 0.1);

    new SimpleBar( this._htmlElement);


    const planeMaterial = new THREE.MeshPhysicalMaterial();
    planeMaterial.color.set("black");
    planeMaterial.reflectivity = 0.5
    planeMaterial.opacity = 0;
    planeMaterial.blending = THREE.NoBlending;
    planeMaterial.transparent = false;
    planeMaterial.side = THREE.DoubleSide;
    this._webgpuplane = new THREE.Mesh(
      new THREE.PlaneGeometry(
        (1 * this._size.x) / 100,
        (1* this._size.y) / 100
      ),
      planeMaterial
    );
    this._webgpuplane.receiveShadow = true;
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
    let x   =   Number(this._htmlElement.style.top.replace(/\D/g, ""));
    tween({
      from: {
        x: this._htmlElement.clientWidth,
        y: this._htmlElement. clientHeight,
      },
      to: { x: size.x, y: size.y },
      duration: 1500,
      easing: "easeOutQuad",
      render: (state: any) => {
        this._htmlElement.style.height = state.y + "px";
        this._htmlElement.style.width = state.x + "px";
       // this._entity._entityManager._mc.onWindowResize()
        // this._htmlElement.style.top =  +x + "px";
        x+=1;
         
       
      },
      finish: () => {
        this.Size = size;
        this._entity._entityManager._mc.onWindowResize()
      }
    });
      
  }

  async makescrollable(size: THREE.Vector2) {
    console.log("setSizeSmoothly");
    console.log(size);
    this._size = size; 
    let x   =   Number(this._htmlElement.style.top.replace(/\D/g, ""));
    //extract the number from the string
    x = x

    console.log(x);

    //convert string to number defqult to 0
     
    tween({
      from: {
        x: this._htmlElement.clientWidth,
        y: this._htmlElement. clientHeight,
      },
      to: { x: size.x, y: size.y },
      duration: 1500,
      easing: "easeOutQuad",
      render: (state: any) => {

        this._htmlElement.style.height = state.y  + "px";
        this._htmlElement.style.width = state.x   + "px";
        x = Math.min(0, Number(x)-1);
       // this._htmlElement.style.top =       Math.min(0, Number(this._htmlElement.style.top)) + "px";

      
     //   this.Size = size;
        //translate the element to keep it centered
       


        
      },
      finish: () => {
        //this._htmlElement.scrollIntoView( {block: "center", inline: "center"});
        //this.Size = size;
      //  
      //  this._entity._entityManager._mc.onWindowResize()
      }
       

    });

    // this._htmlElement.style.height = this._size.y + "px";
    // this._htmlElement.style.width = this._size.x + "px";
    // this._webgpuplane.geometry = new THREE.PlaneGeometry(
    //   (2 * this._size.x) / 100,
    //   (1.5 * this._size.y) / 100
    // );
    tween({
      from: { x: this._webgpuplane.scale.x, y: this._webgpuplane.scale.y },
      to: { x: 15, y: 15 },
      duration: 1500,
      easing: "easeOutQuad",
      render: (state: any) => {
        this._webgpuplane.scale.set(state.x, state.y, 1);

   
      },
    });
  }

  getElementPositionByContent( content: string) {
    // Find the span element with the data attribute data-cli-cursor
 // Method 2: Using a recursive approach
          function findElementByInnerHTMLRecursive(rootElement, searchText) {
            console.log(rootElement.textContent);

            if (rootElement.textContent === searchText) {
              console.log(rootElement.innerHTML.trim() )
                return rootElement;
            }
            
            for (const child of rootElement.children) {
                const result = findElementByInnerHTMLRecursive(child, searchText);
                if (result) return result;
            }
            
            return null;
          }
    let span =   findElementByInnerHTMLRecursive(this.editor.getContainerDomNode(),content);
   
    //find child of html element with the content 
    
    if (!span) {
      console.log("span not found");
      return;
    }
    let rect = span.getBoundingClientRect();
  
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
   

  async Update(deltaTime: number): Promise<void> {
    // Update positions and quaternions
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

    const camera = this._entity._entityManager._mc.camera;
    const distance = this._entity.Position.distanceTo(camera.position);

    // Calculate visible plane size based on camera FOV and distance
    const fov = camera.fov * Math.PI / 180; // Convert FOV to radians
    const cameraHeight = Math.abs(camera.position.y); // Height above the plane
    
    // Calculate visible width and height at the plane
    const visibleHeight = 2.0 * Math.tan(fov / 2) * cameraHeight;
    const aspectRatio = window.innerWidth / window.innerHeight;
    const visibleWidth = visibleHeight * aspectRatio;

    // Clamp the visible size to window limits
    const clampedWidth = Math.min(visibleWidth, window.innerWidth / 100);
    const clampedHeight = Math.min(visibleHeight, 2 * window.innerHeight / 100);

    // Calculate the scale for the plane
    const targetScale = new THREE.Vector2(clampedWidth, clampedHeight);

    // Update the plane geometry and HTML element size
    if (!this.sticky) {
      if (distance > 15) {
        this._htmlElement.style.opacity = "0";
        this._htmlElement.style.pointerEvents = "none";
        this._webgpuplane.scale.set(0.001, 0.001, 1);
      } else {
        // Smoothly transition the plane scale
        tween({
          from: { 
            x: this._webgpuplane.scale.x, 
            y: this._webgpuplane.scale.y 
          },
          to: { 
            x: targetScale.x, 
            y: targetScale.y 
          },
          duration: 500,
          easing: "easeOutQuad",
          render: (state: any) => {
            this._webgpuplane.scale.set(state.x, state.y, 1);
            
            // Update HTML element size proportionally
            const htmlWidth = state.x * 100;
            const htmlHeight = state.y * 100;
            this._htmlElement.style.width = `${htmlWidth}px`;
            this._htmlElement.style.height = `${htmlHeight}px`;
          }
        });

        this._htmlElement.style.opacity = "1";
        this._htmlElement.style.pointerEvents = "auto";
      }
    }

    // Update last distance
    if (Math.abs(distance - this.lastdistance) > 0.1){
      
       //s this.HtmlElement.scrollIntoView({block: "center", inline: "center"});
        this._entity._entityManager._mc.onWindowResize();
    }
    this.lastdistance = distance;

    // Handle fittoscroll case
    if (this.fittoscroll && (this._size.x !== window.innerWidth || this._size.y !== window.innerHeight)) {
      this.Size = new THREE.Vector2(window.innerWidth, window.innerHeight);
      this.setSizeSmoothly(new THREE.Vector2(window.innerWidth, window.innerHeight));
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
