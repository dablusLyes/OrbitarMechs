import type { CelestialBody } from './Body.js';
import { CelestialBody as CelestialBodyClass } from './Body.js';
import * as THREE from 'three';

/**
 * Represents a snapshot of a body's state for undo/redo
 */
interface BodySnapshot {
  id: string; // Unique identifier for the body
  name: string;
  mass: number;
  radius: number;
  position: { x: number; y: number; z: number };
  velocity: { x: number; y: number; z: number };
  color: number;
  emissive: number;
  emissiveIntensity: number;
  isStatic: boolean;
}

/**
 * Types of operations that can be undone
 */
export type UndoOperationType = 'add' | 'remove' | 'modify';

export const UndoOperationType = {
  AddBody: 'add' as UndoOperationType,
  RemoveBody: 'remove' as UndoOperationType,
  ModifyBody: 'modify' as UndoOperationType
} as const;

/**
 * Represents an undoable operation
 */
interface UndoOperation {
  type: UndoOperationType;
  bodySnapshot: BodySnapshot;
  bodyIndex?: number; // For remove operations, track original index
}

/**
 * Manages undo/redo functionality for the simulation
 */
export class UndoManager {
  private undoStack: UndoOperation[];
  private redoStack: UndoOperation[];
  private maxStackSize: number;
  private bodyIdMap: Map<CelestialBody, string>; // Map bodies to unique IDs

  constructor(maxStackSize: number = 50) {
    this.undoStack = [];
    this.redoStack = [];
    this.maxStackSize = maxStackSize;
    this.bodyIdMap = new Map();
  }

  /**
   * Create a snapshot of a body's current state
   */
  private createBodySnapshot(body: CelestialBody, id?: string): BodySnapshot {
    const bodyId = id || this.getBodyId(body);
    return {
      id: bodyId,
      name: body.name,
      mass: body.mass,
      radius: body.radius,
      position: {
        x: body.position.x,
        y: body.position.y,
        z: body.position.z
      },
      velocity: {
        x: body.velocity.x,
        y: body.velocity.y,
        z: body.velocity.z
      },
      color: body.color,
      emissive: body.emissive,
      emissiveIntensity: body.emissiveIntensity,
      isStatic: body.isStatic
    };
  }

  /**
   * Get or create a unique ID for a body
   */
  private getBodyId(body: CelestialBody): string {
    if (!this.bodyIdMap.has(body)) {
      this.bodyIdMap.set(body, `body_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
    }
    return this.bodyIdMap.get(body)!;
  }

  /**
   * Find a body by its ID
   */
  findBodyById(bodies: CelestialBody[], id: string): CelestialBody | null {
    for (const body of bodies) {
      const bodyId = this.getBodyId(body);
      if (bodyId === id) {
        return body;
      }
    }
    return null;
  }

  /**
   * Create a body from a snapshot
   */
  createBodyFromSnapshot(snapshot: BodySnapshot): CelestialBody {
    return new CelestialBodyClass({
      name: snapshot.name,
      mass: snapshot.mass,
      radius: snapshot.radius,
      position: new THREE.Vector3(snapshot.position.x, snapshot.position.y, snapshot.position.z),
      velocity: new THREE.Vector3(snapshot.velocity.x, snapshot.velocity.y, snapshot.velocity.z),
      color: snapshot.color,
      emissive: snapshot.emissive,
      emissiveIntensity: snapshot.emissiveIntensity,
      isStatic: snapshot.isStatic
    });
  }

  /**
   * Record a body addition for undo
   */
  recordAddBody(body: CelestialBody): void {
    const snapshot = this.createBodySnapshot(body);
    this.addToUndoStack({
      type: UndoOperationType.AddBody,
      bodySnapshot: snapshot
    });
    this.redoStack = []; // Clear redo stack when new operation is performed
  }

  /**
   * Record a body removal for undo
   */
  recordRemoveBody(body: CelestialBody, bodyIndex: number): void {
    const snapshot = this.createBodySnapshot(body);
    this.addToUndoStack({
      type: UndoOperationType.RemoveBody,
      bodySnapshot: snapshot,
      bodyIndex: bodyIndex
    });
    this.redoStack = []; // Clear redo stack when new operation is performed
  }

  /**
   * Record a body modification for undo
   */
  recordModifyBody(_body: CelestialBody, beforeSnapshot: BodySnapshot): void {
    this.addToUndoStack({
      type: UndoOperationType.ModifyBody,
      bodySnapshot: beforeSnapshot
    });
    this.redoStack = []; // Clear redo stack when new operation is performed
  }

  /**
   * Get a snapshot of a body before modification (for recordModifyBody)
   */
  getBodySnapshot(body: CelestialBody): BodySnapshot {
    return this.createBodySnapshot(body);
  }

  /**
   * Add operation to undo stack with size limit
   */
  private addToUndoStack(operation: UndoOperation): void {
    this.undoStack.push(operation);
    if (this.undoStack.length > this.maxStackSize) {
      this.undoStack.shift(); // Remove oldest operation
    }
  }

  /**
   * Check if undo is possible
   */
  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  /**
   * Check if redo is possible
   */
  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /**
   * Undo the last operation
   * Returns the operation that was undone, or null if nothing to undo
   */
  undo(_bodies: CelestialBody[]): UndoOperation | null {
    if (!this.canUndo()) {
      return null;
    }

    const operation = this.undoStack.pop()!;
    this.redoStack.push(operation);
    return operation;
  }

  /**
   * Redo the last undone operation
   * Returns the operation that was redone, or null if nothing to redo
   */
  redo(_bodies: CelestialBody[]): UndoOperation | null {
    if (!this.canRedo()) {
      return null;
    }

    const operation = this.redoStack.pop()!;
    this.undoStack.push(operation);
    return operation;
  }

  /**
   * Clear all undo/redo history
   */
  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }

  /**
   * Remove a body from the ID map (when body is permanently deleted)
   */
  removeBodyId(_body: CelestialBody): void {
    // Note: We can't actually delete from the map here because we need the ID
    // to restore the body. The ID map is kept for undo/redo purposes.
    // In practice, bodies are kept in the map until the undo stack is cleared.
  }
}

