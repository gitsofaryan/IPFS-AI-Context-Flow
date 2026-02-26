import { describe, it, expect, beforeAll } from 'vitest';
import { UcanService } from '../src/lib/ucan.js';
import { AgentRuntime } from '../src/lib/runtime.js';

describe('UCAN Service Cryptography', () => {
    let agentA: any;
    let agentB: any;
    let agentC: any;

    beforeAll(async () => {
        agentA = await UcanService.createIdentity();
        agentB = await UcanService.createIdentity();
        agentC = await UcanService.createIdentity();
    });

    it('should issue and verify a valid delegation', async () => {
        const delegation = await UcanService.issueDelegation(
            agentA,
            agentB,
            'agent/read',
            1
        );

        const result = UcanService.verifyDelegation(delegation, agentA.did(), 'agent/read');
        expect(result.valid).toBe(true);
    });

    it('should fail verification if capability does not match', async () => {
        const delegation = await UcanService.issueDelegation(
            agentA,
            agentB,
            'agent/read',
            1
        );

        const result = UcanService.verifyDelegation(delegation, agentA.did(), 'agent/write');
        expect(result.valid).toBe(false);
        expect(result.reason).toContain('Missing capability');
    });

    it('should fail verification if issuer DID is incorrect (forged)', async () => {
        const delegation = await UcanService.issueDelegation(
            agentA, // A issues to B
            agentB,
            'agent/read',
            1
        );

        // Verification checks if C issued it, which should fail
        const result = UcanService.verifyDelegation(delegation, agentC.did(), 'agent/read');
        expect(result.valid).toBe(false);
        expect(result.reason).toContain('Issuer mismatch');
    });

    it('should encode and decode delegations identically (CAR archives)', async () => {
        const originalDelegation = await UcanService.issueDelegation(
            agentA,
            agentB,
            'agent/execute',
            24
        );

        const base64Token = await UcanService.delegationToBase64(originalDelegation);
        const reconstructedDelegation = await UcanService.delegationFromBase64(base64Token);

        const result = UcanService.verifyDelegation(reconstructedDelegation, agentA.did(), 'agent/execute');
        expect(result.valid).toBe(true);
    });

    it('should deterministically generate the exact same DID from the same wallet signature', async () => {
        const mockSignature = '0x1c4e7d4a2b9f33b118b63e8a38bcd51e44f5012574e4fe62c76d2';
        
        const identity1 = await UcanService.createIdentityFromSignature(mockSignature);
        const identity2 = await UcanService.createIdentityFromSignature(mockSignature);

        expect(identity1.did()).toEqual(identity2.did());
        
        const mockSignature2 = '0xabcde12345';
        const identity3 = await UcanService.createIdentityFromSignature(mockSignature2);
        expect(identity3.did()).not.toEqual(identity1.did());
    });

    it('should allow AgentRuntime to load deterministically from a seed', async () => {
        const mySecretSeed = 'correct-horse-battery-staple-agent-seed';
        
        const agent1 = await AgentRuntime.loadFromSeed(mySecretSeed);
        const agent2 = await AgentRuntime.loadFromSeed(mySecretSeed);
        
        expect(agent1.identity.did()).toEqual(agent2.identity.did());
        expect(agent1.identity.did().startsWith('did:key:')).toBe(true);
    });
});
