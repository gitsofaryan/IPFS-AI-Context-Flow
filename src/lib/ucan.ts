import * as Signer from '@ucanto/principal/ed25519';
import { delegate, Delegation } from '@ucanto/core';

export class UcanService {
    /**
     * Generates a new Ed25519 decentralized identity.
     * @returns A Signer with a did:key identity.
     */
    static async createIdentity() {
        return await Signer.generate();
    }

    /**
     * Issues a UCAN delegation from one agent to another.
     * @param issuer The signer issuing the permission.
     * @param audience The signer receiving the permission.
     * @param ability The specific capability (e.g., 'agent/read', 'agent/write').
     * @param expirationHours Hours until the delegation expires (default: 24).
     * @returns The signed UCAN delegation.
     */
    static async issueDelegation(
        issuer: any,
        audience: any,
        ability: string,
        expirationHours: number = 24
    ) {
        return await delegate({
            issuer,
            audience,
            capabilities: [
                {
                    with: issuer.did(),
                    can: ability as any
                }
            ],
            expiration: Math.floor(Date.now() / 1000) + (60 * 60 * expirationHours)
        });
    }

    /**
     * Verifies a UCAN delegation token.
     * Checks that:
     * 1. The delegation was issued by the expected issuer
     * 2. The delegation grants the expected capability
     * 3. The delegation has not expired
     *
     * @param delegation The UCAN delegation to verify.
     * @param expectedIssuerDid The DID of the expected issuer.
     * @param expectedAbility The capability that should be granted.
     * @returns An object with { valid, reason? }
     */
    static verifyDelegation(
        delegation: any,
        expectedIssuerDid: string,
        expectedAbility: string
    ): { valid: boolean; reason?: string } {
        // Check issuer matches
        if (delegation.issuer.did() !== expectedIssuerDid) {
            return {
                valid: false,
                reason: `Issuer mismatch: expected ${expectedIssuerDid}, got ${delegation.issuer.did()}`
            };
        }

        // Check capability exists
        const cap = delegation.capabilities.find(
            (c: any) => c.can === expectedAbility
        );
        if (!cap) {
            return {
                valid: false,
                reason: `Missing capability: ${expectedAbility}`
            };
        }

        // Check the resource scope matches the issuer
        if (cap.with !== expectedIssuerDid) {
            return {
                valid: false,
                reason: `Resource scope mismatch: delegation grants access to ${cap.with}, not ${expectedIssuerDid}`
            };
        }

        // Check expiration
        if (delegation.expiration) {
            const now = Math.floor(Date.now() / 1000);
            if (now > delegation.expiration) {
                return {
                    valid: false,
                    reason: `Delegation expired at ${new Date(delegation.expiration * 1000).toISOString()}`
                };
            }
        }

        return { valid: true };
    }

    /**
     * Utility to convert a private key from base64 string to a Signer.
     */
    static async getSignerFromBase64(base64Key: string) {
        const buffer = Buffer.from(base64Key, 'base64');
        return await Signer.derive(new Uint8Array(buffer));
    }
}
