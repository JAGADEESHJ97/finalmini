/**
 * Client-side cryptography utilities using WebCrypto API
 * All encryption/decryption happens in the browser
 * Server never receives plaintext files or file keys
 */

// Generate a random 32-byte AES-256 key
export async function generateFileKey(): Promise<CryptoKey> {
  return await crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256,
    },
    true, // extractable
    ["encrypt", "decrypt"]
  );
}

// Export CryptoKey to raw bytes
export async function exportKey(key: CryptoKey): Promise<ArrayBuffer> {
  return await crypto.subtle.exportKey("raw", key);
}

// Import raw bytes to CryptoKey
export async function importKey(keyData: ArrayBuffer): Promise<CryptoKey> {
  return await crypto.subtle.importKey(
    "raw",
    keyData,
    {
      name: "AES-GCM",
      length: 256,
    },
    true,
    ["encrypt", "decrypt"]
  );
}

// Encrypt file with AES-GCM using fileKey
export async function encryptFile(
  file: File,
  fileKey: CryptoKey
): Promise<{ encryptedData: ArrayBuffer; iv: Uint8Array }> {
  const fileData = await file.arrayBuffer();
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 12-byte IV for GCM

  const encryptedData = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    fileKey,
    fileData
  );

  return { encryptedData, iv };
}

// Decrypt file with AES-GCM
export async function decryptFile(
  encryptedData: ArrayBuffer,
  fileKey: CryptoKey,
  iv: Uint8Array
): Promise<ArrayBuffer> {
  return await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: iv as any,
    },
    fileKey,
    encryptedData
  );
}

// Generate random 6-digit PIN (000000-999999)
export function generatePIN(): string {
  const pin = crypto.getRandomValues(new Uint32Array(1))[0] % 1000000;
  return pin.toString().padStart(6, "0");
}

// Generate random salt for PIN derivation
export function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(16));
}

// Derive key from PIN using PBKDF2
export async function derivePINKey(
  pin: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  // Import PIN as key material
  const pinKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(pin),
    "PBKDF2",
    false,
    ["deriveBits", "deriveKey"]
  );

  // Derive AES key from PIN using PBKDF2
  return await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as any,
      iterations: 200000, // 200k iterations for security
      hash: "SHA-256",
    },
    pinKey,
    {
      name: "AES-GCM",
      length: 256,
    },
    true,
    ["encrypt", "decrypt"]
  );
}

// Encrypt fileKey with PIN-derived key
export async function encryptFileKey(
  fileKey: CryptoKey,
  pinDerivedKey: CryptoKey
): Promise<{ encryptedFileKey: ArrayBuffer; iv: Uint8Array }> {
  const fileKeyBytes = await exportKey(fileKey);
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const encryptedFileKey = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    pinDerivedKey,
    fileKeyBytes
  );

  return { encryptedFileKey, iv };
}

// Decrypt fileKey with PIN-derived key
export async function decryptFileKey(
  encryptedFileKey: ArrayBuffer,
  pinDerivedKey: CryptoKey,
  iv: Uint8Array
): Promise<CryptoKey> {
  const fileKeyBytes = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: iv as any,
    },
    pinDerivedKey,
    encryptedFileKey
  );

  return await importKey(fileKeyBytes);
}

// Hash PIN for server-side verification (using SHA-256 as fallback to bcrypt)
export async function hashPIN(pin: string, salt: Uint8Array): Promise<string> {
  // Combine PIN with salt
  const combined = new Uint8Array([
    ...new TextEncoder().encode(pin),
    ...salt,
  ]);

  // Hash with SHA-256 (in production, server should use bcrypt)
  const hashBuffer = await crypto.subtle.digest("SHA-256", combined);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Convert ArrayBuffer to Base64 for transmission
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Convert Base64 to ArrayBuffer
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// Format bytes to human readable size
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}
