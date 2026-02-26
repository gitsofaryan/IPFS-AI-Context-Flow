import { StorachaService } from './storacha.js';
import { UcanService } from './ucan.js';

/**
 * AgentRuntime — Unified orchestration layer that ties together
 * Storacha (public memory), UCAN (authorization), and Zama FHE (private vault).
 *
 * This gives an AI agent a single API for:
 * - Persisting public context to IPFS
 * - Retrieving context from IPFS with authorization checks
 * - Delegating read/write permissions to sub-agents
 * - Verifying incoming delegation tokens
 */
export class AgentRuntime {
    private signer: any;
    private memoryCids: string[] = [];
    private delegations: Map<string, any> = new Map(); // audienceDid -> delegation

    private constructor(signer: any) {
        this.signer = signer;
    }

    /**
     * Initialize a new agent with a fresh decentralized identity.
     */
    static async create(): Promise<AgentRuntime> {
        const signer = await UcanService.createIdentity();
        return new AgentRuntime(signer);
    }

    /**
     * Initialize an agent from an existing base64 private key.
     */
    static async fromKey(base64Key: string): Promise<AgentRuntime> {
        const signer = await UcanService.getSignerFromBase64(base64Key);
        return new AgentRuntime(signer);
    }

    /**
     * Get this agent's DID (public identifier).
     */
    get did(): string {
        return this.signer.did();
    }

    // ─── PUBLIC MEMORY (Storacha / IPFS) ──────────────────────────────

    /**
     * Store agent context to IPFS via Storacha.
     * @param context The JSON-serializable context object.
     * @returns The CID of the stored memory.
     */
    async storePublicMemory(context: object): Promise<string> {
        const payload = {
            agent_id: this.did,
            timestamp: new Date().toISOString(),
            context,
        };

        const cid = await StorachaService.uploadMemory(payload);
        this.memoryCids.push(cid);
        return cid;
    }

    /**
     * Retrieve agent context from IPFS.
     * If a delegation token is provided, it's verified before granting access.
     *
     * @param cid The CID of the memory to retrieve.
     * @param delegation Optional UCAN delegation token (required if caller is not the owner).
     * @returns The parsed memory object, or null if unauthorized/failed.
     */
    async retrievePublicMemory(
        cid: string,
        delegation?: any
    ): Promise<object | null> {
        // If a delegation is provided, verify it before allowing retrieval
        if (delegation) {
            const verification = UcanService.verifyDelegation(
                delegation,
                this.did,
                'agent/read'
            );
            if (!verification.valid) {
                console.error(`Authorization denied: ${verification.reason}`);
                return null;
            }
            console.log(`Authorization verified for ${delegation.audience.did()}`);
        }

        return await StorachaService.fetchMemory(cid);
    }

    /**
     * Get all CIDs this agent has stored.
     */
    getStoredCids(): string[] {
        return [...this.memoryCids];
    }

    /**
     * Get a gateway URL for a specific CID.
     */
    getMemoryUrl(cid: string): string {
        return StorachaService.getGatewayUrl(cid);
    }

    // ─── AUTHORIZATION (UCAN) ─────────────────────────────────────────

    /**
     * Delegate a capability to another agent.
     * @param subAgentDid The DID of the agent receiving the permission (or a signer).
     * @param ability The capability to grant (e.g., 'agent/read', 'agent/write').
     * @param expirationHours How long the delegation is valid (default: 24 hours).
     * @returns The signed UCAN delegation.
     */
    async delegateTo(
        subAgent: any,
        ability: string = 'agent/read',
        expirationHours: number = 24
    ): Promise<any> {
        const delegation = await UcanService.issueDelegation(
            this.signer,
            subAgent,
            ability,
            expirationHours
        );

        // Track issued delegations
        this.delegations.set(
            typeof subAgent === 'string' ? subAgent : subAgent.did(),
            delegation
        );

        return delegation;
    }

    /**
     * Verify an incoming delegation token.
     * @param delegation The UCAN delegation to verify.
     * @param requiredAbility The capability that must be present.
     * @returns Verification result with { valid, reason? }
     */
    verifyIncoming(
        delegation: any,
        requiredAbility: string = 'agent/read'
    ): { valid: boolean; reason?: string } {
        return UcanService.verifyDelegation(delegation, this.did, requiredAbility);
    }

    /**
     * Get all active delegations this agent has issued.
     */
    getIssuedDelegations(): Map<string, any> {
        return new Map(this.delegations);
    }
}
