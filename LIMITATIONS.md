# Limitations & Known Issues

> An honest assessment of the current state of Agent DB, what's simulated vs. real, and where the project needs work.

---

## ✅ Resolved Issues

The following issues from the original assessment have been **fixed**:

| Issue | Status | What Changed |
|---|---|---|
| Solidity compilation failure | ✅ Fixed | Corrected fhevm 0.6.2 API (`bytes memory inputProof`), added `TFHE.allow/allowThis` ACL, renamed config to `.cts` for ESM compat |
| Exposed recovery key | ✅ Fixed | Deleted `vault-recovery-key.txt`, added to `.gitignore` |
| No UCAN verification | ✅ Fixed | Added `UcanService.verifyDelegation()` — checks issuer, capability, scope, and expiration |
| No agent orchestration | ✅ Fixed | Added `AgentRuntime` class unifying Storacha + UCAN + FHE in `src/lib/runtime.ts` |
| No retrieval flow | ✅ Fixed | Added `StorachaService.fetchMemory(cid)` for IPFS retrieval |
| UCAN delegation mocked in frontend | ✅ Fixed | Frontend now calls real `UcanService.issueDelegation()` + verification |
| No env configuration | ✅ Fixed | Added `.env.example` with all required variables |
| npm test broken | ✅ Fixed | Wired `npm test` to run integration tests via tsx |
| FHE Gateway decryption missing | ✅ Fixed | Contract now has `requestSecretDecryption()` → `onSecretDecrypted()` → `getDecryptedSecret()` |
| Duplicate library code | ✅ Synced | Frontend libs synced from `src/lib/` (still need monorepo for long-term) |

---

## 🟡 Remaining Simulated Features

### 1. Frontend Storacha Upload — Graceful Fallback

The frontend now **attempts a real upload** via `StorachaService.uploadMemory()` but falls back to a simulated CID if the Storacha account isn't configured. To enable live uploads, run `npx storacha login <email>` and provision a space.

**Where it lies:** `frontend/src/app/page.tsx` → `handleUpload()`

**To fix:** Configure a Storacha account and space. The code is already wired — it just needs credentials.

---

### 2. Frontend Zama Vault — Simulated

The "Store in Zama Vault" action still generates a **simulated hex hash** rather than transacting with a deployed contract. This requires:
- A deployed `EncryptedAgentMemory` contract on Zama Sephora
- MetaMask or wallet integration via `ethers.js`
- Client-side FHE encryption via the Zama client SDK

**Where it lies:** `frontend/src/app/page.tsx` → `handleZama()`

**To fix:** Deploy the contract using `npx hardhat run scripts/deploy.ts --network sephora`, then integrate wallet connection + FHE client in the frontend.

---

## 🟠 Architectural Gaps

### 3. No Authorization-Gated Retrieval Flow (End-to-End)

`UcanService.verifyDelegation()` and `StorachaService.fetchMemory()` both exist, and `AgentRuntime.retrievePublicMemory()` ties them together with optional auth gating. However, the **frontend** does not yet expose this flow — there's no UI where Agent B presents a token and retrieves Agent A's memory.

Additionally, IPFS CIDs are inherently public — anyone with the CID can fetch the data. True privacy requires encrypting the IPFS payload and using UCAN to authorize key exchange.

**To fix:** Add a frontend panel demonstrating the full delegation → verification → retrieval flow. For payload privacy, encrypt memory before uploading and share decryption keys via UCAN-authorized channels.

---

### 4. No UCAN Revocation

UCAN delegations expire after the configured duration (default 24h), but there's no way to **revoke** a delegation before expiration. An agent that issues a token loses control until it naturally expires.

**To fix:** Implement a revocation list — either stored on IPFS (lightweight) or on-chain (stronger guarantees).

---

## 🔵 Code Quality

### 5. Library Duplication (Short-Term Fix)

`src/lib/` and `frontend/src/lib/` are now synced, but they're still separate copies. Manual syncing is error-prone.

**To fix:** Set up a monorepo with shared packages (Turborepo or Nx), or publish the shared libs as an internal npm package.

---

### 6. No CI/CD Pipeline

There's no automated testing or deployment pipeline. The integration tests run locally but aren't enforced on PRs.

**To fix:** Add GitHub Actions workflow for lint → test → compile → deploy.

## 🔴 Planned — Auth & Sharing Mechanism

The current authentication model uses **static Bearer tokens** (base64-encoded UCAN delegations). This works but has critical weaknesses:

- Static tokens can be leaked if Agent B's server is compromised
- Tokens are replayable — anyone with the token can impersonate Agent B
- No agent discovery — agents can't find each other without manual coordination
- Copy-paste provisioning is not automation-friendly

Two approaches are planned to replace this:

---

### Option A: Agent Registry + Challenge-Response Auth ⭐ (Primary)

A smart contract serves as an **on-chain agent phone book**, and API auth uses **challenge-response signing** instead of static tokens.

**Architecture:**

```
┌─────────────────────────────────────────────────────────┐
│             SMART CONTRACT: AgentRegistry                │
│                                                          │
│  register("ecom-partner-42", did, endpoint)  → sign up  │
│  grantAccess(agentB, "agent/read", cids[])   → authorize│
│  revokeAccess(agentB)                        → revoke   │
│  lookup("ecom-partner-42")                   → discover │
│  hasAccess(ownerA, agentB, "agent/read")     → check    │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

**Auth Flow (replaces static Bearer tokens):**

```
Agent B                        API Gateway                  On-Chain
   │                               │                           │
   │ POST /auth/challenge           │                           │
   │ { agentName: "ecom-42" }       │                           │
   │──────────────────────────────►│                           │
   │                               │                           │
   │ { nonce: "a8f3c2..." }        │                           │
   │◄──────────────────────────────│                           │
   │                               │                           │
   │ Sign nonce with private key   │                           │
   │ (key NEVER leaves Agent B)    │                           │
   │                               │                           │
   │ POST /auth/verify              │                           │
   │ { agentName, nonce, signature }│                           │
   │──────────────────────────────►│                           │
   │                               │── hasAccess(A, B)? ─────►│
   │                               │◄─── ✅ yes ──────────────│
   │                               │                           │
   │ { sessionToken: "jwt...", 5m } │                           │
   │◄──────────────────────────────│                           │
   │                               │                           │
   │ GET /memory/:cid              │                           │
   │ Authorization: Bearer <jwt>    │                           │
   │──────────────────────────────►│                           │
   │                               │                           │
   │ { memory: {...} }             │                           │
   │◄──────────────────────────────│                           │
```

**Security properties:**
- ✅ No static tokens — session JWTs expire in 5 minutes
- ✅ Private key never leaves Agent B's server
- ✅ Nonce is one-time-use — replaying a captured signature fails
- ✅ Instant revocation via `revokeAccess()` on-chain (no waiting for token expiry)
- ✅ Agent discovery is automated — look up any agent by name
- ✅ Access grants are auditable — on-chain and transparent

**What needs to be built:**
- `AgentRegistry.sol` — register, grant, revoke, lookup, hasAccess
- Challenge-response endpoints on the API server (`/auth/challenge`, `/auth/verify`)
- Short-lived JWT session tokens (5-minute expiry)
- Client SDK wrapping the handshake into a single `client.getContext(agentName, cid)` call

---

### Option C: Short-Lived Signed Requests (Lightweight / No Registry)

A simpler alternative where **every API request is self-authenticating** — no registry contract needed, no session tokens.

**Flow:**

```
Agent B → API:
  {
    "did":       "did:key:z6Mk...",
    "memoryCid": "bafybe...",
    "timestamp": 1710000000,
    "nonce":     "a8f3c2d1",
    "signature": "0x7b2f..."  ← signed with Agent B's private key
  }

API verifies:
  1. Signature is valid for the DID's public key
  2. Timestamp is within last 30 seconds (prevents replay)
  3. Nonce hasn't been used before (prevents reuse)
  4. A UCAN delegation exists from memory owner → this DID
```

**Security properties:**
- ✅ No static tokens or session management
- ✅ Every request is unique (timestamp + nonce)
- ✅ Private key never leaves Agent B's server
- ✅ Simpler than Option A — no smart contract needed
- ❌ No agent discovery — Agent B must know Agent A's CIDs upfront
- ❌ Delegation management is still off-chain (UCAN-based)
- ❌ No instant revocation — relies on UCAN expiry

**What needs to be built:**
- Signed request middleware on the API server
- Nonce tracking (in-memory or Redis) to prevent replay
- Request signing utility for Agent B's SDK

---

### Comparison

| | Option A (Registry + Challenge-Response) | Option C (Signed Requests) |
|---|---|---|
| **Discovery** | ✅ On-chain registry — lookup by name | ❌ Manual — must know CIDs |
| **Static secrets on Agent B** | ❌ None (only private key in .env) | ❌ None (only private key in .env) |
| **Replay protection** | ✅ One-time nonces | ✅ Timestamp + nonce |
| **Revocation** | ✅ Instant via on-chain `revokeAccess()` | ❌ Wait for UCAN expiry |
| **Complexity** | Higher — needs smart contract | Lower — pure API |
| **Gas costs** | Yes — registry + grant txns | None |
| **Best for** | Production, multi-agent ecosystems | Prototypes, simple 1-to-1 sharing |

---

## Summary

| Area | Status | Notes |
|---|---|---|
| Solidity contract | ✅ Compiles | fhEVM 0.6.2 compatible, gateway decryption implemented |
| Security | ✅ Fixed | Recovery key removed, .gitignore updated |
| Storacha upload (frontend) | 🟡 Fallback | Attempts real upload, falls back to simulation |
| Zama vault (frontend) | 🟡 Simulated | Needs deployed contract + wallet |
| UCAN auth (frontend) | ✅ Real | Real Ed25519 identity + delegation + verification |
| Auth-gated retrieval | 🟠 Backend only | `AgentRuntime` supports it, frontend doesn't expose it yet |
| Agent orchestration | ✅ Built | `AgentRuntime` class ties all services together |
| UCAN revocation | 🟠 Missing | Time-based expiry only |
| **Auth mechanism** | 🔴 Planned | Static tokens → challenge-response signing (Option A) |
| **Agent discovery** | 🔴 Planned | On-chain registry with name-based lookup (Option A) |
| **Signed requests** | 🔴 Planned | Per-request signatures as lightweight alternative (Option C) |
| Library duplication | 🔵 Workaround | Synced copies, needs monorepo |
| CI/CD | 🔵 Missing | No automated pipeline |

---

*This document reflects the state of the project as of February 2026.*

