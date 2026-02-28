# Changelog

All notable changes to **Agent DB SDK** are documented here.

## [1.3.0] - 2026-03-02
### Added
- **ECIES Encryption (`src/lib/encryption.ts`)**: Implemented ECIES with NIST P-256 for secure, large-payload private memory on IPFS.
- **File-Based Persistence**: Upgraded `StorachaService` to cache memory blocks in `~/.agent-db/cache`, ensuring data survives agent restarts.
- **Safe IPNS Concurrency**: Added `syncStream()` in `AgentRuntime` to prevent race conditions during collaborative IPNS updates.
- **Runtime Schema Validation**: Integrated `zod` into `storePublicMemory()` to enforce data integrity on agent payloads.
- **Structured Error Handling**: Introduced `ValidationError`, `StorageError`, `AuthenticationError`, and `NetworkError` classes.
- **Hardening Test Suite**: Added `src/test-persistence.ts`, `src/test-encryption.ts`, and `src/test-dx.ts`.

### Changed
- **Version Bump**: Released production-hardened SDK v1.3.0.

## [1.2.0] - 2026-03-01
### Added
- **Hackathon Track Alignment**:
    - **Storacha**: Added `OpenClaw` adapter for persistent agent memory.
    - **Filecoin**: Deployed `AgentRegistry.sol` to Calibration Testnet for decentralized agent discovery.
    - **Zama**: Added `ConfidentialFinance.sol` for FHE-based trade verification.
    - **Lit Protocol**: Integrated Vincent API for autonomous wallet management with guardrails.
- **Demos**: Added `demo:openclaw`, `demo:filecoin`, `demo:defi`, and `demo:lit`.

## [1.1.0] - 2026-02-28
### Added
- **Deterministic Identity**: Gated Ed25519 DIDs behind wallet signatures via `UcanService`.
- **Public Skills Discovery**: Added endpoints and demos for publishing and finding public agent contexts.
- **Sovereign Authorization**: Client-side UCAN signing for zero-server-privilege state updates.

## [1.0.0] - 2026-02-20
### Added
- **Initial Release**: Core `AgentRuntime` with IPFS storage and UCAN authentication.
- **LangChain Integration**: First-class memory adapter for LangChain agents.
