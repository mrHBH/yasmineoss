let version = "2.00.11";

// Constants for RPM ranges
const IDLE_RPM = 20000;
const MAX_RPM = 44000;
const ROTOR_GEAR_RATIO = 81.2;  // Typical reduction ratio for helicopter main rotor
const IDLE_ROTOR_RPM = IDLE_RPM / ROTOR_GEAR_RATIO;
const MAX_ROTOR_RPM = MAX_RPM / ROTOR_GEAR_RATIO;

let rpm = IDLE_RPM;
let rotorRpm = IDLE_ROTOR_RPM;
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

// RPM accelerationz/deceleration rates
const RPM_ACCEL_RATE = 5000;  // RPM per second
const RPM_DECEL_RATE = 3000;  // RPM per second

function animate(delta, input) {
  // RPM and power management
  let targetRpm = IDLE_RPM;
  
  if (input.forward || input.backward || thrust[1] > stableLift) {
    // Calculate target RPM based on collective position
    let collectivePosition = thrust[1] / maxLift;
    targetRpm = IDLE_RPM + (MAX_RPM - IDLE_RPM) * collectivePosition;
  }

  // Smooth RPM changes
  if (rpm < targetRpm) {
    rpm = Math.min(rpm + RPM_ACCEL_RATE * delta, targetRpm);
  } else if (rpm > targetRpm) {
    rpm = Math.max(rpm - RPM_DECEL_RATE * delta, targetRpm);
  }

  // Calculate rotor RPM from engine RPM
  rotorRpm = rpm / ROTOR_GEAR_RATIO;

  // Thrust calculations
  climbing = false;
  if (input.forward) {
    if (thrust[1] < maxLift) {
      thrust[1] += maxLiftStep * 1.3 * delta;
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
    rotorRpm: rotorRpm,
    thrust: thrust,
    rotorAngularVelocity: rotorAngularVelocity,
    delta: delta
  });
}

// Updated sound parameters for more realistic helicopter audio
let soundoptions = {
  cylinders: 3,  // More typical for a turbine engine

  intakeWaveguideLength: 30,  // Increased for more prominent turbine whine
  exhaustWaveguideLength: 550,
  extractorWaveguideLength: 150,

  intakeOpenReflectionFactor: 0.02,
  intakeClosedReflectionFactor: 0.98,

  exhaustOpenReflectionFactor: 0.02,
  exhaustClosedReflectionFactor: 0.98,
  ignitionTime: 0.5,  // Adjusted for turbine characteristics

  straightPipeWaveguideLength: 1500,
  straightPipeReflectionFactor: 0.015,

  mufflerElementsLength: [15, 5, 25, 3],  // Adjusted for helicopter acoustics
  action: 0.015,

  outletWaveguideLength: 150,
  outletReflectionFactor: 0.025
};

let clamp = true;
let gain = 0.002;  // Slightly increased for better audibility
let gainEngineBlockVibrations = 0.002;
let gainOutlet = 0.003;

self.onmessage = function(e) {
  if (e.data.type == "update") {
    let input = e.data.input;
    let delta = e.data.dt;
    altitude = e.data.altitude;
    animate(delta, input);
  }
};

postMessage({ 
  type: 'soundupdate',
  soundoptions: soundoptions,
  clamp: clamp,
  gain: gain,
  gainEngineBlockVibrations: gainEngineBlockVibrations,
  gainOutlet: gainOutlet
});