
/**
 * Represents a task for undo/redo functionality, storing image data and its position/dimensions.
 */
export class Task
{
    data: ImageData;
    x: number;
    y: number;
    width: number;
    height: number;
    constructor(data: ImageData, x: number, y: number, width: number, height: number)
    {
        this.data = data;
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }
}