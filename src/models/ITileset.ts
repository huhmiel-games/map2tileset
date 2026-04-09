import type { Task } from "../Task";

export interface ITileset {
    name: string;
    width: number;
    height: number;
    isLoaded: boolean;
    isDirty: boolean;
    zoom: number;
    undos: Task[]; // Add the 'undos' array for undo history
    redos: Task[]; // Add the 'redos' array for redo history
}