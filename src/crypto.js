// Cryptographic Helper Module using native Web Crypto API
// Implements ECDH key exchange, AES-GCM encryption, and SHA-256 emoji hashing.

// Helper: Convert ArrayBuffer to Hex String
export function bufferToHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Helper: Convert Hex String to ArrayBuffer
export function hexToBuffer(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes.buffer;
}

// Helper: Convert String to ArrayBuffer (UTF-8)
export function stringToBuffer(str) {
  return new TextEncoder().encode(str);
}

// Helper: Convert ArrayBuffer to String (UTF-8)
export function bufferToString(buffer) {
  return new TextDecoder().decode(buffer);
}

// 1. Generate ECDH Key Pair (P-256 Curve)
export async function generateECDHKeys() {
  try {
    const keyPair = await window.crypto.subtle.generateKey(
      {
        name: 'ECDH',
        namedCurve: 'P-256'
      },
      true, // extractable
      ['deriveKey', 'deriveBits']
    );
    return keyPair;
  } catch (error) {
    console.error('Error generating ECDH keys:', error);
    throw error;
  }
}

// 2. Export Public Key to SubjectPublicKeyInfo (SPKI) format as Hex string
export async function exportPublicKey(cryptoKey) {
  try {
    const exported = await window.crypto.subtle.exportKey('spki', cryptoKey);
    return bufferToHex(exported);
  } catch (error) {
    console.error('Error exporting public key:', error);
    throw error;
  }
}

// 3. Import Public Key from SPKI Hex string
export async function importPublicKey(spkiHex) {
  try {
    const buffer = hexToBuffer(spkiHex);
    return await window.crypto.subtle.importKey(
      'spki',
      buffer,
      {
        name: 'ECDH',
        namedCurve: 'P-256'
      },
      true,
      []
    );
  } catch (error) {
    console.error('Error importing public key:', error);
    throw error;
  }
}

// 4. Derive AES-GCM 256 Key from Local Private Key and Remote Public Key
export async function deriveAESGCMKey(localPrivateKey, remotePublicKey) {
  try {
    return await window.crypto.subtle.deriveKey(
      {
        name: 'ECDH',
        public: remotePublicKey
      },
      localPrivateKey,
      {
        name: 'AES-GCM',
        length: 256
      },
      true, // extractable
      ['encrypt', 'decrypt']
    );
  } catch (error) {
    console.error('Error deriving AES-GCM key:', error);
    throw error;
  }
}

// 5. Derive Raw Shared Secret Bits (for fingerprinting)
export async function deriveSharedSecretBits(localPrivateKey, remotePublicKey) {
  try {
    return await window.crypto.subtle.deriveBits(
      {
        name: 'ECDH',
        public: remotePublicKey
      },
      localPrivateKey,
      256 // 256 bits = 32 bytes
    );
  } catch (error) {
    console.error('Error deriving shared secret bits:', error);
    throw error;
  }
}

// 6. Encrypt message payload using AES-GCM
export async function encryptMessage(text, aesKey) {
  try {
    const iv = window.crypto.getRandomValues(new Uint8Array(12)); // 12-byte IV for GCM
    const encoded = stringToBuffer(text);
    const encrypted = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      aesKey,
      encoded
    );

    return {
      ciphertext: bufferToHex(encrypted),
      iv: bufferToHex(iv)
    };
  } catch (error) {
    console.error('Encryption failed:', error);
    throw error;
  }
}

// 7. Decrypt message payload using AES-GCM
export async function decryptMessage(ciphertextHex, ivHex, aesKey) {
  try {
    const iv = hexToBuffer(ivHex);
    const ciphertext = hexToBuffer(ciphertextHex);
    const decrypted = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      aesKey,
      ciphertext
    );
    return bufferToString(decrypted);
  } catch (error) {
    console.error('Decryption failed:', error);
    throw error;
  }
}

// 8. Emoji list for visual Call Security fingerprint (Telegram-style, 64 items)
const VERIFICATION_EMOJIS = [
  '🔒', '🔑', '🛡️', '⚡', '🔋', '💎', '🚀', '🌟', 
  '❤️', '🍉', '🍋', '🍒', '🍓', '🥑', '🥦', '🌶️', 
  '🍕', '🍩', '🍪', '🐱', '🦁', '🐨', '🐼', '🦊', 
  '🦄', '🐙', '🦋', '🌵', '🌴', '🌻', '🌸', '🎈', 
  '🎨', '🎸', '🎮', '🛹', '🚗', '✈️', '⛵', '🔮',
  '🌈', '🔥', '💧', '🌍', '🏔️', '⛺', '⚓', '👑',
  '🕶️', '🎩', '🎒', '🧩', '🧁', '🍦', '🍧', '🍣',
  '🦉', '🦜', '🐬', '🐾', '⚽', '🎯', '🪐', '🎐'
];

// 9. Generate 4 Security Emojis and a HEX Fingerprint from Shared Secret Bits
export async function generateSecurityFingerprint(sharedSecretBits) {
  try {
    // SHA-256 hash the shared secret bits to get a consistent digests
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', sharedSecretBits);
    const hashArray = new Uint8Array(hashBuffer);
    
    // Choose 4 emojis using the first 4 bytes of the hash
    const emojis = [];
    for (let i = 0; i < 4; i++) {
      const index = hashArray[i] % VERIFICATION_EMOJIS.length;
      emojis.push(VERIFICATION_EMOJIS[index]);
    }
    
    // Create a readable HEX checksum from the rest of the hash
    const hexChecksum = bufferToHex(hashBuffer).substring(0, 16).toUpperCase();
    
    return {
      emojis,
      checksum: hexChecksum.match(/.{1,4}/g).join('-') // Format: ABCD-EFGH-IJKL-MNOP
    };
  } catch (error) {
    console.error('Fingerprint generation failed:', error);
    throw error;
  }
}
