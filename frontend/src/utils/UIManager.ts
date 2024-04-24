import * as THREE from "three";
import { MainController } from "./MainController";
import { TransformControls } from "three/addons/controls/TransformControls.js";
import { twoDUIComponent } from "../utils/Components/2dUIComponent";
import { threeDUIComponent } from "../utils/Components/3dUIComponent";
import { Entity } from "./Entity";
import * as pdfjsLib from "pdfjs-dist";
import { CarComponent } from "./Components/CarComponent.js";
import { KeyboardInput } from "./Components/KeyboardInput.js";
import { DynamicuiComponent } from "./Components/DynamicuiComponent.js";

// //const {MediaPresenter, AudioStreamer , VideoStreamer } = require('sfmediastream');

pdfjsLib.GlobalWorkerOptions.workerSrc = "./pdf.worker.mjs";
class UIManager {
  private splinePath: THREE.CatmullRomCurve3 | null = null;
  attentionCursor: THREE.Mesh | null = null;
  cubePosition: number = 0;
  private scrollmodenavigation: boolean = false;

   splineObject: THREE.Line<
    THREE.BufferGeometry<THREE.NormalBufferAttributes>,
    THREE.LineBasicMaterial,
    THREE.Object3DEventMap
  >;
  scrollbarContainer: HTMLDivElement;
  scrollbarContent: HTMLDivElement;
  mc: MainController;
  controlpointsmeshes: THREE.Object3D[];
  constructor(parent: MainController) {
    this.mc = parent;
    this.controlpointsmeshes = [];
    this.createAttentionCursor();
    this.createSplinePath();
    this.createUIButtons();
    this.addScrollbar();
    this.moveCubeAlongPath(0);
    this.createInitialUI();
  }
  private async createInitialUI(): Promise<void> {
 
    const dynamicuicomponent = new DynamicuiComponent("../pages/homepage.js")

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
    const geometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
    const material = new THREE.MeshBasicMaterial({ color: 0xff11ff });
    this.attentionCursor = new THREE.Mesh(geometry, material);
    //make draggable along the path

    this.mc.webgpuscene.add(this.attentionCursor);
  }
  private touchStartY: number = 0;

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
      new THREE.Vector3(0, 15, 0),
      new THREE.Vector3(0, 10, -3),

      //  new THREE.Vector3(0, 5, 0),
      // new THREE.Vector3(-5, 2, 10),

      // new THREE.Vector3(-10, 2, 10),
      // new THREE.Vector3(-15, 2, 13),
      // new THREE.Vector3(-20, 2,  10),
    ];
    this.splinePath = new THREE.CatmullRomCurve3(controlPoints);
    const points = this.splinePath.getPoints(100);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ color: 0xff0000 });
    this.splineObject = new THREE.Line(geometry, material);
    this.mc.webgpuscene.add(this.splineObject);

    // Create control points
    controlPoints.forEach((point, index) => {
      const sphereGeometry = new THREE.SphereGeometry(0.1);
      const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
      const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
      sphere.position.copy(point);
      this.controlpointsmeshes?.push(sphere);
      this.mc.webgpuscene.add(sphere);
    });
  }

  private moveCubeAlongPath(delta: number): void {
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
  }
  private addScrollbar(): void {
    if (!this.splinePath || !this.attentionCursor) return;

    // Create the scrollbar container
    this.scrollbarContainer = document.createElement("div");
    this.scrollbarContainer.classList.add("scrollbar-container");

    Object.assign(this.scrollbarContainer.style, {
      position: "absolute",
      top: "50%",
      right: "1vw", // Adjust the right position to take up just the gutter space
      transform: "translateY(-50%)",
      width: "18px", // Adjust the width to take up just the gutter space
      height: "80vh",
      overflow: "auto",
      cursor: "pointer",
      zIndex: "5",
      borderRadius: "4px", // Add rounded corners
      backgroundColor: "rgba(0, 0, 0, 0.0)", // Transparent background color
      transition: "background-color 0.3s ease-in-out", // Add hover effect
    });

    // Add hover effect
    this.scrollbarContainer.addEventListener("mouseover", () => {
      this.scrollbarContainer.style.backgroundColor = "rgba(0, 0, 0, 0.4)";
    });
    this.scrollbarContainer.addEventListener("mouseout", () => {
      this.scrollbarContainer.style.backgroundColor = "rgba(0, 0, 0, 0.2)";
    });

    // Create the scrollbar content
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
  private updateScrollbarPosition(): void {
    this.scrollbarContainer.scrollTop =
      this.cubePosition *
      (this.scrollbarContent.offsetHeight -
        this.scrollbarContainer.offsetHeight);
  }

  private mousewheelistener = (event: WheelEvent) => {
    if (!this.mc.orbitControls.enableZoom) {
      // event.preventDefault();
      const delta = Math.sign(event.deltaY) * 0.1;
      this.cubePosition = Math.max(0, Math.min(1, this.cubePosition + delta));
      this.moveCubeAlongPath(0);
      this.updateScrollbarPosition();
    }
  };
 
  

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
        uk-tooltip="First Person view"
        uk-icon="icon:  user"
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
        if (this.mc.orbitControls.enableZoom) {
          this.mc.orbitControls.enableZoom = false;
          this.mc.orbitControls.enabled = false;
          this.mc.orbitControls.enableRotate = false;
          window.addEventListener("wheel", this.mousewheelistener.bind(this));
          window.addEventListener("touchstart", this.touchStartHandler.bind(this));
          window.addEventListener("touchmove", this.touchMoveHandler.bind(this));
          document
            .getElementById("togglemousecontrolsbutton")
            ?.classList.add("uk-text-danger");
          this.scrollmodenavigation = true;
        } else {
          this.mc.orbitControls.enabled = true;

          this.mc.orbitControls.enableZoom = true;
          this.mc.orbitControls.enableRotate = true;
          document
            .getElementById("togglemousecontrolsbutton")
            ?.classList.remove("uk-text-danger");
          window.removeEventListener(
            "wheel",
            this.mousewheelistener.bind(this)
          );
          window.removeEventListener("touchstart", this.touchStartHandler.bind(this));
          window.removeEventListener("touchmove", this.touchMoveHandler.bind(this));
       
          this.scrollmodenavigation = false;
        }
      });
    document.getElementById("togglemousecontrolsbutton")?.click();
    document.getElementById("voiceButton")?.addEventListener("click", () => {
      // this.toggleVoice();
    });
  }
  private updateSplineObject(): void {
    const points = this.splinePath.getPoints(10);
    this.splineObject.geometry.setFromPoints(points);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ color: 0xffff00 });
    this.mc.webgpuscene.remove(this.splineObject);
    this.splineObject = new THREE.Line(geometry, material);
    this.mc.webgpuscene.add(this.splineObject);
  }
  private resetSplinePath(): void {
    const controlPoints = [
      new THREE.Vector3(0, 15, 0),
      new THREE.Vector3(0, 10, 0),
    ];
    this.splinePath.points = controlPoints;
    this.cubePosition = 0;
    this.updateScrollbarPosition();
    this.updateSplineObject();

    for (let i = 0; i < this.controlpointsmeshes?.length; i++) {
      this.mc.webgpuscene.remove(this.controlpointsmeshes[i]);
    }

    //destroy all entities with ui component
    for (let i = 0; i < this.mc.entitymanager.Entities.length; i++) {
      this.mc.entitymanager.Entities[i]
        .getComponent("twoDUIComponent")
        .then((value) => {
          if (value) {
            this.mc.entitymanager
              .RemoveEntity(this.mc.entitymanager.Entities[i])
              .then(() => {
                this.createInitialUI();
              });
          }
        });
    }

    this.controlpointsmeshes = [];
    // Create control points
    controlPoints.forEach((point, index) => {
      const sphereGeometry = new THREE.SphereGeometry(0.1);
      const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
      const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
      sphere.position.copy(point);
      this.controlpointsmeshes.push(sphere);
      this.mc.webgpuscene.add(sphere);
    });
  }

  private followCursor(): void {
    this.mc.zoomTo(this.attentionCursor.position, 6, new THREE.Quaternion());
  }

  async Update() {
    if (this.scrollmodenavigation) {
      // this.trackCamera();
      await this.followCursor(); // Call the new function
    }
  }
}
export { UIManager };
