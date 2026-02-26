# Changelog

All notable changes to the Agent Context Service and related components are documented here.

## [Unreleased] - 2026-02-26

### Added
- **Deterministic Identity (`src/lib/ucan.ts`)**: Added `createIdentityFromSignature` to generate Ed25519 DIDs deterministically from wallet signatures (enabling "No Visible Auth").
- **Public Skills Registry (`src/server/index.ts`)**: Added `GET /api/skills` endpoint to discover publicly published agent contexts/skills.
- **Context Visibility (`src/server/index.ts`)**: Updated `POST /api/memory` to accept a `visibility` flag (`public` or `private`), allowing public fetching without UCAN authentication.
- **Client-Side Delegation (`src/server/index.ts`)**: Added `POST /api/delegations` and `GET /api/delegations/:did` to allow clients to push and retrieve locally signed UCAN tokens, removing server-side signing.
- **Marketplace Demo (`src/demos/public-skills-flow.ts`)**: Added a new demo script showcasing the public skills discovery and deterministic identity flow.
- **Demo Script (`package.json`)**: Added `npm run demo:platform` command.

### Changed
- **API Gateway Architecture (`src/server/index.ts`)**: Refactored the server into a production-ready, unprivileged Indexer & IPFS Pinner. It no longer generates or stores private keys.
- **API Gateway Demo (`src/demos/api-gateway-flow.ts`)**: Updated the demo to perform identity generation and UCAN token signing entirely client-side before interacting with the API.
- **Documentation (`LIMITATIONS.md`)**: Added architectural proposals for Challenge-Response Auth (Option A), Signed Requests (Option C), and IPFS Payload Encryption for true data sovereignty.

### Removed
- **Server-Side Identity Storage (`src/server/index.ts`)**: Removed the `POST /api/identity` endpoint and `agentStore` that centrally held agent private keys and generated random identities.
