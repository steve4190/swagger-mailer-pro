const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // File operations
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),
  showMessageBox: (options) => ipcRenderer.invoke('show-message-box', options),
  
  // Menu actions
  onMenuAction: (callback) => ipcRenderer.on('menu-action', callback),
  removeMenuActionListener: () => ipcRenderer.removeAllListeners('menu-action'),
  
  // Platform info
  platform: process.platform,
  
  // App info
  getVersion: () => require('../package.json').version,
  
  // Notification support
  showNotification: (title, body) => ipcRenderer.invoke('show-notification', title, body),
  
  // Node.js APIs for desktop functionality
  path: require('path'),
  os: require('os')
});

// Security: Remove Node.js globals from renderer process
delete window.require;
delete window.exports;
delete window.module;