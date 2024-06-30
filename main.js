const {
    app,
    BrowserWindow,
    desktopCapturer,
    ipcMain,
    globalShortcut,
} = require('electron');
const path = require('path');
const fs = require('fs');

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

    if (settings.alwaysOnTop) {
        mainWindow.setAlwaysOnTop(true);
    }
}

const settingsFilePath = path.join(__dirname, 'settings.json');
const defaultSettings = {
    apiKey: '',
    apiHost: 'https://api.openai.com/v1',
    model: 'gpt-4o',
    temperature: 0.7,
    topP: 1,
    presencePenalty: 0,
    frequencyPenalty: 0,
    minimizeOnClose: true,
    alwaysOnTop: true,
    startOnBoot: false
};

let settings;

function loadSettings() {
    try {
        settings = JSON.parse(fs.readFileSync(settingsFilePath, 'utf8'));
    } catch (error) {
        console.error('Error loading settings:', error);
        settings = {
            ...defaultSettings
        };
    }
}

app.whenReady().then(() => {
    loadSettings();
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

    ipcMain.on('apply-settings', (event, newSettings) => {
        settings = newSettings;
        if (settings.alwaysOnTop) {
            mainWindow.setAlwaysOnTop(true);
        } else {
            mainWindow.setAlwaysOnTop(false);
        }
    });

    // Register global shortcut
    globalShortcut.register('Control+Shift+A', () => {
        mainWindow.show();
    });

    // Handle minimize on close
    mainWindow.on('close', (event) => {
        if (settings.minimizeOnClose) {
            event.preventDefault();
            mainWindow.minimize();
        }
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