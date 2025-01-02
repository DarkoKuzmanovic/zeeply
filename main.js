const { app, BrowserWindow, Menu, ipcMain, dialog } = require("electron");
const path = require("path");
const Store = require("electron-store");
const fs = require("fs").promises;

const store = new Store({
  defaults: {
    recentFiles: [],
  },
});

function addRecentFile(filePath) {
  const recentFiles = store.get("recentFiles");
  const updatedFiles = [filePath, ...recentFiles.filter((f) => f !== filePath)].slice(0, 5);
  store.set("recentFiles", updatedFiles);
  createMenu(BrowserWindow.getFocusedWindow());
}

function createMenu(win) {
  const recentFiles = store.get("recentFiles");
  const recentFilesMenu = recentFiles.map((file) => ({
    label: path.basename(file),
    click: () => {
      win.webContents.send("menu-open-recent", file);
    },
  }));

  const template = [
    {
      label: "File",
      submenu: [
        {
          label: "Open",
          accelerator: "CmdOrCtrl+O",
          click: async () => {
            win.webContents.send("menu-open-file");
          },
        },
        {
          label: "Export as PNG",
          accelerator: "CmdOrCtrl+E",
          click: () => {
            win.webContents.send("menu-export");
          },
        },
        {
          label: "Open Recent",
          submenu: recentFiles.length
            ? [
                ...recentFilesMenu,
                { type: "separator" },
                {
                  label: "Clear Recently Opened",
                  click: () => {
                    store.set("recentFiles", []);
                    createMenu(win);
                  },
                },
              ]
            : [
                {
                  label: "No Recent Files",
                  enabled: false,
                },
              ],
        },
        { type: "separator" },
        { role: "quit" },
      ],
    },
    {
      label: "Edit",
      submenu: [
        {
          label: "Rotate",
          accelerator: "CmdOrCtrl+R",
          click: () => {
            win.webContents.send("menu-rotate");
          },
        },
        {
          label: "Zoom In",
          accelerator: "CommandOrControl+=",
          click: () => {
            win.webContents.send("menu-zoom-in");
          },
        },
        {
          label: "Zoom Out",
          accelerator: "CommandOrControl+-",
          click: () => {
            win.webContents.send("menu-zoom-out");
          },
        },
      ],
    },
    {
      label: "View",
      submenu: [
        {
          label: "Theme",
          submenu: [
            {
              label: "System",
              type: "radio",
              checked: store.get("theme", "system") === "system",
              click: () => {
                store.set("theme", "system");
                win.webContents.send("menu-theme-change", "system");
              },
            },
            {
              label: "Light",
              type: "radio",
              checked: store.get("theme", "system") === "light",
              click: () => {
                store.set("theme", "light");
                win.webContents.send("menu-theme-change", "light");
              },
            },
            {
              label: "Dark",
              type: "radio",
              checked: store.get("theme", "system") === "dark",
              click: () => {
                store.set("theme", "dark");
                win.webContents.send("menu-theme-change", "dark");
              },
            },
          ],
        },
        { type: "separator" },
      ],
    },
    {
      label: "Help",
      submenu: [
        {
          label: "About",
          click: () => {
            win.webContents.send("menu-about");
          },
        },
        { type: "separator" },
        {
          label: "Developer Tools",
          accelerator: "F12",
          click: () => {
            win.webContents.toggleDevTools();
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "src/preload.js"),
    },
  });

  win.loadFile("src/index.html");
  createMenu(win);
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// Near the top where other IPC handlers are defined
ipcMain.on("add-recent-file", (event, filePath) => {
  addRecentFile(filePath);
});

// File menu handlers
ipcMain.handle("dialog:openFile", handleFileOpen);

async function handleFileOpen() {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ["openFile"],
    filters: [{ name: "ZPL Files", extensions: ["zpl"] }],
  });
  if (!canceled) {
    return filePaths[0];
  }
}

// Add near the other IPC handlers
ipcMain.handle("dialog:saveFile", async () => {
  const { canceled, filePath } = await dialog.showSaveDialog({
    filters: [{ name: "PNG Image", extensions: ["png"] }],
    defaultPath: "label.png",
  });
  if (!canceled) {
    return filePath;
  }
});

// Add near other IPC handlers
ipcMain.handle("fs:writeFile", async (event, filePath, base64Data) => {
  const buffer = Buffer.from(base64Data, "base64");
  await fs.writeFile(filePath, buffer);
});
