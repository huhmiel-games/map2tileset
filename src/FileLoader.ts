import type { IImageState } from './models/IImageState';
import type { ITileset } from './models/ITileset';
import { fs } from './script'; // Import fs from script.ts

/**
 * Load image files for the Left and Right Panels
 */
export class FileLoader
{

    constructor()
    {
        if (typeof fs === 'undefined')
        {
            console.error("NW.js 'fs' module is not available. File operations will not work.");
        }
    }

    /**
     * Loads an image from a file path and draws it to a canvas, updating the corresponding state.
     * @param filePath The full path to the image file.
     * @param imgElm The HTMLImageElement to load the source into.
     * @param canvasElm The HTMLCanvasElement to draw the image onto.
     * @param state The state object (IImageState or ITileset) to update after loading.
     * @param onImageLoaded Callback function to execute once the image is loaded and drawn.
     */
    public loadImageFromPath(
        filePath: string,
        imgElm: HTMLImageElement,
        canvasElm: HTMLCanvasElement,
        state: IImageState | ITileset,
        onImageLoaded: () => void
    ): void
    {
        if (!filePath || typeof fs === 'undefined') return;

        try
        {
            const base64Data = fs.readFileSync(filePath, { encoding: 'base64' });
            const buffer = Buffer.from(base64Data, 'base64');
            const blob = new Blob([buffer]);
            const imageSrc = window.URL.createObjectURL(blob);

            imgElm.addEventListener("load", () =>
            {
                // We keep the regex split which is an improvement for Windows/Linux cross-compatibility
                state.name = filePath.split(/[\\/]/).pop() || 'unnamed';
                state.width = imgElm.naturalWidth;
                state.height = imgElm.naturalHeight;
                state.isLoaded = true;
                this.drawImage(canvasElm, imgElm);
                canvasElm.classList.remove('none');
                if (canvasElm.parentElement) (canvasElm.parentElement as any).ariaBusy = false;
                onImageLoaded();
            }, { once: true });
            imgElm.src = imageSrc;
        } 
        catch (error)
        {
            console.error(`Failed to load file from path "${filePath}":`, error);
            alert(`${filePath.split(/[\\/]/).pop()} not found ...`);
        }
    }

    /**
     * Draws an image onto a canvas.
     * @param canvas The target HTMLCanvasElement.
     * @param img The source HTMLImageElement.
     * @param x The X coordinate to start drawing (default is 0).
     * @param y The Y coordinate to start drawing (default is 0).
     */
    public drawImage(canvas: HTMLCanvasElement, img: HTMLImageElement, x = 0, y = 0): void
    {
        const ctx = canvas.getContext("2d")!;
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        ctx.drawImage(img, x, y);
    }
}