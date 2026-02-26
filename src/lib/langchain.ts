import { AgentRuntime } from './runtime.js';

/**
 * Interface representing the generic shape of Langchain chat messages.
 */
export interface BaseMessage {
    _getType(): string;
    content: string;
    name?: string;
    additional_kwargs?: Record<string, any>;
}

/**
 * AgentDbLangchainMemory - A drop-in persistence layer for LangChain bots.
 * 
 * It automatically takes the LangChain conversational context and writes it 
 * to a decentralized, continuously streaming IPNS Hive Mind pointer.
 */
export class AgentDbLangchainMemory {
    private agentRuntime: AgentRuntime;
    private memoryKey: string;
    private ipnsNameId: string | null = null;
    private memoryQueue: BaseMessage[] = [];
    
    constructor(agentRuntime: AgentRuntime, memoryKey: string = "history") {
        this.agentRuntime = agentRuntime;
        this.memoryKey = memoryKey;
    }

    /**
     * Initializes the decentralized IPNS stream if it doesn't exist yet.
     */
    async initStream() {
        if (!this.ipnsNameId) {
            this.ipnsNameId = await this.agentRuntime.startMemoryStream({
                messages: this.memoryQueue
            });
            console.log(`[AgentDB Langchain] Decentralized Memory Stream Started: ${this.ipnsNameId}`);
        }
        return this.ipnsNameId;
    }

    /**
     * Returns the memory stream Identifier for sharing.
     */
    getStreamId(): string | null {
        return this.ipnsNameId;
    }

    /**
     * LangChain Interface: Saves context from a conversation to decentralized storage.
     * @param inputValues The input received from the user
     * @param outputValues The LLM's response
     */
    async saveContext(inputValues: Record<string, any>, outputValues: Record<string, any>): Promise<void> {
        // Format the new interaction
        const humanMessage = { _getType: () => 'human', content: inputValues.input || JSON.stringify(inputValues) };
        const aiMessage = { _getType: () => 'ai', content: outputValues.output || JSON.stringify(outputValues) };

        this.memoryQueue.push(humanMessage, aiMessage);

        try {
            if (!this.ipnsNameId) {
                await this.initStream();
            } else {
                // Update the decentralized stream with the new conversation history
                await this.agentRuntime.updateMemoryStream({ 
                    timestamp: new Date().toISOString(),
                    messages: this.memoryQueue 
                });
            }
        } catch (error) {
            console.error("[AgentDB Langchain] Failed to persist memory to decentralized web:", error);
            // We do not throw to avoid crashing the LangChain execution flow just because IPFS is slow.
        }
    }

    /**
     * LangChain Interface: Loads memory variables. 
     * Since we maintain the internal `memoryQueue` state and sync to IPFS asynchronously,
     * we can return it synchronously for the LLM prompt.
     */
    loadMemoryVariables(_inputs: Record<string, any>): Record<string, any> {
        return { [this.memoryKey]: this.memoryQueue };
    }

    /**
     * LangChain Interface: Clears the memory context.
     */
    async clear(): Promise<void> {
        this.memoryQueue = [];
        if (this.ipnsNameId) {
            await this.agentRuntime.updateMemoryStream({ messages: [] });
        }
    }
}
