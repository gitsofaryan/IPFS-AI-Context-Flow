import * as Signer from '@ucanto/principal/ed25519';
import { delegate, Delegation } from '@ucanto/core';
import * as DelegationLib from '@ucanto/core/delegation';
import { z } from 'zod';
import { AuthenticationError, ValidationError } from './errors.js';

const didSchema = z.string().startsWith('did:key:');
const abilitySchema = z.string().min(1);

export class UcanService {
    /**
     * Generates a new Ed25519 decentralized identity.
     * @returns A Signer with a did:key identity.
     */
    static async createIdentity() {
        return await Signer.generate();
    }

    /**
     * Deterministically generates an Ed25519 identity from a user's wallet signature.
     * This enables "No Visible Auth" — the user signs a message, and that signature
     * becomes the seed for their Agent's DID.
     * 
     * @param signature The hex signature string from the wallet (e.g., MetaMask).
     * @returns A Signer with a deterministic did:key identity.
     */
    static async createIdentityFromSignature(signature: string) {
        return this.createIdentityFromSeed(signature);
    }

    /**
     * Deterministically generates an Ed25519 identity from a fixed seed phrase.
     * This allows agents to load the exact same DID across different servers/restarts.
     * 
     * @param seed A high-entropy seed string.
     * @returns A Signer with a deterministic did:key identity.
     */
    static async createIdentityFromSeed(seed: string) {
        // We need a 32-byte seed for Ed25519. We hash the seed using SHA-256.
        const crypto = await import('crypto');
        const hash = crypto.createHash('sha256').update(seed).digest();
        return await Signer.derive(new Uint8Array(hash));
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
        try {
            abilitySchema.parse(ability);
            z.number().positive().parse(expirationHours);
            if (typeof issuer?.did !== 'function') throw new Error("Invalid issuer");
            if (typeof audience?.did !== 'function') throw new Error("Invalid audience");
        } catch (e: any) {
            throw new ValidationError('Invalid UCAN delegation parameters', e.errors || e.message);
        }
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

    // ─── SERIALIZATION / TRANSPORT ────────────────────────────────────

    /**
     * Serializes a UCAN delegation into a portable CAR archive (Uint8Array).
     * This can be stored on IPFS, sent over HTTP, or encoded as base64.
     *
     * @param delegation The UCAN delegation to serialize.
     * @returns The CAR archive as Uint8Array.
     */
    static async serializeDelegation(delegation: any): Promise<Uint8Array> {
        const result = await DelegationLib.archive(delegation);
        if (result.error) {
            throw new Error(`Failed to serialize delegation: ${result.error.message}`);
        }
        return result.ok;
    }

    /**
     * Deserializes a UCAN delegation from a CAR archive (Uint8Array).
     * Reconstructs the full delegation chain from the archive bytes.
     *
     * @param bytes The CAR archive bytes.
     * @returns The reconstructed Delegation object.
     */
    static async deserializeDelegation(bytes: Uint8Array): Promise<any> {
        const result = await DelegationLib.extract(bytes);
        if (result.error) {
            throw new AuthenticationError(`Failed to deserialize delegation: ${result.error.message}`);
        }
        return result.ok;
    }

    /**
     * Encodes a delegation as a base64 string for easy transport over HTTP/JSON.
     *
     * @param delegation The UCAN delegation.
     * @returns Base64-encoded string of the CAR archive.
     */
    static async delegationToBase64(delegation: any): Promise<string> {
        const bytes = await UcanService.serializeDelegation(delegation);
        return Buffer.from(bytes).toString('base64');
    }

    /**
     * Decodes a delegation from a base64 string.
     *
     * @param base64 The base64-encoded CAR archive.
     * @returns The reconstructed Delegation object.
     */
    static async delegationFromBase64(base64: string): Promise<any> {
        const bytes = new Uint8Array(Buffer.from(base64, 'base64'));
        return await UcanService.deserializeDelegation(bytes);
    }

    /**
     * Utility to convert a private key from base64 string to a Signer.
     */
    static async getSignerFromBase64(base64Key: string) {
        const buffer = Buffer.from(base64Key, 'base64');
        return await Signer.derive(new Uint8Array(buffer));
    }
}
