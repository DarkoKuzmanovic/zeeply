const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  addRecentFile: (filePath) => ipcRenderer.send("add-recent-file", filePath),
  onMenuOpenFile: (callback) => ipcRenderer.on("menu-open-file", callback),
  onMenuOpenRecent: (callback) => ipcRenderer.on("menu-open-recent", callback),
  onMenuRotate: (callback) => ipcRenderer.on("menu-rotate", callback),
  onMenuZoomIn: (callback) => ipcRenderer.on("menu-zoom-in", callback),
  onMenuZoomOut: (callback) => ipcRenderer.on("menu-zoom-out", callback),
  onMenuAbout: (callback) => ipcRenderer.on("menu-about", callback),
  openFile: () => ipcRenderer.invoke("dialog:openFile"),
  saveFile: () => ipcRenderer.invoke("dialog:saveFile"),
  onMenuExport: (callback) => ipcRenderer.on("menu-export", callback),
  writeFile: (filePath, data) => ipcRenderer.invoke("fs:writeFile", filePath, data),
  onThemeChange: (callback) => ipcRenderer.on("menu-theme-change", callback),
});
