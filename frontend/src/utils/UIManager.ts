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

  isDragging: any;
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
    const html = /*html*/ `
     <div class="uk-container">
      <div class="uk-grid-match uk-child-width-1-2@m" uk-grid>
        <div>
          <div class="uk-card uk-card-secondary uk-card-body" uk-scrollspy="cls: uk-animation-slide-left; repeat: true">
            <article class="uk-comment uk-comment-secondary" role="comment">
              <header class="uk-comment-header">
                <div class="uk-grid-medium uk-flex-middle" uk-grid>
                  <div class="uk-width-auto"> <img class="uk-comment-avatar uk-border-circle" src="Hamza012.jpg" width="80"
                      height="80" alt=""> </div>
                  <div class="uk-width-expand">
                    <h4 class="uk-comment-title uk-margin-remove"><a class="uk-link-reset" href="#">Hamza Ben Hassen</a></h4>
                    <ul class="uk-comment-meta uk-subnav uk-subnav-divider uk-margin-remove-top">
                      <li><a href="#">Electrical Engineer</a></li>
                    </ul>
                  </div>
                </div>
              </header>
              <div class="uk-comment-body">
                <p>Welcome to my personal website!</p>            </div>
            </article>
          </div>
        </div>
        <div>
          <div class="uk-card uk-card-secondary uk-card-body" uk-scrollspy="cls: uk-animation-slide-right; repeat: true">
            <h3 class="uk-card-title">Navigation</h3>
            <div class="uk-child-width-1-2@s uk-child-width-1-3@m uk-grid-match" uk-grid>
              <div>
                <div class="uk-card uk-card-secondary uk-card-body uk-card-hover uk-text-center" uk-scrollspy="cls: uk-animation-scale-up; repeat: true">
                  <span uk-icon="icon: mail; ratio: 2"></span>
                  <div class="uk-grid-small uk-child-width-auto" uk-grid>
                      <div>
                        <a class="uk-button  uk-button-text"  id="contactButton" href="#">Contact</a>
                      </div>
                
            </div>
                  
                </div>
              </div>
              <div>
                <div class="uk-card uk-card-secondary uk-card-body uk-card-hover uk-text-center" uk-scrollspy="cls: uk-animation-scale-up; repeat: true">
                  <span uk-icon="icon: code; ratio: 2"></span>
                   <a class="uk-button  uk-button-text"  id="projectsButton" href="#">Projects</a>

                 </div>
              </div>
              <div>
                <div class="uk-card uk-card-secondary uk-card-body  uk-text-center" uk-scrollspy="cls: uk-animation-scale-up; repeat: true">
                  <span uk-icon="icon: user; ratio: 2"></span>
                   <a class="uk-button  uk-button-text"  id="aboutButton" href="#">About</a>

 
              </div>
            </div>
          </div>
           </div>
    </div>
   `;

    
    const uicomponent = new twoDUIComponent(
      html,
      new THREE.Vector2(window.innerWidth * 0.8, window.innerHeight * 1.0)
    );

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

      // let contactButton = dynamicuicomponent.HtmlElement.querySelector(
      //   "#contactButton"
      // ) as HTMLButtonElement;
      // let projectsButton = dynamicuicomponent.HtmlElement.querySelector(
      //   "#projectsButton"
      // ) as HTMLButtonElement;
      // let aboutButton = dynamicuicomponent.HtmlElement.querySelector(
      //   "#aboutButton"
      // ) as HTMLButtonElement;

      // contactButton.onclick = () => {

    
      //   let contactFlow = [
      //     new THREE.Vector3(0, 15, 0),
      //     new THREE.Vector3(-2, 15, 0),
      //     new THREE.Vector3(-14, 19, 0),
      //   ];
      //   this.splinePath.points = contactFlow;

      //   let introui2 = new Entity();
      //   introui2.Position.set(
      //     this.splinePath.points[2].x,
      //     this.splinePath.points[2].y - 2,
      //     this.splinePath.points[2].z - 2
      //   );
      //   const h = async () => {
      //     let html = /*html*/ `
      //     <div class="uk-card uk-card-default uk-card-body uk-text-center" uk-scrollspy="cls: uk-animation-scale-up; repeat: true">
      //       <h3 class="uk-card-title">Contact</h3>
      //       <p>Feel free to reach out to me at <a href="mailto:hamza@ben-hassen.com">hamza@ben-hassen.com</a></p>
      //       <form class="uk-form-stacked">
      //         <div class="uk-margin">
      //           <label class="uk-form-label" for="form-stacked-text">Name</label>
      //           <div class="uk-form-controls">
      //             <input       
      //                  </div>
      //         </div>
      //         <div class="uk-margin">
      //           <label class="uk-form-label" for="form-stacked-email">Email</label>
      //           <div class="uk-form-controls">
      //             <input class="uk-input" id="form-stacked-email" type="email" placeholder="Your Email">
      //           </div>
      //         </div>
      //         <div class="uk-margin">
      //           <label class="uk-form-label" for="form-stacked-message">Message</label>
      //           <div class="uk-form-controls">
      //             <textarea class="uk-textarea" id="form-stacked-message" rows="5" placeholder="Your Message"></textarea>
      //           </div>
      //         </div>
      //         <button class="uk-button uk-button-primary">Send</button>
      //       </form>
      //     </div>`;
      //     const uicomponent = new twoDUIComponent(
      //       html,
      //       new THREE.Vector2(window.innerWidth * 0.8, window.innerHeight * 1.2)
      //     );
      //     await introui2.AddComponent(uicomponent);
      //     await this.mc.entitymanager.AddEntity(introui2, "contactUI");
      //   };
      //   h();
      //   this.cubePosition = 1;
      //   this.updateScrollbarPosition();
      //   this.updateSplineObject();
      // };

      // projectsButton.onclick = () => {

      //   this.mc.listener = new  SoundGeneratorAudioListener();
      //   const car = new Entity();
      //   const carcontroller = new CarComponent({
  
      //   });
      //   const keyboardinput = new KeyboardInput();
     
      //   car.Position = new THREE.Vector3(0, 1, 0);
      //    car.AddComponent(carcontroller).then(() => {      
      //     car.AddComponent(keyboardinput);    
      //    this.mc.entitymanager.AddEntity(car, "Car"+Math.random())})
      //   let projectsFlow = [
      //     new THREE.Vector3(0, 15, -5),
      //     new THREE.Vector3(5,10, -5),
      //     new THREE.Vector3(8, 3, -5),
      //     new THREE.Vector3(12, 3, -5),
      //     new THREE.Vector3(15, 1.5, -5),
      //   ];

      //   this.splinePath.points = projectsFlow;

      //   // for (let i = 1; i < projectsFlow.length; i++) {
      //   //   let introui = new Entity();
      //   //   introui.Position.set(
      //   //     this.splinePath.points[i].x,
      //   //     this.splinePath.points[i].y -2,
      //   //     this.splinePath.points[i].z - 2
      //   //   );
      //   //   const h = async () => {
      //   //     let html = /*html*/ `
      //   //     <div class="uk-card uk-card-default uk-card-body uk-text-center" uk-scrollspy="cls: uk-animation-scale-up; repeat: true">
      //   //       <h3 class="uk-card-title">Project ${i + 1}</h3>
      //   //       <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed euismod, nulla sit amet aliquam lacinia, nisl nisl aliquam nisl, nec aliquam nisl nisl sit amet nisl.</p>
      //   //       <div class="uk-grid-small uk-child-width-auto" uk-grid>
      //   //         <div>
      //   //           <a class="uk-button uk-button-text" href="#">Read more</a>
      //   //         </div>
      //   //         <div>
      //   //           <a class="uk-button uk-button-text" href="#">Source code</a>
      //   //         </div>
      //   //       </div>
      //   //     </div>`;
      //   //     const uicomponent = new twoDUIComponent(
      //   //       html,
      //   //       new THREE.Vector2(window.innerWidth * 0.8, window.innerHeight * 1)
      //   //     );
      //   //     await introui.AddComponent(uicomponent);
      //   //     await this.mc.entitymanager.AddEntity(introui, `projectUI${i}`);
      //   //   };
      //   //   h();
      //   // }
      //   this.cubePosition = 0.01;

      //   this.updateScrollbarPosition();
      //   this.updateSplineObject();
      // };

      // aboutButton.onclick = () => {
      //   let aboutFlow = [
      //     new THREE.Vector3(0, 15, 0),
      //     new THREE.Vector3(2, 14, -2),
      //     new THREE.Vector3(12, 10, 0),
      //     new THREE.Vector3(22, 10, 0),
      //   ];
      //   this.splinePath.points = aboutFlow;
      //   this.cubePosition = 0.5;

      //   let introui2 = new Entity();
      //   introui2.Position.set(
      //     this.splinePath.points[2].x,
      //     this.splinePath.points[2].y,
      //     this.splinePath.points[2].z - 2
      //   );
      //   const h = async () => {
      //     let html = /*html*/ `
      //     <div class="uk-card uk-card-default uk-card-body uk-text-center" uk-scrollspy="cls: uk-animation-scale-up; repeat: true">
      //       <h3 class="uk-card-title">About Me</h3>
      //       <p>I am an electrical engineer with a passion for innovation and problem-solving. With expertise in embedded systems, automation, and human-machine interfaces, I strive to create cutting-edge solutions that enhance user experiences and drive technological advancements.</p>
      //       <div class="uk-grid-small uk-child-width-auto" uk-grid>
      //         <div>
      //           <a class="uk-button uk-button-text" href="#">Resume</a>
      //         </div>
      //         <div>
      //           <a class="uk-button uk-button-text" href="#">Portfolio</a>
      //         </div>
      //       </div>
      //     </div>`;
      //     const uicomponent = new twoDUIComponent(
      //       html,
      //       new THREE.Vector2(window.innerWidth * 0.4, window.innerHeight * 0.8)
      //     );
      //     await introui2.AddComponent(uicomponent);
      //     await this.mc.entitymanager.AddEntity(introui2, "aboutUI");
      //   };
      //   h();
      //   this.updateScrollbarPosition();
      //   this.updateSplineObject();
      // };
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
