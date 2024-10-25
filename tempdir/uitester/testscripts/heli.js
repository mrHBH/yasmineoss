let version = "2.00.10";
let rpm = 8000;
let thrust = [0, 0, 0];
let rotorAngularVelocity = 0;
let stableLift = 390.2;
let maxLift = 2250;
let maxLiftStep = 325;
let climbing = false;
let yawing = false;
let pitching = false;
let banking = false;
let altitude = 0;

function animate(delta, input) {
  rpm = 0;
  climbing = false;
  if (input.forward) {
    if (thrust[1] <maxLift) {
      thrust[1] +=maxLiftStep *1.3* delta;
      climbing = true;
    }
  }
  if (input.backward) {
    if (thrust[1] > 0) {
      thrust[1] -= maxLiftStep * delta;
      climbing = true;
    }
  }
  yawing = false;
  if (input.left) {
    if (rotorAngularVelocity < 20.0)
      rotorAngularVelocity += 5 * delta;
    yawing = true;
  }
  if (input.right) {
    if (rotorAngularVelocity > -2.0)
      rotorAngularVelocity -= 5 * delta;
    yawing = true;
  }

  pitching = false;
  if (input.action) {
    if (thrust[2] >= -10.0) thrust[2] -= 5 * delta;
    pitching = true;
  }
  if (input.space) {
    if (thrust[2] <= 10.0) thrust[2] += 5 * delta;
    pitching = true;
  }
  banking = false;
  if (input.attack1) {
    if (thrust[0] >= -10.0) thrust[0] -= 5 * delta;
    banking = true;
  }
  if (input.attack2) {
    if (thrust[0] <= 10.0) thrust[0] += 5 * delta;
    banking = true;
  }

  // Auto stabilize
  if (!yawing) {
    if (rotorAngularVelocity < 0)
      rotorAngularVelocity += 1 * delta;
    if (rotorAngularVelocity > 0)
      rotorAngularVelocity -= 1 * delta;
  }

  if (!pitching) {
    if (thrust[2] < 0) thrust[2] += 2.5 * delta;
    if (thrust[2] > 0) thrust[2] -= 2.5 * delta;
  }
  if (!banking) {
    if (thrust[0] < 0) thrust[0] += 2.5 * delta;
    if (thrust[0] > 0) thrust[0] -= 2.5 * delta;
  }
  if (!climbing && altitude > 2) {
    thrust[1] = stableLift;
  }

  postMessage({
    type: 'tick',
    rpm: rpm,
    thrust: thrust,
    rotorAngularVelocity: rotorAngularVelocity,
    delta: delta
  });
}

self.onmessage = function (e) {
  if (e.data.type == "update") {
    let input = e.data.input;
    let delta = e.data.dt;
    altitude = e.data.altitude;
    animate(delta, input);
  }
};