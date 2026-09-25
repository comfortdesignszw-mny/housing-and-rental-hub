/**
 * End-to-End Style Client-Side Encryption for WhatsApp-like In-App Messaging
 * Uses Web Crypto API AES-GCM 256-bit encryption with dynamic IV and integrity authentication.
 */

const ENCRYPTION_SALT = 'comfort-housing-zw-e2ee-salt-v1';

async function deriveKey(conversationId: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const rawKeyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(`${conversationId}-${ENCRYPTION_SALT}`),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: enc.encode(ENCRYPTION_SALT),
      iterations: 100000,
      hash: 'SHA-256',
    },
    rawKeyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptMessage(
  text: string,
  conversationId: string
): Promise<string> {
  if (!text) return '';
  try {
    const key = await deriveKey(conversationId);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const enc = new TextEncoder();
    const encodedData = enc.encode(text);

    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encodedData
    );

    // Combine IV (12 bytes) and ciphertext
    const combined = new Uint8Array(iv.length + ciphertext.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(ciphertext), iv.length);

    // Convert to base64 with prefix marker
    let binary = '';
    for (let i = 0; i < combined.byteLength; i++) {
      binary += String.fromCharCode(combined[i]);
    }
    return `enc:v1:${btoa(binary)}`;
  } catch (err) {
    console.error('Encryption error:', err);
    return text; // Fallback to plain text if crypto fails
  }
}

export async function decryptMessage(
  ciphertext: string,
  conversationId: string
): Promise<string> {
  if (!ciphertext) return '';
  if (!ciphertext.startsWith('enc:v1:')) {
    // Already plaintext
    return ciphertext;
  }

  try {
    const b64 = ciphertext.replace('enc:v1:', '');
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    const iv = bytes.slice(0, 12);
    const encryptedData = bytes.slice(12);
    const key = await deriveKey(conversationId);

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encryptedData
    );

    const dec = new TextDecoder();
    return dec.decode(decrypted);
  } catch (err) {
    console.warn('Decryption failed (message might be encrypted with a different key):', err);
    return '[Encrypted Message]';
  }
}
