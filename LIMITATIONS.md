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
| Library duplication | 🔵 Workaround | Synced copies, needs monorepo |
| CI/CD | 🔵 Missing | No automated pipeline |

---

*This document reflects the state of the project as of February 2026.*
