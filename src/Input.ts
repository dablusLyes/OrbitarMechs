import * as THREE from 'three';
import type { CelestialBody } from './Body.js';
import type { InteractionMode } from './ModeManager.js';

/**
 * Handles mouse interaction for selecting and dragging celestial bodies
 */
export class InputHandler {
  camera: THREE.PerspectiveCamera;
  domElement: HTMLElement;
  scene: THREE.Scene;
  raycaster: THREE.Raycaster;
  mouse: THREE.Vector2;
  selectedBody: CelestialBody | null;
  isDragging: boolean;
  dragPlane: THREE.Plane;
  dragOffset: THREE.Vector3;
  onSelectionChange: ((body: CelestialBody | null) => void) | null;
  onDeleteRequest: ((body: CelestialBody) => void) | null;
  currentMode: InteractionMode;

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement, scene: THREE.Scene) {
    this.camera = camera;
    this.domElement = domElement;
    this.scene = scene;

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.selectedBody = null;
    this.isDragging = false;
    this.dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.dragOffset = new THREE.Vector3();
    this.onSelectionChange = null; // Callback for when selection changes
    this.onDeleteRequest = null; // Callback for delete requests
    this.currentMode = 'camera' as InteractionMode;

    // Bind event handlers
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);

    // Add event listeners
    this.domElement.addEventListener('mousedown', this.onMouseDown);
    this.domElement.addEventListener('mousemove', this.onMouseMove);
    this.domElement.addEventListener('mouseup', this.onMouseUp);
  }

  /**
   * Set the current interaction mode
   */
  setMode(mode: InteractionMode): void {
    this.currentMode = mode;

    // Cancel any ongoing drag when switching modes
    if (this.isDragging) {
      this.isDragging = false;
      this.selectedBody = null;
    }

    // Update cursor based on mode
    this.updateCursor();
  }

  /**
   * Update mouse coordinates
   */
  updateMousePosition(event: MouseEvent): void {
    const rect = this.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  /**
   * Get the celestial body under the mouse cursor
   */
  getBodyUnderMouse(): CelestialBody | null {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.scene.children, true);

    for (const intersect of intersects) {
      if (intersect.object.userData.body) {
        return intersect.object.userData.body as CelestialBody;
      }
    }

    return null;
  }

  /**
   * Handle mouse down event
   */
  onMouseDown(event: MouseEvent): void {
    if (event.button !== 0) return; // Only left click

    // Don't handle interactions in Camera mode
    if (this.currentMode === 'camera') {
      return;
    }

    this.updateMousePosition(event);
    const body = this.getBodyUnderMouse();

    if (body) {
      this.selectedBody = body;

      // Handle different modes
      if (this.currentMode === 'grab') {
        // Grab mode: start dragging
        this.isDragging = true;

        // Calculate drag plane and offset
        this.dragPlane.setFromNormalAndCoplanarPoint(
          this.camera.getWorldDirection(new THREE.Vector3()).negate(),
          body.position
        );

        const intersection = new THREE.Vector3();
        this.raycaster.ray.intersectPlane(this.dragPlane, intersection);
        this.dragOffset.subVectors(body.position, intersection);

        // Notify selection change
        if (this.onSelectionChange) {
          this.onSelectionChange(this.selectedBody);
        }
      } else if (this.currentMode === 'delete') {
        // Delete mode: delete immediately
        if (this.onDeleteRequest) {
          this.onDeleteRequest(body);
        }
        this.selectedBody = null;
      } else if (this.currentMode === 'edit') {
        // Edit mode: just select (UI will open)
        if (this.onSelectionChange) {
          this.onSelectionChange(this.selectedBody);
        }
      }

      // Prevent orbit controls from interfering
      event.stopPropagation();
    } else {
      // Clicked on empty space - deselect
      if (this.currentMode === 'edit') {
        if (this.onSelectionChange) {
          this.onSelectionChange(null);
        }
      }
      this.selectedBody = null;
    }
  }

  /**
   * Handle mouse move event
   */
  onMouseMove(event: MouseEvent): void {
    this.updateMousePosition(event);

    // Only handle dragging in Grab mode
    if (this.isDragging && this.selectedBody && this.currentMode === 'grab') {
      this.raycaster.setFromCamera(this.mouse, this.camera);

      const intersection = new THREE.Vector3();
      if (this.raycaster.ray.intersectPlane(this.dragPlane, intersection)) {
        this.selectedBody.position.copy(intersection.add(this.dragOffset));
        this.selectedBody.updateMesh();

        // Clear trail when dragging
        this.selectedBody.clearTrail();
      }

      event.stopPropagation();
    } else {
      // Update cursor style based on mode and hover
      this.updateCursor();
    }
  }

  /**
   * Update cursor style based on current mode and hover state
   */
  private updateCursor(): void {
    if (this.currentMode === 'camera') {
      this.domElement.style.cursor = 'default';
      return;
    }

    const body = this.getBodyUnderMouse();

    if (this.currentMode === 'grab') {
      this.domElement.style.cursor = body ? 'grab' : 'default';
      if (this.isDragging && body) {
        this.domElement.style.cursor = 'grabbing';
      }
    } else if (this.currentMode === 'delete') {
      this.domElement.style.cursor = body ? 'not-allowed' : 'default';
    } else if (this.currentMode === 'edit') {
      this.domElement.style.cursor = body ? 'pointer' : 'default';
    }
  }

  /**
   * Handle mouse up event
   */
  onMouseUp(_event: MouseEvent): void {
    if (this.isDragging) {
      this.isDragging = false;
      // Optionally reset velocity when dropping
      // this.selectedBody.velocity.set(0, 0, 0);
    }
  }

  /**
   * Deselect current body
   */
  deselect(): void {
    this.selectedBody = null;
    if (this.onSelectionChange) {
      this.onSelectionChange(null);
    }
  }

  /**
   * Clean up event listeners
   */
  dispose(): void {
    this.domElement.removeEventListener('mousedown', this.onMouseDown);
    this.domElement.removeEventListener('mousemove', this.onMouseMove);
    this.domElement.removeEventListener('mouseup', this.onMouseUp);
  }
}

