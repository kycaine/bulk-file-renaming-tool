const { app, BrowserWindow, Menu, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

process.on('uncaughtException', (error) => {
    console.error('🛑 Uncaught Exception in Main Process:', error);
});

let mainWindow;

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      sandbox: false
    }
  });

  mainWindow.loadFile('index.html');
  mainWindow.maximize();

  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.control && input.shift && input.key.toLowerCase() === 'i') {
      mainWindow.webContents.toggleDevTools();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
};

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});


ipcMain.handle('dialog:openFiles', async (event) => {
    const result = await dialog.showOpenDialog(mainWindow, { 
        properties: ['openFile', 'multiSelections'] 
    });
    
    if (mainWindow && !mainWindow.isDestroyed()) { 
        mainWindow.focus(); 
    } 
    
    return result.filePaths;
});

ipcMain.handle('dialog:openDirectory', async (event) => {
    const result = await dialog.showOpenDialog(mainWindow, { 
        properties: ['openDirectory'] 
    });
    
    if (mainWindow && !mainWindow.isDestroyed()) { 
        mainWindow.focus(); 
    }
    
    return result.filePaths;
});


ipcMain.handle('file:getFileStats', async (event, filePath) => {
  try {
    const stats = fs.statSync(filePath);
    return {
      size: stats.size,
      modified: stats.mtimeMs,
      isFile: stats.isFile(),
      isDirectory: stats.isDirectory()
    };
  } catch (error) {
    return null;
  }
});

ipcMain.handle('file:readDirectory', async (event, dirPath) => {
  try {
    const files = fs.readdirSync(dirPath, { withFileTypes: true });
    return files.map(file => ({
      name: file.name,
      path: path.join(dirPath, file.name),
      isDirectory: file.isDirectory()
    }));
  } catch (error) {
    return [];
  }
});

ipcMain.handle('file:renameFile', async (event, oldPath, newPath) => {
  try {
    fs.renameSync(oldPath, newPath);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('file:renameFiles', async (event, renames) => {
  const results = [];
  for (const { oldPath, newPath } of renames) {
    try {
      fs.renameSync(oldPath, newPath);
      results.push({ oldPath, newPath, success: true });
    } catch (error) {
      results.push({ oldPath, newPath, success: false, error: error.message });
    }
  }
  return results;
});

ipcMain.handle('file:copyFilesToFolder', async (event, copies, sourceFolderPath) => {
  try {
    const outputFolderName = `renamed_files_${new Date().toISOString().split('T')[0]}`;
    const outputPath = path.join(sourceFolderPath, outputFolderName);
    
    if (!fs.existsSync(outputPath)) {
      fs.mkdirSync(outputPath, { recursive: true });
    }

    const results = [];
    for (const { oldPath, newName } of copies) {
      try {
        const newPath = path.join(outputPath, newName);
        fs.copyFileSync(oldPath, newPath);
        results.push({ oldPath, newPath, success: true });
      } catch (error) {
        results.push({ oldPath, newPath: '', success: false, error: error.message });
      }
    }
    
    return { success: true, outputFolder: outputPath, results };
  } catch (error) {
    return { success: false, error: error.message, results: [] };
  }
});

ipcMain.handle('file:getNewPath', async (event, oldPath, newName) => {
    const dir = path.dirname(oldPath);
    return path.join(dir, newName);
});

