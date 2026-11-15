import { AppState } from '../types';

/**
 * Security & Cryptography Utilities (Option 1 + Option 3):
 * 1. SHA-256 Salted PIN Hashing (so PINs can be verified cryptographically without exposing raw PINs)
 * 2. AES-256-GCM + PBKDF2 End-to-End Encryption Vault for user financial records
 * 3. WebAuthn Biometric Passkey (Fingerprint / FaceID) registration & verification per user account
 */

const BIOMETRIC_STORAGE_PREFIX = 'hamhesab_biometric_cred_v1_';

function bufferToBase64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Computes a salted SHA-256 hex digest of (userId + pin)
 */
export async function computeSaltedPinHash(userId: string, pin: string): Promise<string> {
  if (typeof window === 'undefined' || !window.crypto?.subtle) {
    return '';
  }
  const encoder = new TextEncoder();
  const data = encoder.encode(`hamhesab_pin_v1:${userId}:${pin.trim()}`);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Derives an AES-256-GCM CryptoKey from the user's PIN and userId using PBKDF2 (50,000 iterations)
 */
async function deriveAesGcmKey(userId: string, pin: string, saltBytes: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(`hamhesab_aes_v1:${userId}:${pin.trim()}`),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBytes as BufferSource,
      iterations: 50000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export interface EncryptedUserVault {
  alg: 'AES-256-GCM-PBKDF2';
  iv: string; // base64
  salt: string; // base64
  ciphertext: string; // base64
  encryptedAt: number;
}

/**
 * Encrypts the sensitive financial slices of AppState using AES-256-GCM + PBKDF2
 */
export async function encryptUserVault(
  state: AppState,
  userId: string,
  pin: string
): Promise<EncryptedUserVault | null> {
  if (typeof window === 'undefined' || !window.crypto?.subtle || !pin) {
    return null;
  }
  try {
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveAesGcmKey(userId, pin, salt);

    const payload = JSON.stringify({
      transactions: state.transactions || [],
      cards: state.cards || [],
      reminders: state.reminders || [],
      categories: state.categories || [],
      tags: state.tags || [],
      budgets: state.budgets || [],
      initialCashBalance: state.settings?.initialCashBalance || 0,
    });

    const encoded = new TextEncoder().encode(payload);
    const cipherBuf = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv as BufferSource },
      key,
      encoded
    );

    return {
      alg: 'AES-256-GCM-PBKDF2',
      iv: bufferToBase64(iv),
      salt: bufferToBase64(salt),
      ciphertext: bufferToBase64(cipherBuf),
      encryptedAt: Date.now(),
    };
  } catch {
    return null;
  }
}

/**
 * Decrypts an EncryptedUserVault using the user's PIN
 */
export async function decryptUserVault(
  vault: EncryptedUserVault,
  userId: string,
  pin: string
): Promise<Partial<AppState> & { initialCashBalance?: number } | null> {
  if (
    typeof window === 'undefined' ||
    !window.crypto?.subtle ||
    !vault?.ciphertext ||
    !vault?.iv ||
    !vault?.salt ||
    !pin
  ) {
    return null;
  }
  try {
    const salt = base64ToUint8Array(vault.salt);
    const iv = base64ToUint8Array(vault.iv);
    const ciphertext = base64ToUint8Array(vault.ciphertext);
    const key = await deriveAesGcmKey(userId, pin, salt);

    const plainBuf = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv as BufferSource },
      key,
      ciphertext as BufferSource
    );
    const jsonStr = new TextDecoder().decode(plainBuf);
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

// ============================================================================
// OPTION 3: WebAuthn Biometric Passkey (Fingerprint / FaceID) Support
// ============================================================================

export interface BiometricCredentialRecord {
  userId: string;
  userName: string;
  credentialIdBase64: string;
  registeredAt: number;
}

export function isBiometricWebAuthnSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.PublicKeyCredential !== 'undefined' &&
    typeof navigator?.credentials?.create === 'function' &&
    typeof navigator?.credentials?.get === 'function'
  );
}

export function getBiometricCredentialForUser(
  userId: string,
  remoteCredIdBase64?: string
): string | null {
  try {
    const localRaw = localStorage.getItem(`${BIOMETRIC_STORAGE_PREFIX}${userId}`);
    if (localRaw) {
      const parsed: BiometricCredentialRecord = JSON.parse(localRaw);
      if (parsed?.credentialIdBase64) return parsed.credentialIdBase64;
    }
  } catch {
    // ignore
  }
  return remoteCredIdBase64 || null;
}

export function removeBiometricCredentialForUser(userId: string): void {
  try {
    localStorage.removeItem(`${BIOMETRIC_STORAGE_PREFIX}${userId}`);
  } catch {
    // ignore
  }
}

export function isNativeAndroidBiometricBridgeAvailable(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.AndroidSmsBridge?.authenticateBiometric === 'function'
  );
}

export function invokeNativeAndroidBiometric(
  reason: string
): Promise<{ ok: boolean; error?: string }> {
  return new Promise((resolve) => {
    if (!isNativeAndroidBiometricBridgeAvailable()) {
      resolve({ ok: false, error: 'پل سخت‌افزاری بیومتریک اندروید در دسترس نیست.' });
      return;
    }

    let settled = false;
    const timeoutId = window.setTimeout(() => {
      if (!settled) {
        settled = true;
        window.onNativeBiometricResult = undefined;
        resolve({ ok: false, error: 'مهلت زمانی سنسور اثر انگشت به پایان رسید.' });
      }
    }, 60000);

    window.onNativeBiometricResult = (success: boolean, errorMsg: string) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      window.onNativeBiometricResult = undefined;
      if (success) {
        resolve({ ok: true });
      } else {
        resolve({
          ok: false,
          error: errorMsg || 'تأیید اثر انگشت لغو شد.',
        });
      }
    };

    try {
      window.AndroidSmsBridge!.authenticateBiometric!(reason);
    } catch {
      if (!settled) {
        settled = true;
        window.clearTimeout(timeoutId);
        window.onNativeBiometricResult = undefined;
        resolve({ ok: false, error: 'خطا در فراخوانی سنسور اثر انگشت اندروید.' });
      }
    }
  });
}

export function completeApkTouchBiometricRegistration(
  userId: string,
  userName: string
): string {
  const randomBytes = window.crypto.getRandomValues(new Uint8Array(24));
  const credentialIdBase64 = `apk_bio_${bufferToBase64(randomBytes.buffer)}`;
  const record: BiometricCredentialRecord = {
    userId,
    userName,
    credentialIdBase64,
    registeredAt: Date.now(),
  };
  try {
    localStorage.setItem(`${BIOMETRIC_STORAGE_PREFIX}${userId}`, JSON.stringify(record));
  } catch {
    // ignore
  }
  return credentialIdBase64;
}

/**
 * Registers a hardware Biometric Passkey (Fingerprint / FaceID / Android APK Biometric) for the given user account
 */
export async function registerBiometricForUser(
  userId: string,
  userName: string
): Promise<{
  ok: boolean;
  credentialIdBase64?: string;
  error?: string;
  useTouchScannerModal?: boolean;
}> {
  // 1. Native Android APK Hardware BiometricPrompt Bridge (APK v4.0+)
  if (isNativeAndroidBiometricBridgeAvailable()) {
    const nativeRes = await invokeNativeAndroidBiometric(
      `ثبت اثر انگشت برای حساب «${userName}»`
    );
    if (nativeRes.ok) {
      const credentialIdBase64 = completeApkTouchBiometricRegistration(userId, userName);
      return { ok: true, credentialIdBase64 };
    }
    return { ok: false, error: nativeRes.error };
  }

  // 2. Standard WebAuthn (iOS WebApp, Chrome, Safari, Desktop)
  if (!isBiometricWebAuthnSupported()) {
    // Running inside Android APK WebView (v3.0) where PublicKeyCredential is disabled by WebView:
    // Open the interactive Touch-Hold Fingerprint Sensor Modal!
    return { ok: false, useTouchScannerModal: true };
  }

  try {
    const challenge = window.crypto.getRandomValues(new Uint8Array(32));
    const userIdBytes = new TextEncoder().encode(`hamhesab_user_${userId}`);

    let credential: PublicKeyCredential | null = null;
    try {
      credential = (await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: {
            name: 'هم‌حساب (HamHesab)',
          },
          user: {
            id: userIdBytes,
            name: `${userName} (${userId})`,
            displayName: userName,
          },
          pubKeyCredParams: [
            { type: 'public-key', alg: -7 }, // ES256
            { type: 'public-key', alg: -257 }, // RS256
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'preferred',
          },
          timeout: 60000,
        },
      })) as PublicKeyCredential | null;
    } catch {
      // Fallback without strict authenticatorAttachment for devices using hybrid/system passkeys
      credential = (await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: {
            name: 'هم‌حساب (HamHesab)',
          },
          user: {
            id: userIdBytes,
            name: `${userName} (${userId})`,
            displayName: userName,
          },
          pubKeyCredParams: [
            { type: 'public-key', alg: -7 },
            { type: 'public-key', alg: -257 },
          ],
          authenticatorSelection: {
            userVerification: 'preferred',
          },
          timeout: 60000,
        },
      })) as PublicKeyCredential | null;
    }

    if (!credential || !credential.rawId) {
      return { ok: false, error: 'ثبت اثر انگشت یا تشخیص چهره لغو شد.' };
    }

    const credentialIdBase64 = bufferToBase64(credential.rawId);
    const record: BiometricCredentialRecord = {
      userId,
      userName,
      credentialIdBase64,
      registeredAt: Date.now(),
    };
    localStorage.setItem(`${BIOMETRIC_STORAGE_PREFIX}${userId}`, JSON.stringify(record));

    return { ok: true, credentialIdBase64 };
  } catch (err: unknown) {
    const msg = err instanceof Error ? `${err.name}: ${err.message}` : '';
    if (msg.includes('NotAllowedError') || msg.includes('AbortError')) {
      return { ok: false, error: 'عملیات تایید اثر انگشت / چهره توسط کاربر لغو شد.' };
    }
    // If WebView or iframe blocked WebAuthn, fall back to the Touch-Hold Fingerprint Sensor Modal
    return { ok: false, useTouchScannerModal: true };
  }
}

/**
 * Verifies the user's identity using their registered Biometric Passkey (Fingerprint / FaceID / Android APK)
 */
export async function authenticateBiometricForUser(
  userId: string,
  remoteCredIdBase64?: string,
  userName?: string
): Promise<{ ok: boolean; error?: string; useTouchScannerModal?: boolean }> {
  const credIdBase64 = getBiometricCredentialForUser(userId, remoteCredIdBase64);
  if (!credIdBase64) {
    return {
      ok: false,
      error:
        'برای این حساب در این دستگاه هنوز اثر انگشت ثبت نشده است. یک‌بار با رمز ۴ رقمی وارد شوید و از نوار بالا روی دکمه «ثبت اثر انگشت» بزنید.',
    };
  }

  // 1. Native Android APK Hardware BiometricPrompt Bridge (APK v4.0+)
  if (isNativeAndroidBiometricBridgeAvailable()) {
    const nativeRes = await invokeNativeAndroidBiometric(
      `ورود به حساب «${userName || userId}»`
    );
    return nativeRes;
  }

  // 2. If running inside Android APK WebView (v3.0) or credential is an APK touch token
  if (!isBiometricWebAuthnSupported() || credIdBase64.startsWith('apk_bio_')) {
    return { ok: false, useTouchScannerModal: true };
  }

  // 3. Standard WebAuthn (iOS WebApp, Chrome, Safari, Desktop)
  try {
    const challenge = window.crypto.getRandomValues(new Uint8Array(32));
    const rawCredId = base64ToUint8Array(credIdBase64);

    const assertion = (await navigator.credentials.get({
      publicKey: {
        challenge,
        allowCredentials: [
          {
            type: 'public-key',
            id: rawCredId as BufferSource,
          },
        ],
        userVerification: 'preferred',
        timeout: 60000,
      },
    })) as PublicKeyCredential | null;

    if (assertion && assertion.rawId) {
      return { ok: true };
    }
    return { ok: false, error: 'تایید هویت بیومتریک انجام نشد.' };
  } catch (err: unknown) {
    const msg = err instanceof Error ? `${err.name}: ${err.message}` : '';
    if (msg.includes('NotAllowedError') || msg.includes('AbortError')) {
      return {
        ok: false,
        error: 'تایید اثر انگشت یا تشخیص چهره لغو شد یا ناموفق بود.',
      };
    }
    return { ok: false, useTouchScannerModal: true };
  }
}
