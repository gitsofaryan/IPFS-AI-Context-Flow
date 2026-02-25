import * as Signer from '@ucanto/principal/ed25519';
import { delegate } from '@ucanto/core';

export class UcanService {
    /**
     * Generates a new decentralized identity.
     */
    static async createIdentity() {
        return await Signer.generate();
    }

    /**
     * Issues a UCAN delegation from one agent to another.
     * @param issuer The signer issuing the permission.
     * @param audience The signer receiving the permission.
     * @param ability The specific capability (e.g., 'agent/read').
     * @returns The signed UCAN delegation.
     */
    static async issueDelegation(issuer: any, audience: any, ability: string) {
        return await delegate({
            issuer,
            audience,
            capabilities: [
                {
                    with: issuer.did(),
                    can: ability as any
                }
            ],
            // 24 hour expiration by default
            expiration: Math.floor(Date.now() / 1000) + (60 * 60 * 24)
        });
    }

    /**
     * Utility to convert a private key from base64 string to a Signer.
     */
    static async getSignerFromBase64(base64Key: string) {
        const buffer = Buffer.from(base64Key, 'base64');
        return await Signer.derive(new Uint8Array(buffer));
    }
}
