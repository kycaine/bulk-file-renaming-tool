const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
    openFiles: () => ipcRenderer.invoke('dialog:openFiles'),
    openDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),
    
    getFileStats: (filePath) => ipcRenderer.invoke('file:getFileStats', filePath),
    readDirectory: (dirPath) => ipcRenderer.invoke('file:readDirectory', dirPath), 
    renameFiles: (renames) => ipcRenderer.invoke('file:renameFiles', renames),

});