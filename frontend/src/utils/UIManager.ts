import * as THREE from 'three';
import { MainController } from './MainController';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { twoDUIComponent } from "../utils/Components/2dUIComponent";
import { threeDUIComponent } from "../utils/Components/3dUIComponent";
import { Entity } from './Entity';
class UIManager {
    
  private splinePath: THREE.CatmullRomCurve3 | null = null;
  attentionCursor: THREE.Mesh | null = null;
  private cubePosition: number = 0;
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
    const html = /*html*/   `
   <div class="uk-container-expand" style="background-color: #212121; box-shadow: 0 4px 8px 0 rgba(0,0,0,0.2); transition: 0.3s; margin: 10px;  ">
  <div class="uk-child-width-1-1 uk-grid-match" uk-grid>
    <div>
      <div class="uk-child-width-1-2@m uk-grid-match" uk-grid>
        <div class="uk-width-3-5">
          <div class="uk-card uk-card-secondary uk-card-body uk-animation-slide-left">
            <h3 class="uk-card-title">Hamza Ben Hassen</h3>
            <p class="inner-text uk-text-lead">Electrical engineer, AI enthusiast, game dev hobbyist</p>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Personal Details and About Me Section -->
  <div class="uk-grid-margin">
    <div class="uk-width-1-2@m uk-grid-match" uk-grid>
      <div class="uk-card uk-card-secondary uk-card-body uk-animation-slide-right">
        <h3 class="uk-card-title">About Me</h3>
        <p class="inner-text uk-text-lead">As an electrical engineer with a passion for AI and game development, I bring a unique blend of technical expertise and creativity to my work. With experience in automotive and a diverse skill set, I strive to create innovative solutions that push the boundaries of what's possible.</p>
      </div>
    </div>
  </div>

  <!-- Skills Section -->
  <div class="uk-grid-margin">
    <div class="uk-width-1-2@m uk-grid-match" uk-grid>
      <div class="uk-card uk-card-secondary uk-card-body uk-animation-scale-up">
        <h3 class="uk-card-title">Skills</h3>
        <ul class="uk-list uk-list-bullet">
          <li>Electrical Engineering</li>
          <li>Artificial Intelligence</li>
          <li>Game Development</li>
          <li>Automotive</li>
          <li>Multilingual (English, French, German)</li>
        </ul>
      </div>
    </div>
  </div>
 
  <!-- Contact Section -->
  <div class="uk-grid-margin">
    <div class="uk-width-1-2@m uk-grid-match" uk-grid>
      <div class="uk-card uk-card-secondary uk-card-body uk-animation-slide-bottom">
        <h3 class="uk-card-title">Contact</h3>
        <ul class="uk-list">
          <li><a href="mailto:Hamza@Ben-Hassen.com"><i class="fa fa-envelope-o"></i> Hamza@Ben-Hassen.com</a></li>
          <li><a href="http://hamza.ben-hassen.com"><i class="fa fa-globe"></i> hamza.ben-hassen.com</a></li>
          <li><a href="https://www.linkedin.com/in/mrhbh/"><i class="fa fa-linkedin"></i> linkedin.com/in/mrhbh/</a></li>
         </ul>

`;
 
 
 
    const h = async () => {


        for (let i = 0; i < 1; i++) {
            let introui = new Entity();
            introui.Position.set(this.splinePath.points[i].x, this.splinePath.points[i].y -8 /2 , this.splinePath.points[i].z-2);
            await introui.AddComponent(new twoDUIComponent(html, new THREE.Vector2(1000, 1000)));
        
            await this.mc.entitymanager.AddEntity(introui, "UI" + i);
        
        
        }
        
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

    }
   h();

    
}
   private createAttentionCursor(): void {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
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
  
      this.cubePosition = this.scrollbarContainer.scrollTop / (this.scrollbarContent.offsetHeight - this.scrollbarContainer.offsetHeight);
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
      this.scrollbarContainer.scrollTop = this.cubePosition * (this.scrollbarContent.offsetHeight - this.scrollbarContainer.offsetHeight);
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
    document.getElementById("homeButton")?.addEventListener("click", () => {
     
    });

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
      document.getElementById("togglemousecontrolsbutton")
      ?.click();
    document.getElementById("voiceButton")?.addEventListener("click", () => {
      // this.toggleVoice();
    });
  }

 
  private followCursor(): void {
    this.mc.zoomTo(this.attentionCursor.position, 6, new THREE.Quaternion());
  }


   Update(){
    if (this.scrollmodenavigation) {
        // this.trackCamera();
        this.followCursor(); // Call the new function
      }
   }
}
export { UIManager}