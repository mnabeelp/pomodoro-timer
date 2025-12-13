const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getTimerDuration: () => ipcRenderer.invoke('get-timer-duration'),
  setTimerDuration: (durations) => ipcRenderer.invoke('set-timer-duration', durations),
  getTheme: () => ipcRenderer.invoke('get-theme'),
  setTheme: (theme) => ipcRenderer.invoke('set-theme', theme),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  setSettings: (settings) => ipcRenderer.invoke('set-settings', settings),

  // Window controls
  minimizeWindow: () => ipcRenderer.send('minimize-window'),
  closeWindow: () => ipcRenderer.send('close-window'),
  setAlwaysOnTop: (alwaysOnTop) => ipcRenderer.send('set-always-on-top', alwaysOnTop),

  // Timer control
  startTimer: (duration) => ipcRenderer.send('start-timer', duration),
  pauseTimer: () => ipcRenderer.send('pause-timer'),
  resetTimer: () => ipcRenderer.send('reset-timer'),

  // Position control
  setWindowPosition: (x, y) => ipcRenderer.send('set-window-position', x, y),

  // Notifications
  showNotification: (title, body) => ipcRenderer.send('show-notification', title, body)
});