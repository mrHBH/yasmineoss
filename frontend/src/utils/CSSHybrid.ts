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

// Additional temp vectors for optimization
const _objectNormal = new Vector3();
const _cameraForward = new Vector3();
const _objectToCamera = new Vector3();
// Temporary vector for calculations - moved to function scope to avoid global state

// Transform cache for string building - moved to instance level for better performance

interface CSSHybridOptions {
	zoomThreshold?: number;
	transitionDuration?: number;
	enableAutoSwitch?: boolean;
	hysteresis?: number; // Prevents flickering when switching modes
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
	public hysteresis: number; // Distance buffer to prevent mode flickering
	
	// Performance optimization caches (made public for renderer access)
	public _lastCameraPosition = new Vector3();
	public _lastObjectPosition = new Vector3();
	public _lastDistance = -1;
	public _lastModeSwitch = 0;
	public _dirtyTransform = true;

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
		this.hysteresis = options.hysteresis || 0.5; // 0.5 unit buffer to prevent flickering
		this.mode = '3d'; // '2d' or '3d'
		this.isTransitioning = false;
		this.center = new Vector2(0.5, 0.5); // For 2D mode
		this.rotation2D = 0; // For 3D sprite mode

		// Use will-change for better performance
		this.element.style.willChange = 'transform, opacity';
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
		this.hysteresis = source.hysteresis;
		this.mode = source.mode;
		this.center = source.center.clone();
		this.rotation2D = source.rotation2D;

		return this;
	}

	// Mark transform as dirty when object moves
	updateMatrixWorld(force?: boolean) {
		super.updateMatrixWorld(force);
		this._dirtyTransform = true;
	}

	// Optimized distance check with caching
	shouldUpdateDistance(cameraPosition: Vector3): boolean {
		if (this._lastDistance === -1) return true;
		
		// Only recalculate if camera or object moved significantly
		const cameraMoved = this._lastCameraPosition.distanceToSquared(cameraPosition) > 0.01;
		const objectMoved = this._lastObjectPosition.distanceToSquared(this.position) > 0.01;
		
		return cameraMoved || objectMoved;
	}

	// Switch between 2D and 3D modes with performance improvements
	async switchMode(newMode, force = false) {
		if (this.mode === newMode && !force) return;
		if (this.isTransitioning && !force) return;

		// Throttle mode switches to prevent rapid flickering
		const now = performance.now();
		if (now - this._lastModeSwitch < 100 && !force) return; // 100ms throttle
		this._lastModeSwitch = now;

		this.isTransitioning = true;
		const oldMode = this.mode;
		this.mode = newMode;

		// Use requestAnimationFrame for smoother transitions
		requestAnimationFrame(() => {
			this.element.style.opacity = '0';
			this.element.style.transform += oldMode === '3d' ? ' scale(0.8)' : ' scale(1.2)';
			this.element.style.pointerEvents = 'none';

			// Wait for transition, then fade in new element
			setTimeout(() => {
				requestAnimationFrame(() => {
					this.element.style.opacity = '1';
					this.element.style.pointerEvents = 'auto';
					
					setTimeout(() => {
						this.isTransitioning = false;
					}, this.transitionDuration / 2);
				});
			}, this.transitionDuration / 2);
		});
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
 }

class CSSHybridRenderer {
	// Track if a mode switch just happened
	public _forceHybridTransformUpdate = false;
	public domElement: HTMLElement;

	public getSize: () => { width: number; height: number };
	public render: (scene: Object3D, camera: any) => void;
	public setSize: (width: number, height: number) => void;
	public invalidateCache: () => void;
 
	constructor(parameters: CSSHybridRendererParameters = {}) {
		const _this = this;

			   let _width, _height;

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

				   // Set up container transforms based on what modes are being used
				   let has3D = false;
				   let has2D = false;
				   scene.traverse(function (object) {
						   if ((object as any).isCSSHybridObject) {
								   if ((object as any).mode === '3d') has3D = true;
								   if ((object as any).mode === '2d') has2D = true;
						   }
				   });

				   // 2D mode is DOMINANT - if any element is in 2D mode, optimize container for 2D
				   // This ensures 2D elements work perfectly while 3D elements are frozen when 2D is active
				   const previous2DDominant = hybridContainer.getAttribute('data-2d-dominant') === 'true';
				   
				   if (has2D) {
						   // Pure 2D mode - optimize for 2D elements (2D is dominant)
						   hybridContainer.style.transform = '';
						   hybridContainer.style.transformStyle = '';
						   hybridContainer.style.perspective = '';
						   hybridContainer.setAttribute('data-2d-dominant', 'true');
						   hybridContainer.removeAttribute('data-mixed-mode');
						   
						   if (!previous2DDominant) {
							   console.log('📺 2D DOMINANCE ACTIVATED - 3D elements frozen, container optimized for 2D');
						   }
				   } else if (has3D) {
						   // Pure 3D mode - only when no 2D elements exist
						   hybridContainer.style.transform = cameraTransform;
						   hybridContainer.style.transformStyle = 'preserve-3d';
						   hybridContainer.style.perspective = '';
						   hybridContainer.removeAttribute('data-mixed-mode');
						   hybridContainer.removeAttribute('data-2d-dominant');
						   
						   if (previous2DDominant) {
							   console.log('🎮 3D MODE RESTORED - 2D dominance ended, 3D elements unfrozen');
						   }
				   } else {
						   // No hybrid objects
						   hybridContainer.style.transform = '';
						   hybridContainer.style.transformStyle = '';
						   hybridContainer.style.perspective = '';
						   hybridContainer.removeAttribute('data-mixed-mode');
						   hybridContainer.removeAttribute('data-2d-dominant');
				   }

				   // If a mode switch just happened, force transform update for 3D elements only when 2D is not dominant
				   if (this._forceHybridTransformUpdate) {
					   const is2DDominant = hybridContainer.getAttribute('data-2d-dominant') === 'true';
					   
					   // Only update 3D elements if 2D mode is not dominant
					   if (!is2DDominant) {
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
					   }
					   this._forceHybridTransformUpdate = false;
				   }

				   // Render all objects using a single container, with 2D dominance
				   renderHybridObject(scene, scene, camera, hybridContainer, has3D, has2D);
 			   };


			   this.setSize = function (width, height) {
					   _width = width;
					   _height = height;

					   domElement.style.width = width + 'px';
					   domElement.style.height = height + 'px';
					   hybridContainer.style.width = width + 'px';
					   hybridContainer.style.height = height + 'px';
			   };

			   // Public method to invalidate cache when objects are added/removed
			   this.invalidateCache = function() {
					   // Simple cache invalidation placeholder - could be expanded later
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

		// Original working render function with 2D dominance and 3D freezing
		function renderHybridObject(object, scene, camera, container, has3D?, has2D?) {
			if ((object).isCSSHybridObject) {
				// Check if 2D mode is dominant (any element is in 2D mode)
				const is2DDominant = container.getAttribute('data-2d-dominant') === 'true';
				
				// Use optimized distance calculation with reduced allocations
				const distance = getDistanceToOptimized(camera, object);
			 
				// Auto-switch mode based on distance with hysteresis to prevent flickering
				if (object.enableAutoSwitch && !object.isTransitioning) {
					const threshold = object.zoomThreshold;
					const hysteresis = object.hysteresis || 0.5;
					
					let shouldBe2D;
					if (object.mode === '3d') {
						shouldBe2D = distance < (threshold - hysteresis);
					} else {
						shouldBe2D = distance < (threshold + hysteresis);
					}
					
					const newMode = shouldBe2D ? '2d' : '3d';
					if (object.mode !== newMode) {
						object.switchMode(newMode);
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

				if (object.mode === '3d') {
					// If 2D mode is dominant, freeze 3D elements (don't update them but keep HTML visible)
					if (is2DDominant) {
						// Freeze: Keep element visible but don't update transforms
						element.style.display = visible ? '' : 'none';
						// Don't update transforms - element stays frozen in last position
						// This prevents interference with 2D elements while keeping HTML intact
					} else {
						// Normal 3D rendering when no 2D elements are active
						element.style.display = visible ? '' : 'none';
						if (visible) {
							if (object.onBeforeRender) object.onBeforeRender(_this as any, scene as any, camera, null, null, null);
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
							// Apply transform
							element.style.transform = style;
							if (object.onAfterRender) object.onAfterRender(_this as any, scene as any, camera, null, null, null);
						}
					}
				} else if (object.mode === '2d') {
					// 2D mode always gets updated (it's dominant)
					_vector.setFromMatrixPosition(object.matrixWorld);
					_vector.applyMatrix4(_viewProjectionMatrix);
					const visible2D = visible && (_vector.z >= -1 && _vector.z <= 1);
					element.style.display = visible2D ? '' : 'none';
					if (visible2D) {
						if (object.onBeforeRender) object.onBeforeRender(_this as any, scene as any, camera, null, null, null);
						
						// Since 2D is dominant, we can always use pure 2D rendering
						const _widthHalf = _width / 2;
						const _heightHalf = _height / 2;
						const x = (_vector.x * _widthHalf + _widthHalf);
						const y = (-_vector.y * _heightHalf + _heightHalf);
						style = 'translate(' + (-100 * object.center.x) + '%,' + (-100 * object.center.y) + '%)'
							+ 'translate(' + x + 'px,' + y + 'px)';
						
						element.style.transform = style;
						element.style.transformStyle = 'flat';
						if (object.onAfterRender) object.onAfterRender(_this as any, scene as any, camera, null, null, null);
					}
				}
				
				// Cache distance for z-ordering
			}
			for (let i = 0, l = object.children.length; i < l; i++) {
				renderHybridObject(object.children[i], scene, camera, container, has3D, has2D);
			}
		}

		// Optimized distance calculation with minimal vector allocations
		function getDistanceToOptimized(camera, object) {
			// Reuse global temp vectors instead of allocating new ones
			_a.setFromMatrixPosition(camera.matrixWorld);
			_b.setFromMatrixPosition(object.matrixWorld);
			
			// Reuse _objectNormal instead of creating new Vector3
			_objectNormal.set(0, 0, 1);
			_objectNormal.applyQuaternion(object.quaternion).normalize();
			
			// Reuse _objectToCamera instead of creating new Vector3
			_objectToCamera.copy(_a).sub(_b);
			
			// Calculate orthogonal distance (dot product with normal)
			const orthogonalDistance = Math.abs(_objectToCamera.dot(_objectNormal));
			
			// Check viewing angle - camera should be facing the element
			_cameraForward.set(0, 0, -1); // Camera looks down negative Z
			_cameraForward.applyQuaternion(camera.quaternion).normalize();
			
			// Calculate angle between camera forward and object normal
			const viewingAngleCos = Math.abs(_cameraForward.dot(_objectNormal));
			const viewingAngleThreshold = 0.9; // cos(25°) ≈ 0.9
			
			// If not facing the element properly, force 3D mode by returning large distance
			if (viewingAngleCos < viewingAngleThreshold) {
				return object.zoomThreshold * 2; // Force 3D mode
			}
			
			return orthogonalDistance;
		}
 
 
	}
}

export { CSSHybridObject, CSSHybridRenderer };
