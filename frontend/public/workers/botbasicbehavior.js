
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

let position = null
let target = null
let quaternion = [null, null, null, null]
let state ="Ideling"
 let cb = function (e) {
  this.task = "wakeup";
 //  console.log("worker setup");


  let mc = this._entity._entityManager._mc;
  let pos = mc.UIManager.attentionCursor.position;
  return this.StepToPosition(new THREE.Vector3(pos.x, 0, pos.z));


 //   console.log("walking to cursor");

};







let timer = 0;
// self.onmessage = function (e) {
//   // // console.log("worker received message", e.data);
//   // print(e)
//   // if (e.type == "update") {
//   //    print("worker received update");
//   // }
    

// }


//get current target position
// self.postMessage({ type: "jssetup", js: `(${cb.toString()})` });

function updateKeysBasedOnQuaternionAndPosition(quaternion, targetPosition, threshold) {
  const qx = quaternion[0];
  const qy = quaternion[1];
  const qz = quaternion[2];
  const qw = quaternion[3];

  const x = targetPosition.x;
  const z = targetPosition.z; // Note: I assume y is not used, so I changed it to z

  // Calculate the target direction
  const targetDirection = [x - position.x, 0, z - position.z];
  const targetLength = Math.sqrt(
    targetDirection[0] ** 2 + targetDirection[1] ** 2 + targetDirection[2] ** 2
  );
  targetDirection[0] /= targetLength;
  targetDirection[1] /= targetLength;
  targetDirection[2] /= targetLength;

  // Calculate the current direction based on the quaternion
  const currentDirection = [
    2 * (qx * qz + qw * qy),
    2 * (qy * qz - qw * qx),
    1 - 2 * (qx * qx + qy * qy),
  ];

  // Calculate the cross product between the current direction and the target direction
  const crossProduct = [
    currentDirection[1] * targetDirection[2] - currentDirection[2] * targetDirection[1],
    currentDirection[2] * targetDirection[0] - currentDirection[0] * targetDirection[2],
    currentDirection[0] * targetDirection[1] - currentDirection[1] * targetDirection[0],
  ];

  const deadZone = threshold;

  if (crossProduct[1] < -deadZone) {
    // Needs to turn right
    keys.right = true;
    keys.left = false;
  } else if (crossProduct[1] > deadZone) {
    // Needs to turn left
    keys.right = false;
    keys.left = true;
  } else {
    // Within the dead zone, maintain current direction
    keys.left = false;
    keys.right = false;
  }

  let distance = Math.sqrt((position.x - targetPosition.x) ** 2 + (position.z - targetPosition.z) ** 2);
   // Always try to walk to the target position
  if (distance <1) {
    keys.forward = false;
    keys.backward = false;
  }
  else {
    keys.forward = true;
    keys.backward = false;
  }

  // Send the updated keys to the main thread
  self.postMessage({ type: "input", input: keys });
}
self.onmessage = function (e) {
  // // console.log("worker received message", e.data);
  // print(e)
  // if (e.type == "update") {
  //    print("worker received update");
  // }
  
  if (e.data.type == "update") {
    // console.log("worker received update");
      position = e.data.position 
      target = e.data.target
      quaternion =  e.data.quaternion
      state= e.data.state
      updateKeysBasedOnQuaternionAndPosition(quaternion, target, 0.05)

      // let distance2 = Math.sqrt((position.x - target.x) ** 2 + (position.z - target.z) ** 2)
      // console.log("distance to target", distance2)
      // if (distance2 > 4) {
      //   console.log("reached target")



      // }
      // //calculate distance to target
      // let distance = Math.sqrt((position.x - target.x) ** 2 + (position.z - target.z) ** 2)
      // if (distance <3) {
      //     console.log("reached target")
      //     keys.forward = false;
      //     keys.backward = false;
      //     self.postMessage({ type: "input", input: keys });



      //  }
      //  else {
      //   keys.forward = true;
      //   self.postMessage({ type: "input", input: keys });

      //  // self.postMessage({ type: "jssetup", js: `(${cb.toString()})` });
   


      //  }

 
  }
};
// self.postMessage({ type: "jssetup", js: `(${cb.toString()})` });

