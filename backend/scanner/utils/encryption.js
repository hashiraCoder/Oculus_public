import crypto from 'crypto';
import config from '../../config/env.js';
import logger from '../../config/logger.js';

const ALGORITHM = 'aes-256-gcm';

/**
 * Derives a 32-byte key from input string using scrypt.
 * @param {string} secret 
 * @param {string} salt 
 * @returns {Buffer}
 */
const deriveKey = (secret, salt = 'salt') => {
    return crypto.scryptSync(secret, salt, 32);
};

// Primary dedicated finding encryption key
const dedicatedKeyString = config.security?.findingEncryptionKey || process.env.FINDING_ENCRYPTION_KEY;
const PRIMARY_ENCRYPTION_KEY = dedicatedKeyString
    ? (dedicatedKeyString.length === 64 && /^[0-9a-fA-F]+$/.test(dedicatedKeyString)
        ? Buffer.from(dedicatedKeyString, 'hex')
        : deriveKey(dedicatedKeyString, 'oculus_finding_salt'))
    : (config.jwt?.secret
        ? deriveKey(config.jwt.secret, 'salt')
        : deriveKey('fallback_secret_for_development', 'salt'));

// Build list of candidate keys for fallback decryption (removing exact duplicates)
const rawCandidateKeys = [
    PRIMARY_ENCRYPTION_KEY,
    deriveKey('fallback_secret_for_development', 'salt'),
    config.jwt?.secret ? deriveKey(config.jwt.secret, 'salt') : null,
].filter(Boolean);

const CANDIDATE_KEYS = [];
for (const key of rawCandidateKeys) {
    if (!CANDIDATE_KEYS.some(k => Buffer.compare(k, key) === 0)) {
        CANDIDATE_KEYS.push(key);
    }
}

/**
 * Encrypts a plaintext finding snippet using AES-256-GCM.
 * @param {string} text - Plaintext snippet
 * @returns {string|null} - Format: iv:authTag:encryptedData (hex encoded)
 */
export const encrypt = (text) => {
    if (!text) return null;
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGORITHM, PRIMARY_ENCRYPTION_KEY, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag().toString('hex');
    
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
};

/**
 * Decrypts an encrypted snippet. Tries primary key first, falls back to legacy keys.
 * @param {string} encryptedText - Format: iv:authTag:encryptedData (hex encoded)
 * @returns {string|null} - Decrypted plaintext or null
 */
export const decrypt = (encryptedText) => {
    if (!encryptedText) return null;
    
    const parts = encryptedText.split(':');
    if (parts.length !== 3) return null;

    const [ivHex, authTagHex, encrypted] = parts;
    if (!ivHex || !authTagHex || !encrypted) return null;

    let iv, authTag;
    try {
        iv = Buffer.from(ivHex, 'hex');
        authTag = Buffer.from(authTagHex, 'hex');
        if (iv.length !== 12 || authTag.length !== 16) {
            return null;
        }
    } catch {
        return null;
    }

    // Try all candidate keys in order (PRIMARY first, then legacy fallbacks)
    for (const key of CANDIDATE_KEYS) {
        try {
            const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
            decipher.setAuthTag(authTag);
            
            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            
            return decrypted;
        } catch {
            // Key mismatch or authTag authentication failure, try next key
            continue;
        }
    }
    
    logger.debug('[Encryption] Failed to decrypt snippet with all available candidate keys');
    return null;
};
