import { AgentRuntime } from './runtime.js';

export interface OpenClawSystemMessage {
    role: string;
    content: string;
    timestamp?: string;
}

/**
 * AgentDbOpenClawMemory - A drop-in persistence layer for OpenClaw agents.
 * 
 * Fulfills the PL Hacks Storacha Bounty: 'Persistent Agent Memory for openclaw agents'.
 * It allows OpenClaw agents to save their conversational history, learned preferences, 
 * and state to Storacha, and resume it across device reboots or server migrations.
 */
export class AgentDbOpenClawMemory {
    private agentRuntime: AgentRuntime;
    private memoryQueue: OpenClawSystemMessage[] = [];
    public preferences: Record<string, any> = {};
    public lastSavedCid: string | null = null;
    
    constructor(agentRuntime: AgentRuntime) {
        this.agentRuntime = agentRuntime;
    }

    /**
     * Resumes an existing memory state from a Storacha CID.
     * Solves: "OpenClaw agents lose all context when you restart or switch devices."
     * @param cid The IPFS Content Identifier of the previous state
     */
    async resumeFromCid(cid: string): Promise<boolean> {
        console.log(`[OpenClaw Memory] Pulling persistent memory from Storacha CID: ${cid}`);
        const state: any = await this.agentRuntime.retrievePublicMemory(cid);
        
        if (state) {
            this.memoryQueue = state.messages || [];
            this.preferences = state.preferences || {};
            this.lastSavedCid = cid;
            console.log(`[OpenClaw Memory] Memory restored. Found ${this.memoryQueue.length} messages.`);
            return true;
        } else {
            console.warn(`[OpenClaw Memory] Error restoring from ${cid}`);
            return false;
        }
    }

    /**
     * Commits the agent's current conversation state & preferences to Storacha.
     * @returns The newly pinned CID.
     */
    async commitToStoracha(): Promise<string> {
        const payload = {
            timestamp: new Date().toISOString(),
            messages: this.memoryQueue,
            preferences: this.preferences,
            agent_did: this.agentRuntime.did
        };

        const cid = await this.agentRuntime.storePublicMemory(payload);
        this.lastSavedCid = cid;
        return cid;
    }

    /**
     * OpenClaw Interface: Adds an interaction to memory and auto-syncs to Storacha if requested.
     */
    async saveContext(
        input: any, 
        output: any, 
        newPreferences?: Record<string, any>, 
        autoCommit: boolean = true
    ): Promise<string | null> {
        const humanMessage = { role: 'user', content: typeof input === 'string' ? input : JSON.stringify(input), timestamp: new Date().toISOString() };
        const aiMessage = { role: 'assistant', content: typeof output === 'string' ? output : JSON.stringify(output), timestamp: new Date().toISOString() };

        this.memoryQueue.push(humanMessage, aiMessage);
        
        if (newPreferences) {
            Object.assign(this.preferences, newPreferences);
        }

        if (autoCommit) {
            try {
                return await this.commitToStoracha();
            } catch (error) {
                console.error("[OpenClaw Memory] Failed to persist memory to decentralized web:", error);
            }
        }
        return null;
    }

    /**
     * OpenClaw Interface: Loads memory variables for prompt injection. 
     */
    loadMemoryVariables(): Record<string, any> {
        return { 
            messages: this.memoryQueue,
            preferences: this.preferences
        };
    }
}
