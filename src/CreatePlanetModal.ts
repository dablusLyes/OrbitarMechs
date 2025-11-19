import * as THREE from 'three';
import { CelestialBody } from './Body.js';
import { MIN_STAR_MASS, STAR_COLORS } from './PremadeData.js';

export interface CreatePlanetResult {
  body: CelestialBody;
  name: string;
  type: 'planet' | 'star';
  mass: number;
  radius: number;
  color: number;
  emissive: number;
  emissiveIntensity: number;
  textureFile?: File;
  normalMapFile?: File;
}

/**
 * Modal for creating custom planets/stars with live 3D preview
 */
export class CreatePlanetModal {
  private modal: HTMLElement;
  private previewRenderer: THREE.WebGLRenderer | null = null;
  private previewScene: THREE.Scene | null = null;
  private previewCamera: THREE.PerspectiveCamera | null = null;
  private previewMesh: THREE.Mesh | null = null;
  private previewLight: THREE.DirectionalLight | null = null;
  private animationId: number | null = null;

  private formData: {
    name: string;
    type: 'planet' | 'star';
    color: number;
    radius: number;
    mass: number;
    textureFile: File | null;
    normalMapFile: File | null;
  } = {
    name: 'New Body',
    type: 'planet',
    color: 0xffffff,
    radius: 1.0,
    mass: 1.0,
    textureFile: null,
    normalMapFile: null
  };

  private resolveCallback: ((result: CreatePlanetResult | null) => void) | null = null;

  constructor() {
    this.modal = this.createModal();
    document.body.appendChild(this.modal);
  }

  /**
   * Show modal and return promise that resolves with created body or null if cancelled
   */
  show(): Promise<CreatePlanetResult | null> {
    return new Promise((resolve) => {
      this.resolveCallback = resolve;
      this.modal.style.display = 'flex';
      this.initializePreview();
      this.startPreviewAnimation();
    });
  }

  /**
   * Hide modal
   */
  private hide(): void {
    this.modal.style.display = 'none';
    this.stopPreviewAnimation();
    if (this.resolveCallback) {
      this.resolveCallback(null);
      this.resolveCallback = null;
    }
  }

  /**
   * Create the modal HTML structure
   */
  private createModal(): HTMLElement {
    const modal = document.createElement('div');
    modal.className = 'create-planet-modal';
    modal.style.display = 'none';

    const content = document.createElement('div');
    content.className = 'create-planet-modal-content';

    // Header
    const header = document.createElement('div');
    header.className = 'create-planet-modal-header';
    header.innerHTML = '<h2>CREATE PLANET/STAR</h2>';
    const closeBtn = document.createElement('button');
    closeBtn.className = 'create-planet-modal-close';
    closeBtn.innerHTML = '×';
    closeBtn.onclick = () => this.hide();
    header.appendChild(closeBtn);
    content.appendChild(header);

    // Body with form and preview
    const body = document.createElement('div');
    body.className = 'create-planet-modal-body';

    // Left side: Form
    const formContainer = document.createElement('div');
    formContainer.className = 'create-planet-form';

    // Name input
    const nameGroup = document.createElement('div');
    nameGroup.className = 'form-group';
    nameGroup.innerHTML = '<label>NAME</label>';
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.value = this.formData.name;
    nameInput.oninput = (e) => {
      this.formData.name = (e.target as HTMLInputElement).value || 'New Body';
    };
    nameGroup.appendChild(nameInput);
    formContainer.appendChild(nameGroup);

    // Type selection
    const typeGroup = document.createElement('div');
    typeGroup.className = 'form-group';
    typeGroup.innerHTML = '<label>TYPE</label>';
    const typeContainer = document.createElement('div');
    typeContainer.className = 'radio-group';
    const planetRadio = document.createElement('input');
    planetRadio.type = 'radio';
    planetRadio.name = 'type';
    planetRadio.value = 'planet';
    planetRadio.checked = true;
    planetRadio.onchange = () => {
      this.formData.type = 'planet';
      this.updateFormForType();
      this.updatePreview();
    };
    const planetLabel = document.createElement('label');
    planetLabel.textContent = 'PLANET';
    planetLabel.appendChild(planetRadio);
    typeContainer.appendChild(planetLabel);

    const starRadio = document.createElement('input');
    starRadio.type = 'radio';
    starRadio.name = 'type';
    starRadio.value = 'star';
    starRadio.onchange = () => {
      this.formData.type = 'star';
      this.updateFormForType();
      this.updatePreview();
    };
    const starLabel = document.createElement('label');
    starLabel.textContent = 'STAR';
    starLabel.appendChild(starRadio);
    typeContainer.appendChild(starLabel);
    typeGroup.appendChild(typeContainer);
    formContainer.appendChild(typeGroup);

    // Color picker
    const colorGroup = document.createElement('div');
    colorGroup.className = 'form-group';
    colorGroup.innerHTML = '<label>COLOR</label>';
    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.value = '#ffffff';
    colorInput.oninput = (e) => {
      const hex = (e.target as HTMLInputElement).value;
      this.formData.color = parseInt(hex.replace('#', ''), 16);
      this.updatePreview();
    };
    colorGroup.appendChild(colorInput);
    formContainer.appendChild(colorGroup);

    // Star color selector (only for stars)
    const starColorGroup = document.createElement('div');
    starColorGroup.className = 'form-group star-color-group';
    starColorGroup.style.display = 'none';
    starColorGroup.innerHTML = '<label>STAR COLOR</label>';
    const starColorContainer = document.createElement('div');
    starColorContainer.className = 'star-color-buttons';
    Object.entries(STAR_COLORS).forEach(([, color]) => {
      const btn = document.createElement('button');
      btn.className = 'star-color-btn';
      btn.style.backgroundColor = `#${color.toString(16).padStart(6, '0')}`;
      btn.onclick = () => {
        this.formData.color = color;
        colorInput.value = `#${color.toString(16).padStart(6, '0')}`;
        this.updatePreview();
      };
      starColorContainer.appendChild(btn);
    });
    starColorGroup.appendChild(starColorContainer);
    formContainer.appendChild(starColorGroup);

    // Radius slider
    const radiusGroup = document.createElement('div');
    radiusGroup.className = 'form-group';
    radiusGroup.innerHTML = '<label>RADIUS</label>';
    const radiusContainer = document.createElement('div');
    radiusContainer.className = 'slider-container';
    const radiusSlider = document.createElement('input');
    radiusSlider.type = 'range';
    radiusSlider.min = '0.1';
    radiusSlider.max = '10';
    radiusSlider.step = '0.1';
    radiusSlider.value = '1.0';
    radiusSlider.oninput = (e) => {
      this.formData.radius = parseFloat((e.target as HTMLInputElement).value);
      const valueDisplay = radiusContainer.querySelector('.slider-value') as HTMLElement;
      if (valueDisplay) valueDisplay.textContent = this.formData.radius.toFixed(1);
      this.updatePreview();
    };
    const radiusValue = document.createElement('span');
    radiusValue.className = 'slider-value';
    radiusValue.textContent = '1.0';
    radiusContainer.appendChild(radiusSlider);
    radiusContainer.appendChild(radiusValue);
    radiusGroup.appendChild(radiusContainer);
    formContainer.appendChild(radiusGroup);

    // Mass input
    const massGroup = document.createElement('div');
    massGroup.className = 'form-group';
    massGroup.innerHTML = '<label>MASS</label>';
    const massInput = document.createElement('input');
    massInput.type = 'number';
    massInput.min = '0.01';
    massInput.step = '0.01';
    massInput.value = '1.0';
    massInput.oninput = (e) => {
      let mass = parseFloat((e.target as HTMLInputElement).value);
      if (this.formData.type === 'star' && mass < MIN_STAR_MASS) {
        mass = MIN_STAR_MASS;
        massInput.value = MIN_STAR_MASS.toString();
      }
      this.formData.mass = mass;
      this.updatePreview();
    };
    massGroup.appendChild(massInput);
    const massHint = document.createElement('div');
    massHint.className = 'form-hint';
    massHint.textContent = `Minimum for stars: ${MIN_STAR_MASS}`;
    massGroup.appendChild(massHint);
    formContainer.appendChild(massGroup);

    // Texture upload
    const textureGroup = document.createElement('div');
    textureGroup.className = 'form-group';
    textureGroup.innerHTML = '<label>TEXTURE (OPTIONAL)</label>';
    const textureInput = document.createElement('input');
    textureInput.type = 'file';
    textureInput.accept = 'image/*';
    textureInput.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      this.formData.textureFile = file || null;
      if (file) {
        this.loadTextureToPreview(file);
      }
    };
    textureGroup.appendChild(textureInput);
    formContainer.appendChild(textureGroup);

    // Normal map upload
    const normalMapGroup = document.createElement('div');
    normalMapGroup.className = 'form-group';
    normalMapGroup.innerHTML = '<label>NORMAL MAP (OPTIONAL)</label>';
    const normalMapInput = document.createElement('input');
    normalMapInput.type = 'file';
    normalMapInput.accept = 'image/*';
    normalMapInput.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      this.formData.normalMapFile = file || null;
      if (file) {
        this.loadNormalMapToPreview(file);
      }
    };
    normalMapGroup.appendChild(normalMapInput);
    formContainer.appendChild(normalMapGroup);

    body.appendChild(formContainer);

    // Right side: Preview
    const previewContainer = document.createElement('div');
    previewContainer.className = 'create-planet-preview';
    const previewCanvas = document.createElement('canvas');
    previewCanvas.className = 'create-planet-preview-canvas';
    previewContainer.appendChild(previewCanvas);
    body.appendChild(previewContainer);

    content.appendChild(body);

    // Footer with buttons
    const footer = document.createElement('div');
    footer.className = 'create-planet-modal-footer';
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn-cancel';
    cancelBtn.textContent = 'CANCEL';
    cancelBtn.onclick = () => this.hide();
    const createBtn = document.createElement('button');
    createBtn.className = 'btn-create';
    createBtn.textContent = 'CREATE';
    createBtn.onclick = () => this.createBody();
    footer.appendChild(cancelBtn);
    footer.appendChild(createBtn);
    content.appendChild(footer);

    modal.appendChild(content);

    // Close on backdrop click
    modal.onclick = (e) => {
      if (e.target === modal) {
        this.hide();
      }
    };

    return modal;
  }

  /**
   * Update form based on type (planet/star)
   */
  private updateFormForType(): void {
    const starColorGroup = this.modal.querySelector('.star-color-group') as HTMLElement;
    const massInput = this.modal.querySelector('input[type="number"]') as HTMLInputElement;

    if (this.formData.type === 'star') {
      if (starColorGroup) starColorGroup.style.display = 'block';
      if (massInput) {
        massInput.min = MIN_STAR_MASS.toString();
        if (this.formData.mass < MIN_STAR_MASS) {
          this.formData.mass = MIN_STAR_MASS;
          massInput.value = MIN_STAR_MASS.toString();
        }
      }
    } else {
      if (starColorGroup) starColorGroup.style.display = 'none';
      if (massInput) {
        massInput.min = '0.01';
      }
    }
  }

  /**
   * Initialize 3D preview
   */
  private initializePreview(): void {
    const canvas = this.modal.querySelector('.create-planet-preview-canvas') as HTMLCanvasElement;
    if (!canvas) return;

    // Create renderer
    this.previewRenderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.previewRenderer.setSize(400, 400);
    this.previewRenderer.setPixelRatio(window.devicePixelRatio);

    // Create scene
    this.previewScene = new THREE.Scene();
    this.previewScene.background = new THREE.Color(0x000510);

    // Create camera
    this.previewCamera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    this.previewCamera.position.set(0, 0, 5);

    // Add lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.previewScene.add(ambientLight);

    this.previewLight = new THREE.DirectionalLight(0xffffff, 0.8);
    this.previewLight.position.set(5, 5, 5);
    this.previewScene.add(this.previewLight);

    // Create initial mesh
    this.updatePreview();
  }

  /**
   * Update preview mesh
   */
  private updatePreview(): void {
    if (!this.previewScene) return;

    // Remove old mesh
    if (this.previewMesh) {
      this.previewScene.remove(this.previewMesh);
      this.previewMesh.geometry.dispose();
      (this.previewMesh.material as THREE.Material).dispose();
    }

    // Create new mesh
    const geometry = new THREE.SphereGeometry(this.formData.radius, 32, 32);
    const material = new THREE.MeshStandardMaterial({
      color: this.formData.color,
      emissive: this.formData.type === 'star' ? this.formData.color : 0x000000,
      emissiveIntensity: this.formData.type === 'star' ? 1.0 : 0.0,
      metalness: 0.3,
      roughness: 0.7
    });

    this.previewMesh = new THREE.Mesh(geometry, material);
    this.previewScene.add(this.previewMesh);
  }

  /**
   * Load texture to preview
   */
  private async loadTextureToPreview(file: File): Promise<void> {
    if (!this.previewMesh) return;

    const loader = new THREE.TextureLoader();
    const objectUrl = URL.createObjectURL(file);

    try {
      const texture = await new Promise<THREE.Texture>((resolve, reject) => {
        loader.load(objectUrl, resolve, undefined, reject);
      });

      const material = this.previewMesh.material as THREE.MeshStandardMaterial;
      material.map = texture;
      material.needsUpdate = true;
    } catch (error) {
      console.error('Failed to load texture:', error);
      URL.revokeObjectURL(objectUrl);
    }
  }

  /**
   * Load normal map to preview
   */
  private async loadNormalMapToPreview(file: File): Promise<void> {
    if (!this.previewMesh) return;

    const loader = new THREE.TextureLoader();
    const objectUrl = URL.createObjectURL(file);

    try {
      const normalMap = await new Promise<THREE.Texture>((resolve, reject) => {
        loader.load(objectUrl, resolve, undefined, reject);
      });

      const material = this.previewMesh.material as THREE.MeshStandardMaterial;
      material.normalMap = normalMap;
      material.needsUpdate = true;
    } catch (error) {
      console.error('Failed to load normal map:', error);
      URL.revokeObjectURL(objectUrl);
    }
  }

  /**
   * Start preview animation
   */
  private startPreviewAnimation(): void {
    if (!this.previewMesh || !this.previewRenderer || !this.previewScene || !this.previewCamera) return;

    const animate = () => {
      this.animationId = requestAnimationFrame(animate);

      if (this.previewMesh) {
        this.previewMesh.rotation.y += 0.01;
      }

      if (this.previewRenderer && this.previewScene && this.previewCamera) {
        this.previewRenderer.render(this.previewScene, this.previewCamera);
      }
    };

    animate();
  }

  /**
   * Stop preview animation
   */
  private stopPreviewAnimation(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  /**
   * Create body from form data
   */
  private createBody(): void {
    // Validation
    if (this.formData.name.trim() === '') {
      alert('Please enter a name');
      return;
    }

    if (this.formData.type === 'star' && this.formData.mass < MIN_STAR_MASS) {
      alert(`Star mass must be at least ${MIN_STAR_MASS}`);
      return;
    }

    if (this.formData.type === 'star') {
      // Validate star color
      const validColors = Object.values(STAR_COLORS);
      if (!validColors.includes(this.formData.color)) {
        alert('Star color must be Red, Yellow, White, or Blue');
        return;
      }
    }

    // Create body
    const body = new CelestialBody({
      name: this.formData.name,
      mass: this.formData.mass,
      radius: this.formData.radius,
      position: new THREE.Vector3(0, 0, 0),
      velocity: new THREE.Vector3(0, 0, 0),
      color: this.formData.color,
      emissive: this.formData.type === 'star' ? this.formData.color : 0x000000,
      emissiveIntensity: this.formData.type === 'star' ? 1.0 : 0.0,
      isStatic: this.formData.type === 'star' && this.formData.mass >= 10
    });

    // Load textures if provided
    if (this.formData.textureFile) {
      body.loadTexture(this.formData.textureFile).catch(err => {
        console.error('Failed to load texture:', err);
      });
    }
    if (this.formData.normalMapFile) {
      body.loadNormalMap(this.formData.normalMapFile).catch(err => {
        console.error('Failed to load normal map:', err);
      });
    }

    const result: CreatePlanetResult = {
      body,
      name: this.formData.name,
      type: this.formData.type,
      mass: this.formData.mass,
      radius: this.formData.radius,
      color: this.formData.color,
      emissive: this.formData.type === 'star' ? this.formData.color : 0x000000,
      emissiveIntensity: this.formData.type === 'star' ? 1.0 : 0.0,
      textureFile: this.formData.textureFile || undefined,
      normalMapFile: this.formData.normalMapFile || undefined
    };

    // Cleanup
    this.stopPreviewAnimation();
    if (this.previewRenderer) {
      this.previewRenderer.dispose();
      this.previewRenderer = null;
    }
    if (this.previewScene) {
      this.previewScene.clear();
      this.previewScene = null;
    }
    this.previewCamera = null;
    this.previewMesh = null;
    this.previewLight = null;

    this.modal.style.display = 'none';

    if (this.resolveCallback) {
      this.resolveCallback(result);
      this.resolveCallback = null;
    }
  }

  /**
   * Dispose of modal
   */
  dispose(): void {
    this.stopPreviewAnimation();
    if (this.previewRenderer) {
      this.previewRenderer.dispose();
    }
    if (this.modal.parentNode) {
      this.modal.parentNode.removeChild(this.modal);
    }
  }
}

