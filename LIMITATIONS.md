# Limitations & Known Issues

> An honest assessment of the current state of Agent DB, what's simulated vs. real, and where the project needs work.

---

## 🔴 Critical Issues

### 1. Solidity Contract Compilation Failure

The `EncryptedAgentMemory.sol` contract has had compilation issues against the Zama fhEVM toolchain. An earlier version used the `inputProof` type (which was deprecated), and switching to `bytes calldata` resolved the type error — however, full end-to-end compilation and deployment on Zama Sephora has **not been verified** in the current codebase.

**Where it lies:** `contracts/EncryptedAgentMemory.sol` + `compile_error.txt`

**To fix:** Pin to a specific, tested version of the `fhevm` package and validate compilation against the exact Zama Sephora RPC endpoint. The `TFHE.sol` imports and `GatewayCaller` inheritance need to match the version deployed on the target network.

---

### 2. Exposed Recovery Key

The file `vault-recovery-key.txt` contains a **BIP-39 mnemonic phrase in plaintext**. Even if this is a testnet-only wallet, committing secrets to version control is a security anti-pattern.

**Where it lies:** `vault-recovery-key.txt` (root directory)

**To fix:** Delete from the repository, add to `.gitignore`, and use environment variables or a secrets manager instead. If this key was ever used on mainnet, consider it compromised.

---

## 🟡 Simulated / Incomplete Features

### 3. Frontend Storacha Upload is Mocked

The frontend's "Upload to Storacha" button does **not** call the actual `StorachaService.uploadMemory()` function. Instead, it returns a **hardcoded CID** (`bafybeigh4mv...`). The backend library (`src/lib/storacha.ts`) contains real upload logic, but the frontend never invokes it.

**Where it lies:** `frontend/src/app/page.tsx` → `handleUpload()` function

**To fix:** Wire up the actual `StorachaService` call. This requires the Storacha client to be initialized with a valid account (via `npx storacha login`) and a provisioned space. Browser-side uploads may require additional configuration for the w3up client.

---

### 4. Frontend Zama Vault is Fully Simulated

The "Store in Zama Vault" action in the frontend sets a **hardcoded string** (`0x5FbDB2315678... (FHE Encrypted)`) rather than interacting with any deployed smart contract.

**Where it lies:** `frontend/src/app/page.tsx` → `handleZama()` function

**To fix:** Integrate `ethers.js` (already a dependency) to connect to metamask or a wallet provider, then call the deployed `EncryptedAgentMemory.storeSecret()` function with proper FHE encryption via the Zama client SDK.

---

### 5. UCAN Delegation is Partially Real

Identity generation (`UcanService.createIdentity()`) works with real Ed25519 key generation. However, the **UCAN delegation** in the frontend is also mocked — clicking "Issue UCAN" just sets a static string rather than calling `UcanService.issueDelegation()`.

**Where it lies:** `frontend/src/app/page.tsx` → `handleIssueUcan()` function

**To fix:** Call the actual `UcanService.issueDelegation()` method and display the real delegation CID. The backend library already supports this fully.

---

## 🟠 Architectural Gaps

### 6. No Memory Retrieval Flow

The system demonstrates **storing** memory (upload to IPFS, store secret on-chain) but has **no retrieval or read path**. There's no way to:
- Fetch agent memory from a CID and parse it back into context
- Retrieve or decrypt FHE-encrypted secrets from the contract
- Verify a UCAN token to prove authorization before reading

**To fix:** Implement `StorachaService.fetchMemory(cid)` for IPFS retrieval. For Zama, implement a gateway decryption request flow. For UCAN, add token verification using `@ucanto/validator`.

---

### 7. No Agent Orchestration Layer

The project demonstrates each infrastructure component in isolation, but there's **no unified agent runtime** that ties them together. A real agent would need a coordinator that:
- Automatically persists context after each action cycle
- Checks UCAN authorization before sharing memory
- Routes sensitive vs. public data to the correct storage layer

**To fix:** Build an `AgentRuntime` class that wraps `StorachaService`, `UcanService`, and the FHE contract into a single coherent API.

---

### 8. No UCAN Verification / Revocation

UCAN tokens are issued but never **verified**. The `@ucanto/validator` package is listed as a dependency but unused. There's also no mechanism to revoke a delegation before its 24-hour expiration.

**Where it lies:** `src/lib/ucan.ts` — only issues delegations, never validates them

**To fix:** Implement `UcanService.verifyDelegation()` using `@ucanto/validator`. For revocation, consider a revocation list stored on IPFS or an on-chain registry.

---

### 9. No Gateway Decryption for FHE Secrets

The Solidity contract can store and compare encrypted values, but **reading the actual decrypted secret** requires Zama's Gateway decryption flow (`GatewayCaller`). This is referenced in the contract inheritance but never implemented.

**Where it lies:** `contracts/EncryptedAgentMemory.sol` — inherits `GatewayCaller` but doesn't use it

**To fix:** Implement a `requestDecrypt()` function that calls the Zama Gateway, along with a callback handler to receive the decrypted value.

---

## 🔵 Code Quality & DX

### 10. Duplicate Library Code

`src/lib/storacha.ts` and `frontend/src/lib/storacha.ts` are **identical files**. Same for `src/lib/ucan.ts` and `frontend/src/lib/ucan.ts`. Changes to one won't propagate to the other.

**To fix:** Extract shared libraries into a shared workspace package, or use a monorepo tool (Turborepo, Nx) to manage the dependency.

---

### 11. No Environment Configuration

The Hardhat config reads `process.env.PRIVATE_KEY` but there's no `.env.example` file or documentation on which environment variables are required. The Storacha client also needs account setup that isn't documented.

**To fix:** Add a `.env.example` with all required variables and document the Storacha account setup flow in the README.

---

### 12. No CI/CD or Automated Testing

The single integration test (`test/integration.test.ts`) tests UCAN delegation but:
- It's not wired to `npm test` (the script just echoes an error message)
- There are no tests for Storacha uploads or contract interactions
- No CI pipeline exists

**To fix:** Configure the `test` script in `package.json`, add Hardhat-based contract tests, and set up GitHub Actions for CI.

---

## Summary

| Area | Status | Effort to Fix |
|---|---|---|
| Solidity compilation | 🔴 Broken | Medium — version pinning + testing |
| Exposed secrets | 🔴 Security risk | Low — delete + gitignore |
| Storacha upload (frontend) | 🟡 Mocked | Medium — wire up real client |
| Zama vault (frontend) | 🟡 Mocked | High — needs wallet + FHE SDK |
| UCAN delegation (frontend) | 🟡 Partially mocked | Low — backend library is ready |
| Memory retrieval | 🟠 Missing | Medium |
| Agent orchestration | 🟠 Missing | High |
| UCAN verification | 🟠 Missing | Medium |
| FHE gateway decryption | 🟠 Missing | High |
| Code duplication | 🔵 Tech debt | Low — monorepo setup |
| Env configuration | 🔵 DX issue | Low |
| Testing & CI | 🔵 Missing | Medium |

---

*This document reflects the state of the project as of February 2026.*
