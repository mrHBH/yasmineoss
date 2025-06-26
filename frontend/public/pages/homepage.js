let ver = "0.0.306";

  
const fronthtml = /*html*/ `
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
       <h3 class="uk-card-title uk-text-center">Navigation</h3> 
       <div class="uk-child-width-1-2@s uk-child-width-1-3@m uk-grid-match" uk-grid>
         <div>
           <div class="uk-card uk-card-secondary uk-card-body uk-card-hover uk-text-center" uk-scrollspy="cls: uk-animation-scale-up; repeat: true">
             <span uk-icon="icon: mail; ratio: 2"></span>
             <div class="uk-grid-small uk-child-width-auto  uk-center" uk-grid>
                 <div>
                   <a class="uk-button  uk-button-text  uk-text-center "  id="contactButton" href="#">Contact</a>
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
let cb = function (e) {

// Create fixed smooth navigation on document
const createFixedSmoothNavigation = () => {
  // Remove existing navigation if it exists
  const existingNav = document.getElementById('smoothNavigation');
  if (existingNav) {
    existingNav.remove();
  }
  
  // Create CSS link if it doesn't exist
  if (!document.querySelector('link[href*="smooth-navigation.css"]')) {
    const cssLink = document.createElement('link');
    cssLink.rel = 'stylesheet';
    cssLink.href = '../styles/smooth-navigation.css';
    document.head.appendChild(cssLink);
  }
  
  
  // Create the navigation HTML
  const navHTML = `
    <div class="smooth-navigation" id="smoothNavigation">
      <div class="section-indicator">Start</div>
      <div class="nav-ruler">
        <div class="nav-progress" id="navProgress"></div>
        <div class="nav-markers">
          <div class="nav-marker" data-section="home">
            <div class="nav-label">🏠 Home</div>
          </div>
          <div class="nav-marker" data-section="contact">
            <div class="nav-label">📧 Contact</div>
          </div>
          <div class="nav-marker" data-section="projects">
            <div class="nav-label">💼 Projects</div>
          </div>
          <div class="nav-marker" data-section="about">
            <div class="nav-label">👤 About</div>
          </div>
        </div>
      </div>
      <div class="section-indicator">End</div>
      <div class="section-indicator" style="font-size: 8px; opacity: 0.6; margin-top: 0.5rem;">scroll or click</div>
    </div>
  `;
  
  // Create a container and add it to the document body
  const navContainer = document.createElement('div');
  navContainer.innerHTML = navHTML;
  document.body.appendChild(navContainer.firstElementChild);
  
  return document.getElementById('smoothNavigation');
};

// Navigation system state
const navigationState = {
  sections: [
    { name: 'home', position: new THREE.Vector3(0, 15, 0), progress: 0 },
    { name: 'contact', position: new THREE.Vector3(-15, 10, 0), progress: 0.33 },
    { name: 'projects', position: new THREE.Vector3(25, 0.01, 20), progress: 0.66 },
    { name: 'about', position: new THREE.Vector3(15, 10, 2), progress: 1.0 }
  ],
  currentSection: 0,
  isTransitioning: false
};

// Smooth navigation functions
const updateNavigationProgress = (progress) => {
  const navProgress = document.getElementById('navProgress'); // Now reference document directly
  const markers = document.querySelectorAll('.nav-marker'); // Now reference document directly
  
  if (navProgress) {
    // Clamp progress between 0 and 1
    const clampedProgress = Math.max(0, Math.min(1, progress));
    navProgress.style.top = `${clampedProgress * 100}%`;
  }
  
  // Update active marker with smooth transitions
  markers.forEach((marker, index) => {
    marker.classList.remove('active');
    const sectionProgress = navigationState.sections[index]?.progress || 0;
    if (Math.abs(progress - sectionProgress) < 0.15) {
      marker.classList.add('active');
    }
  });
};

const getProgressFromCameraPosition = () => {
  const mc = this._entity._entityManager._mc;
  if (!mc || !mc.UIManager) return 0;
  
  // Convert cube position to navigation progress
  const totalSections = navigationState.sections.length - 1;
  return mc.UIManager.cubePosition / totalSections;
};

const syncNavigationWithCamera = () => {
  const progress = getProgressFromCameraPosition();
  updateNavigationProgress(progress);
};

const handleSmoothNavScroll = (event) => {
  event.preventDefault();
  const mc = this._entity._entityManager._mc;
  if (!mc || navigationState.isTransitioning) return;
  
  const delta = event.deltaY > 0 ? 0.1 : -0.1;
  const newPosition = Math.max(0, Math.min(1, mc.UIManager.cubePosition + delta));
  
  mc.UIManager.cubePosition = newPosition;
  mc.UIManager.updateScrollbarPosition();
  mc.UIManager.moveCubeAlongPath(0);
  
  // Update our navigation progress to match
  const navProgress = newPosition * 0.75; // Scale to match our navigation range
  updateNavigationProgress(navProgress);
};

const smoothTransitionTo = async (targetSection, duration = 2000) => {
  if (navigationState.isTransitioning) return;
  navigationState.isTransitioning = true;
  
  const mc = this._entity._entityManager._mc;
  const startPos = mc.UIManager.splinePath.points[mc.UIManager.splinePath.points.length - 1] || new THREE.Vector3(0, 15, 0);
  const targetPos = navigationState.sections[targetSection].position;
  const targetProgress = navigationState.sections[targetSection].progress;
  
  // Create smooth path
  const controlPoints = [
    startPos,
    startPos.clone().lerp(targetPos, 0.3).add(new THREE.Vector3(0, 5, 0)), // Add some curve
    targetPos
  ];
  
  mc.UIManager.splinePath.points = controlPoints;
  mc.UIManager.updateSplineObject();
  
  // Animate the transition
  await tween({
    from: { 
      progress: mc.UIManager.cubePosition,
      navProgress: navigationState.sections[navigationState.currentSection].progress 
    },
    to: { 
      progress: 1,
      navProgress: targetProgress 
    },
    duration: duration,
    easing: "easeInOutCubic",
    render: (state) => {
      mc.UIManager.cubePosition = state.progress;
      mc.UIManager.updateScrollbarPosition();
      updateNavigationProgress(state.navProgress);
    },
  });
  
  navigationState.currentSection = targetSection;
  navigationState.isTransitioning = false;
};

// Cleanup function to remove navigation
const cleanupSmoothNavigation = () => {
  const existingNav = document.getElementById('smoothNavigation');
  if (existingNav) {
    existingNav.remove();
  }
};

const interestshtml = /*html*/ `
<div class="uk-card uk-card-secondary uk-card-body" uk-scrollspy="cls: uk-animation-slide-left; repeat: true">

  <h3 class="uk-card-title">Interests</h3>
  <ul class="uk-list uk-list-divider">

    <li><a href="#">Embedded Systems</a></li>
    <li><a href="#">Automation</a></li>
    <li><a href="#">Human-Machine Interfaces</a></li>
    <li><a href="#">LLM driven agents</a></li>

  </ul>
</div>
`;
const contacthtml =/*html*/ `
<div class="uk-card uk-card-secondary uk-card-body" uk-scrollspy="cls: uk-animation-slide-left; repeat: true">
  <h3 class="uk-card-title">Contact</h3>
  <form>
    <fieldset class="uk-fieldset">
      <div class="uk-margin">
        <input class="uk-input" type="text" placeholder="Name" required>
      </div>
      <div class="uk-margin">
        <input class="uk-input" type="email" placeholder="Email" required>
      </div>
      <div class="uk-margin">
        <textarea class="uk-textarea" rows="5" placeholder="Message" required></textarea>
      </div>
      <button class="uk-button uk-button-primary" type="submit">Send</button>
    </fieldset>
  </form>
</div>
`;

   let mc = this._entity._entityManager._mc;
   console.log(mc);
   if (mc){
   
      // Create the fixed smooth navigation on the document
      const smoothNavElement = createFixedSmoothNavigation();
      
      // Hide the old scrollbar since we're replacing it
      const oldScrollbar = document.querySelector('.scrollbar-container');
      if (oldScrollbar) {
        oldScrollbar.style.display = 'none';
      }
      
      // Initialize navigation
      updateNavigationProgress(0);
      
      // Set up periodic sync with camera position
      setInterval(() => {
        if (!navigationState.isTransitioning) {
          syncNavigationWithCamera();
        }
      }, 100); // Update every 100ms for smooth tracking
      
      // Setup navigation marker click handlers
      const navMarkers = document.querySelectorAll('.nav-marker'); // Now reference document
      const smoothNavContainer = document.getElementById('smoothNavigation'); // Now reference document
      
      // Add scroll wheel support to smooth navigation
      if (smoothNavContainer) {
        smoothNavContainer.addEventListener('wheel', handleSmoothNavScroll, { passive: false });
      }
      
      navMarkers.forEach((marker, index) => {
        marker.addEventListener('click', async () => {
          await smoothTransitionTo(index);
          
          // Trigger section-specific actions
          const sectionName = navigationState.sections[index].name;
          switch(sectionName) {
            case 'contact':
              mc.UIManager.adduiElement("contactui", contacthtml, navigationState.sections[index].position);
              break;
            case 'projects':
              mc.initSound();
              const ui = await mc.UIManager.CreateDynamicUI("projectsUIé", "../pages/projects.js", 
                navigationState.sections[index].position, 
                new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2));
              break;
            case 'about':
              mc.UIManager.adduiElement("aboutui", interestshtml, navigationState.sections[index].position);
              break;
          }
        });
      });
   
      let contactButton = this.HtmlElement.querySelector("#contactButton");  
      let projectsButton = this.HtmlElement.querySelector("#projectsButton");  
      let aboutButton = this.HtmlElement.querySelector("#aboutButton");  
      
      contactButton.onclick = async () => {
        await smoothTransitionTo(1); // Contact section
        mc.UIManager.adduiElement("contactui", contacthtml, navigationState.sections[1].position);
      };

      projectsButton.onclick = async () => {
        mc.initSound();
        await smoothTransitionTo(2); // Projects section
        
        const ui = await mc.UIManager.CreateDynamicUI("projectsUIé", "../pages/projects.js", 
          navigationState.sections[2].position, 
          new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2));
        
        const dynauicomponent = ui.getComponent("DynamicuiWorkerComponent");
      };

      aboutButton.onclick = async () => {
        await smoothTransitionTo(3); // About section
        mc.UIManager.adduiElement("aboutui", interestshtml, navigationState.sections[3].position); 
      };
      
      mc.UIManager.updateScrollbarPosition();
      mc.UIManager.updateSplineObject();
   };
};
 
 
postMessage({ type: 'freshhtml' , html : fronthtml });
postMessage({ type: 'size', width: 1500, height: 1000 });



self.postMessage({ type: 'jssetup', js: `(${cb.toString()})` });
 