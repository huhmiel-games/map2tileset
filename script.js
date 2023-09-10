(()=>{
// Html elements
const saveTilesetBtn = document.getElementById('save-tileset');
const undoBtn = document.getElementById('undo-btn');
const redoBtn = document.getElementById('redo-btn');
const imageElm = document.getElementById("image");
const offsetXInput = document.getElementById('offset-x');
const offsetYInput = document.getElementById('offset-y');
/**@type {HTMLCanvasElement} */
const imageCanvas = document.getElementById('imageCanvas');
const tilesetElm = document.getElementById("tileset");
/**@type {HTMLCanvasElement} */
const tilesetCanvas = document.getElementById('tilesetCanvas');
const redZone = document.getElementById("red-zone");
/**@type {HTMLCanvasElement} */
const floatingCanvas = document.getElementById('floating-canvas');
const selectedAreaLabelElm = document.getElementById('selected-area-label');
const imageZoomLabel = document.getElementById('image-zoom');
const tilesetZoomLabel = document.getElementById('tileset-zoom');
const leftPanel = document.getElementById('left-panel');
const rightPanel = document.getElementById('right-panel');

// Data
const selectedImageArea = {
    sx: 0,
    sy: 0,
    ex: 0,
    ey: 0,
    isDirty: false,
    isComplete: false,
    data: undefined
}

const image = {
    name: '',
    width: 0,
    height: 0,
    isLoaded: false,
    zoom: 1,
    offsetX: 0,
    offsetY: 0
}

const tileset = {
    name: '',
    width: 0,
    height: 0,
    isLoaded: false,
    zoom: 1,
    undos: [],
    redos: []
}

const settings = {
    tilesize: +localStorage.getItem('tilesize') || 8
}

let visibleModal = undefined;
const navbarHeight = document.querySelector('nav').clientHeight;

// Event listeners
document.getElementById('open-image').addEventListener('change', openImage, false);
document.getElementById('open-tileset').addEventListener('change', openTileset, false);
document.getElementById('settings-btn').addEventListener('click', openModal, false);
document.getElementById('about-btn').addEventListener('click', openModal, false);
document.getElementById('new-tileset-btn').addEventListener('click', openModal, false);
document.addEventListener('wheel', onMouseWheel, { passive: false });
(document.querySelectorAll('[id ^= "close-"]')).forEach(elm => elm.addEventListener('click', closeModal));
document.getElementById('confirm-settings-btn').addEventListener('click', saveSettings);
document.getElementById('confirm-tileset-btn').addEventListener('click', createNewTileset, false);
document.addEventListener('keydown', handleKeyPress);
offsetXInput.addEventListener('change', setOffsetX, false);
offsetYInput.addEventListener('change', setOffsetY, false);
selectedAreaLabelElm.addEventListener('click', resetSelection, false);
imageCanvas.addEventListener('mousedown', onImageCanvasMouseDown, false);
imageCanvas.addEventListener('mouseup', onImageCanvasMouseUp, false);
imageCanvas.addEventListener('contextmenu', resetSelection, false);
undoBtn.addEventListener('click', undo, false);
redoBtn.addEventListener('click', redo, false);
saveTilesetBtn.addEventListener('click', downloadTilesetAsImage, false);
tilesetCanvas.addEventListener('mousemove', moveFloatingCanvas, false);
tilesetCanvas.addEventListener('click', paste, false);
tilesetCanvas.addEventListener('contextmenu', resetFloatingCanvas, false);

// Init
if (settings.tilesize !== 8)
{
    imageCanvas.style.backgroundImage = `url("/map2tileset/assets/grid-${settings.tilesize / 8}.png")`;
    tilesetCanvas.style.backgroundImage = `url("/map2tileset/assets/grid-${settings.tilesize / 8}.png")`;
}
// Settings
function openModal(event)
{
    event.preventDefault();
    document.getElementById('tilesize').value = settings.tilesize;
    const modal = document.getElementById(event.currentTarget.getAttribute("data-target"));
    modal.open = true;
    visibleModal = modal;
}

function closeModal(event)
{
    visibleModal = undefined;
    event.preventDefault();
    document.getElementById('tilesize').value = settings.tilesize;
    const modal = document.getElementById(event.currentTarget.getAttribute("data-target"));
    modal.open = false;
}

function saveSettings(event)
{
    event.preventDefault();
    settings.tilesize = +document.getElementById('tilesize').value;
    localStorage.setItem('tilesize', settings.tilesize);
    closeModal(event);
}

// Image canvas
function openImage(event)
{
    const imageFiles = event.target.files;
    const imageFilesLength = imageFiles.length;
    resetOffset();
    if (imageFilesLength > 0)
    {
        image.name = imageFiles.name;
        const imageSrc = URL.createObjectURL(imageFiles[0]);
        imageElm.src = imageSrc;
        imageElm.addEventListener("load", (e) =>
        {
            image.width = imageElm.naturalWidth;
            image.height = imageElm.naturalHeight;
            imageCanvas.classList.remove('none');
            drawImage(imageCanvas, imageElm);
            image.isLoaded = true;
        }, { once: true });
    }
}

function moveImage()
{
    const imageCtx = imageCanvas.getContext('2d');
    imageCtx.clearRect(0, 0, imageCanvas.width, imageCanvas.height);
    drawImage(imageCanvas, imageElm, image.offsetX, image.offsetY);
}

function copy()
{
    const imageCtx = imageCanvas.getContext('2d');
    try
    {
        selectedImageArea.data = imageCtx.getImageData(
            selectedImageArea.sx / image.zoom,
            selectedImageArea.sy / image.zoom,
            (selectedImageArea.ex - selectedImageArea.sx) / image.zoom,
            (selectedImageArea.ey - selectedImageArea.sy) / image.zoom
        );
    } catch (error)
    {
        alert('Select a zone first');
        return;
    }

    floatingCanvas.classList.remove('none');
    floatingCanvas.classList.add('floating-canvas');
    floatingCanvas.width = selectedImageArea.ex - selectedImageArea.sx;
    floatingCanvas.height = selectedImageArea.ey - selectedImageArea.sy;
    const ctx = floatingCanvas.getContext('2d');
    ctx.putImageData(selectedImageArea.data, 0, 0);
}

function setOffsetX(event)
{
    image.offsetX = +event.target.value;
    if (image.isLoaded)
    {
        moveImage()
    }
}

function setOffsetY(event)
{
    image.offsetY = +event.target.value;
    if (image.isLoaded)
    {
        moveImage()
    }
}

function resetOffset()
{
    image.offsetX = 0;
    image.offsetY = 0;
    offsetXInput.value = 0;
    offsetYInput.value = 0;
}

function onImageCanvasMouseDown(event)
{
    if (image.isLoaded === false || event.button !== 0) return;

    if (selectedImageArea.isComplete)
    {
        resetSelection(event);
    }

    selectedImageArea.sx = roundMultipleTilesize((event.offsetX - image.offsetX) / image.zoom) * image.zoom;
    selectedImageArea.sy = roundMultipleTilesize((event.offsetY - image.offsetY) / image.zoom) * image.zoom;
    selectedImageArea.isDirty = true;

    placeRedZone(selectedImageArea.sx, selectedImageArea.sy);
}

function onImageCanvasMouseUp(event)
{
    if (
        selectedImageArea.isDirty === false ||
        image.isLoaded === false ||
        selectedImageArea.isComplete === true ||
        event.button !== 0
    ) return;

    // selectedImageArea.ex = roundMultipleTilesize(event.offsetX);
    // selectedImageArea.ey = roundMultipleTilesize(event.offsetY);

    let width = roundMultipleTilesize((event.offsetX - selectedImageArea.sx) / image.zoom);
    let height = roundMultipleTilesize((event.offsetY - selectedImageArea.sy) / image.zoom);

    while (isMultipleOfTilesize(width) === false)
    {
        width = Math.floor(width + 1);
    }
    while (isMultipleOfTilesize(height) === false)
    {
        height = Math.floor(height + 1);
    }

    selectedImageArea.ex = selectedImageArea.sx + width * image.zoom;
    selectedImageArea.ey = selectedImageArea.sy + height * image.zoom;

    // selectedImageArea.ex = roundMultipleTilesize(event.offsetX);
    // selectedImageArea.ey = roundMultipleTilesize(event.offsetY);

    if (selectedImageArea.ex === selectedImageArea.sx)
    {
        selectedImageArea.ex += settings.tilesize;
    }

    if (selectedImageArea.ey === selectedImageArea.sy)
    {
        selectedImageArea.ey += settings.tilesize;
    }

    selectedImageArea.isComplete = true;
    setRedZoneSize(selectedImageArea);
    copy();
}

function onMouseMove(event)
{
    // zone selection
    if (event.target.id === 'imageCanvas' && !selectedImageArea.isComplete && selectedImageArea.isDirty)
    {
        selectedImageArea.ex = roundMultipleTilesize(event.offsetX);
        selectedImageArea.ey = roundMultipleTilesize(event.offsetY);
        setRedZoneSize(selectedImageArea)
    }
}

// Tileset canvas
function openTileset(event)
{
    const tilesetFiles = event.target.files;
    const tilesetFilesLength = tilesetFiles.length;
    if (tilesetFilesLength > 0)
    {
        tileset.name = tilesetFiles[0].name;
        const tilesetSrc = URL.createObjectURL(tilesetFiles[0]);
        tilesetElm.src = tilesetSrc;
        tilesetElm.addEventListener("load", (e) =>
        {
            tileset.width = tilesetElm.naturalWidth;
            tileset.height = tilesetElm.naturalHeight;
            tilesetCanvas.classList.remove('none');
            drawImage(tilesetCanvas, tilesetElm);
            tileset.isLoaded = true;
            saveTilesetBtn.disabled = false;
            if (image.isLoaded && selectedImageArea.isComplete)
            {
                copy();
            }
        }, { once: true });
    }
}

function createNewTileset(event)
{
    const name = document.getElementById('tileset-name').value || 'tileset';
    tileset.name = name + '.png';
    tileset.width = +document.getElementById('tileset-width').value || 512;
    tileset.height = +document.getElementById('tileset-height').value || 512;
    tilesetCanvas.width = tileset.width;
    tilesetCanvas.height = tileset.height;
    const ctx = tilesetCanvas.getContext('2d');
    ctx.fillStyle = 'rgba(0, 0, 0, 0)';
    ctx.fillRect(0, 0, tileset.width, tileset.height);
    tilesetElm.src = tilesetCanvas.toDataURL();
    tilesetCanvas.classList.remove('none');
    tileset.isLoaded = true;
    saveTilesetBtn.disabled = false;
    if (image.isLoaded && selectedImageArea.isComplete)
    {
        copy();
    }
    closeModal(event);
}

function downloadTilesetAsImage()
{
    const newTileset = tilesetCanvas.toDataURL('image/png');
    const xhr = new XMLHttpRequest();
    xhr.responseType = 'blob';
    xhr.onload = function ()
    {
        let a = document.createElement('a');
        a.href = window.URL.createObjectURL(xhr.response);
        a.download = tileset.name;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        a.remove();
    };
    xhr.open('GET', newTileset);
    xhr.send();
}

function paste(event)
{
    const x = roundMultipleTilesize(event.offsetX / tileset.zoom) - roundMultipleTilesize(selectedImageArea.data.width / 2);
    const y = roundMultipleTilesize(event.offsetY / tileset.zoom) - roundMultipleTilesize(selectedImageArea.data.height / 2);

    const width = (selectedImageArea.ex - selectedImageArea.sx) / image.zoom;
    const height = (selectedImageArea.ey - selectedImageArea.sy) / image.zoom;

    if (selectedImageArea.data)
    {
        const ctx = tilesetCanvas.getContext("2d");
        const previousData = ctx.getImageData(x, y, width, height);
        const undo = new Task(previousData, x, y, width, height);
        tileset.undos.push(undo);
        const floatingCtx = floatingCanvas.getContext('2d');
        const floatingData = floatingCtx.getImageData(0, 0, selectedImageArea.data.width, selectedImageArea.data.height);
        ctx.putImageData(floatingData, x, y);
        undoBtn.disabled = false;
    }
}

function undo()
{
    const lastTask = tileset.undos.at(-1);
    if (!lastTask) return;
    const ctx = tilesetCanvas.getContext("2d");
    const redoData = ctx.getImageData(lastTask.x, lastTask.y, lastTask.width, lastTask.height);
    const redo = new Task(redoData, lastTask.x, lastTask.y, lastTask.width, lastTask.height);
    tileset.redos.push(redo);
    ctx.clearRect(lastTask.x, lastTask.y, lastTask.width, lastTask.height);
    ctx.putImageData(lastTask.data, lastTask.x, lastTask.y);
    tileset.undos.pop();
    redoBtn.disabled = false;
    if (tileset.undos.length === 0)
    {
        undoBtn.disabled = true;
    }
}

function redo()
{
    const lastTask = tileset.redos.at(-1);
    if (!lastTask) return;
    const ctx = tilesetCanvas.getContext("2d");
    const undoData = ctx.getImageData(lastTask.x, lastTask.y, lastTask.width, lastTask.height);
    const undo = new Task(undoData, lastTask.x, lastTask.y, lastTask.width, lastTask.height);
    tileset.undos.push(undo);
    ctx.clearRect(lastTask.x, lastTask.y, lastTask.width, lastTask.height);
    ctx.putImageData(lastTask.data, lastTask.x, lastTask.y);
    tileset.redos.pop();
    undoBtn.disabled = false;
    if (tileset.redos.length === 0)
    {
        redoBtn.disabled = true;
    }
}

// Floating canvas
function moveFloatingCanvas(event)
{
    if (selectedImageArea.data === undefined) return;

    if (floatingCanvas.style.width !== floatingCanvas.width * tileset.zoom + 'px')
    {
        floatingCanvas.style.width = floatingCanvas.width * tileset.zoom + 'px';
        floatingCanvas.style.height = floatingCanvas.height * tileset.zoom + 'px';
    }

    const x = (roundMultipleTilesize(event.offsetX / tileset.zoom) - roundMultipleTilesize(selectedImageArea.data.width / 2)) * tileset.zoom;
    const y = (roundMultipleTilesize(event.offsetY / tileset.zoom) - roundMultipleTilesize(selectedImageArea.data.height / 2)) * tileset.zoom;
    const marginX = document.body.clientWidth / 2 - rightPanel.scrollLeft;
    const marginY = navbarHeight - rightPanel.scrollTop;
    floatingCanvas.style.left = marginX + x + 'px';
    floatingCanvas.style.top = marginY + y + 'px';
}

function flipX()
{
    const ctx = floatingCanvas.getContext('2d');

    const inMemoryCanvas = document.createElement('canvas');
    const inMemoryCtx = inMemoryCanvas.getContext('2d');
    inMemoryCtx.drawImage(floatingCanvas, 0, 0);

    ctx.clearRect(0, 0, selectedImageArea.data.width, selectedImageArea.data.height);
    ctx.translate(selectedImageArea.data.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(inMemoryCanvas, 0, 0);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
}

function flipY()
{
    const ctx = floatingCanvas.getContext('2d');

    const inMemoryCanvas = document.createElement('canvas');
    const inMemoryCtx = inMemoryCanvas.getContext('2d');
    inMemoryCtx.drawImage(floatingCanvas, 0, 0);

    ctx.clearRect(0, 0, selectedImageArea.data.width, selectedImageArea.data.height);
    ctx.translate(0, selectedImageArea.data.height);
    ctx.scale(1, -1);
    ctx.drawImage(inMemoryCanvas, 0, 0);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
}

function resetFloatingCanvas(event)
{
    event.stopPropagation();
    event.preventDefault();
    if (event.button === 2)
    {
        const ctx = floatingCanvas.getContext('2d');
        ctx.clearRect(0, 0, floatingCanvas.width, floatingCanvas.height);
        selectedImageArea.data = undefined;
        floatingCanvas.style.left = '0px';
        floatingCanvas.style.top = '0px';
        floatingCanvas.width = '0px'
        floatingCanvas.height = '0px';
    }
}

// Red zone
function placeRedZone(x_pos, y_pos)
{
    if (selectedImageArea.isComplete) return;
    redZone.style.width = '0px';
    redZone.style.height = '0px';
    redZone.style.left = x_pos + 'px';
    redZone.style.top = y_pos + 'px';
}

function setRedZoneSize(zone)
{
    const x = roundMultipleTilesize(zone.ex - zone.sx);
    const y = roundMultipleTilesize(zone.ey - zone.sy);

    if (redZone.style.width !== x + 'px')
    {
        redZone.style.width = x + 'px';
    }

    if (redZone.style.height !== y + 'px')
    {
        redZone.style.height = y + 'px';
    }

    selectedAreaLabelElm.innerHTML = `Width: ${x / settings.tilesize} Height: ${y / settings.tilesize}`
}

function resetRedZone()
{
    redZone.style.width = '0px';
    redZone.style.height = '0px';
    redZone.style.left = '0px';
    redZone.style.top = '0px';
}

// Zoom
function onMouseWheel(event)
{
    if (event.ctrlKey) event.preventDefault();

    // zoom image
    if (event.ctrlKey && event.target.id === 'imageCanvas' && image.isLoaded)
    {
        if (selectedImageArea.isComplete) resetSelection(event);

        let scrollX, scrollY;
        if (event.wheelDelta > 0)
        {
            if (image.zoom === 64) return;
            image.zoom = clamp(image.zoom * 2, 0, 64);
            scrollX = (event.offsetX - event.clientX / 2) * 2;
            scrollY = (event.offsetY - (event.clientY - navbarHeight) / 2) * 2;

        }
        else if (event.wheelDelta < 0)
        {
            if (image.zoom < 0.02) return;
            image.zoom /= 2;
            scrollX = (event.offsetX - event.clientX * 2) / 2;
            scrollY = (event.offsetY - (event.clientY - navbarHeight) * 2) / 2;
        }

        imageCanvas.style.width = image.width * image.zoom + 'px';
        imageCanvas.style.height = image.height * image.zoom + 'px';
        leftPanel.scroll(scrollX, scrollY);

        imageZoomLabel.innerText = `Zoom: ${image.zoom}`;

        if (image.zoom >= 1)
        {
            imageCanvas.style.backgroundImage = `url("/map2tileset/assets/grid-${image.zoom * settings.tilesize / 8}.png")`;
        }
    }

    // zoom tileset
    if (event.ctrlKey && event.target.id === 'tilesetCanvas' && tileset.isLoaded)
    {
        let scrollX, scrollY;
        if (event.wheelDelta > 0)
        {
            if (tileset.zoom === 64) return;
            tileset.zoom = clamp(tileset.zoom * 2, 0, 64);;
            scrollX = (event.offsetX - (event.clientX - rightPanel.offsetLeft) / 2) * 2;
            scrollY = (event.offsetY - (event.clientY - rightPanel.offsetTop) / 2) * 2;
        }
        else if (event.wheelDelta < 0)
        {
            if (tileset.zoom < 0.02) return;
            tileset.zoom /= 2;
            scrollX = (event.offsetX - (event.clientX - rightPanel.offsetLeft) * 2) / 2;
            scrollY = (event.offsetY - (event.clientY - rightPanel.offsetTop) * 2) / 2;
        }

        tilesetCanvas.style.width = tileset.width * tileset.zoom + 'px';
        tilesetCanvas.style.height = tileset.height * tileset.zoom + 'px';
        rightPanel.scroll(scrollX, scrollY);

        tilesetZoomLabel.innerText = `Zoom: ${tileset.zoom}`;

        if (tileset.zoom >= 1)
        {
            tilesetCanvas.style.backgroundImage = `url("/map2tileset/assets/grid-${tileset.zoom * settings.tilesize / 8}.png")`;
        }
    }
}

// Key press
function handleKeyPress(event)
{
    if (event.ctrlKey && event.key === 'z' && undoBtn.disabled === false)
    {
        event.preventDefault();
        undo();
        return;
    }

    if (event.ctrlKey && event.key === 'y' && redoBtn.disabled === false)
    {
        event.preventDefault();
        redo();
        return;
    }

    if (event.ctrlKey && event.key === 's' && tileset.isLoaded)
    {
        event.preventDefault();
        downloadTilesetAsImage();
        return;
    }

    if (event.ctrlKey === false && event.key === 'x' && selectedImageArea.data !== undefined)
    {
        flipX();
        return;
    }

    if (event.ctrlKey === false && event.key === 'y' && selectedImageArea.data !== undefined)
    {
        flipY();
        return;
    }

    if (event.ctrlKey && event.key === 'a' && image.isLoaded)
    {
        event.preventDefault();
        selectedImageArea.sx = 0;
        selectedImageArea.sy = navbarHeight;
        selectedImageArea.isDirty = true;
        placeRedZone(selectedImageArea.sx, selectedImageArea.sy);
        selectedImageArea.ex = image.width;
        selectedImageArea.ey = image.height;
        selectedImageArea.isComplete = true;
        redZone.style.width = image.width + 'px';
        redZone.style.height = image.height + 'px';
        copy();
    }
}

// Utils
function resetZone()
{
    selectedImageArea.sx = 0;
    selectedImageArea.sy = 0;
    selectedImageArea.ex = 0;
    selectedImageArea.ey = 0;
    selectedImageArea.isDirty = false;
}

function drawImage(canvas, img, x = 0, y = 0)
{
    const ctx = canvas.getContext("2d");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    ctx.drawImage(img, x, y);
}

function roundMultipleTilesize(num)
{
    const size = settings.tilesize;
    return Math.round(num / size) * size;
}

function isMultipleOfTilesize(nbr)
{
    if (nbr === 0) return false;
    return nbr % settings.tilesize === 0;
}

function clamp(number, min, max)
{
    return Math.max(min, Math.min(number, max));
}

function resetSelection(event)
{
    event.stopPropagation();
    event.preventDefault();
    resetZone();
    resetRedZone();
    selectedImageArea.isComplete = false;
    selectedAreaLabelElm.innerHTML = 'Width: 0 Height: 0';
}

function debounce(func, time)
{
    let timer = null;
    return (event) =>
    {
        clearTimeout(timer);
        timer = setTimeout(() => func(event), time);
    };
}

class Task
{
    constructor(data, x, y, width, height)
    {
        this.data = data;
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }
}

})();