import { app, BrowserWindow, screen } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import isDev from 'electron-is-dev';

// Воссоздаем __dirname для окружения ES-модулей
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * ОПТИМИЗАЦИЯ РЕНДЕРИНГА И ШРИФТОВ
 * Флаги Chrome добавляются ДО события ready
 */
// Включаем поддержку High DPI
app.commandLine.appendSwitch('high-dpi-support', '1');
// Улучшаем отрисовку шрифтов (субпиксельное сглаживание)
app.commandLine.appendSwitch('enable-font-antialiasing');
app.commandLine.appendSwitch('font-render-hinting', 'medium');
// Оптимизация аппаратного ускорения для 2D графики и Canvas
app.commandLine.appendSwitch('enable-accelerated-2d-canvas');
app.commandLine.appendSwitch('enable-gpu-rasterization');
// Предотвращение размытия при масштабировании на некоторых GPU
app.commandLine.appendSwitch('force-device-scale-factor', '1'); 

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  const mainWindow = new BrowserWindow({
    width: Math.min(1440, width),
    height: Math.min(900, height),
    backgroundColor: '#111827', // Соответствует bg-gray-900
    show: false, // Не показываем до готовности (предотвращает белый миг)
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      // Помогает при тяжелых вычислениях в Canvas
      backgroundThrottling: false,
      preload: path.join(__dirname, 'preload.js'), // Если планируется использование
    },
  });

  // Убираем стандартное меню
  mainWindow.setMenuBarVisibility(false);

  const startUrl = isDev 
    ? 'http://localhost:5173' 
    : `file://${path.join(__dirname, 'dist/index.html')}`;

  mainWindow.loadURL(startUrl);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
  });

  mainWindow.on('closed', () => {
    app.quit();
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
