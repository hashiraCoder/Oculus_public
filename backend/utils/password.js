import crypto from 'node:crypto';

const KEY_LENGTH = 64;

export const DUMMY_PASSWORD_HASH = `${'0'.repeat(32)}:${'0'.repeat(128)}`;

export const hashPassword = (password, salt = crypto.randomBytes(16).toString('hex')) =>
    new Promise((resolve, reject) => {
        crypto.scrypt(password, salt, KEY_LENGTH, (error, derivedKey) => {
            if (error) {
                reject(error);
                return;
            }

            resolve(`${salt}:${derivedKey.toString('hex')}`);
        });
    });

export const verifyPassword = async (password, storedHash) => {
    const [salt, derivedHex] = String(storedHash || '').split(':');

    if (!salt || !derivedHex) {
        return false;
    }

    const derivedKey = await new Promise((resolve, reject) => {
        crypto.scrypt(password, salt, KEY_LENGTH, (error, result) => {
            if (error) {
                reject(error);
                return;
            }

            resolve(result);
        });
    });

    let expectedKey;

    try {
        expectedKey = Buffer.from(derivedHex, 'hex');
    } catch {
        return false;
    }

    if (expectedKey.length !== derivedKey.length) {
        return false;
    }

    return crypto.timingSafeEqual(expectedKey, derivedKey);
};