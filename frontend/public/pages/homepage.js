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
      
      let startpos = new THREE.Vector3(0, 15, 0);
      contactButton.onclick = () => {
        let pos =   new THREE.Vector3(-15, 10, 0)  
        let contactFlow = [
          startpos,
          pos,
 
        ];
        mc.UIManager.splinePath.points = contactFlow;   
      
        mc.UIManager.cubePosition = 1;
        mc.UIManager.updateScrollbarPosition();
        mc.UIManager.updateSplineObject();
        mc.UIManager.adduiElement("contactui", contacthtml, pos);

      };

      projectsButton.onclick = () => {
        mc.initSound();

        let contactFlow = [
          startpos,
          new THREE.Vector3(0, 10, 0),
          new THREE.Vector3(0,3, 5),
          new THREE.Vector3(5,3, 15),
          new THREE.Vector3(15,3, 20),
          new THREE.Vector3(25,3, 20),
        ];
        mc.UIManager.splinePath.points = contactFlow;   
      
        mc.UIManager.cubePosition = 1;
        mc.UIManager.updateScrollbarPosition();
        mc.UIManager.updateSplineObject();

      //  mc.spwancar();
      };

      aboutButton.onclick = () => {
      let pos =           new THREE.Vector3(15, 10, 2)


        let aboutFlow = [
          startpos,
          pos,
     
        ];
        mc.UIManager.splinePath.points = aboutFlow;
        mc.UIManager.cubePosition = 1;

        mc.UIManager.updateScrollbarPosition();  
        mc.UIManager.adduiElement("aboutui",interestshtml , pos); 
        };
      
        mc.UIManager.updateScrollbarPosition();
        mc.UIManager.updateSplineObject();
      };
    };
 
 
postMessage({ type: 'freshhtml' , html : fronthtml });
postMessage({ type: 'size', width: 1500, height: 1000 });



self.postMessage({ type: 'jssetup', js: `(${cb.toString()})` });
 