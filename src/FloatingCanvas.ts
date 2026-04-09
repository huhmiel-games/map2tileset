import { Settings } from './Settings';

/**
 * Manages the floating canvas used for displaying the current image selection.
 * This class encapsulates all logic related to the floating canvas's state,
 * drawing, positioning, and transformations.
 */
export class FloatingCanvas
{
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private currentImageData: ImageData | undefined;
    private settings: Settings;

    constructor(settings: Settings)
    {
        this.canvas = document.getElementById('floating-canvas') as HTMLCanvasElement;
        this.ctx = this.canvas.getContext('2d')!;
        this.settings = settings;

        // Initially hide the canvas
        this.clear();
    }

    /**
     * Sets the image data for the floating canvas and makes it visible.
     * @param imageData The ImageData object to display.
     */
    public setData(imageData: ImageData): void
    {
        this.currentImageData = imageData;
        this.canvas.width = imageData.width;
        this.canvas.height = imageData.height;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.putImageData(imageData, 0, 0);
        this.canvas.classList.remove('none');
        this.canvas.classList.add('floating-canvas');
    }

    /**
     * Clears the floating canvas and hides it.
     */
    public clear(): void
    {
        this.currentImageData = undefined;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.canvas.style.left = '0px';
        this.canvas.style.top = '0px';
        this.canvas.style.width = '0px';
        this.canvas.style.height = '0px';
        this.canvas.width = 0;
        this.canvas.height = 0;
        this.canvas.classList.add('none');
    }

    /**
     * Updates the position and size of the floating canvas based on mouse event and zoom level.
     * Applies grid snapping.
     * @param event The MouseEvent from the tileset canvas.
     * @param tilesetZoom The current zoom level of the tileset.
     * @param rightPanelOffsetLeft The offsetLeft of the right panel (scrollable container).
     * @param rightPanelOffsetTop The offsetTop of the right panel (scrollable container).
     * @param rightPanelScrollLeft The scrollLeft of the right panel.
     * @param rightPanelScrollTop The scrollTop of the right panel.
     */
    public updatePosition(
        event: MouseEvent,
        tilesetZoom: number,
        tilesetCanvasViewportLeft: number, // Renamed parameter for clarity
        tilesetCanvasViewportTop: number  // Renamed parameter for clarity
    ): void
    {


        if (!this.currentImageData) return;

        this.canvas.style.width = `${this.currentImageData.width * tilesetZoom}px`;
        this.canvas.style.height = `${this.currentImageData.height * tilesetZoom}px`;

        const x = (this.roundToGrid(event.offsetX / tilesetZoom) - this.roundToGrid(this.currentImageData.width / 2)) * tilesetZoom;
        const y = (this.roundToGrid(event.offsetY / tilesetZoom) - this.roundToGrid(this.currentImageData.height / 2)) * tilesetZoom;

        this.canvas.style.left = `${tilesetCanvasViewportLeft + x}px`;
        this.canvas.style.top = `${tilesetCanvasViewportTop + y}px`;
    }

    public flipX(): void
    {
        if (!this.currentImageData) return;
        this.ctx.translate(this.currentImageData.width, 0);
        this.ctx.scale(-1, 1);
        this.ctx.drawImage(this.canvas, 0, 0); // Redraw the current content flipped
        this.ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transformation
    }

    public flipY(): void
    {
        if (!this.currentImageData) return;
        this.ctx.translate(0, this.currentImageData.height);
        this.ctx.scale(1, -1);
        this.ctx.drawImage(this.canvas, 0, 0); // Redraw the current content flipped
        this.ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transformation
    }

    public getCanvas(): HTMLCanvasElement
    {
        return this.canvas;
    }

    public getSelectionData(): ImageData | undefined
    {
        return this.currentImageData;
    }

    private roundToGrid(num: number): number
    {
        return Math.round(num / this.settings.tilesize) * this.settings.tilesize;
    }
}