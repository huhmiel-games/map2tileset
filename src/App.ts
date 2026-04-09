import { Settings } from './Settings';
import { FileLoader } from './FileLoader'; // Import FileLoader
import { ModalManager } from './ModalManager'; // Import ModalManager
import { ImageEditor } from './ImageEditor'; // Import ImageEditor
import { FloatingCanvas } from './FloatingCanvas'; // Import FloatingCanvas
import { TilesetEditor } from './TilesetEditor'; // Import TilesetEditor

export class App
{
    private settings = new Settings();

    // DOM Elements
    private imageElm = document.getElementById("image") as HTMLImageElement;
    private tilesetElm = document.getElementById("tileset") as HTMLImageElement; // Used by FileLoader

    private fileLoader: FileLoader; // Declare FileLoader instance
    private floatingCanvas: FloatingCanvas; // Declare FloatingCanvas instance
    private imageEditor: ImageEditor; // Declare ImageEditor instance
    private tilesetEditor: TilesetEditor; // Declare TilesetEditor instance

    constructor()
    {
        this.floatingCanvas = new FloatingCanvas(this.settings);
        this.imageEditor = new ImageEditor(this.settings, this.floatingCanvas, () => this.handleImageSelectionComplete());
        this.imageEditor.setImageElement(this.imageElm);

        this.fileLoader = new FileLoader(); // Initialize FileLoader

        new ModalManager(
            (size) => this.handleSettingsSave(size),
            (name, w, h) => this.handleNewTilesetCreate(name, w, h),
            () => this.settings.tilesize
        );

        this.tilesetEditor = new TilesetEditor(
            this.settings,
            this.fileLoader,
            this.floatingCanvas,
            () => this.handleSaveSuccess()
        );

        this.init();
        this.bindEvents();
        this.restoreSession();
    }

    private init()
    {
        if (this.settings.tilesize !== 8)
        {
            const gridUrl = `url("/assets/grid-${this.settings.tilesize / 8}.png")`;
            this.imageEditor.getCanvas().style.backgroundImage = gridUrl;
            this.tilesetEditor.getCanvas().style.backgroundImage = gridUrl;
        }
    }

    // --- Event Binding ---

    private bindEvents()
    {
        document.getElementById('open-image')!.addEventListener('change', (e) => this.handleOpenImage(e));
        document.getElementById('open-tileset')!.addEventListener('change', (e) => this.handleOpenTileset(e));
        document.addEventListener('wheel', (e) => this.onMouseWheel(e), { passive: false });
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));

        document.getElementById('offset-x')!.addEventListener('change', (e) => this.handleOffsetX(e));
        document.getElementById('offset-y')!.addEventListener('change', (e) => this.handleOffsetY(e));
        document.getElementById('selected-area-label')!.addEventListener('click', () => this.imageEditor.resetSelection());

        
    }

    private restoreSession()
    {
        const lastImgPath = localStorage.getItem('lastImage');
        if (lastImgPath)
        {
            this.fileLoader.loadImageFromPath(lastImgPath, this.imageElm, this.imageEditor.getCanvas(), this.imageEditor.state, () =>
            {
                // Optional callback after image is loaded
                // No specific action needed here for imageEditor.state.isLoaded as it's handled by FileLoader
            });
        }
        else
        {
            // Equivalent to imageCanvas.parentNode.ariaBusy = false; in script.js if no image is loaded
            if (this.imageEditor.getCanvas().parentElement)
            {
                (this.imageEditor.getCanvas().parentElement as any).ariaBusy = false;
            }
        };

        const lastTilesetPath = localStorage.getItem('lastTileset');
        if (lastTilesetPath)
        {   // TilesetEditor now handles loading its own image
            this.fileLoader.loadImageFromPath(lastTilesetPath, this.tilesetElm, this.tilesetEditor.getCanvas(), this.tilesetEditor.state, () =>
            {
                this.tilesetEditor.setSaveButtonEnabled(true); // Enable save button as per script.js
            });
        }
        else
        {
            // Equivalent to tilesetCanvas.parentNode.ariaBusy = false; in script.js if no tileset is loaded
            if (this.tilesetEditor.getCanvas().parentElement)
            {
                (this.tilesetEditor.getCanvas().parentElement as any).ariaBusy = false;
            }
        }
    }

    // --- File Handling ---

    private handleOffsetX(event: any)
    {
        const x = Number(event.target.value) || 0;
        this.imageEditor.moveImage(x, this.imageEditor.state.offsetY);
        this.imageEditor.copy();
    }

    private handleOffsetY(event: any)
    {
        const y = Number(event.target.value) || 0;
        this.imageEditor.moveImage(this.imageEditor.state.offsetX, y);
        this.imageEditor.copy();
    }

    private handleOpenImage(event: any)
    {
        const path = event.target.value;
        if (path)
        {
            localStorage.setItem('lastImage', path);
            this.fileLoader.loadImageFromPath(path, this.imageElm, this.imageEditor.getCanvas(), this.imageEditor.state, () =>
            {
                // Optional callback after image is loaded
            });
        }
    }

    private handleOpenTileset(event: any)
    {
        const path = event.target.value;
        if (path)
        {
            localStorage.setItem('lastTileset', path);
            this.fileLoader.loadImageFromPath(path, this.tilesetElm, this.tilesetEditor.getCanvas(), this.tilesetEditor.state, () =>
            {
                // Optional callback after tileset is loaded
            });
        }
    }

    // --- Zoom Handling ---

    private onMouseWheel(event: WheelEvent)
    {
        if (!event.ctrlKey) return;

        event.preventDefault();
        const target = (event.target as HTMLElement).id;

        if (target === this.imageEditor.getCanvas().id)
        {
            this.imageEditor.updateZoom(event);
        }
        else if (target === this.tilesetEditor.getCanvas().id)
        {
            this.tilesetEditor.updateZoom(event);
        }
    }

    // --- Keyboard Shortcuts ---

    private handleKeyPress(event: KeyboardEvent)
    {
        if (event.ctrlKey && event.key === 'z') this.tilesetEditor.undo();
        if (event.ctrlKey && event.key === 'y') this.tilesetEditor.redo();
        if (event.ctrlKey && event.key === 's') this.tilesetEditor.downloadTileset();
        if (event.ctrlKey && event.key === 'a') { event.preventDefault(); this.imageEditor.selectAll(); } // Select all in image editor
        if (!event.ctrlKey && event.key === 'x') this.floatingCanvas.flipX(); // Flip floating canvas
        if (!event.ctrlKey && event.key === 'y') this.floatingCanvas.flipY(); // Flip floating canvas
    }

    // --- Modal Handling ---

    private handleSettingsSave(tilesize: number)
    {
        this.settings.save(tilesize);
        location.reload(); // Refresh to apply grid changes
    }

    private handleNewTilesetCreate(name: string, width: number, height: number)
    {
        this.tilesetEditor.createNewTileset(name, width, height);
        // If an image is loaded and a selection exists, ensure the floating canvas is updated
        if (this.imageEditor.state.isLoaded && this.imageEditor.selection.isComplete)
        {
            this.imageEditor.copy();
        }
        else
        {
            this.floatingCanvas.clear(); // Clear floating canvas if no selection or image
        }
    }

    // --- Callbacks from ImageEditor ---
    private handleImageSelectionComplete(): void
    {
        // This callback is triggered when ImageEditor has completed a selection and copied it to FloatingCanvas.
        // No direct action needed here, as TilesetEditor will pick up the data from FloatingCanvas on mousemove/paste.
    }

    private handleSaveSuccess(): void
    {
        const toast = document.getElementById('save-toast');
        if (toast)
        {
            toast.style.display = 'block';
            setTimeout(() =>
            {
                toast.style.display = 'none';
            }, 1000);
        }
    }
}
