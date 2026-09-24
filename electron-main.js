const { app, BrowserWindow } = require('electron');
const path = require('path');
const { fork } = require('child_process');

let mainWindow = null;
let serverProcess = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    title: "AppG - Control de Importaciones y Stock",
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // Carga la app desde el servidor local
  mainWindow.loadURL('http://localhost:4000');

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  // Levanta el backend Node en segundo plano sin mostrar consola
  const serverPath = path.join(__dirname, 'server', 'server.js');
  
  serverProcess = fork(serverPath, [], {
    silent: true
  });

  // Espera 2 segundos a que Node y SQLite inicien antes de abrir la ventana
  setTimeout(createWindow, 2000);
});

// Cierra el proceso de Node cuando el usuario cierre la ventana
app.on('window-all-closed', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});