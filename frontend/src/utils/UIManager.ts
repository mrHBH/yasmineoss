import * as THREE from "three";
import { MainController } from "./MainController";
import { TransformControls } from "three/addons/controls/TransformControls.js";
import { twoDUIComponent } from "../utils/Components/2dUIComponent";
import { threeDUIComponent } from "../utils/Components/3dUIComponent";
import { Entity } from "./Entity";
import * as pdfjsLib from "pdfjs-dist";

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
  constructor(parent: MainController) {
    this.mc = parent;
    this.createAttentionCursor();
    this.createSplinePath();
    this.createUIButtons();
    this.addScrollbar();
    this.moveCubeAlongPath(0);
    this.createInitialUI();
  }
  private createInitialUI(): void {
    const html = /*html*/ `
<div class="<div class=" uk-section uk-section-secondary uk-light">
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
              <p>Welcome to my personal website!</p>
            </div>
          </article>
        </div>
      </div>
      <div>
        <div class="uk-card uk-card-default uk-card-body" uk-scrollspy="cls: uk-animation-slide-right; repeat: true">
          <h3 class="uk-card-title">About Me</h3>
          <p>I am an electrical engineer with a passion for innovation and problem-solving. With expertise in embedded
            systems, automation, and human-machine interfaces, I strive to create cutting-edge solutions that enhance
            user experiences and drive technological advancements.</p>
        </div>
      </div>
    </div>
  </div>
</div>
<div class="uk-section uk-section-muted " uk-scrollspy="cls: uk-animation-slide-left; repeat: true ; ">
  <div class="uk-container">
    <h2 class="uk-text-center">Skills</h2>
    <div class="uk-child-width-1-2@s uk-child-width-1-4@m uk-grid-match" uk-grid>
      <div>
        <div class="uk-card uk-card-default uk-card-body uk-text-center" uk-scrollspy="cls: uk-animation-scale-up; repeat: true">
          <span uk-icon="icon: code; ratio: 2"></span>
          <h3 class="uk-card-title">Programming</h3>
          <p>Proficient in Python, JavaScript, TypeScript, C, and C#</p>
        </div>
      </div>
      <div>
        <div class="uk-card uk-card-default uk-card-body uk-text-center" uk-scrollspy="cls: uk-animation-scale-up; repeat: true">
          <span uk-icon="icon: bolt; ratio: 2"></span>
          <h3 class="uk-card-title">Embedded Systems</h3>
          <p>Experience with Bluetooth Low Energy, ZigBee, and Modbus</p>
        </div>
      </div>
      <div>
        <div class="uk-card uk-card-default uk-card-body uk-text-center" uk-scrollspy="cls: uk-animation-scale-up; repeat: true">
          <span uk-icon="icon: comments; ratio: 2"></span>
          <h3 class="uk-card-title">Languages</h3>
          <p>Fluent in German, English, French, and Arabic</p>
        </div>
      </div>
      <div>
        <div class="uk-card uk-card-default uk-card-body uk-text-center" uk-scrollspy="cls: uk-animation-scale-up; repeat: true">
          <span uk-icon="icon: future; ratio: 2"></span>
          <h3 class="uk-card-title">Interests</h3>
          <p>Generative AI pipelines for ASR, TTS, language understanding, and reasoning</p>
        </div>
      </div>
    </div>
  </div>
 </div> `;

 
    let canvas = document.createElement("canvas");
    // Loading a document.
    const loadingTask = pdfjsLib.getDocument("resumeEN.pdf");
    loadingTask.promise
      .then(function (pdfDocument) {
        // Request a first page
        return pdfDocument.getPage(1).then(function (pdfPage) {
          // Display page on the existing canvas with 100% scale.
          const viewport = pdfPage.getViewport({ scale: 4.0 });

          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext("2d");
          const renderTask = pdfPage.render({
            canvasContext: ctx,
            viewport,
          });
          //document.body.appendChild(canvas);
          return renderTask.promise;
        });
      })
      .catch(function (reason) {
        console.error("Error: " + reason);
      });

    const h = async () => {
      for (let i = 0; i < 1; i++) {
        let introui = new Entity();
        introui.Position.set(
          this.splinePath.points[i].x,
          this.splinePath.points[i].y  ,
          this.splinePath.points[i].z - 2
        );
        await introui.AddComponent(
          new twoDUIComponent(
            html,
            new THREE.Vector2(window.innerWidth * 0.8, window.innerHeight * 1.0)
          )
        );
        // const loadingTask = pdfjsLib.getDocument("resumeEN.pdf");
        // loadingTask.promise
        //   .then(function (pdfDocument) {
        //     // Request a first page
        //     return pdfDocument.getPage(1).then(function (pdfPage) {
        //       // Display page on the existing canvas with 100% scale.
        //       const viewport = pdfPage.getViewport({ scale: 15});

        //       canvas.width = viewport.width;
        //       canvas.height = viewport.height;
        //       const ctx = canvas.getContext("2d");
        //       const renderTask = pdfPage.render({
        //         canvasContext: ctx,
        //         viewport,
        //       });
        //       //document.body.appendChild(canvas);
        //       //get ui component
        //       let uicomponent = introui.getComponent ("twoDUIComponent") as  Promise<twoDUIComponent>;
        //       // uicomponent.then((value) => {
        //       //   value.HtmlElement.appendChild(canvas);
        //       // });

        //       return renderTask.promise;
        //     });
        //   })
        //   .catch(function (reason) {
        //     console.error("Error: " + reason);
        //   });
        await this.mc.entitymanager.AddEntity(introui, "UI" + i);
      }
      // let introui2 = new Entity();

      // introui2.Position.set(
      //   this.splinePath.points[4].x,
      //   this.splinePath.points[4].y,
      //   this.splinePath.points[4].z - 2
      // );
      // await introui2.AddComponent(
      //   new twoDUIComponent(
      //     html,
      //     new THREE.Vector2(window.innerWidth * 3.2, window.innerHeight * 1.6)
      //   )
      // );
      // await this.mc.entitymanager.AddEntity(introui2, "UIflat");

      // const loadingTask = pdfjsLib.getDocument("resumeEN.pdf");

      // loadingTask.promise
      //   .then(function (pdfDocument) {
      //     // Request a first page
      //     return pdfDocument.getPage(1).then(function (pdfPage) {
      //       // Display page on the existing canvas with 100% scale.
      //       const viewport = pdfPage.getViewport({ scale: 15});

      //       canvas.width = viewport.width;
      //       canvas.height = viewport.height;
      //       const ctx = canvas.getContext("2d");
      //       const renderTask = pdfPage.render({
      //         canvasContext: ctx,
      //         viewport,
      //       });
      //       //document.body.appendChild(canvas);
      //       //get ui component
      //       let uicomponent = introui.getComponent ("twoDUIComponent") as  Promise<twoDUIComponent>;
      //       // uicomponent.then((value) => {
      //       //   value.HtmlElement.appendChild(canvas);
      //       // });

      //       return renderTask.promise;
      //     });
      //   })
      //   .catch(function (reason) {
      //     console.error("Error: " + reason);
      //   });

      //  introui.rotation.set(-Math.PI / 2, 0, 0, 1);
      //   const uicomponent = new twoDUIComponent(html, new THREE.Vector2(1000, 600));

      // await   introui.AddComponent(uicomponent);
      //   await this.mc.entitymanager.AddEntity(introui, "UI");

      // const introui3 = new Entity();
      // introui3.Position.set(0, 0.1, 0);
      // introui3.AddComponent (new threeDUIComponent(html2, new THREE.Vector2(1000, 600) ));
      // this.mc.entitymanager.AddEntity(introui3, "UI3");

      // const introui4 = new Entity();
      // introui4.Position.set(0, 0.1, 0);
      // introui4.AddComponent (new threeDUIComponent(html2, new THREE.Vector2(1000, 600) ));
      // this.mc.entitymanager.AddEntity(introui4, "UI4");
    };
    h();
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

      new THREE.Vector3(0, 5, 0),
      new THREE.Vector3(-5, 2, 10),

      new THREE.Vector3(-5, 2, 10),
    ];
    this.splinePath = new THREE.CatmullRomCurve3(controlPoints);
    const points = this.splinePath.getPoints(1000);
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
      const delta = Math.sign(event.deltaY) * 0.01;
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
    document.getElementById("homeButton")?.addEventListener("click", () => {});

    document
      .getElementById("togglemousecontrolsbutton")
      ?.addEventListener("click", () => {
        //toggle the first person view
        if (this.mc.orbitControls.enableZoom) {
          this.mc.orbitControls.enableZoom = false;
          // this.orbitControls.enableRotate = false;
          window.addEventListener("wheel", this.mousewheelistener.bind(this));
          document
            .getElementById("togglemousecontrolsbutton")
            ?.classList.add("uk-text-danger");
          this.scrollmodenavigation = true;
        } else {
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

  private followCursor(): void {
    this.mc.zoomTo(this.attentionCursor.position, 6, new THREE.Quaternion());
  }

  Update() {
    if (this.scrollmodenavigation) {
      // this.trackCamera();
      this.followCursor(); // Call the new function
    }
  }
}
export { UIManager };
