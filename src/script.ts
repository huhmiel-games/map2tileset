import { App } from './App';

export const fs = nw.require('fs');
const win = nw.Window.get();
win.setMinimumSize(600, 320);

new App();
