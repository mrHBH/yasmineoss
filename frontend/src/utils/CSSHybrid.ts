import {
	Matrix4,
	Object3D,
	Quaternion,
	Vector2,
	Vector3
} from 'three';

/**
 * A hybrid CSS renderer that automatically switches between 2D and 3D modes based on distance
 * Combines CSS2DRenderer and CSS3DRenderer functionality with smooth transitions
 */

const _position = new Vector3();
const _quaternion = new Quaternion();
const _scale = new Vector3();
const _vector = new Vector3();
const _viewMatrix = new Matrix4();
const _viewProjectionMatrix = new Matrix4();
const _matrix = new Matrix4();
const _matrix2 = new Matrix4();
const _a = new Vector3();
const _b = new Vector3();

interface CSSHybridOptions {
	zoomThreshold?: number;
	transitionDuration?: number;
	enableAutoSwitch?: boolean;
}

class CSSHybridObject extends Object3D {
	public isCSSHybridObject: boolean;
	public element: HTMLElement;
	public zoomThreshold: number;
	public transitionDuration: number;
	public enableAutoSwitch: boolean;
	public mode: '2d' | '3d';
	public isTransitioning: boolean;
	public center: Vector2;
	public rotation2D: number;

	constructor(element: HTMLElement = document.createElement('div'), options: CSSHybridOptions = {}) {
		super();

		this.isCSSHybridObject = true;

		this.element = element;
		this.element.style.position = 'absolute';
		this.element.style.pointerEvents = 'auto';
		this.element.style.userSelect = 'none';
		this.element.setAttribute('draggable', 'false');

		// Hybrid-specific properties
		this.zoomThreshold = options.zoomThreshold || 8;
		this.transitionDuration = options.transitionDuration || 800;
		this.enableAutoSwitch = options.enableAutoSwitch !== false;
		this.mode = '3d'; // '2d' or '3d'
		this.isTransitioning = false;
		this.center = new Vector2(0.5, 0.5); // For 2D mode
		this.rotation2D = 0; // For 3D sprite mode

		this.element.style.transition = `opacity ${this.transitionDuration}ms ease-in-out, transform ${this.transitionDuration}ms ease-in-out`;

		this.addEventListener('removed', function () {
			this.traverse(function (object: any) {
				if (object.element instanceof Element && object.element.parentNode !== null) {
					object.element.parentNode.removeChild(object.element);
				}
			});
		});
	}

	copy(source, recursive) {
		super.copy(source, recursive);

		this.element = source.element.cloneNode(true);
		this.zoomThreshold = source.zoomThreshold;
		this.transitionDuration = source.transitionDuration;
		this.enableAutoSwitch = source.enableAutoSwitch;
		this.mode = source.mode;
		this.center = source.center.clone();
		this.rotation2D = source.rotation2D;

		return this;
	}

	// Switch between 2D and 3D modes
	async switchMode(newMode, force = false) {
	   
		if (this.mode === newMode && !force) return;
		if (this.isTransitioning && !force) return;

		this.isTransitioning = true;
		const oldMode = this.mode;
		this.mode = newMode;

		this.element.style.opacity = '0';
		this.element.style.transform += oldMode === '3d' ? ' scale(0.8)' : ' scale(1.2)';
		this.element.style.pointerEvents = 'none';

		// Wait for transition, then fade in new element
		setTimeout(() => {
			this.element.style.opacity = '1';
			this.element.style.pointerEvents = 'auto';
			
			setTimeout(() => {
				this.isTransitioning = false;
			}, this.transitionDuration / 2);
		}, this.transitionDuration / 2);
	}

	// Manually toggle between modes
	async toggleMode() {
		const newMode = this.mode === '3d' ? '2d' : '3d';
		await this.switchMode(newMode, true);
	}

	// Set zoom threshold
	setZoomThreshold(threshold) {
		this.zoomThreshold = threshold;
	}

	// Enable/disable automatic mode switching
	setAutoSwitch(enabled) {
		this.enableAutoSwitch = enabled;
	}
}
// how is tgis class used? ?


interface CSSHybridRendererParameters {
	element?: HTMLElement;
	onZIndexChange?: (mode: string) => void;
}

class CSSHybridRenderer {
			   // Track if a mode switch just happened
			   public _forceHybridTransformUpdate = false;
	public domElement: HTMLElement;
	public zIndexMode: string;
	public onZIndexChange: ((mode: string) => void) | null;
	public getSize: () => { width: number; height: number };
	public render: (scene: Object3D, camera: any) => void;
	public setSize: (width: number, height: number) => void;
	public setZIndexMode: (mode: string) => void;

	constructor(parameters: CSSHybridRendererParameters = {}) {
		const _this = this;

		let _width, _height;
		let _widthHalf, _heightHalf;

		const cache = {
			camera: { style: '' },
			objects: new WeakMap(),
			hybridObjects: new WeakMap()
		};

		// Z-index management
		this.zIndexMode = 'default'; // 'default', '2d-priority', '3d-priority'
		this.onZIndexChange = parameters.onZIndexChange || null;

		const domElement = parameters.element !== undefined ? parameters.element : document.createElement('div');
		domElement.style.overflow = 'hidden';
		this.domElement = domElement;


			   // Use a single container for all hybrid objects
			   const hybridContainer = document.createElement('div');
			   hybridContainer.style.position = 'absolute';
			   hybridContainer.style.top = '0';
			   hybridContainer.style.left = '0';
			   hybridContainer.style.width = '100%';
			   hybridContainer.style.height = '100%';
			   hybridContainer.style.pointerEvents = 'none';
			   hybridContainer.className = 'css-hybrid-container';
			   domElement.appendChild(hybridContainer);


			   this.getSize = function () {
					   return { width: _width, height: _height };
			   };

			   this.render = function (scene, camera) {
					   if (scene.matrixWorldAutoUpdate === true) scene.updateMatrixWorld();
					   if (camera.parent === null && camera.matrixWorldAutoUpdate === true) camera.updateMatrixWorld();

					   // Update view matrices for 2D calculations
					   _viewMatrix.copy(camera.matrixWorldInverse);
					   _viewProjectionMatrix.multiplyMatrices(camera.projectionMatrix, _viewMatrix);

					   // Compute camera CSS transform for 3D mode
					   let tx, ty;
					   if (camera.isOrthographicCamera) {
							   tx = - (camera.right + camera.left) / 2;
							   ty = (camera.top + camera.bottom) / 2;
					   }
					   const _widthHalf = _width / 2;
					   const _heightHalf = _height / 2;
					   const fov = camera.projectionMatrix.elements[5] * _heightHalf;
					   const scaleByViewOffset = camera.view && camera.view.enabled ? camera.view.height / camera.view.fullHeight : 1;
					   const cameraCSSMatrix = camera.isOrthographicCamera ?
							   `scale( ${ scaleByViewOffset } )` + 'scale(' + fov + ')' + 'translate(' + epsilon(tx) + 'px,' + epsilon(ty) + 'px)' + getCameraCSSMatrix(camera.matrixWorldInverse) :
							   `scale( ${ scaleByViewOffset } )` + 'translateZ(' + fov + 'px)' + getCameraCSSMatrix(camera.matrixWorldInverse);
					   const perspective = camera.isPerspectiveCamera ? 'perspective(' + fov + 'px) ' : '';
					   const cameraTransform = perspective + cameraCSSMatrix + 'translate(' + _widthHalf + 'px,' + _heightHalf + 'px)';

					   // Set camera transform on container for 3D mode, clear for 2D mode
					   let has3D = false;
					   scene.traverse(function (object) {
							   if ((object as any).isCSSHybridObject && (object as any).mode === '3d') has3D = true;
					   });
					   const is3DMode = has3D;
					   if (is3DMode) {
							   hybridContainer.style.transform = cameraTransform;
							   hybridContainer.style.transformStyle = 'preserve-3d';
							   hybridContainer.style.perspective = '';
					   } else {
							   hybridContainer.style.transform = '';
							   hybridContainer.style.transformStyle = '';
							   hybridContainer.style.perspective = '';
					   }

					   // If a mode switch just happened, force transform update for all CSSHybridObjects in 3D mode
					   if (this._forceHybridTransformUpdate && is3DMode) {
						   scene.traverse(function (o) {
							   const obj = o as any;
							   if (obj.isCSSHybridObject && obj.mode === '3d') {
								   let style;
								   if (obj.rotation2D !== 0) {
									   _matrix.copy(camera.matrixWorldInverse);
									   _matrix.transpose();
									   _matrix.multiply(_matrix2.makeRotationZ(obj.rotation2D));
									   obj.matrixWorld.decompose(_position, _quaternion, _scale);
									   _matrix.setPosition(_position);
									   _matrix.scale(_scale);
									   _matrix.elements[3] = 0;
									   _matrix.elements[7] = 0;
									   _matrix.elements[11] = 0;
									   _matrix.elements[15] = 1;
									   style = getObjectCSSMatrix(_matrix);
								   } else {
									   style = getObjectCSSMatrix(obj.matrixWorld);
								   }
								   obj.element.style.transform = style;
							   }
						   });
						   this._forceHybridTransformUpdate = false;
					   }

					   // Render all objects using a single container, passing mode info
					   renderHybridObject(scene, scene, camera, hybridContainer, is3DMode);
					   zOrder2D(scene, hybridContainer);
			   };


			   this.setSize = function (width, height) {
					   _width = width;
					   _height = height;
					   _widthHalf = _width / 2;
					   _heightHalf = _height / 2;

					   domElement.style.width = width + 'px';
					   domElement.style.height = height + 'px';
					   hybridContainer.style.width = width + 'px';
					   hybridContainer.style.height = height + 'px';
			   };

		// Set z-index priority mode
		this.setZIndexMode = function(mode) {
			_this.zIndexMode = mode;
			if (_this.onZIndexChange) {
				_this.onZIndexChange(mode);
			}
		};

		function epsilon(value) {
			return Math.abs(value) < 1e-10 ? 0 : value;
		}

		function getCameraCSSMatrix(matrix) {
			const elements = matrix.elements;
			return 'matrix3d(' +
				epsilon(elements[0]) + ',' +
				epsilon(-elements[1]) + ',' +
				epsilon(elements[2]) + ',' +
				epsilon(elements[3]) + ',' +
				epsilon(elements[4]) + ',' +
				epsilon(-elements[5]) + ',' +
				epsilon(elements[6]) + ',' +
				epsilon(elements[7]) + ',' +
				epsilon(elements[8]) + ',' +
				epsilon(-elements[9]) + ',' +
				epsilon(elements[10]) + ',' +
				epsilon(elements[11]) + ',' +
				epsilon(elements[12]) + ',' +
				epsilon(-elements[13]) + ',' +
				epsilon(elements[14]) + ',' +
				epsilon(elements[15]) + ')';
		}

		function getObjectCSSMatrix(matrix) {
			const elements = matrix.elements;
			const matrix3d = 'matrix3d(' +
				epsilon(elements[0]) + ',' +
				epsilon(elements[1]) + ',' +
				epsilon(elements[2]) + ',' +
				epsilon(elements[3]) + ',' +
				epsilon(-elements[4]) + ',' +
				epsilon(-elements[5]) + ',' +
				epsilon(-elements[6]) + ',' +
				epsilon(-elements[7]) + ',' +
				epsilon(elements[8]) + ',' +
				epsilon(elements[9]) + ',' +
				epsilon(elements[10]) + ',' +
				epsilon(elements[11]) + ',' +
				epsilon(elements[12]) + ',' +
				epsilon(elements[13]) + ',' +
				epsilon(elements[14]) + ',' +
				epsilon(elements[15]) + ')';

			return 'translate(-50%,-50%)' + matrix3d;
		}

			   function renderHybridObject(object, scene, camera, container, is3DMode) {
					   if ((object).isCSSHybridObject) {
							   const distance = getDistanceTo(camera, object);
							   // Debug logging for distance
							   if (object.enableAutoSwitch && Math.random() < 0.01) {
									   console.log(`🔄 Hybrid Object Distance: ${distance.toFixed(2)}, Threshold: ${object.zoomThreshold}, Current Mode: ${object.mode}`);
							   }
							   // Auto-switch mode based on distance
							   if (object.enableAutoSwitch && !object.isTransitioning) {
									   const shouldBe2D = distance < object.zoomThreshold;
									   const newMode = shouldBe2D ? '2d' : '3d';
									   if (object.mode !== newMode) {
											   console.log(`🔄 Auto-switching from ${object.mode} to ${newMode} (distance: ${distance.toFixed(2)})`);
											   object.switchMode(newMode);
											   // Update z-index based on mode
											   const currentZIndexMode = newMode === '2d' ? '2d-priority' : '3d-priority';
											   if (_this.zIndexMode !== currentZIndexMode) {
													   _this.setZIndexMode(currentZIndexMode);
											   }
											   // Set flag to force transform update in next render
											   _this._forceHybridTransformUpdate = true;
									   }
							   }

							   const visible = (object.visible === true) && (object.layers.test(camera.layers) === true);
							   const element = object.element;
							   let style;

							   // Always use the same container for both modes
							   if (element.parentNode !== container) {
									   container.appendChild(element);
							   }

							   if (object.mode === '3d' && is3DMode) {
									   element.style.display = visible ? '' : 'none';
									   if (visible) {
											   object.onBeforeRender(_this, scene, camera);
											   if (object.rotation2D !== 0) {
													   // Sprite-like behavior
													   _matrix.copy(camera.matrixWorldInverse);
													   _matrix.transpose();
													   _matrix.multiply(_matrix2.makeRotationZ(object.rotation2D));
													   object.matrixWorld.decompose(_position, _quaternion, _scale);
													   _matrix.setPosition(_position);
													   _matrix.scale(_scale);
													   _matrix.elements[3] = 0;
													   _matrix.elements[7] = 0;
													   _matrix.elements[11] = 0;
													   _matrix.elements[15] = 1;
													   style = getObjectCSSMatrix(_matrix);
											   } else {
													   style = getObjectCSSMatrix(object.matrixWorld);
											   }
											   const cachedObject = cache.objects.get(object);
											   if (cachedObject === undefined || cachedObject.style !== style) {
													   element.style.transform = style;
													   cache.objects.set(object, { style: style });
											   }
											   object.onAfterRender(_this, scene, camera);
									   }
							   } else if (object.mode === '2d' && !is3DMode) {
									   _vector.setFromMatrixPosition(object.matrixWorld);
									   _vector.applyMatrix4(_viewProjectionMatrix);
									   const visible2D = visible && (_vector.z >= -1 && _vector.z <= 1);
									   element.style.display = visible2D ? '' : 'none';
									   if (visible2D) {
											   object.onBeforeRender(_this, scene, camera);
											   style = 'translate(' + (-100 * object.center.x) + '%,' + (-100 * object.center.y) + '%)'
													   + 'translate(' + (_vector.x * _widthHalf + _widthHalf) + 'px,' + (-_vector.y * _heightHalf + _heightHalf) + 'px)';
											   element.style.transform = style;
											   object.onAfterRender(_this, scene, camera);
									   }
							   } else {
									   // Hide element if not in the current mode
									   element.style.display = 'none';
							   }
							   // Cache distance for z-ordering
							   const objectData = {
									   distanceToCameraSquared: getDistanceToSquared(camera, object),
									   distance: distance
							   };
							   cache.hybridObjects.set(object, objectData);
					   }
					   for (let i = 0, l = object.children.length; i < l; i++) {
							   renderHybridObject(object.children[i], scene, camera, container, is3DMode);
					   }
			   }

		function getDistanceTo(object1, object2) {
			_a.setFromMatrixPosition(object1.matrixWorld);
			_b.setFromMatrixPosition(object2.matrixWorld);
			return _a.distanceTo(_b);
		}

		function getDistanceToSquared(object1, object2) {
			_a.setFromMatrixPosition(object1.matrixWorld);
			_b.setFromMatrixPosition(object2.matrixWorld);
			return _a.distanceToSquared(_b);
		}

			   function filterAndFlatten2D(scene) {
					   const result = [];
					   scene.traverse(function (object) {
							   if (object.isCSSHybridObject && object.mode === '2d') {
									   result.push(object);
							   }
					   });
					   return result;
			   }

			   function zOrder2D(scene, container) {
					   const sorted = filterAndFlatten2D(scene).sort(function (a, b) {
							   if (a.renderOrder !== b.renderOrder) {
									   return b.renderOrder - a.renderOrder;
							   }
							   const distanceA = cache.hybridObjects.get(a).distanceToCameraSquared;
							   const distanceB = cache.hybridObjects.get(b).distanceToCameraSquared;
							   return distanceA - distanceB;
					   });

					   const zMax = sorted.length;
					   for (let i = 0, l = sorted.length; i < l; i++) {
							   if (sorted[i].element.parentNode === container) {
									   sorted[i].element.style.zIndex = zMax - i;
							   }
					   }
			   }
	}
}

export { CSSHybridObject, CSSHybridRenderer };
