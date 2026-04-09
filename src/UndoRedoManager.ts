import { Task } from './Task';
import type { ITileset } from './models/ITileset';

export class UndoRedoManager
{
    private undos: Task[] = [];
    private redos: Task[] = [];
    private ctx: CanvasRenderingContext2D;
    private undoBtn: HTMLButtonElement;
    private redoBtn: HTMLButtonElement;

    constructor(context: CanvasRenderingContext2D, undoButton: HTMLButtonElement, redoButton: HTMLButtonElement)
    {
        this.ctx = context;
        this.undoBtn = undoButton;
        this.redoBtn = redoButton;
        this.updateButtonStates();
    }

    /**
     * Records the current state of a canvas area as a task for undo/redo.
     * @param imageData The ImageData to record.
     * @param x The X coordinate of the area.
     * @param y The Y coordinate of the area.
     * @param width The width of the area.
     * @param height The height of the area.
     */
    public recordTask(imageData: ImageData, x: number, y: number, width: number, height: number): void
    {
        this.undos.push(new Task(imageData, x, y, width, height));
        this.redos = []; // Clear redo stack on new action
        this.updateButtonStates();
    }

    /**
     * Undoes the last action on the canvas.
     */
    public undo(): void
    {
        const lastTask = this.undos.pop();
        if (!lastTask) return;

        const currentData = this.ctx.getImageData(lastTask.x, lastTask.y, lastTask.width, lastTask.height);
        this.redos.push(new Task(currentData, lastTask.x, lastTask.y, currentData.width, currentData.height));

        this.ctx.putImageData(lastTask.data, lastTask.x, lastTask.y);
        this.updateButtonStates();
    }

    /**
     * Redoes the last undone action on the canvas.
     */
    public redo(): void
    {
        const lastRedo = this.redos.pop();
        if (!lastRedo) return;

        const currentData = this.ctx.getImageData(lastRedo.x, lastRedo.y, lastRedo.width, lastRedo.height);
        this.undos.push(new Task(currentData, lastRedo.x, lastRedo.y, currentData.width, currentData.height));

        this.ctx.putImageData(lastRedo.data, lastRedo.x, lastRedo.y);
        this.updateButtonStates();
    }

    private updateButtonStates(): void
    {
        this.undoBtn.disabled = this.undos.length === 0;
        this.redoBtn.disabled = this.redos.length === 0;
    }

    // Method to initialize with existing tasks (e.g., after loading a tileset with its history)
    public initializeHistory(undos: Task[], redos: Task[]): void
    {
        this.undos = undos;
        this.redos = redos;
        this.updateButtonStates();
    }
}