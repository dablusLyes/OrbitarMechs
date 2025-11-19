/**
 * Interaction modes for the simulation
 */
export type InteractionMode = 'camera' | 'grab' | 'delete' | 'edit';

export const InteractionMode = {
  Camera: 'camera' as InteractionMode,
  Grab: 'grab' as InteractionMode,
  Delete: 'delete' as InteractionMode,
  Edit: 'edit' as InteractionMode
} as const;

/**
 * Manages the current interaction mode and emits change events
 */
export class ModeManager {
  private _currentMode: InteractionMode;
  private _onModeChangeCallbacks: ((mode: InteractionMode) => void)[];

  constructor(initialMode: InteractionMode = InteractionMode.Camera) {
    this._currentMode = initialMode;
    this._onModeChangeCallbacks = [];
  }

  /**
   * Get the current interaction mode
   */
  get currentMode(): InteractionMode {
    return this._currentMode;
  }

  /**
   * Set a new interaction mode
   */
  setMode(mode: InteractionMode): void {
    if (this._currentMode !== mode) {
      this._currentMode = mode;
      this._notifyModeChange();
    }
  }

  /**
   * Register a callback for mode changes
   */
  onModeChange(callback: (mode: InteractionMode) => void): void {
    this._onModeChangeCallbacks.push(callback);
  }

  /**
   * Remove a mode change callback
   */
  removeModeChangeCallback(callback: (mode: InteractionMode) => void): void {
    const index = this._onModeChangeCallbacks.indexOf(callback);
    if (index > -1) {
      this._onModeChangeCallbacks.splice(index, 1);
    }
  }

  /**
   * Notify all registered callbacks of mode change
   */
  private _notifyModeChange(): void {
    for (const callback of this._onModeChangeCallbacks) {
      callback(this._currentMode);
    }
  }
}

