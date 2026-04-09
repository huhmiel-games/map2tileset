export class Settings
{
    public tilesize: number;

    constructor()
    {
        const saved = localStorage.getItem('tilesize');
        this.tilesize = Number(saved) || 8;
    }

    public save(size: number): void
    {
        this.tilesize = size;
        localStorage.setItem('tilesize', size.toString());
    }
}
