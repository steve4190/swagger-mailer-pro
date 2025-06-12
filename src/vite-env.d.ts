/// <reference types="vite/client" />

interface Window {
  electronAPI?: {
    showSaveDialog: (options: any) => Promise<any>;
    showOpenDialog: (options: any) => Promise<any>;
    showMessageBox: (options: any) => Promise<any>;
    onMenuAction: (callback: (event: any, action: string) => void) => void;
    removeMenuActionListener: () => void;
    platform: string;
    getVersion: () => string;
    showNotification: (title: string, body: string) => void;
  };
}