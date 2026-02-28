# 🤖 How to Build & Integrate an AI Agent with Agent DB

This guide shows you how to take a simple AI agent and give it "Infinite Memory" using our system.

## Step 1: Initialize the Agent Identity
Instead of using an API key, your agent uses a **DID** (Decentralized ID). This makes them a unique, verifiable entity on the web.

```typescript
import { AgentRuntime } from '@arienjain/agent-db';

// Load a persistent identity so the agent keeps its memory after a restart
const agent = await AgentRuntime.loadFromSeed("your-secret-agent-seed-phrase");
console.log(`Agent DID initialized: ${agent.did}`);
```

## Step 2: Choose Your Integration Level

### Option A: The "Automatic" Way (LangChain / OpenClaw)
If you already use a framework, just drop in our memory class. It handles all the IPFS pinning and UCAN security behind the scenes.

**LangChain Example:**
```typescript
import { AgentDbLangchainMemory } from '@arienjain/agent-db';

const memory = new AgentDbLangchainMemory(agent);
// Now pass this 'memory' to your LangChain Agent/Chain
```

### Option B: The "Manual" Way (Custom Agents)
If you have a custom script, manually save "checkpoints" of the agent's logic.

```typescript
// After every LLM response, save the context
const chatSummary = "User asked about Bitcoin. I explained the Halving.";
const cid = await agent.storePublicMemory({
    thoughts: chatSummary,
    timestamp: Date.now()
});

console.log(`Memory safe on IPFS: https://storacha.link/ipfs/${cid}`);

### Option C: The "Private" Way (ECIES Vault)
For highly sensitive data, use the ECIES-encrypted vault. Only the owner agent can decrypt this.

```typescript
// Encrypt and store private data (Sovereign Context)
const secretCid = await agent.storePrivateMemory({
    private_key_recovery: "...",
    secret_strategy: "Buy low, sell high"
});

// To retrieve and decrypt:
const secretData = await agent.retrievePrivateMemory(secretCid);
```
```

## Step 3: Enable "Swarm Collaboration" (Delegation)
To make your agent work with other agents, issue a **UCAN delegation**. This lets Agent B read Agent A's memory without sharing private keys.

```typescript
// Agent A grants 'read' permission to Agent B for 24 hours
const token = await agentA.delegateTo(agentB.did, 'agent/read', 24);

// Send this 'token' to Agent B so they can access your memory stream!
```

## Why use this for "Real" Agents?
1. **Persistence**: Your bot won't forget who the user is if the server reboots.
2. **Privacy**: Sensitive data is encrypted via Zama FHE or exported with UCAN guardrails.
3. **Interoperability**: Different agents (one in Python, one in JS) can share a single "Hive Mind" memory stream on IPFS.
