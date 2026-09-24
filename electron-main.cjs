const { app, BrowserWindow } = require('electron');
const path = require('path');
const http = require('http');

// BLINDAJE: Evita que cualquier error interno cierre la aplicación (adiós "DevTools disconnected")
process.on('uncaughtException', (err) => {
  console.error('Error capturado para evitar cierre:', err);
});

let mainWindow = null;

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

  mainWindow.webContents.openDevTools();

  // Bucle seguro: Espera a que Express esté listo antes de mostrar la interfaz
  const checkServerAndLoad = () => {
    http.get('http://localhost:4000/health', (res) => {
      if (res.statusCode === 200) {
        mainWindow.loadURL('http://localhost:4000');
      } else {
        setTimeout(checkServerAndLoad, 1000);
      }
    }).on('error', () => {
      setTimeout(checkServerAndLoad, 1000);
    });
  };

  checkServerAndLoad();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

async function startServer() {
  try {
    const serverPath = path.join(app.getAppPath(), 'server', 'server.js');
    const fileUrl = 'file:///' + serverPath.replace(/\\/g, '/');
    await import(fileUrl);
  } catch (err) {
    console.error('Fallo al iniciar el servidor Express:', err);
  }
}

app.whenReady().then(async () => {
  await startServer();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});