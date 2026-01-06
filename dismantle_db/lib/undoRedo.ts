export interface UndoState {
  rateId: string
  oldValue: string
  newValue: string
  timestamp: number
}

export class UndoRedoManager {
  private undoStack: UndoState[] = []
  private redoStack: UndoState[] = []
  private maxStackSize = 50

  addAction(rateId: string, oldValue: string, newValue: string) {
    this.undoStack.push({
      rateId,
      oldValue,
      newValue,
      timestamp: Date.now()
    })

    // Limit stack size
    if (this.undoStack.length > this.maxStackSize) {
      this.undoStack.shift()
    }

    // Clear redo stack when new action is added
    this.redoStack = []
  }

  canUndo(): boolean {
    return this.undoStack.length > 0
  }

  canRedo(): boolean {
    return this.redoStack.length > 0
  }

  undo(): UndoState | null {
    const action = this.undoStack.pop()
    if (action) {
      this.redoStack.push(action)
      return action
    }
    return null
  }

  redo(): UndoState | null {
    const action = this.redoStack.pop()
    if (action) {
      this.undoStack.push(action)
      return action
    }
    return null
  }

  clear() {
    this.undoStack = []
    this.redoStack = []
  }
}
