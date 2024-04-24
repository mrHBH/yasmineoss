let ver = "0.0.306";
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
                 <li><a href="#">Electrical Enginee r</a></li>
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
              <a class="uk-button  uk-button-text"  id="projectsButton" href="#">Projec</a>

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
  
  
   let mc =   this._entity._entityManager._mc
   console.log(mc);
   if (mc){
   
      let contactButton =this.HtmlElement.querySelector(
        "#contactButton"
      )  
      let projectsButton = this.HtmlElement.querySelector(
        "#projectsButton"
      )  
      let aboutButton = this.HtmlElement.querySelector(
        "#aboutButton"
      )  

      contactButton.onclick = () => {
     
        let contactFlow = [
          new THREE.Vector3(0, 15, 0),
          new THREE.Vector3(-2, 15, 0),
          new THREE.Vector3(-14, 19, 0),
        ];
        mc.UIManager.splinePath.points = contactFlow;   
      
        mc.UIManager.cubePosition = 1;
        mc.UIManager.updateScrollbarPosition();
        mc.UIManager.updateSplineObject();

      };

      projectsButton.onclick = () => {
        mc.initSound();

        let contactFlow = [
          new THREE.Vector3(0, 15, 0),
          new THREE.Vector3(0, 10, 0),
          new THREE.Vector3(0,3, 5),
        ];
        mc.UIManager.splinePath.points = contactFlow;   
      
        mc.UIManager.cubePosition = 1;
        mc.UIManager.updateScrollbarPosition();
        mc.UIManager.updateSplineObject();

        mc.spwancar();
      };

      aboutButton.onclick = () => {
        let aboutFlow = [
          new THREE.Vector3(0, 15, 0),
          new THREE.Vector3(2, 14, -2),
          new THREE.Vector3(12, 10, 0),
          new THREE.Vector3(22, 10, 0),
        ];
        mc.UIManager.splinePath.points = aboutFlow;
        this.cubePosition = 0.5;

        let introui2 = new Entity();
        introui2.Position.set(
          mc.UIManager.splinePath.points[2].x,
          mc.UIManager.splinePath.points[2].y,
          mc.UIManager.splinePath.points[2].z - 2
        );
        const h = async () => {
          let html = /*html*/ `
          <div class="uk-card uk-card-default uk-card-body uk-text-center" uk-scrollspy="cls: uk-animation-scale-up; repeat: true">
            <h3 class="uk-card-title">About Me</h3>
            <p>I am an electrical engineer with a passion for innovation and problem-solving. With expertise in embedded systems, automation, and human-machine interfaces, I strive to create cutting-edge solutions that enhance user experiences and drive technological advancements.</p>
            <div class="uk-grid-small uk-child-width-auto" uk-grid>
              <div>
                <a class="uk-button uk-button-text" href="#">Resume</a>
              </div>
              <div>
                <a class="uk-button uk-button-text" href="#">Portfolio</a>
              </div>
            </div>
          </div>`;
          const uicomponent = new twoDUIComponent(
            html,
            new THREE.Vector2(window.innerWidth * 0.4, window.innerHeight * 0.8)
          );
          await introui2.AddComponent(uicomponent);
          await this.mc.entitymanager.AddEntity(introui2, "aboutUI");
        };
        h();
        this.updateScrollbarPosition();
        this.updateSplineObject();
      };
    };
};
 
postMessage({ type: 'freshhtml' , html : html });
postMessage({ type: 'size', width: 1500, height: 1000 });



self.postMessage({ type: 'jssetup', js: `(${cb.toString()})` });
 