export interface ISelectedImageArea {
    sx: number;
    sy: number;
    ex: number;
    ey: number;
    isDirty: boolean;
    isComplete: boolean;
    data?: ImageData;
}