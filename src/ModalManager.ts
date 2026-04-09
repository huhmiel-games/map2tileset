/**
 * Handle the modals:
 * Settings Modal
 * New Tileset Modal
 * About Modal
 * 
 * Check index.html to get the ids
 */
export class ModalManager
{

    private settingsTilesizeInput: HTMLInputElement | null;
    private newTilesetNameInput: HTMLInputElement | null;
    private newTilesetWidthInput: HTMLInputElement | null;
    private newTilesetHeightInput: HTMLInputElement | null;
    private visibleModal: HTMLDialogElement | undefined;

    constructor(private onSettingsSave: (tilesize: number) => void,
        private onNewTilesetCreate: (name: string, width: number, height: number) => void,
        private getInitialTilesize: () => number)
    {
        this.settingsTilesizeInput = document.getElementById('tilesize') as HTMLInputElement;
        this.newTilesetNameInput = document.getElementById('tileset-name') as HTMLInputElement;
        this.newTilesetWidthInput = document.getElementById('tileset-width') as HTMLInputElement;
        this.newTilesetHeightInput = document.getElementById('tileset-height') as HTMLInputElement;
        this.bindEvents();
    }

    private bindEvents(): void
    {
        document.getElementById('settings-btn')?.addEventListener('click', (e) => this.openModal(e, 'settings-modal', this.getInitialTilesize()));
        document.getElementById('about-btn')?.addEventListener('click', (e) => this.openModal(e, 'about-modal'));
        document.getElementById('new-tileset-btn')?.addEventListener('click', (e) => this.openModal(e, 'new-tileset-modal'));

        document.getElementById('confirm-settings-btn')?.addEventListener('click', (e) => this.confirmSettings(e));
        document.getElementById('confirm-tileset-btn')?.addEventListener('click', (e) => this.confirmNewTileset(e));

        document.querySelectorAll('[id^="close-"]').forEach(elm =>
            elm.addEventListener('click', (e) => this.closeModal(e, elm.getAttribute('data-target')!))
        );
    }

    public openModal(event: Event, modalId: string, initialTilesize?: number): void
    {
        event.preventDefault();
        const modal = document.getElementById(modalId) as HTMLDialogElement;

        if (modal)
        {
            if (modalId === 'settings-modal' && this.settingsTilesizeInput && initialTilesize)
            {
                this.settingsTilesizeInput.value = initialTilesize.toString();
            }
            modal.open = true;
            this.visibleModal = modal;
        }
    }

    public closeModal(event: Event, modalId: string): void
    {
        event.preventDefault();
        // Reset the input value to the current setting if closing the settings modal
        if (modalId === 'settings-modal' && this.settingsTilesizeInput)
        {
            this.settingsTilesizeInput.value = this.getInitialTilesize().toString();
        }

        if (!this.visibleModal) return;

        this.visibleModal.open = false;
        this.visibleModal = undefined;
    }

    private confirmSettings(event: Event): void
    {
        event.preventDefault();
        if (this.settingsTilesizeInput)
        {
            this.onSettingsSave(+this.settingsTilesizeInput.value);
        }
        this.closeModal(event, 'settings-modal');
    }

    private confirmNewTileset(event: Event): void
    {
        event.preventDefault();
        const name = this.newTilesetNameInput?.value || 'tileset';
        const width = +(this.newTilesetWidthInput?.value || 512);
        const height = +(this.newTilesetHeightInput?.value || 512);
        this.onNewTilesetCreate(name, width, height);
        this.closeModal(event, 'new-tileset-modal');
    }
}