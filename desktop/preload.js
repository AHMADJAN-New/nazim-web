const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  retryLoad: () => ipcRenderer.invoke('retry-load'),
});
