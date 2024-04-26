const keys = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  space: false,
  shift: false,
  backspace: false,
  attack1: false,
  attack2: false,
  action: false,
};
 let cb = function (e) {
  this.task = "followcursor";
   console.log("worker setup");

  const walktopos = function (locationposition) {
    if (this.taskintervals) {
      for (let i = 0; i < this.taskintervals.length; i++) {
        console.log("clearing interval " + i);
         clearInterval(this.taskintervals[i]);
         //remove the interval from the array
          this.taskintervals.splice(i, 1);
      }
    }

 
    const interval = setInterval(() => {
      const controlObject = new THREE.Object3D();
      controlObject.position.copy(this._entity.Position);
      controlObject.quaternion.copy(this._entity.Quaternion);
      controlObject.lookAt(locationposition);
      const distance = controlObject.position.distanceTo(locationposition);
      //rotation
      const targetDirection = new THREE.Vector3()
        .subVectors(locationposition, this._entity.Position)
        .normalize();
      const currentDirection = new THREE.Vector3(0, 0, 1).applyQuaternion(
        this._entity.Quaternion
      );
      const crossProduct = new THREE.Vector3().crossVectors(
        currentDirection,
        targetDirection
      );
      const deadZone = 0.05; // Change this value according to required dead zone size.

      //  console.log(distance);
      if (distance > 1) {
        console.log("walking");
        try {
          if (this.state == "Walking" || this.state == "Running") {
            //shift
            if (distance > 8) {
              this.Input._keys.shift = true;
            } else {
              this.Input._keys.shift = false; 
            }
          } 
          else {
            this.Input._keys.forward = true ;  
          }
        } catch (error) {
          console.log(error);
        }

        if (crossProduct.y < -deadZone) {
          // Needs to turn right
          this.Input._keys.right = true;
          this.Input._keys.left = false;
        } else if (crossProduct.y > deadZone) {
          // Needs to turn left
          this.Input._keys.right = false;
          this.Input._keys.left = true;
        } else {
          // Within the dead zone, maintain current direction
          //we might be facing the wrong direction , so we need to check the deviation of the target position from the current position and press either left or right
          const deviation = controlObject.quaternion.angleTo(
            this._entity.Quaternion
          );
          if (Math.abs(deviation) > 1) {
            this.Input._keys.left = true;
            this.Input._keys.right = false;
          } else {
            this.Input._keys.left = false;
            this.Input._keys.right = false;
          }

          this.Input._keys.forward = true;

          const targetDirection = new THREE.Vector3()
            .subVectors(locationposition, controlObject.position)
            .normalize();
          const currentDirection = new THREE.Vector3(0, 0, 1).applyQuaternion(
            this._entity.Quaternion
          );
          const crossProduct = new THREE.Vector3().crossVectors(
            currentDirection,
            targetDirection
          );
          const deadZone = 0.05; // Change this value according to required dead zone size.

          try {
            if (crossProduct.y < -deadZone) {
              // Needs to turn right
              this.Input._keys.right = true;
              this.Input._keys.left = false;
            } else if (crossProduct.y > deadZone) {
              // Needs to turn left
              this.Input._keys.right = false;
              this.Input._keys.left = true;
            } else {
              // Within the dead zone, maintain current direction
              //we might be facing the wrong direction , so we need to check the deviation of the target position from the current position and press either left or right
              const deviation = controlObject.quaternion.angleTo(
                this._entity.Quaternion
              );
              if (Math.abs(deviation) > 1) {
                this.Input._keys.left = true;
                this.Input._keys.right = false;
              } else {
                this.Input._keys.left = false;
                this.Input._keys.right = false;
              }
            }
          } catch (error) {
            console.log(error);
          }
        }
      } else {
        try {
          this.Input._keys.shift = false;
          this.Input._keys.forward = false;
          this.Input._keys.left = false;
          this.Input._keys.right = false;
          clearInterval(interval);
          //remove the interval from the array
          this.taskintervals.splice(this.taskintervals.indexOf(interval), 1);
          return;
        } catch (error) {
          console.log(error);
        }
      }
      console.log(distance);
    }, 50);  

    this.taskintervals.push(interval);
  }.bind(this);
    console.log("walking to cursor");
   let mc = this._entity._entityManager._mc;
  // let pos = mc.UIManager.attentionCursor.position;

  // walktopos(new THREE.Vector3(pos.x, 0, pos.z));

  
    interval = setInterval(() => {
      console.log("check")
    let pos = mc.UIManager.attentionCursor.position;
    walktopos(new THREE.Vector3(pos.x, 0, pos.z));
  }
  , 1000);
   this.taskintervals.push(interval);
};

self.postMessage({ type: "input", input: keys });
self.postMessage({ type: "jssetup", js: `(${cb.toString()})` });
