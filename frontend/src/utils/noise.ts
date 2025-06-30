import { createNoise2D } from "simplex-noise";
import MersenneTwister from "mersennetwister";

const MT_ = new MersenneTwister(1);
const NOISE_2D_ = createNoise2D(() => { return MT_.random(); });

function noise1D(x: number) {
  return NOISE_2D_(x, x);
}

function noise2D(x: number, y: number) {
  return NOISE_2D_(x, y);
}

export { noise1D, noise2D };
