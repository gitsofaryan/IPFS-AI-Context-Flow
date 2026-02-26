/**
 * Demo: REST API Gateway — Full Agent-to-Agent Flow (PROD VERSION)
 *
 * This script demonstrates the production flow where a Web2 AI agent (Agent B)
 * can consume context from Agent A through the REST API Gateway.
 *
 * NOTE: Private keys and UCAN delegation happens entirely client-side.
 * The server acts ONLY as a verification and storage layer.
 *
 * Prerequisites: Start the server first with:
 *   npm run server
 */

import { UcanService } from '../lib/ucan.js';

const API_BASE = process.env.API_URL || 'http://localhost:3001';

async function main() {
    console.log('═══════════════════════════════════════════════════════════');
    console.log(' 🌐 REST API Gateway (PROD) — Agent-to-Agent Flow');
    console.log('═══════════════════════════════════════════════════════════\n');

    // ── Step 1: SDK Creates Client-Side Identities ─────────────────
    console.log('Step 1: Creating Agent A and B identities (Locally inside SDK)...');

    // Private keys stay local to the script/SDK
    const agentA = await UcanService.createIdentity();
    const agentB = await UcanService.createIdentity();

    console.log(`  Agent A DID: ${agentA.did()}`);
    console.log(`  Agent B DID: ${agentB.did()}\n`);

    // ── Step 2: Agent A Stores Memory ──────────────────────────────
    console.log('Step 2: Agent A publishes context to IPFS via API Gateway...');
    const memoryRes = await fetch(`${API_BASE}/api/memory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            did: agentA.did(),
            visibility: 'private',
            context: {
                status: 'exploring',
                goal: 'find-water',
                location: { x: 42, y: 17 },
                inventory: ['map', 'compass', 'torch'],
            }
        }),
    });
    const memory = await memoryRes.json();
    console.log(`  Memory CID: ${memory.cid}`);
    console.log(`  Simulated:  ${memory.simulated}\n`);

    // ── Step 3: Agent A Locally Creates Delegation & Pushes ────────
    console.log('Step 3: Agent A locally signs UCAN delegation and pushes to Platform...');

    // SDK creates the UCAN token LOCALLY.
    const delegation = await UcanService.issueDelegation(agentA, agentB, 'agent/read', 24);
    const ucanBase64 = await UcanService.delegationToBase64(delegation);

    const delegateRes = await fetch(`${API_BASE}/api/delegations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            ucanBase64,
            memoryCids: [memory.cid],
        }),
    });
    const delegationResult = await delegateRes.json();
    console.log(`  Delegation ID: ${delegationResult.delegationId}`);
    console.log(`  Message:       ${delegationResult.message}\n`);

    // ── Step 4: Agent B Fetches their Delegations ──────────────────
    console.log('Step 4: Agent B fetches their delegation tokens from Platform...');
    const fetchDlgRes = await fetch(`${API_BASE}/api/delegations/${agentB.did()}`);
    const fetchedDlgs = await fetchDlgRes.json();

    if (fetchedDlgs.count === 0) throw new Error("No delegations found for Agent B!");

    const tokenForB = fetchedDlgs.delegations[0].base64Token;
    console.log(`  Tokens fetched: ${fetchedDlgs.count}`);
    console.log(`  Token received: ${tokenForB.slice(0, 40)}...\n`);

    // ── Step 5: Agent B Retrieves Memory Without Token (Should Fail) ─
    console.log('Step 5: Agent B tries to access memory WITHOUT token...');
    const noAuthRes = await fetch(`${API_BASE}/api/memory/${memory.cid}`);
    const noAuth = await noAuthRes.json();
    console.log(`  Status: ${noAuthRes.status}`);
    console.log(`  Error:  ${noAuth.error}\n`);

    // ── Step 6: Agent B Retrieves Memory With Token (Should Succeed) ─
    console.log('Step 6: Agent B retrieves memory WITH UCAN Bearer token...');
    const authRes = await fetch(`${API_BASE}/api/memory/${memory.cid}`, {
        headers: {
            'Authorization': `Bearer ${tokenForB}`,
        },
    });
    const authResult = await authRes.json();
    console.log(`  Status:       ${authRes.status}`);
    console.log(`  Verification: ${authResult.verification}`);
    console.log(`  Issuer:       ${authResult.issuer}`);
    console.log(`  Audience:     ${authResult.audience}`);
    if (authResult.memory) {
        console.log(`  Memory:       ${JSON.stringify(authResult.memory).slice(0, 80)}...`);
    } else {
        console.log(`  Note:         ${authResult.note}`);
    }

    console.log('\n🚀 FULL API FLOW COMPLETE!');
}

main().catch(err => {
    console.error('Demo failed:', err.message);
    process.exit(1);
});
