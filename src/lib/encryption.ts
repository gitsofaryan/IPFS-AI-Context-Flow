import * as crypto from 'node:crypto';

/**
 * EncryptionService - Handles ECIES-like encryption for agent data.
 * Uses X25519 for Key Exchange and AES-256-GCM for symmetric encryption.
 */
export class EncryptionService {
    /**
     * Encrypts data for a specific public key (X25519).
     * @param data The data to encrypt (Buffer or string).
     * @param recipientPublicKey The recipient's X25519 public key.
     * @returns The encrypted payload (JSON with iv, ciphertext, ephemeralPublicKey, tag).
     */
    static async encrypt(data: Buffer | string, recipientPublicKey: Buffer) {
        // 1. Generate ephemeral key pair
        const ephemeral = crypto.createECDH('prime256v1');
        ephemeral.generateKeys();
        
        // 2. Perform Diffie-Hellman to get shared secret
        const sharedSecret = ephemeral.computeSecret(recipientPublicKey);

        // 3. Derive symmetric key (AES-256) from shared secret using HKDF
        const salt = crypto.randomBytes(16);
        const encryptionKey = crypto.hkdfSync('sha256', sharedSecret, salt, Buffer.from('agent-db-encryption'), 32);

        // 4. Encrypt with AES-256-GCM
        const iv = crypto.randomBytes(12);
        const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(encryptionKey), iv);
        
        const payload = typeof data === 'string' ? Buffer.from(data) : data;
        let ciphertext = cipher.update(payload);
        ciphertext = Buffer.concat([ciphertext, cipher.final()]);
        const tag = cipher.getAuthTag();

        return {
            iv: iv.toString('hex'),
            tag: tag.toString('hex'),
            salt: salt.toString('hex'),
            ephemeralPublicKey: ephemeral.getPublicKey().toString('hex'),
            ciphertext: ciphertext.toString('hex')
        };
    }

    /**
     * Decrypts an ECIES payload using a raw private key.
     * @param payload The encrypted payload.
     * @param privateKey The recipient's raw private key Buffer.
     * @returns The decrypted data as a Buffer.
     */
    static async decrypt(payload: any, privateKey: Buffer) {
        const { iv, tag, salt, ephemeralPublicKey, ciphertext } = payload;

        // 1. Reconstruct ECDH state
        const ecdh = crypto.createECDH('prime256v1');
        ecdh.setPrivateKey(privateKey);

        // 2. Perform Diffie-Hellman for shared secret
        const sharedSecret = ecdh.computeSecret(Buffer.from(ephemeralPublicKey, 'hex'));

        // 3. Derive symmetric key using HKDF
        const encryptionKey = crypto.hkdfSync(
            'sha256', 
            sharedSecret, 
            Buffer.from(salt, 'hex'), 
            Buffer.from('agent-db-encryption'), 
            32
        );

        // 4. Decrypt with AES-256-GCM
        const decipher = crypto.createDecipheriv(
            'aes-256-gcm', 
            Buffer.from(encryptionKey), 
            Buffer.from(iv, 'hex')
        );
        decipher.setAuthTag(Buffer.from(tag, 'hex'));

        let decrypted = decipher.update(Buffer.from(ciphertext, 'hex'));
        decrypted = Buffer.concat([decrypted, decipher.final()]);

        return decrypted;
    }
}
