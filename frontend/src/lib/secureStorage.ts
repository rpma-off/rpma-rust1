/**
 * Secure Storage Service
 * 
 * Provides encrypted storage for sensitive data like authentication tokens
 * using AES-GCM encryption with a device-specific key
 */

import { ipcClient } from '@/lib/ipc';

interface EncryptedData {
  data: string;
  iv: string;
  salt: string;
  algorithm: string;
}

export class SecureStorage {
  private static readonly STORAGE_PREFIX = 'secure_';
  private static readonly ALGORITHM = 'AES-GCM';
  private static readonly KEY_LENGTH = 256;
  private static readonly IV_LENGTH = 12;
  private static readonly SALT_LENGTH = 32;
  private static deviceFingerprint: string | null = null;

  /**
   * Store data securely with encryption
   */
  static async setItem(key: string, value: string): Promise<void> {
    try {
      const encrypted = await this.encrypt(value);
      localStorage.setItem(this.STORAGE_PREFIX + key, JSON.stringify(encrypted));
    } catch (error) {
      console.error('Failed to store secure data:', error);
      throw new Error('Failed to store data securely');
    }
  }

  /**
   * Retrieve and decrypt data
   */
  static async getItem(key: string): Promise<string | null> {
    try {
      const stored = localStorage.getItem(this.STORAGE_PREFIX + key);
      if (!stored) {
        return null;
      }

      // Validate JSON structure before parsing
      let encrypted: EncryptedData;
      try {
        encrypted = JSON.parse(stored);
      } catch {
        console.warn('Invalid JSON format for encrypted data, removing corrupted entry');
        this.removeItem(key);
        return null;
      }

      // Validate required fields
      if (!encrypted.data || !encrypted.iv || !encrypted.salt || !encrypted.algorithm) {
        console.warn('Invalid encrypted data structure, removing corrupted entry');
        this.removeItem(key);
        return null;
      }

      return await this.decrypt(encrypted);
    } catch (error) {
      console.error('Failed to retrieve secure data:', error);
      // Remove corrupted data
      this.removeItem(key);
      return null;
    }
  }

  /**
   * Remove stored data
   */
  static removeItem(key: string): void {
    localStorage.removeItem(this.STORAGE_PREFIX + key);
  }

  /**
   * Check if key exists
   */
  static hasItem(key: string): boolean {
    return localStorage.getItem(this.STORAGE_PREFIX + key) !== null;
  }

  /**
   * Clear all secure storage
   */
  static clear(): void {
    const keys = Object.keys(localStorage).filter(key => 
      key.startsWith(this.STORAGE_PREFIX)
    );
    keys.forEach(key => localStorage.removeItem(key));
  }

  /**
   * Encrypt data using Web Crypto API
   */
  private static async encrypt(data: string): Promise<EncryptedData> {
    // Generate salt for key derivation
    const salt = crypto.getRandomValues(new Uint8Array(this.SALT_LENGTH));
    
    // Generate device-specific key
    const key = await this.deriveKey(salt);
    
    // Generate random IV
    const iv = crypto.getRandomValues(new Uint8Array(this.IV_LENGTH));
    
    // Encrypt data
    const encoder = new TextEncoder();
    const encodedData = encoder.encode(data);
    
    const encryptedData = await crypto.subtle.encrypt(
      {
        name: this.ALGORITHM,
        iv: iv,
      },
      key,
      encodedData
    );

    return {
      data: this.arrayBufferToBase64(encryptedData),
      iv: this.arrayBufferToBase64(iv.buffer),
      salt: this.arrayBufferToBase64(salt.buffer),
      algorithm: this.ALGORITHM,
    };
  }

  /**
   * Decrypt data using Web Crypto API
   */
  private static async decrypt(encrypted: EncryptedData): Promise<string> {
    try {
      // Convert base64 strings back to Uint8Arrays with validation
      let salt: Uint8Array, iv: Uint8Array, data: Uint8Array;
      
      try {
        salt = this.base64ToUint8Array(encrypted.salt);
        iv = this.base64ToUint8Array(encrypted.iv);
        data = this.base64ToUint8Array(encrypted.data);
      } catch {
        throw new Error('Invalid base64 encoding in encrypted data');
      }

      // Validate buffer sizes
      if (salt.length !== this.SALT_LENGTH) {
        throw new Error(`Invalid salt length: expected ${this.SALT_LENGTH}, got ${salt.length}`);
      }
      if (iv.length !== this.IV_LENGTH) {
        throw new Error(`Invalid IV length: expected ${this.IV_LENGTH}, got ${iv.length}`);
      }
      if (data.length === 0) {
        throw new Error('Empty encrypted data');
      }
      
      // Derive the same key
      const key = await this.deriveKey(salt);
      
      // Decrypt data - ensure we have the right buffer type
      const buffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
      const decryptedData = await crypto.subtle.decrypt(
        {
          name: this.ALGORITHM,
          iv: iv as BufferSource,
        },
        key,
        buffer
      );

      const decoder = new TextDecoder();
      const result = decoder.decode(decryptedData);
      
      // Validate decrypted result is not empty
      if (!result) {
        throw new Error('Decrypted data is empty');
      }
      
      return result;
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Derive encryption key from device fingerprint and salt
   */
  private static async deriveKey(salt: Uint8Array): Promise<CryptoKey> {
    // Create device fingerprint
    const fingerprint = await this.getDeviceFingerprint();
    
    // Import fingerprint as key material
    const encoder = new TextEncoder();
    const keyData = encoder.encode(fingerprint);
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      keyData,
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );

    // Convert salt to ArrayBuffer safely
    const saltBuffer = new ArrayBuffer(salt.length);
    const saltView = new Uint8Array(saltBuffer);
    saltView.set(salt);

    // Derive encryption key
    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: saltBuffer,
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      {
        name: this.ALGORITHM,
        length: this.KEY_LENGTH,
      },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Generate device fingerprint for key derivation
   */
  private static async getDeviceFingerprint(): Promise<string> {
    // Return cached fingerprint if available
    if (this.deviceFingerprint) {
      return this.deviceFingerprint;
    }

    try {
      // Generate device fingerprint using available browser/navigator info
      const components = [
        navigator.userAgent,
        navigator.language,
        screen.width.toString(),
        screen.height.toString(),
        // Add timezone info
        Intl.DateTimeFormat().resolvedOptions().timeZone,
        // Add platform info
        navigator.platform || 'unknown',
      ];

      // Create hash of components
      const encoder = new TextEncoder();
      const data = encoder.encode(components.join('|'));

      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));

      this.deviceFingerprint = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      return this.deviceFingerprint;
    } catch (error) {
      console.warn('Failed to get device info, using fallback fingerprint:', error);

      // Fallback fingerprint using browser APIs only
      const fallbackComponents = [
        navigator.userAgent,
        navigator.language,
        screen.width.toString(),
        screen.height.toString(),
        new Date().getTimezoneOffset().toString(),
      ];

      const encoder = new TextEncoder();
      const data = encoder.encode(fallbackComponents.join('|'));

      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));

      this.deviceFingerprint = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      return this.deviceFingerprint;
    }
  }

  /**
   * Convert ArrayBuffer to Base64 string
   */
  private static arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Convert Base64 string to Uint8Array
   */
  private static base64ToUint8Array(base64: string): Uint8Array {
    try {
      // Validate base64 string format
      if (!base64 || typeof base64 !== 'string') {
        throw new Error('Invalid base64 input');
      }
      
      // Remove any whitespace and validate base64 pattern
      const cleanBase64 = base64.trim();
      if (!/^[A-Za-z0-9+/]*={0,2}$/.test(cleanBase64)) {
        throw new Error('Invalid base64 format');
      }
      
      const binary = atob(cleanBase64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return bytes;
    } catch (error) {
      throw new Error(`Base64 conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if secure storage is available
   */
  static isAvailable(): boolean {
    return (
      typeof crypto !== 'undefined' &&
      typeof crypto.subtle !== 'undefined' &&
      typeof localStorage !== 'undefined'
    );
  }

  /**
   * Migrate existing plain text data to secure storage
   */
  static async migrateFromPlainStorage(key: string, plainKey: string): Promise<void> {
    try {
      const plainData = localStorage.getItem(plainKey);
      if (plainData) {
        await this.setItem(key, plainData);
        localStorage.removeItem(plainKey);
      }
    } catch (error) {
      console.error('Failed to migrate data to secure storage:', error);
      throw new Error('Migration failed');
    }
  }
}

/**
 * Authentication-specific secure storage helpers
 */
export class AuthSecureStorage {
  private static readonly TOKEN_KEY = 'auth_token';
  private static readonly USER_KEY = 'auth_user';
  private static readonly REFRESH_TOKEN_KEY = 'refresh_token';

  /**
   * Store authentication session securely
   */
  static async storeSession(token: string, user: Record<string, unknown>, refreshToken?: string): Promise<void> {
    await Promise.all([
      SecureStorage.setItem(this.TOKEN_KEY, token),
      SecureStorage.setItem(this.USER_KEY, JSON.stringify(user)),
      refreshToken ? SecureStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken) : null,
    ].filter(Boolean) as Promise<void>[]);
  }

  /**
   * Retrieve authentication session
   */
  static async getSession(): Promise<{
    token: string | null;
    user: Record<string, unknown> | null;
    refreshToken: string | null;
  }> {
    const [token, userStr, refreshToken] = await Promise.all([
      SecureStorage.getItem(this.TOKEN_KEY),
      SecureStorage.getItem(this.USER_KEY),
      SecureStorage.getItem(this.REFRESH_TOKEN_KEY),
    ]);

    let user = null;
    if (userStr) {
      try {
        user = JSON.parse(userStr);
      } catch (error) {
        console.error('Failed to parse user data:', error);
        await this.clearSession();
      }
    }

    return { token, user, refreshToken };
  }

  /**
   * Clear authentication session
   */
  static async clearSession(): Promise<void> {
    SecureStorage.removeItem(this.TOKEN_KEY);
    SecureStorage.removeItem(this.USER_KEY);
    SecureStorage.removeItem(this.REFRESH_TOKEN_KEY);
  }

  /**
   * Check if session exists
   */
  static async hasSession(): Promise<boolean> {
    return SecureStorage.hasItem(this.TOKEN_KEY) && SecureStorage.hasItem(this.USER_KEY);
  }

  /**
   * Migrate from plain localStorage to secure storage
   */
  static async migrateFromPlainStorage(): Promise<void> {
    try {
      await Promise.all([
        SecureStorage.migrateFromPlainStorage(this.TOKEN_KEY, 'auth_token'),
        SecureStorage.migrateFromPlainStorage(this.USER_KEY, 'auth_user'),
        SecureStorage.migrateFromPlainStorage(this.REFRESH_TOKEN_KEY, 'refresh_token'),
      ]);
    } catch (error) {
      console.error('Failed to migrate auth data to secure storage:', error);
    }
  }
}