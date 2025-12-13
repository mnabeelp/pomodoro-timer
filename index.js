const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, screen, Notification } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
let tray = null;
const settingsFile = path.join(app.getPath('userData'), 'settings.json');

// Load settings from file
function loadSettings() {
    try {
        if (fs.existsSync(settingsFile)) {
            return JSON.parse(fs.readFileSync(settingsFile, 'utf8'));
        }
    } catch (error) {
        console.error('Error loading settings:', error);
    }
    return {
        workDuration: 25 * 60,
        breakDuration: 5 * 60,
        theme: 'default',
        alwaysOnTop: true,
        notificationsEnabled: true
    };
}

// Save settings to file
function saveSettings(settings) {
    try {
        fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 2));
    } catch (error) {
        console.error('Error saving settings:', error);
    }
}

function createWindow() {
    const settings = loadSettings();

    mainWindow = new BrowserWindow({
        width: 400,
        height: 450,
        frame: false,
        transparent: false,
        alwaysOnTop: settings.alwaysOnTop,
        resizable: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    mainWindow.loadFile('index.html');

    // Enable dev tools in development
    if (process.env.NODE_ENV === 'development') {
        mainWindow.webContents.openDevTools({ mode: 'detach' });
    }

    // Position window in top-right corner
    const { width } = screen.getPrimaryDisplay().workAreaSize;
    mainWindow.setPosition(width - 400, 0);
}

function createTray() {
    let icon;
    const iconPath = path.join(__dirname, 'assets', 'icon.png');

    if (fs.existsSync(iconPath)) {
        icon = nativeImage.createFromPath(iconPath);
    } else {
        // Create a simple red circle icon programmatically
        const size = 16;
        const channels = 4; // RGBA
        const buffer = Buffer.alloc(size * size * channels);

        const centerX = size / 2;
        const centerY = size / 2;
        const radius = size / 2 - 1;

        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const index = (y * size + x) * channels;
                const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);

                if (distance <= radius) {
                    // Red circle
                    buffer[index] = 255;     // R
                    buffer[index + 1] = 107; // G
                    buffer[index + 2] = 107; // B
                    buffer[index + 3] = 255; // A
                } else {
                    // Transparent
                    buffer[index] = 0;
                    buffer[index + 1] = 0;
                    buffer[index + 2] = 0;
                    buffer[index + 3] = 0;
                }
            }
        }

        icon = nativeImage.createFromBuffer(buffer, {
            width: size,
            height: size
        });
    }

    tray = new Tray(icon);

    const contextMenu = Menu.buildFromTemplate([
        { label: 'Show Timer', click: () => mainWindow.show() },
        { label: 'Hide Timer', click: () => mainWindow.hide() },
        { type: 'separator' },
        { label: 'Quit', click: () => app.quit() }
    ]);

    tray.setToolTip('Pomodoro Timer');
    tray.setContextMenu(contextMenu);

    tray.on('click', () => {
        mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
    });
}

app.whenReady().then(() => {
    createWindow();
    createTray();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

// IPC handlers
ipcMain.handle('get-timer-duration', () => {
    const settings = loadSettings();
    return { work: settings.workDuration, break: settings.breakDuration };
});

ipcMain.handle('set-timer-duration', (event, durations) => {
    const settings = loadSettings();
    settings.workDuration = durations.work;
    settings.breakDuration = durations.break;
    saveSettings(settings);
    return { success: true };
});

ipcMain.handle('get-theme', () => {
    const settings = loadSettings();
    return { name: settings.theme };
});

ipcMain.handle('set-theme', (event, theme) => {
    const settings = loadSettings();
    settings.theme = theme.name;
    saveSettings(settings);
    return { success: true };
});

ipcMain.handle('get-settings', () => {
    return loadSettings();
});

ipcMain.handle('set-settings', (event, newSettings) => {
    saveSettings(newSettings);
    return { success: true };
});

ipcMain.on('minimize-window', () => {
    if (mainWindow) mainWindow.minimize();
});

ipcMain.on('close-window', () => {
    if (mainWindow) mainWindow.close();
});

ipcMain.on('set-window-position', (event, x, y) => {
    if (mainWindow) mainWindow.setPosition(x, y);
});

ipcMain.on('start-timer', (event, duration) => {
    // Forward to renderer if needed
    if (mainWindow) mainWindow.webContents.send('timer-start', duration);
});

ipcMain.on('pause-timer', () => {
    if (mainWindow) mainWindow.webContents.send('timer-pause');
});

ipcMain.on('reset-timer', () => {
    if (mainWindow) mainWindow.webContents.send('timer-reset');
});

ipcMain.on('show-notification', (event, title, body) => {
    if (Notification.isSupported()) {
        const notification = new Notification({
            title: title,
            body: body,
            silent: false
        });
        notification.show();
    }
});

ipcMain.on('set-always-on-top', (event, alwaysOnTop) => {
    if (mainWindow) mainWindow.setAlwaysOnTop(alwaysOnTop);
});