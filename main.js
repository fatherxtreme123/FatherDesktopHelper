const { app, BrowserWindow, desktopCapturer, ipcMain } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 450,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true
        },
        icon: path.join(__dirname, 'FatherDesktopHelper.ico'), 
        autoHideMenuBar: true, 
    });

    mainWindow.loadFile('index.html');

    mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
        if (permission === 'media') {
            callback(true);
        } else {
            callback(false);
        }
    });
}

app.whenReady().then(() => {
    createWindow();

    ipcMain.handle('DESKTOP_CAPTURER_GET_SOURCES', async (event, opts) => {
        const sources = await desktopCapturer.getSources(opts);
        return sources;
    });

    ipcMain.handle('HIDE_WINDOW', () => {
        mainWindow.hide();
    });

    ipcMain.handle('SHOW_WINDOW', () => {
        mainWindow.show();
    });

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});