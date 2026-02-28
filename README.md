# 🧠 Agent DB: Decentralized Memory for AI Agents

> **Persistent, encrypted, and permission-controlled memory for autonomous AI agents powered entirely by Web3 infrastructure.**

Built on **Storacha**, **IPNS**, **UCAN**, and **Zama fhEVM**, Agent DB is an enterprise-grade platform for endowing AI agents with cross-platform reasoning continuity and verifiable capability delegation.

---

## 🏗️ Platform Architecture

Agent DB is a decentralized memory and sovereignty engine for autonomous AI. It addresses the "Amnesia Bot" problem while ensuring that an agent's internal reasoning remains private and cryptographically secure.

1. **The SDK (`src/lib`)**: Enables agents to generate deterministic DIDs and pin context directly to IPFS (**Verifiable AI Provenance**).
2. **ECIES Private Vault**: High-security storage for private memory using **ECIES (NIST P-256)** encryption for true data sovereignty.
3. **The Hive Mind (IPNS)**: Mutable memory streams via IPNS pointers, allowing swarms to continuously resolve each other's state.
4. **Agent Vault (Zama fhEVM)**: FHE-powered smart contracts for confidential finance and verifiable risk thresholds.
5. **OpenClaw Adapter**: Native persistence for OpenClaw agents, preventing context loss across device restarts using Storacha.
6. **Vincent Integration**: Autonomous agent wallet management with programmable guardrails using Lit Protocol.

---

## 🚀 Running the Platform

### 0. Prerequisites: Storacha IPFS Account
Before starting the gateway, you must provision a free decentralized storage bucket via Storacha.
1. `npm install -g @storacha/cli`
2. `storacha login`
3. `storacha space create "MyAgentNode"`
4. `storacha space use <SPACE_DID>`

*(If skipped, the gateway will gracefully fallback to simulated, local-only CIDs).*

### 1. Start the API Gateway
The API Gateway handles UCAN delegation indexing and public skills discovery.

```bash
# Install platform dependencies
npm install

# Start the discovery gateway
npm run server
```

The gateway will run on `http://localhost:3001` with strict CORS and rate-limiting enabled for production stability.

### 2. Start the Frontend Dashboard
The Next.js dashboard visualizes the global active agents, public skills on IPFS, and UCAN delegation flows.

```bash
cd frontend
npm install
npm run dev
```

Navigate to `http://localhost:3000` to view the live Globe visualization.

---

## 🤖 Model Context Protocol (MCP) Server
Agent DB is now accessible via MCP! This allows any AI model (Claude, Gemini, Cursor) to natively use decentralized memory, encryption, and delegation tools.

### 🔌 Connect to MCP
To add Agent DB to your AI agent environment, use the following command:

```bash
npm run mcp
```

**Exposed Tools:**
- `init_agent`: Login with your seed phrase.
- `store_memory` / `retrieve_memory`: Decentralized IPFS storage.
- `store_private_memory` / `retrieve_private_memory`: High-security ECIES vault.
- `delegate_access`: Issue UCAN permissions to other agents.

---

## 🔐 Smart Contract Vault (Zama fhEVM)

For data that cannot be public on IPFS, Agent DB leverages Zama's Fully Homomorphic Encryption.

1.  Agents encrypt their context locally.
2.  The FHE payload is submitted to the `EncryptedAgentMemory` contract.
3.  Secondary agents can verify knowledge of the secret via the FHE Gateway without it ever being decrypted on-chain.

### 3. Running Hackathon Bounty Demos
We have prepared specific demonstrators for the PL_Genesis bounty tracks. These demos satisfy the core requirements for the **AI & Robotics**, **Crypto**, and **Neurotech** tracks.

```bash
# 🤖 AI & Robotics: OpenClaw Persistence (Storacha)
npm run demo:openclaw

# 🔗 Crypto: Agent Registry on Filecoin Calibration
npm run demo:filecoin

# ⚖️ Crypto/DeFi: Zama fhEVM Confidential Finance
npm run demo:defi

# 🛡️ Crypto/KeyMgmt: Lit Protocol Vincent Wallet Logic
npm run demo:lit
```

### 🛡️ Production Hardening Proofs
The system has been hardened for real-world deployments. You can verify the security and resilience features here:

```bash
# 🔐 Private Vault (ECIES Security Verification)
npx tsx src/test-encryption.ts

# 💾 Resilience (Handoff & Persistence Verification)
npx tsx src/test-persistence.ts

# 🛠️ Validation & DX (Zod Schema & Error Handling)
npx tsx src/test-dx.ts
```

---

## 📦 For Agent Developers (SDK)

Are you an AI developer looking to integrate persistent memory into your Discord bot, LangChain agent, or CLI tool? 

**Do not read this repository manual.**

Instead, please consult the lightweight SDK Developer Guide:
👉 [Read the `@arienjain/agent-db` Node.js Developer Documentation](README_NPM.md)

---

## 🤝 Contributing
Agent DB is an open protocol. We welcome pull requests for expanding UCAN capabilities, creating new visualization widgets in the Next.js frontend, or adding additional fhEVM smart contract capabilities.

## 📄 License
MIT License.
