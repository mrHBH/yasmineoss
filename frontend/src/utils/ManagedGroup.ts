import * as THREE from 'three';

class ManagedGroup extends THREE.Group {

  #disposeMaterials_ = true;
  #disposeTextures_ = true;
  #disposeGeometries_ = true;

  constructor(shallow: boolean) {
    super();

    if (shallow) {
      this.#disposeMaterials_ = true;
      this.#disposeTextures_ = false;
      this.#disposeGeometries_ = false;
    }
  }

  get IsManagedGroup() {
    return true;
  }

  dispose() {
    for (let i = 0; i < this.children.length; i++) {
      const child = this.children[i];

      if ((child as any).IsManagedGroup) {
        (child as any).dispose();
      } else {
        this.#disposeChild_(child);
      }
    }
    this.clear();
  }

  #disposeChild_(node: THREE.Object3D) {
    node.traverse((c) => {
      if (c instanceof THREE.Mesh) {
        if (this.#disposeGeometries_) {
          c.geometry.dispose();
        }

        if (this.#disposeMaterials_) {
            if (Array.isArray(c.material)) {
                c.material.forEach(m => this.#disposeMaterial(m));
            } else {
                this.#disposeMaterial(c.material);
            }
        }
      }
    });
  }

  #disposeMaterial(material: THREE.Material) {
    material.dispose();
    for (const key in material) {
        if (this.#disposeTextures_) {
            const value = material[key];
            if (value instanceof THREE.Texture) {
                value.dispose();
            }
        }
    }
  }

};

export { ManagedGroup };
