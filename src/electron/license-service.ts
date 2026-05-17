import { app, dialog } from 'electron';
import { createHash, createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { shell } from 'electron';

const LICENSE_SERVER_URL = 'https://license-server.docalert.workers.dev';
const PURCHASE_URL = 'https://docalert.workers.dev';
const SUPPORT_EMAIL = 'yogirajparmar44@gmail.com';
const REVALIDATION_INTERVAL_MS = 24 * 60 * 60 * 1000;
const STATUS_CHANNEL = 'license-status-changed';
const FILE_SECRET = 'docalert-license-bundle-v1';

type LicenseStatusState = 'checking' | 'locked' | 'unlocked';
type LicenseFailureReason = 'missing-license' | 'invalid-license' | 'device-mismatch' | 'expired' | 'cannot-connect' | 'unknown';

type StoredActivationState = {
  licenseKey: string;
  email?: string;
  expiresAt?: string;
  lastValidatedAt?: string;
  activatedAt?: string;
};

type LicenseStatus = {
  state: LicenseStatusState;
  reason?: LicenseFailureReason;
  message?: string;
  activation?: {
    email?: string;
    expiresAt?: string;
    lastValidatedAt?: string;
  };
};

type EncryptedFileEnvelope = {
  version: 1;
  type: 'docalert-license' | 'docalert-machine-request' | 'docalert-activation-state';
  payload: string;
};

type LicenseFilePayload = {
  license_key: string;
  email?: string;
  expires_at?: string;
  device_fingerprint?: string;
  issued_at?: string;
};

type MachineRequestPayload = {
  device_fingerprint: string;
  generated_at: string;
  app: 'DocAlert';
};

type LicenseValidationSuccess = {
  success: true;
  expiresAt?: string;
};

type LicenseValidationFailure = {
  success: false;
  reason: LicenseFailureReason;
  message: string;
};

export class LicenseService {
  private status: LicenseStatus = { state: 'checking' };

  private activationState: StoredActivationState | null = null;

  private revalidationTimer: NodeJS.Timeout | null = null;

  private readonly activationPath = path.join(app.getPath('userData'), 'license-state.json');

  private readonly stagedLicensePath = path.join(app.getPath('userData'), 'docalert.license');

  // Device-bound activation is temporarily disabled.
  // private readonly deviceFingerprint = this.computeDeviceFingerprint();

  private onStatusChange: ((status: LicenseStatus) => void) | null = null;

  public setStatusListener(listener: (status: LicenseStatus) => void): void {
    this.onStatusChange = listener;
  }

  public async initialize(): Promise<void> {
    await this.loadStoredActivation();
    await this.importStagedLicenseIfNeeded();
    await this.refreshStatus(true);
    this.startPeriodicRevalidation();
  }

  public getStatus(): LicenseStatus {
    return {
      ...this.status,
      activation: this.activationState
        ? {
            email: this.activationState.email,
            expiresAt: this.activationState.expiresAt,
            lastValidatedAt: this.activationState.lastValidatedAt,
          }
        : undefined,
    };
  }

  public async activateFromFile(): Promise<LicenseStatus> {
    const file = await dialog.showOpenDialog({
      title: 'Select your DocAlert license file',
      properties: ['openFile'],
      filters: [
        { name: 'DocAlert License', extensions: ['license'] },
        { name: 'JSON', extensions: ['json'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });

    if (file.canceled || !file.filePaths[0]) {
      return this.getStatus();
    }

    const rawContent = await fs.readFile(file.filePaths[0], 'utf8');
    return this.activateWithLicenseSource(rawContent);
  }

  public async activateFromManualKey(licenseKey: string): Promise<LicenseStatus> {
    return this.activateWithLicenseSource(licenseKey);
  }

  public async retryValidation(): Promise<LicenseStatus> {
    return this.refreshStatus(true);
  }

  public async exportMachineRequestFile(): Promise<{ success: boolean; path?: string }> {
    // Device-bound activation is temporarily disabled.
    /*
    const defaultPath = path.join(app.getPath('downloads'), 'docalert-machine-request.license');
    const saveResult = await dialog.showSaveDialog({
      title: 'Save your DocAlert machine request file',
      defaultPath,
      filters: [{ name: 'DocAlert Machine Request', extensions: ['license'] }],
    });

    if (saveResult.canceled || !saveResult.filePath) {
      return { success: false };
    }

    const content = this.buildEncryptedEnvelope('docalert-machine-request', {
      app: 'DocAlert',
      device_fingerprint: this.deviceFingerprint,
      generated_at: new Date().toISOString(),
    });

    await fs.writeFile(saveResult.filePath, content, 'utf8');

    return { success: true, path: saveResult.filePath };
    */
    return { success: false };
  }

  public async openPurchasePage(): Promise<void> {
    await shell.openExternal(PURCHASE_URL);
  }

  public async contactSupport(): Promise<void> {
    await shell.openExternal(`mailto:${SUPPORT_EMAIL}`);
  }

  private async activateWithLicenseSource(rawSource: string): Promise<LicenseStatus> {
    const parsedLicense = this.parseLicenseKey(rawSource);
    const validation = await this.validateRemote(parsedLicense.license_key);

    if (validation.success === true) {
      this.activationState = {
        licenseKey: parsedLicense.license_key,
        email: parsedLicense.email,
        expiresAt: validation.expiresAt ?? parsedLicense.expires_at,
        activatedAt: this.activationState?.activatedAt ?? new Date().toISOString(),
        lastValidatedAt: new Date().toISOString(),
      };

      await this.persistActivation();

      this.setStatus({
        state: 'unlocked',
        activation: {
          email: this.activationState.email,
          expiresAt: this.activationState.expiresAt,
          lastValidatedAt: this.activationState.lastValidatedAt,
        },
      });

      return this.getStatus();
    }

    const failedValidation = validation as LicenseValidationFailure;

    if (failedValidation.reason !== 'cannot-connect') {
      await this.clearStoredActivation();
    }

    this.setStatus({
      state: 'locked',
      reason: failedValidation.reason,
      message: failedValidation.message,
    });

    return this.getStatus();
  }

  private async refreshStatus(forceValidation: boolean): Promise<LicenseStatus> {
    if (!this.activationState?.licenseKey) {
      this.setStatus({
        state: 'locked',
        reason: 'missing-license',
        message: 'Upload your DocAlert license file to unlock the app.',
      });
      return this.getStatus();
    }

    const shouldValidate =
      forceValidation ||
      !this.activationState.lastValidatedAt ||
      Date.now() - new Date(this.activationState.lastValidatedAt).getTime() >= REVALIDATION_INTERVAL_MS;

    if (!shouldValidate) {
      this.setStatus({
        state: 'unlocked',
        activation: {
          email: this.activationState.email,
          expiresAt: this.activationState.expiresAt,
          lastValidatedAt: this.activationState.lastValidatedAt,
        },
      });
      return this.getStatus();
    }

    this.setStatus({
      state: 'checking',
      activation: {
        email: this.activationState.email,
        expiresAt: this.activationState.expiresAt,
        lastValidatedAt: this.activationState.lastValidatedAt,
      },
    });

    const validation = await this.validateRemote(this.activationState.licenseKey);
    if (validation.success === true) {
      this.activationState = {
        ...this.activationState,
        expiresAt: validation.expiresAt ?? this.activationState.expiresAt,
        lastValidatedAt: new Date().toISOString(),
      };

      await this.persistActivation();

      this.setStatus({
        state: 'unlocked',
        activation: {
          email: this.activationState.email,
          expiresAt: this.activationState.expiresAt,
          lastValidatedAt: this.activationState.lastValidatedAt,
        },
      });

      return this.getStatus();
    }

    const failedValidation = validation as LicenseValidationFailure;

    if (failedValidation.reason !== 'cannot-connect') {
      await this.clearStoredActivation();
    }

    this.setStatus({
      state: 'locked',
      reason: failedValidation.reason,
      message: failedValidation.message,
    });

    return this.getStatus();
  }

  private async validateRemote(licenseKey: string): Promise<LicenseValidationSuccess | LicenseValidationFailure> {
    try {
      const response = await fetch(`${LICENSE_SERVER_URL}/license/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          license_key: licenseKey,
          // Device-bound activation is temporarily disabled.
          // device_id: this.deviceFingerprint,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (response.ok && payload?.success) {
        return {
          success: true,
          expiresAt: payload.expires_at,
        };
      }

      const errorText = String(payload?.error || 'License validation failed');
      if (response.status === 404) {
        return { success: false, reason: 'invalid-license', message: errorText };
      }
      if (response.status === 403 && /expired/i.test(errorText)) {
        return { success: false, reason: 'expired', message: errorText };
      }
      if (response.status === 403 && /another device/i.test(errorText)) {
        return { success: false, reason: 'device-mismatch', message: errorText };
      }

      return { success: false, reason: 'unknown', message: errorText };
    } catch (_error) {
      return {
        success: false,
        reason: 'cannot-connect',
        message: 'Cannot connect to the license server. Please check your connection and try again.',
      };
    }
  }

  /*
  private computeDeviceFingerprint(): string {
    const interfaces = os.networkInterfaces();
    const macAddresses = Object.values(interfaces)
      .reduce((all, entries) => all.concat(entries || []), [] as os.NetworkInterfaceInfo[])
      .filter((entry) => !entry.internal && entry.mac && entry.mac !== '00:00:00:00:00:00')
      .map((entry) => entry.mac)
      .sort()
      .join('|');

    const seed = [
      os.hostname(),
      os.platform(),
      os.arch(),
      os.userInfo().username,
      macAddresses,
    ].join('|');

    return createHash('sha256').update(seed).digest('hex');
  }
  */

  private async loadStoredActivation(): Promise<void> {
    try {
      const raw = await fs.readFile(this.activationPath, 'utf8');
      const envelope = JSON.parse(raw) as EncryptedFileEnvelope;
      const state = this.decryptEnvelope<StoredActivationState>(envelope, 'docalert-activation-state');
      this.activationState = state;
    } catch (_error) {
      this.activationState = null;
    }
  }

  private async importStagedLicenseIfNeeded(): Promise<void> {
    if (this.activationState?.licenseKey) {
      return;
    }

    try {
      const raw = await fs.readFile(this.stagedLicensePath, 'utf8');
      const result = await this.activateWithLicenseSource(raw);

      if (result.state === 'unlocked') {
        await fs.unlink(this.stagedLicensePath).catch(() => undefined);
      }
    } catch (_error) {
      // Ignore missing or unreadable staged license files.
    }
  }

  private async persistActivation(): Promise<void> {
    if (!this.activationState) {
      return;
    }

    const encrypted = this.buildEncryptedEnvelope('docalert-activation-state', this.activationState);
    await fs.mkdir(path.dirname(this.activationPath), { recursive: true });
    await fs.writeFile(this.activationPath, encrypted, 'utf8');
  }

  private async clearStoredActivation(): Promise<void> {
    this.activationState = null;

    try {
      await fs.unlink(this.activationPath);
    } catch (_error) {
      // Ignore missing files.
    }
  }

  private buildEncryptedEnvelope(type: EncryptedFileEnvelope['type'], payload: object): string {
    const iv = randomBytes(12);
    const key = createHash('sha256').update(FILE_SECRET).digest();
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const plaintext = Buffer.from(JSON.stringify(payload), 'utf8');
    const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const tag = cipher.getAuthTag();

    return JSON.stringify({
      version: 1,
      type,
      payload: Buffer.concat([iv, tag, encrypted]).toString('base64'),
    });
  }

  private decryptEnvelope<T>(envelope: EncryptedFileEnvelope, expectedType: EncryptedFileEnvelope['type']): T {
    if (envelope.type !== expectedType) {
      throw new Error('Unexpected file type');
    }

    const buffer = Buffer.from(envelope.payload, 'base64');
    const iv = buffer.subarray(0, 12);
    const tag = buffer.subarray(12, 28);
    const ciphertext = buffer.subarray(28);
    const key = createHash('sha256').update(FILE_SECRET).digest();
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');

    return JSON.parse(plaintext) as T;
  }

  private parseLicenseKey(rawSource: string): LicenseFilePayload {
    const trimmed = rawSource.trim();
    if (!trimmed) {
      throw new Error('License data is empty');
    }

    if (trimmed.startsWith('{')) {
      const envelope = JSON.parse(trimmed) as EncryptedFileEnvelope;
      return this.decryptEnvelope<LicenseFilePayload>(envelope, 'docalert-license');
    }

    return {
      license_key: trimmed,
    };
  }

  private setStatus(nextStatus: LicenseStatus): void {
    this.status = {
      ...nextStatus,
      activation: nextStatus.activation,
    };
    this.onStatusChange?.(this.getStatus());
  }

  private startPeriodicRevalidation(): void {
    if (this.revalidationTimer) {
      clearInterval(this.revalidationTimer);
    }

    this.revalidationTimer = setInterval(() => {
      this.refreshStatus(false).catch(() => {
        this.setStatus({
          state: 'locked',
          reason: 'cannot-connect',
          message: 'Cannot connect to the license server. Please check your connection and try again.',
        });
      });
    }, 60 * 60 * 1000);
  }

}

export const licenseStatusChannel = STATUS_CHANNEL;
