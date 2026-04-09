import type { IImageState } from './models/IImageState';
import type { ISelectedImageArea } from './models/ISelectedImageArea';
import { Settings } from './Settings';
import { FloatingCanvas } from './FloatingCanvas';

export class ImageEditor 
{
    public state: IImageState = { name: '', width: 0, height: 0, isLoaded: false, zoom: 1, offsetX: 0, offsetY: 0 };
    public selection: ISelectedImageArea = { sx: 0, sy: 0, ex: 0, ey: 0, isDirty: false, isComplete: false }; // selection.data is now handled by FloatingCanvas

    private canvas = document.getElementById('image-canvas') as HTMLCanvasElement;
    private redZone = document.getElementById("red-zone") as HTMLDivElement;
    private selectedAreaLabel = document.getElementById('selected-area-label') as HTMLLabelElement;
    private zoomLabel = document.getElementById('image-zoom') as HTMLLabelElement;
    private leftPanel = document.getElementById('left-panel') as HTMLDivElement;
    private imageElm: HTMLImageElement | null = null;
    private floatingCanvas: FloatingCanvas;
    private onSelectionCompleteCallback: () => void;

    constructor(private settings: Settings, floatingCanvas: FloatingCanvas, onSelectionComplete: () => void)
    {
        this.floatingCanvas = floatingCanvas;
        this.onSelectionCompleteCallback = onSelectionComplete;

        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleMouseDown = this.handleMouseDown.bind(this);
        this.handleMouseUp = this.handleMouseUp.bind(this);

        this.leftPanel.addEventListener('mouseleave', (event) =>
        {
            if (this.selection.isComplete || this.selection.isDirty) return;

            this.leftPanel.removeEventListener('mousemove', this.handleMouseMove);
        });

        this.getCanvas().addEventListener('mousedown', this.handleMouseDown);
        this.getCanvas().addEventListener('mouseup', this.handleMouseUp);
        this.getCanvas().addEventListener('contextmenu', (e) =>
        {
            e.preventDefault();
            this.resetSelection();
        });
    }

    public setImageElement(elm: HTMLImageElement): void
    {
        this.imageElm = elm;
    }

    public handleMouseDown(event: MouseEvent): void
    {
        if (!this.state.isLoaded || event.button !== 0) return;
        if (this.selection.isComplete) this.resetSelection();

        this.selection.sx = this.roundToGrid((event.offsetX - this.state.offsetX) / this.state.zoom) * this.state.zoom;
        this.selection.sy = this.roundToGrid((event.offsetY - this.state.offsetY) / this.state.zoom) * this.state.zoom;
        this.selection.isDirty = true;

        this.redZone.style.left = `${this.selection.sx}px`;
        this.redZone.style.top = `${this.selection.sy}px`;

        this.leftPanel.addEventListener('mousemove', this.handleMouseMove, { once: false });
    }

    /**
     * 
     * @param event handleMouseMove never worked so we return, will be fixed later
     * @returns 
     */
    public handleMouseMove(event: MouseEvent): void
    {
        if (!this.selection.isDirty || this.selection.isComplete || !this.state.isLoaded) return;

        const ex = this.roundToGrid((event.offsetX - this.state.offsetX) / this.state.zoom) * this.state.zoom;
        const ey = this.roundToGrid((event.offsetY - this.state.offsetY) / this.state.zoom) * this.state.zoom;

        this.redZone.style.width = `${Math.abs(ex - this.selection.sx)}px`;
        this.redZone.style.height = `${Math.abs(ey - this.selection.sy)}px`;
    }

    public handleMouseUp(event: MouseEvent): void
    {
        if (!this.selection.isDirty || !this.state.isLoaded || event.button !== 0) return;

        let w = this.roundToGrid((event.offsetX - this.selection.sx) / this.state.zoom);
        let h = this.roundToGrid((event.offsetY - this.selection.sy) / this.state.zoom);

        w = Math.max(w, this.settings.tilesize);
        h = Math.max(h, this.settings.tilesize);

        this.selection.ex = this.selection.sx + w * this.state.zoom;
        this.selection.ey = this.selection.sy + h * this.state.zoom;
        this.selection.isComplete = true;

        this.redZone.style.width = `${w * this.state.zoom}px`;
        this.redZone.style.height = `${h * this.state.zoom}px`;

        this.copy();
        this.onSelectionCompleteCallback(); // Notify app that selection is complete and copied

        this.leftPanel.removeEventListener('mousemove', this.handleMouseMove);
    }

    public moveImage(x: number, y: number): void
    {
        this.state.offsetX = x;
        this.state.offsetY = y;

        if (!this.state.isLoaded || !this.imageElm) return;

        const ctx = this.canvas.getContext('2d')!;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.drawImage(this.imageElm, x, y);
    }

    public copy(): void
    {
        const ctx = this.canvas.getContext('2d')!;
        const w = (this.selection.ex - this.selection.sx) / this.state.zoom;
        const h = (this.selection.ey - this.selection.sy) / this.state.zoom;

        const imageData = ctx.getImageData(
            this.selection.sx / this.state.zoom,
            this.selection.sy / this.state.zoom,
            w, h
        );

        this.floatingCanvas.setData(imageData); // Pass data to floating canvas
        this.selectedAreaLabel.innerText = `W: ${w} H: ${h}`;
    }

    public resetSelection(): void
    {
        this.selection = { sx: 0, sy: 0, ex: 0, ey: 0, isDirty: false, isComplete: false };
        this.redZone.style.width = '0px';
        this.redZone.style.height = '0px';
        this.selectedAreaLabel.innerHTML = 'W: 0 H: 0';
        this.floatingCanvas.clear(); // Clear floating canvas as well
        this.leftPanel.removeEventListener('mousemove', this.handleMouseMove);
    }

    public selectAll(): void
    {
        if (!this.state.isLoaded) return;

        this.selection.sx = 0;
        this.selection.sy = 0;
        this.selection.ex = this.state.width * this.state.zoom;
        this.selection.ey = this.state.height * this.state.zoom;
        this.selection.isComplete = true;
        this.redZone.style.width = `${this.state.width * this.state.zoom}px`;
        this.redZone.style.height = `${this.state.height * this.state.zoom}px`;
        this.copy();
    }

    /**
     * Updates the zoom level and re-centers the view on the mouse pointer.
     * Based on the original logic found in script.old.
     */
    public updateZoom(event: WheelEvent): void
    {
        if (!this.state.isLoaded) return;

        const deltaY = event.deltaY;
        // In script.old: wheelDelta > 0 was zoom in (2x factor).
        // In standard WheelEvent: deltaY < 0 is wheel up (zoom in).
        const isZoomIn = deltaY < 0;
        const delta = isZoomIn ? 2 : 0.5;
        const oldZoom = this.state.zoom;
        const newZoom = Math.max(0.02, Math.min(64, oldZoom * delta));

        if (newZoom === oldZoom) return;

        // Update state and visual properties
        this.state.zoom = newZoom;

        // Calculate new scroll positions to keep the point under the mouse stationary.
        // We use the panel's offset to correctly calculate relative coordinates, like in TilesetEditor.
        let scrollX: number;
        let scrollY: number;

        if (isZoomIn)
        {
            scrollX = (event.offsetX - (event.clientX - this.leftPanel.offsetLeft) / 2) * 2;
            scrollY = (event.offsetY - (event.clientY - this.leftPanel.offsetTop) / 2) * 2;
        } else
        {
            scrollX = (event.offsetX - (event.clientX - this.leftPanel.offsetLeft) * 2) / 2;
            scrollY = (event.offsetY - (event.clientY - this.leftPanel.offsetTop) * 2) / 2;
        }

        this.canvas.style.width = `${this.state.width * this.state.zoom}px`;
        this.canvas.style.height = `${this.state.height * this.state.zoom}px`;
        this.zoomLabel.innerText = `Zoom: ${this.state.zoom}`;

        // Apply the calculated scroll to the container (the scrollable parent)
        this.leftPanel.scroll(scrollX, scrollY);

        // Update grid background
        if (this.state.zoom >= 1)
        {
            const gridScale = (this.state.zoom * this.settings.tilesize) / 8;
            this.canvas.style.backgroundImage = `url("/assets/grid-${gridScale}.png")`;
        }

        // Update selection if it exists, instead of resetting it
        if (this.selection.isComplete)
        {
            const ratio = newZoom / oldZoom;
            this.selection.sx *= ratio;
            this.selection.sy *= ratio;
            this.selection.ex *= ratio;
            this.selection.ey *= ratio;

            this.redZone.style.left = `${this.selection.sx}px`;
            this.redZone.style.top = `${this.selection.sy}px`;
            this.redZone.style.width = `${this.selection.ex - this.selection.sx}px`;
            this.redZone.style.height = `${this.selection.ey - this.selection.sy}px`;
        }
        else
        {
            this.resetSelection();
        }
    }

    private roundToGrid(num: number): number
    {
        return Math.round(num / this.settings.tilesize) * this.settings.tilesize;
    }

    public getCanvas(): HTMLCanvasElement
    {
        return this.canvas;
    }
}