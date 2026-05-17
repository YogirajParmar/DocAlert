import { app, BrowserWindow, ipcMain } from 'electron';
import { autoUpdater } from 'electron-updater';
import * as path from 'path';
import Server from '../backend/serever';
import { logger } from '../backend/helpers';
import { LicenseService, licenseStatusChannel } from './license-service';

export class Main {
  private mainWindow: BrowserWindow;
  private server: Server;
  private mainApp = app;
  private updater = autoUpdater;
  private licenseService = new LicenseService();

  private indexPage: string;
  private isUpdateInProgress = false;

  constructor() {
    this.indexPage = path.join(__dirname, '../index.html');
    this.server = new Server();
    this.checkForUpdates();
    this.licenseService.setStatusListener(() => this.sendLicenseStatus());
    this.init();
  }

  public init() {
    // start the application
    this.mainApp.whenReady().then(async () => {
      await this.server.init();
      await this.licenseService.initialize();
      this.registerIpcEvents();
      this.createWindow();
    });
  }

  private createWindow() {
    this.mainWindow = new BrowserWindow({
      fullscreen: false,
      minimizable: true,
      maximizable: true,
      closable: true,
      icon: this.resolveIconPath(),
      center: true,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
      },
    });

    if (process.env.NODE_ENV === 'development') {
      console.log('Launhing app in development');
      this.mainWindow.loadURL('http://localhost:5173');
    } else {
      console.log('Launhing app in production');
      const indexPath = path.join(__dirname, '../renderer/index.html');
      console.log('Loading production index.html from:', indexPath);
      this.mainWindow.loadFile(indexPath);
    }

    this.mainWindow.webContents.on('did-finish-load', () => {
      this.sendLicenseStatus();
    });
  }

  private async checkForUpdates() {
    try {
      this.updater.on('checking-for-update', () => {
        logger.log('info', 'checking for updates...');
        this.sendUpdateStatus('checking', null);
      });

      this.updater.on('update-available', async (info: any) => {
        logger.log('info', `Update available! ${info.version}`);
        this.isUpdateInProgress = true;
        this.sendUpdateStatus('available', { version: info.version });
        
        // Automatically start downloading the update
        logger.log('info', 'Starting download...');
        this.sendUpdateStatus('downloading', { version: info.version, progress: 0 });
        this.updater.downloadUpdate();
      });

      this.updater.on('update-not-available', (info: any) => {
        logger.log('info', `No update available. Current version: ${info.version}`);
        this.isUpdateInProgress = false;
        this.sendUpdateStatus('not-available', { version: info.version });
      });

      this.updater.on('download-progress', (progress) => {
        logger.log('info', `Download in progress: ${Math.round(progress.percent)}%`);
        this.sendUpdateStatus('downloading', {
          percent: Math.round(progress.percent),
          bytesPerSecond: progress.bytesPerSecond,
          transferred: progress.transferred,
          total: progress.total,
        });
      });

      this.updater.on('update-downloaded', (info: any) => {
        logger.log('info', 'Update downloaded, ready to install');
        this.isUpdateInProgress = true;
        this.sendUpdateStatus('ready-to-install', { version: info.version });
        
        // Wait a moment to show the message, then quit and install
        setTimeout(() => {
          logger.log('info', 'Quitting and installing update...');
          this.updater.quitAndInstall();
        }, 2000);
      });

      this.updater.on('error', (error) => {
        logger.log('error', `Failed to download the updates ${error}`);
        this.isUpdateInProgress = false;
        this.sendUpdateStatus('error', { error: error.message || 'Update failed' });
      });

      this.updater.checkForUpdates();
    } catch (error) {
      logger.log(
        'error',
        `An error occured while checking the updates: ${error}`
      );
      this.isUpdateInProgress = false;
      this.sendUpdateStatus('error', { error: error.message || 'Update check failed' });
    }
  }

  private sendUpdateStatus(status: string, data: any) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('update-status', { status, data });
    }
  }

  private sendLicenseStatus() {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(licenseStatusChannel, this.licenseService.getStatus());
    }
  }

  private registerIpcEvents() {
    ipcMain.on('ping', (event, arg) => {
      logger.log('info', `Received ping: ${arg}`);
      event.reply('pong', 'Hello from main');
    });

    ipcMain.handle('get-app-version', async () => {
      return app.getVersion();
    });

    ipcMain.handle('is-update-in-progress', () => {
      return this.isUpdateInProgress;
    });

    ipcMain.handle('license:get-status', async () => {
      return this.licenseService.getStatus();
    });

    ipcMain.handle('license:activate-file', async () => {
      return this.licenseService.activateFromFile();
    });

    ipcMain.handle('license:activate-manual', async (_event, licenseKey: string) => {
      return this.licenseService.activateFromManualKey(licenseKey);
    });

    ipcMain.handle('license:retry-validation', async () => {
      return this.licenseService.retryValidation();
    });

    ipcMain.handle('license:export-machine-request', async () => {
      return this.licenseService.exportMachineRequestFile();
    });

    ipcMain.handle('license:open-purchase-page', async () => {
      return this.licenseService.openPurchasePage();
    });

    ipcMain.handle('license:contact-support', async () => {
      return this.licenseService.contactSupport();
    });

    ipcMain.on('login-failed', (event) => {
      logger.log('info', `login-failed.. ${this.indexPage}`);
      this.mainWindow.loadFile(this.indexPage);
    });

    ipcMain.on('sign-up-failed', () => {
      logger.log('info', 'Sign up failed');
      this.mainWindow.loadFile(path.join(__dirname, 'pages/signup.html'));
    });

    ipcMain.on('login-success', () => {
      logger.log('info', 'Login successful');
      this.mainWindow.loadFile(path.join(__dirname, 'pages/index.html'));
    });

    ipcMain.on('minimize-window', () => {
      this.mainWindow.minimize();
    });

    ipcMain.on('maximize-window', () => {
      if (this.mainWindow.isMaximized()) {
        this.mainWindow.unmaximize();
      } else {
        this.mainWindow.maximize();
      }
    });

    ipcMain.on('close-window', () => {
      this.mainWindow.close();
    });
  }

  private resolveIconPath() {
    return this.mainApp.isPackaged
      ? path.join(
          process.resourcesPath,
          'dist',
          'renderer',
          'icon',
          'android-chrome-192x192.png'
        )
      : path.join(process.cwd(), 'public', 'android-chrome-192x192.png');
  }
}

new Main();
