import * as THREE from "three";
import { MainController } from "./MainController";
import { TransformControls } from "three/addons/controls/TransformControls.js";
import { twoDUIComponent } from "../utils/Components/2dUIComponent";
import { threeDUIComponent } from "../utils/Components/3dUIComponent";
 import { Entity } from "./Entity";
  import * as pdfjsLib from "pdfjs-dist";
 import { CarComponent } from "./Components/CarComponent.js";
// // import { KeyboardInput } from "./Components/KeyboardInput.js";
  import { DynamicuiWorkerComponent } from "./Components/DynamicuiWorkerComponent.js";
import { StaticCLI } from "../SimpleCLI.js";
 import {
  utils,
  onScroll,
  animate,
} from 'animejs';

// //const {MediaPresenter, AudioStreamer , VideoStreamer } = require('sfmediastream');

pdfjsLib.GlobalWorkerOptions.workerSrc = "./pdf.worker.mjs";
class UIManager {
   splinePath: THREE.CatmullRomCurve3 | null = null;
   lookatPath: THREE.Vector3[] = [];
  attentionCursor: THREE.Mesh | any;
  cubePosition: number = 0;
   scrollmodenavigation: boolean = false;
    boundarygroup : any;
  private touchStartY: number = 0;
  private birdEyeviewOffset = new THREE.Vector3(0, 0, 0);
  private fpsposoffset = new THREE.Vector3(0, 0, 0);
  currentUIelement:    twoDUIComponent;
  private selectionMode: boolean = false;

  get isSelectionMode(): boolean {
    return this.selectionMode;
  }
 
  splineObject: THREE.Line<
    THREE.BufferGeometry<THREE.NormalBufferAttributes>,
    THREE.LineBasicMaterial,
    THREE.Object3DEventMap
  >;

  scrollbarContainer: HTMLDivElement;
  scrollbarContent: HTMLDivElement;

  mc: MainController;
  controlpointsmeshes: THREE.Object3D[];
  fpsnavigation: any;
  birdviewnavigation: any;
  offsetpos: THREE.Vector3;
  offsetrot: THREE.Quaternion;
  fpsquatoffset: THREE.Quaternion;
  inputBox: any;
  constructor(parent: MainController) {
    this.mc = parent;
    this.controlpointsmeshes = [];
    this.createAttentionCursor();
    this.createSplinePath();
    this.createUIButtons();
    this.addScrollbar();
    this.moveCubeAlongPath(0);
//    this.createInitialUI();
  }

  private async createInitialUI(): Promise<void> {
    const dynamicuicomponent = new DynamicuiWorkerComponent("../pages/homepage.js");
    dynamicuicomponent.sticky = true;
    const h = async () => {
      let introui = new Entity();
      introui.Position.set(
        this.splinePath.points[0].x,
        this.splinePath.points[0].y,
        this.splinePath.points[0].z - 2
      );
      //      await introui.AddComponent(uicomponent);
      await introui.AddComponent(dynamicuicomponent);

      let res = await this.mc.entitymanager.AddEntity(introui, "mainUI");
      if (res == -1) {
        return;
      }
    };

    h();
    this.cubePosition = 0.0;

    this.updateScrollbarPosition();
    this.updateSplineObject();
  }
  private createAttentionCursor(): void {
    //let cube be an arrow helper mesh
    const geometry = new THREE.ConeGeometry(0.5, 1, 32);
    const material = new THREE.MeshBasicMaterial({ color: 0xff11ff });
    const ArrowHelper = new THREE.ArrowHelper(
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(0, 0, 0),
      1,
      0xff0000
    );
    this.attentionCursor = ArrowHelper;
    //make draggable along the path

    this.mc.webglscene.add(this.attentionCursor);
  }
  async adduiElement(name: string, html: string, position: THREE.Vector3 , size: THREE.Vector2 = new THREE.Vector2(2500,6000) , quaternion= new THREE.Quaternion()):  Promise< twoDUIComponent> {
    
    if( this.mc.entitymanager.Entities.some((entity) => entity._name === name)) {
       
      //return the component
      return this.mc.entitymanager.Entities.find((entity) => entity._name === name).getComponent("twoDUIComponent") as twoDUIComponent;
    }
    const uicomponent = new twoDUIComponent(html , size);
    uicomponent.sticky = true;
    uicomponent.fittoscroll = false;
    uicomponent.typed = true;
    
      let introui = new Entity();
      introui.Quaternion = quaternion;

      introui.Position.set(position.x, position.y, position.z);
      await introui.AddComponent(uicomponent);
       

       await this.mc.entitymanager.AddEntity(introui, name);
 
       
  
      const callbacks = {
        greeting: (element) => {
          console.log('Greeting element created:', element);
        },
        "back-to-main": (element) => {
          console.log('Button clicked or created!');
 
            this.mc.UIManager.toggleBirdEyemode();
            this.mc.UIManager.removeuiElement(name);
          element.style.backgroundColor = 'blue';
          element.style.color = 'white';
        }
        
      };
  
       

       await StaticCLI.typeWithCallbacks(uicomponent.HtmlElement, html, callbacks, 0 , true);
       this.currentUIelement =  uicomponent
    //   uicomponent.fittoscroll = true;

      
       return uicomponent;
  


  }
  async removeuiElement(name: string):  Promise<void> {
    this.mc.entitymanager.Entities.forEach( async (entity) => {
      if (entity._name === name) {

      await  this.mc.entitymanager.RemoveEntity(entity);
      }
    });
  }
  private touchStartHandler(event: TouchEvent): void {
    if (event.touches.length === 1) {
      this.touchStartY = event.touches[0].clientY;
    }
  }

  private touchMoveHandler(event: TouchEvent): void {
    if (event.touches.length === 1) {
      const touchMoveY = event.touches[0].clientY;
      const deltaY = this.touchStartY - touchMoveY;
      const delta = Math.sign(deltaY) * 0.1;
      this.cubePosition = Math.max(0, Math.min(1, this.cubePosition + delta));
      this.moveCubeAlongPath(0);
      this.updateScrollbarPosition();
      this.touchStartY = touchMoveY;
    }
  }
  private createSplinePath(): void {
    const controlPoints = [
      new THREE.Vector3(0, 10, 14),
      new THREE.Vector3(0, 15, 14 ),

      //  new THREE.Vector3(0, 5, 0),
      // new THREE.Vector3(-5, 2, 10),

      // new THREE.Vector3(-10, 2, 10),
      // new THREE.Vector3(-15, 2, 13),
      // new THREE.Vector3(-20, 2,  10),
    ];
    this.splinePath = new THREE.CatmullRomCurve3(controlPoints);
    this.lookatPath = [
      new THREE.Vector3(0,  0, -1),
      // new THREE.Vector3(1, 1, -1),

 


     
    ];

    const points = this.splinePath.getPoints(100);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ color: 0xff0000 });
    this.splineObject = new THREE.Line(geometry, material);
   //  this.mc.webgpuscene.add(this.splineObject);

    // Create control points
    controlPoints.forEach((point, index) => {
      const sphereGeometry = new THREE.SphereGeometry(0.1);
      const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
      const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
      sphere.position.copy(point);
      this.controlpointsmeshes?.push(sphere);
  //    this.mc.webgpuscene.add(sphere);
    });
  }

    moveCubeAlongPath(delta: number): void {
    if (!this.splinePath || !this.attentionCursor) return;

    // Calculate the arc lengths of the spline curve
    const arcLengths = this.splinePath.getLengths(1000);
    const totalArcLength = arcLengths[arcLengths.length - 1];

    // Calculate the target arc length based on the current cube position and delta
    const targetArcLength =
      this.cubePosition * totalArcLength + delta * totalArcLength;

    // Clamp the target arc length between 0 and the total arc length
    const clampedArcLength = Math.max(
      0,
      Math.min(totalArcLength, targetArcLength)
    );

    // Update the cube position based on the clamped arc length
    this.cubePosition = clampedArcLength / totalArcLength;

    // Find the closest point on the spline based on the clamped arc length
    let closestPointIndex = 0;
    let closestDistance = Math.abs(arcLengths[0] - clampedArcLength);

    for (let i = 1; i < arcLengths.length; i++) {
      const distance = Math.abs(arcLengths[i] - clampedArcLength);
      if (distance < closestDistance) {
        closestPointIndex = i;
        closestDistance = distance;
      }
    }

    // Get the closest point on the spline curve
    const closestPoint = this.splinePath.getPointAt(
      closestPointIndex / (arcLengths.length - 1)
    );

    // Update the cube position with the closest point
    this.attentionCursor.position.copy(closestPoint);
     let nextlookatpoint =
      this.lookatPath[Math.round(this.cubePosition * this.lookatPath.length)];
    if (nextlookatpoint) {
      //console.log(nextlookatpoint);
      const up = new THREE.Vector3(0, 1, 0);  // Default up vector

      const quaternion = new THREE.Quaternion().setFromUnitVectors(up, nextlookatpoint.normalize());
      this.attentionCursor.quaternion.copy(quaternion); 


    }
    // let nextlookatpoint =
    //   this.lookatPath[Math.round(this.cubePosition * this.lookatPath.length)];
    // if (nextlookatpoint) {
    //   //look at path is a vector array with the direction of the camera

    //   this.attentionCursor.quaternion.setFromEuler(
    //     nextlookatpoint
    //   );
    // }
  }
  private addScrollbar(): void {
    if (!this.splinePath || !this.attentionCursor) return;

    // Create the scrollbar container
    this.scrollbarContainer = document.createElement("div");
    this.scrollbarContainer.classList.add("scrollbar-container");

    Object.assign(this.scrollbarContainer.style, {
      position: "absolute",
      top: "50%",
      right: "0.5vw", // More subtle positioning
      transform: "translateY(-50%)",
      width: "8px", // Thinner for less intrusion
      height: "60vh", // Shorter for better proportions
      overflow: "auto",
      cursor: "pointer",
      zIndex: "4", // Lower z-index so smooth navigation is on top
      borderRadius: "8px", // More rounded
      backgroundColor: "rgba(0, 0, 0, 0.0)", // Transparent background
      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)", // Smooth transitions
      opacity: "0.3", // More subtle by default
    });

    // Enhanced hover effects to work with smooth navigation
    this.scrollbarContainer.addEventListener("mouseover", () => {
      this.scrollbarContainer.style.backgroundColor = "rgba(0, 0, 0, 0.2)";
      this.scrollbarContainer.style.opacity = "0.8";
      this.scrollbarContainer.style.width = "12px";
    });
    
    this.scrollbarContainer.addEventListener("mouseout", () => {
      this.scrollbarContainer.style.backgroundColor = "rgba(0, 0, 0, 0.0)";
      this.scrollbarContainer.style.opacity = "0.3";
      this.scrollbarContainer.style.width = "8px";
    });


    // Create the scrollbar content with enhanced styling
    this.scrollbarContent = document.createElement("div");
    this.scrollbarContent.classList.add("scrollbar-content");

    Object.assign(this.scrollbarContent.style, {
      height: "10000px",
      width: "10%",
      backgroundColor: "transparent",
    });

    this.scrollbarContainer.appendChild(this.scrollbarContent);

    // Add event listeners to the scrollbar
    let isScrolling = false;
    let startY: number;
    let scrollOffset: number;

    const handleScroll = (event: Event) => {
      event.preventDefault();
      event.stopPropagation();

      this.cubePosition =
        this.scrollbarContainer.scrollTop /
        (this.scrollbarContent.offsetHeight -
          this.scrollbarContainer.offsetHeight);
      this.cubePosition = Math.max(0, Math.min(1, this.cubePosition));
      this.moveCubeAlongPath(0);
    };

    const handleMouseDown = (event: MouseEvent) => {
      isScrolling = true;
      startY = event.clientY - this.scrollbarContainer.offsetTop;
      scrollOffset = this.scrollbarContainer.scrollTop;
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (!isScrolling) return;
      event.preventDefault();
      const y = event.clientY - this.scrollbarContainer.offsetTop;
      const walk = (y - startY) * 3;
      this.scrollbarContainer.scrollTop = scrollOffset + walk;
      handleScroll(event);
    };

    const handleMouseUp = () => {
      isScrolling = false;
    };

    this.scrollbarContainer.addEventListener("scroll", handleScroll);
    this.scrollbarContainer.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    const updateScrollbarPosition = () => {
      this.scrollbarContainer.scrollTop =
        this.cubePosition *
        (this.scrollbarContent.offsetHeight -
          this.scrollbarContainer.offsetHeight);
    };

    updateScrollbarPosition();
    document.body.appendChild(this.scrollbarContainer);
  }


    updateScrollbarPosition(): void {
    this.scrollbarContainer.scrollTop =
      this.cubePosition *
      (this.scrollbarContent.offsetHeight -
        this.scrollbarContainer.offsetHeight);
  }

  private mousewheelistener = (event: WheelEvent) => {
    if (!this.mc.CameraControls.enableZoom) {
      // event.preventDefault();
      //check if a ui element is present
      
        const delta = Math.sign(event.deltaY) * 0.05;
        //if wheel is scrolling up , the it only allies if the ui element is scrolled to the top
        
        this.cubePosition = Math.max(0, Math.min(1, this.cubePosition + delta));
         this.moveCubeAlongPath(0);
        this.updateScrollbarPosition();
      
        //if we are scrolling down , then we can s
    
      this.moveCubeAlongPath(0);
      this.updateScrollbarPosition();
    }
   
  }

  createUIButtons(): void {
    //check if the buttons already exist
    if (document.getElementById("uiButtons")) {
      return;
    }
    let buttonsht = /*html*/ `
    <ul class="uk-iconnav uk-padding-small">
  
  
 
    <li>
      <a
        href="#"
        id="homeButton"
        uk-tooltip=" reset the camera"
        uk-icon="icon:  home"
      ></a>
    </li>
    <li>
      <a
        href="#"
        id="togglemousecontrolsbutton"
        uk-tooltip="Navigation Mode"
        uk-icon="icon:   file-text"
      ></a>
    </li>
    <li>
      <a
        href="#"
        id="cameramode"
        uk-tooltip="First Person view"
        uk-icon="icon:  video-camera"
      ></a>
    </li>
    <li>
      <a
        href="#"
        id="birdeyemode"
        uk-tooltip="Bird View"
        uk-icon="icon:  bluesky"
      ></a>
    </li>
    <li>
      <a
        href="#"
        id="selectmode"
        uk-tooltip="Select Units"
        uk-icon="icon:  move"
      ></a>
    </li>
    
    
    
  </ul>`;

    //add the buttons to the html
    const buttons = document.createElement("div");
    buttons.innerHTML = buttonsht;
    buttons.id = "uiButtons";
    buttons.style.position = "fixed";
    buttons.style.top = "0px";
    buttons.style.right = "0px";
    buttons.style.zIndex = "50";

    document.body.appendChild(buttons);

    //add event listeners to the buttons
    document.getElementById("debugButton")?.addEventListener("click", () => {
      document.getElementById("offcanvas-usage")?.classList.toggle("uk-hidden");
    });
    document.getElementById("homeButton")?.addEventListener("click", () => {
      this.resetSplinePath();
    });

    document
      .getElementById("togglemousecontrolsbutton")
      ?.addEventListener("click", () => {
        //toggle the first person view
        this.toggleScrollmode();
      });

    document.getElementById("cameramode")?.addEventListener("click", () => {
      //toggle the first person view
      this.toggleFPSmode( new THREE.Vector3(0,2,-3), new THREE.Quaternion());
    });

    document.getElementById("birdeyemode")?.addEventListener("click", () => {
      //toggle the first person view
      this.toggleBirdEyemode();
    });

    document.getElementById("selectmode")?.addEventListener("click", () => {
      //toggle selection mode
      this.toggleSelectionMode();
    });
    // document.getElementById("togglemousecontrolsbutton")?.click();

  }

  toggleScrollmode() {

     

    
    if (this.fpsnavigation) {
      this.disableFPSNavigation();
    }
    if (this.birdviewnavigation) {
      this.disableBirdViewNavigation();
    }
    if (this.scrollmodenavigation == false) {
      this.enableScrollModeNavigation();
    } else {
       this.disableScrollModeNavigation();

    }
  }

  toggleBirdEyemode(offsetpos: THREE.Vector3 = new THREE.Vector3(0, 1.5, 0)) {
    
      this.birdEyeviewOffset = offsetpos;
     
    if (this.scrollmodenavigation) {
      this.disableScrollModeNavigation();
    }
    if (this.fpsnavigation) {
      this.disableFPSNavigation();
    }
    if (this.birdviewnavigation) {
     this.disableBirdViewNavigation();
    } else {
      this.enableBirdViewNavigation();
    }
  }

  toggleFPSmode(offsetpos: THREE.Vector3 = new THREE.Vector3(0, 0, 0) , offsetrot: THREE.Quaternion = new THREE.Quaternion()) {

    this.fpsposoffset = offsetpos;
    this.fpsquatoffset = offsetrot;
    if (this.scrollmodenavigation) {
      this.disableScrollModeNavigation();
    }
    if (this.birdviewnavigation) {
      this.disableBirdViewNavigation();
    }
    if (this.fpsnavigation) {
      this.disableFPSNavigation();

    }
    else {
      this.enableFPSNavigation();
    }
  }

  toggleSelectionMode() {
    if (this.selectionMode) {
      this.disableSelectionMode();
    } else {
      this.enableSelectionMode();
    }
  }

  private enableSelectionMode(): void {
    this.selectionMode = true;
    
    // Disable other navigation modes
    if (this.scrollmodenavigation) {
      this.disableScrollModeNavigation();
    }
    if (this.fpsnavigation) {
      this.disableFPSNavigation();
    }
    if (this.birdviewnavigation) {
      this.disableBirdViewNavigation();
    }
    
    // Disable camera controls to prevent interference with selection
    this.mc.CameraControls.enabled = false;
    
    // Update button appearance and tooltip
    const selectButton = document.getElementById("selectmode");
    if (selectButton) {
      selectButton.classList.add("uk-text-danger");
      selectButton.setAttribute("uk-tooltip", "Selection Mode Active - Click to disable");
    }
    
    // Show hint to user
    this.showSelectionHint();
  }

  private disableSelectionMode(): void {
    this.selectionMode = false;
    
    // Re-enable camera controls
    this.mc.CameraControls.enabled = true;
    
    // Update button appearance and tooltip
    const selectButton = document.getElementById("selectmode");
    if (selectButton) {
      selectButton.classList.remove("uk-text-danger");
      selectButton.setAttribute("uk-tooltip", "Select Units");
    }
    
    // Hide selection hint
    this.hideSelectionHint();
  }

  private showSelectionHint(): void {
    // Create or update hint element
    let hintElement = document.getElementById("selection-hint");
    if (!hintElement) {
      hintElement = document.createElement("div");
      hintElement.id = "selection-hint";
      hintElement.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 20px;
        border-radius: 10px;
        font-size: 16px;
        z-index: 1000;
        pointer-events: none;
        text-align: center;
        font-family: Arial, sans-serif;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
        animation: fadeIn 0.3s ease-in-out;
      `;
      document.body.appendChild(hintElement);
      
      // Add CSS animation
      const style = document.createElement("style");
      style.textContent = `
        @keyframes fadeIn {
          from { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
          to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
      `;
      document.head.appendChild(style);
    }
    
    hintElement.innerHTML = `
      <strong>Selection Mode Active</strong><br>
      Click and drag to select units<br>
      <small>Click the select button again to disable</small>
    `;
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
      if (hintElement && hintElement.parentNode) {
        hintElement.style.animation = "fadeOut 0.3s ease-in-out";
        setTimeout(() => {
          if (hintElement && hintElement.parentNode) {
            hintElement.remove();
          }
        }, 300);
      }
    }, 3000);
    
    // Add fadeOut animation
    const style = document.createElement("style");
    style.textContent = `
      @keyframes fadeOut {
        from { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        to { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
      }
    `;
    document.head.appendChild(style);
  }

  private hideSelectionHint(): void {
    const hintElement = document.getElementById("selection-hint");
    if (hintElement) {
      hintElement.remove();
    }
  }

  private enableScrollModeNavigation(): void {
    this.mc.CameraControls.enableZoom = false;
    this.mc.CameraControls.enabled = false;
    this.mc.CameraControls.enableRotate = false;

    window.addEventListener("wheel", this.mousewheelistener.bind(this));
    window.addEventListener("touchstart", this.touchStartHandler.bind(this));
    window.addEventListener("touchmove", this.touchMoveHandler.bind(this));
    document
      .getElementById("togglemousecontrolsbutton")
      ?.classList.add("uk-text-danger");
   
    // Don't show the old scrollbar if smooth navigation is present
    const smoothNavigation = document.querySelector('.smooth-navigation');
    if (!smoothNavigation) {
      this.scrollbarContainer.style.display = "block";
    }
    
    if (this.currentUIelement) {
      this.currentUIelement.FitToScroll = true;
    }
    this.scrollmodenavigation = true;

    
  }
  private disableScrollModeNavigation(): void {
    this.scrollbarContainer.style.display = "none";
    this.mc.CameraControls.enabled = true;

    this.mc.CameraControls.enableZoom = true;
    this.mc.CameraControls.enableRotate = true;
    document
      .getElementById("togglemousecontrolsbutton")
      ?.classList.remove("uk-text-danger");
    window.removeEventListener("wheel", this.mousewheelistener.bind(this));
    window.removeEventListener("touchstart", this.touchStartHandler.bind(this));
    window.removeEventListener("touchmove", this.touchMoveHandler.bind(this));

    this.scrollmodenavigation = false;
  }
  private enableFPSNavigation(): void {

    //check if one the components of entity contains an attribute fpsoffset
     this.mc.mainEntity._components.forEach((component) => {
      if (component instanceof CarComponent) {
         this.fpsposoffset = component.fpsoffset;
        this.fpsquatoffset = component.fpsquat;
         
      } 
    
    
    });
    this.mc.CameraControls.enableZoom = false;
    this.mc.CameraControls.enabled = false;
    this.mc.CameraControls.enableRotate = false;
    this.mc.CameraControls.enablePan = false;
    this.mc.CameraControls.enableKeys = false;

    document
      .getElementById("cameramode")
      ?.classList.add("uk-text-danger");
    this.fpsnavigation = true;
  }

  private disableFPSNavigation(): void {
    this.mc.CameraControls.enabled = true;
    this.mc.CameraControls.enableZoom = true;
    this.mc.CameraControls.enableRotate = true;
    this.mc.CameraControls.enablePan = true;
    this.mc.CameraControls.enableKeys = true;
    document
      .getElementById("cameramode")
      ?.classList.remove("uk-text-danger");
    this.fpsnavigation = false;
  }


  private enableBirdViewNavigation(): void {
    this.mc.CameraControls.minDistance = 12;
    this.mc.CameraControls.maxDistance =  13;
     if (this.currentUIelement) {

      this.currentUIelement.FitToScroll = false;
       // this.currentUIelement.setSizeSmoothly( new THREE.Vector2(this.currentUIelement.Size.x, this.currentUIelement.Size.y*5));
      //this.currentUIelement.Size = new THREE.Vector2(this.currentUIelement.Size.x, this.currentUIelement.Size.y*5);
    }
 
     //this.mc.CameraControls.maxPolarAngle = 1.5;
   //1   this.mc.CameraControls.minPolarAngle = -2.1;
    // this.mc.CameraControls.enabled = false;
    // this.mc.CameraControls.enableRotate = false;
    // this.mc.CameraControls.enablePan = false;
    // this.mc.CameraControls.enableKeys = false;
     this.birdviewnavigation = true;
    document
    .getElementById("birdeyemode")
    ?.classList.add("uk-text-danger");
  }

  private disableBirdViewNavigation(): void {
    this.mc.CameraControls.enabled = true;
    this.mc.CameraControls.enableZoom = true;
    this.mc.CameraControls.enableRotate = true;
    this.mc.CameraControls.enablePan = true;
    this.mc.CameraControls.enableKeys = true;
    this.mc.CameraControls.minDistance =3;
    this.mc.CameraControls.maxDistance =  130;
    this.birdviewnavigation = false;
    document
    .getElementById("birdeyemode")
    ?.classList.remove("uk-text-danger");
  }

    updateSplineObject(): void {
    const points = this.splinePath.getSpacedPoints(5);
    this.splineObject.geometry.setFromPoints(points);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ color: 0xffff00 });
    this.mc.webglscene.remove(this.splineObject);
    // this.splineObject = new THREE.Line(geometry, material);
    //  this.mc.webgpuscene.add(this.splineObject);
  }
  private resetSplinePath(): void {
    const controlPoints = [
      new THREE.Vector3(0, 15, 0),
      new THREE.Vector3(0, 10, 0),
    ];
 
 
    this.splinePath = new THREE.CatmullRomCurve3(controlPoints);
    this.lookatPath = [
      new THREE.Vector3(0,  0, -1),
      // new THREE.Vector3(1, 1, -1),

 


     
    ];

    this.splinePath.points = controlPoints;
    this.cubePosition = 0.01;
    this.updateScrollbarPosition();

    this.updateSplineObject();
    this.updateScrollbarPosition();



    
 
 
    for (let i = 0; i < this.controlpointsmeshes?.length; i++) {
      this.mc.webglscene.remove(this.controlpointsmeshes[i]);
    }

    //destroy all entities with ui component
    for (let i = 0; i < this.mc.entitymanager.Entities.length; i++) {
      let component= this.mc.entitymanager.Entities[i].getComponent("DynamicuiWorkerComponent")
      if (component) {

        
            this.mc.entitymanager
              .RemoveEntity(this.mc.entitymanager.Entities[i])
              .then(() => {
                this.createInitialUI();
              });
          }
    
    }

    this.controlpointsmeshes = [];
    // Create control points
    controlPoints.forEach((point, index) => {
      const sphereGeometry = new THREE.SphereGeometry(0.1);
      const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
      const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
      sphere.position.copy(point);
      this.controlpointsmeshes.push(sphere);
     // this.mc.webgpuscene.add(sphere);
    });
    this.mc.zoomTo(
      this.attentionCursor.position,
      5,
      this.attentionCursor.quaternion
    );
  }

  

  private followCursor(): void {
    //rotate the normal vector by 180 degrees 
       let normalvec = this.attentionCursor.quaternion.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI/2));
    this.mc.zoomTo(
      this.attentionCursor.position,
      11.5,
      normalvec
    );
   
  // this.mc.CameraControls.setPosition( this.attentionCursor.position.x , this.attentionCursor.position.y , this.attentionCursor.position.z , true);

    this.mc.CameraControls.setTarget(  this.attentionCursor.position.x , this.attentionCursor.position.y , this.attentionCursor.position.z , true );
  }

  keydownhandler = (event: KeyboardEvent) => {
    if (this.inputBox) {
      event.stopPropagation(); // Prevent event propagation
      if ((event.ctrlKey || event.metaKey) && (event.key === 'c' || event.key === 'C' || event.key === 'v' || event.key === 'V')) {
        return; // Allow the default behavior for Ctrl+C and Ctrl+V
      }
  

      if (event.key === "Enter") {
        this.handleInput(this.inputBox.value);
        this.inputBox.value = "";
        let span = this.inputBox.previousSibling;
        //set the span innerHTML to the input value
        span.innerText = this.inputBox.value;
         

      } else if (event.key === "Backspace") {
        // Handle backspace separately if needed
        let currentValue = this.inputBox.value;
        this.inputBox.value = currentValue.slice(0, -1);
        let span = this.inputBox.previousSibling;
        //set the span innerHTML to the input value
        span.innerText = this.inputBox.value;
         

      }
 
      
      else {
        console.log(event.key);
  
        // Ignore control keys like shift, alt, ctrl, but not a backspace or space
        if ((event.key.length === 1 )    ) {
          // Append the key to the input box
          this.inputBox.value += event.key;

          //get span element before the cursor
          let span = this.inputBox.previousSibling;
          //set the span innerHTML to the input value
          span.innerText = this.inputBox.value;
           
        }
  
        if (event.key === "Escape") {
          this.inputBox.blur();
        }
      }
  
      event.preventDefault();
    }
  }
  
  private setupInput(htmlelement: HTMLElement , callback: ( value: string ) => void) {
    // Find cursor in provided HTML elements
    let cursor = htmlelement.querySelector("span[data-cli-cursor]") as HTMLElement;
    if (cursor) {
      // When the cursor is clicked, it toggles its color to red and back to white
      cursor.addEventListener("click", () => {
        if (cursor.style.color === "red") {
          // Dispose of the input box
          if (this.inputBox) {
            this.inputBox.blur();

          }
        } else {
          cursor.style.color = "red";
          // Create an invisible input textbox
          this.inputBox = document.createElement("input");
          this.inputBox.style.position = "absolute";
          this.inputBox.style.opacity = "0";
          cursor.parentNode?.insertBefore(this.inputBox, cursor);

          this.handleInput = callback.bind(this);

          //insert a span element before the cursor
          let span = document.createElement("span");

          span.innerHTML = "";
          //insert the span before the input box
          cursor.parentNode?.insertBefore(span, this.inputBox);
          this.inputBox.focus();
          // When the input box loses focus, it should be white again and disposed of
          this.inputBox.addEventListener("blur", () => {
            cursor.style.color = "white";
            if (this.inputBox) {
              let span = this.inputBox.previousSibling;
              //set the span innerHTML to the input value
              span.innerText = ""
              this.inputBox.remove();
              //remove the span element
              this.inputBox = null;
            }
            document.removeEventListener("keydown", this.keydownhandler);
          });
  
          // Add a keydown event so each keystroke is added before the cursor,
          // with delete key removing the last character, and enter key submitting the input value
          this.inputBox.addEventListener("keydown", this.keydownhandler);
        }
      });
    }
    else {
      console.error("Cursor not found in provided HTML element");
    }
  }
  
  private handleInput(value: string) {
    console.log("Input value submitted:", value);
    // Additional logic for handling the input value can be added here
  }

  async Update() {
    if (this.scrollmodenavigation) {
      // this.trackCamera();
      await this.followCursor(); // Call the new function
    } else if (this.fpsnavigation) {
      let targetoffset = this.fpsposoffset.clone();
      
      targetoffset.applyQuaternion(this.mc.mainEntity.Quaternion).add(this.mc.mainEntity.Position)
      //targetoffset.applyQuaternion(this.mc.mainEntity.Quaternion);
      this.mc.zoomTo(
        targetoffset,
       3,
        this.mc.mainEntity.Quaternion . multiply(this.fpsquatoffset)
      );
    } else if (this.birdviewnavigation) {

        if (this.mc.mainEntity)
        this.mc.zoomTo(this.mc.mainEntity.Position.clone().add(this.birdEyeviewOffset));
      
      //this.mc.zoomTo(this.attentionCursor.position, 5,   this.attentionCursor.quaternion);
    }
  }

  async CreateDynamicUI(
    name: string,
    scriptlocation: string,
    position: THREE.Vector3,
    quatertnion: THREE.Quaternion,
     
  ): Promise<Entity> {
    const dynamicuicomponent = new DynamicuiWorkerComponent(scriptlocation);
    dynamicuicomponent.sticky = true;
      let introui = new Entity();
     
      await introui.AddComponent(dynamicuicomponent);
      introui.Position = position;
      introui.Quaternion = quatertnion;
      let res = await this.mc.entitymanager.AddEntity(introui,  name)
      
      if (res == -1) {
        console.log(this.mc.entitymanager.Entities.filter(e => e._name === name)[0]);
        return this.mc.entitymanager.Entities.filter(e => e._name === name)[0];
        
      }
    

    
    return introui;
  }

  // Method to handle smooth navigation integration
  updateSmoothNavigation(progress: number, positions: THREE.Vector3[], lookatDirections: THREE.Vector3[] = []) {
    if (!this.splinePath) return;
    
    // Update spline path with new positions
    this.splinePath.points = positions;
    
    // Update lookat path if provided
    if (lookatDirections.length > 0) {
      this.lookatPath = lookatDirections;
    }
    
    // Update spline visual representation
    this.updateSplineObject();
    
    // Smoothly update cube position
    this.cubePosition = progress;
    this.updateScrollbarPosition();
    
    // Move cursor along path
    this.moveCubeAlongPath(0);
  }

  // Enhanced method for creating smooth camera transitions
  async createSmoothTransition(startPos: THREE.Vector3, endPos: THREE.Vector3, duration: number = 2000): Promise<void> {
    const midPoint = startPos.clone().lerp(endPos, 0.5).add(new THREE.Vector3(0, 5, 0));
    const controlPoints = [startPos, midPoint, endPos];
    
    this.splinePath.points = controlPoints;
    this.updateSplineObject();
    
    // Use tween for smooth transition (assuming tween is available globally)
    return new Promise((resolve) => {
      const startProgress = this.cubePosition;
      // @ts-ignore - tween might be available globally
      if (typeof tween !== 'undefined') {
        // @ts-ignore
        tween({
          from: { progress: startProgress },
          to: { progress: 1 },
          duration: duration,
          easing: "easeInOutCubic",
          render: (state: any) => {
            this.cubePosition = state.progress;
            this.updateScrollbarPosition();
            this.moveCubeAlongPath(0);
          },
          complete: () => resolve()
        });
      } else {
        // Fallback without animation
        this.cubePosition = 1;
        this.updateScrollbarPosition();
        this.moveCubeAlongPath(0);
        resolve();
      }
    });
  }
}
export { UIManager };
