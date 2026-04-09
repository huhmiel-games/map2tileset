import type { ITileset } from './models/ITileset';
import { Settings } from './Settings';
import { UndoRedoManager } from './UndoRedoManager';
import { FileLoader } from './FileLoader';
import { FloatingCanvas } from './FloatingCanvas';

export class TilesetEditor
{
    public state: ITileset = { name: '', width: 0, height: 0, isLoaded: false, isDirty: false, zoom: 1, undos: [], redos: [] };

    private canvas = document.getElementById('tileset-canvas') as HTMLCanvasElement;
    private tilesetElm = document.getElementById("tileset") as HTMLImageElement;
    private saveTilesetBtn = document.getElementById('save-tileset') as HTMLButtonElement;
    private zoomLabel = document.getElementById('tileset-zoom') as HTMLLabelElement;
    private undoBtn = document.getElementById('undo-btn') as HTMLButtonElement;
    private redoBtn = document.getElementById('redo-btn') as HTMLButtonElement;
    private rightPanel = document.getElementById('right-panel') as HTMLDivElement;

    // Dependencies
    private settings: Settings;
    private undoRedoManager: UndoRedoManager; // Now initialized internally
    private fileLoader: FileLoader;
    private floatingCanvas: FloatingCanvas;
    private onDownloadCompleteCallback?: () => void;

    constructor(settings: Settings, fileLoader: FileLoader, floatingCanvas: FloatingCanvas, onDownloadComplete?: () => void)
    {
        this.settings = settings;
        this.fileLoader = fileLoader;
        this.floatingCanvas = floatingCanvas;
        this.onDownloadCompleteCallback = onDownloadComplete;

        // Initialize UndoRedoManager here, as TilesetEditor now owns it
        this.undoRedoManager = new UndoRedoManager(
            this.canvas.getContext('2d')!,
            this.undoBtn,
            this.redoBtn
        );
        this.bindEvents();
    }

    private bindEvents(): void
    {
        this.canvas.addEventListener('mousemove', (e) => this.moveFloatingCanvas(e));
        this.canvas.addEventListener('click', (e) => this.paste(e));
        this.canvas.addEventListener('contextmenu', (e) => this.resetFloatingCanvas(e));
        this.undoBtn.addEventListener('click', () => this.undo());
        this.redoBtn.addEventListener('click', () => this.redo());
        this.saveTilesetBtn.addEventListener('click', () => this.downloadTileset());
    }

    public paste(event: MouseEvent): void
    {
        const selectionData = this.floatingCanvas.getSelectionData();
        if (!selectionData) return;

        const ctx = this.canvas.getContext("2d")!;
        const x = this.roundToGrid(event.offsetX / this.state.zoom) - this.roundToGrid(selectionData.width / 2);
        const y = this.roundToGrid(event.offsetY / this.state.zoom) - this.roundToGrid(selectionData.height / 2);

        const width = selectionData.width;
        const height = selectionData.height;

        // Record the current state of the area before pasting for undo functionality
        const previousData = ctx.getImageData(x, y, width, height);
        this.undoRedoManager.recordTask(previousData, x, y, width, height);

        const floatingCtx = this.floatingCanvas.getCanvas().getContext('2d')!;
        const floatingData = floatingCtx.getImageData(0, 0, width, height);
        ctx.putImageData(floatingData, x, y);
        this.state.isDirty = true; // Mark tileset as modified
    }

    /**
     * Performs an undo operation on the tileset.
     * Delegated to the UndoRedoManager.
     */
    public undo(): void
    {
        this.undoRedoManager.undo();
        this.state.isDirty = true; // Mark tileset as modified
    }

    public redo(): void
    {
        this.undoRedoManager.redo();
        this.state.isDirty = true; // Mark tileset as modified
    }

    /**
     * Coordinates the movement of the selection preview over the tileset.
     * Translates mouse coordinates and panel state to the FloatingCanvas.
     */
    private moveFloatingCanvas(event: MouseEvent): void
    {
        this.floatingCanvas.updatePosition(
            event,
            this.state.zoom,
            this.canvas.getBoundingClientRect().left,
            this.canvas.getBoundingClientRect().top
        );
    }

    /**
     * Clears the current selection preview when right-clicking on the tileset.
     */
    private resetFloatingCanvas(event: MouseEvent): void
    {
        event.stopPropagation();
        event.preventDefault();
        if (event.button === 2)
        {
            this.floatingCanvas.clear();
        }
    }

    /**
     * Updates the zoom level and re-centers the view on the mouse pointer.
     * Ported from the original tileset zoom logic in script.old.
     */
    public updateZoom(event: WheelEvent): void
    {
        if (!this.state.isLoaded) return;

        const deltaY = event.deltaY;
        const isZoomIn = deltaY < 0;
        const delta = isZoomIn ? 2 : 0.5;
        const newZoom = Math.max(0.02, Math.min(64, this.state.zoom * delta));

        if (newZoom === this.state.zoom) return;

        // Calculate new scroll positions to keep the point under the mouse stationary.
        // We use the panel's offset to correctly calculate relative coordinates.
        let scrollX: number;
        let scrollY: number;

        if (isZoomIn)
        {
            scrollX = (event.offsetX - (event.clientX - this.rightPanel.offsetLeft) / 2) * 2;
            scrollY = (event.offsetY - (event.clientY - this.rightPanel.offsetTop) / 2) * 2;
        } 
        else
        {
            scrollX = (event.offsetX - (event.clientX - this.rightPanel.offsetLeft) * 2) / 2;
            scrollY = (event.offsetY - (event.clientY - this.rightPanel.offsetTop) * 2) / 2;
        }

        this.state.zoom = newZoom;
        this.canvas.style.width = `${this.state.width * this.state.zoom}px`;
        this.canvas.style.height = `${this.state.height * this.state.zoom}px`;
        this.rightPanel.scroll(scrollX, scrollY);
        this.zoomLabel.innerText = `Zoom: ${this.state.zoom}`;

        if (this.state.zoom >= 1)
        {
            const gridScale = (this.state.zoom * this.settings.tilesize) / 8;
            this.canvas.style.backgroundImage = `url("/assets/grid-${gridScale}.png")`;
        }
    }

    public downloadTileset(): void
    {
        const link = document.createElement('a');
        link.download = this.state.name || 'tileset.png';
        link.href = this.canvas.toDataURL();
        
        // We listen for the window regaining focus, which typically happens 
        // after the system save dialog is closed.
        window.addEventListener('focus', () => {
            if (this.onDownloadCompleteCallback) {
                this.onDownloadCompleteCallback();
            }
        }, { once: true });

        link.click();
        this.state.isDirty = false;
    }

    public createNewTileset(name: string, width: number, height: number): void
    {
        this.state.name = name + '.png';
        this.state.width = width;
        this.state.height = height;
        this.canvas.width = width;
        this.canvas.height = height;
        const ctx = this.canvas.getContext('2d')!;
        ctx.fillStyle = 'rgba(0, 0, 0, 0)'; // Transparent background
        ctx.fillRect(0, 0, width, height);
        this.tilesetElm.src = this.canvas.toDataURL(); // Update image element for potential re-loading
        this.canvas.classList.remove('none');
        this.state.isLoaded = true;
        this.saveTilesetBtn.disabled = false;
        this.undoRedoManager.initializeHistory([], []); // Clear undo/redo history for new tileset
    }

    public setSaveButtonEnabled(enabled: boolean): void
    {
        this.saveTilesetBtn.disabled = !enabled;
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