/**
 * Demo: Public Context & Skills Platform Flow
 *
 * This script demonstrates the REAL production logic where:
 * 1. The API Server holds NO private keys.
 * 2. Agents generate identities locally (simulating a wallet-based SDK).
 * 3. Agents publish contexts to the Platform Registry.
 * 4. Agents query the Platform Registry.
 * 5. Agent A SIGNS a UCAN locally and SUBMITS it to the Platform to grant Agent B access.
 *
 * Prerequisites: Start the server first with:
 *   npm run server
 */

import { UcanService } from '../lib/ucan.js';

const API_BASE = process.env.API_URL || 'http://localhost:3001';

async function main() {
    console.log('═══════════════════════════════════════════════════════════>');
    console.log(' 🌍 gitsofaryan|anu-sin-theta: Public Context & Skills Platform x IPFS AI');
    console.log('═══════════════════════════════════════════════════════════>\n');

    // Simulated wallet signatures
    const walletSigA = "0x" + "a".repeat(128); // e.g., 64-byte hex signature
    const walletSigB = "0x" + "b".repeat(128);

    // ── Step 1: SDK (Client-Side) Login with Wallet ────────────────
    console.log('Step 1: Agents login via Wallet (Calculated Locally)...');

    // In production, the SDK creates the identity. The API never knows the private key!
    const agentA = await UcanService.createIdentityFromSignature(walletSigA);
    const agentB = await UcanService.createIdentityFromSignature(walletSigB);

    console.log(`  Agent A (Publisher) DID: ${agentA.did()}`);
    console.log(`  Agent B (Subscriber) DID: ${agentB.did()}\n`);

    // ── Step 2: Publish a Public Skill ─────────────────────────────
    console.log('Step 2: Agent A publishes a PUBLIC skill...');
    const publicSkillRes = await fetch(`${API_BASE}/api/memory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            did: agentA.did(),
            visibility: 'public',
            name: 'DeFi Trading Strategy',
            description: 'A prompt and context for analyzing token swaps on Uniswap.',
            context: { prompt: 'Analyze swap...', tokens: ['UNI', 'USDC'] }
        }),
    });
    const publicSkill = await publicSkillRes.json();
    console.log(`  Published Public CID: ${publicSkill.cid}\n`);

    // ── Step 3: Publish a Private Skill ────────────────────────────
    console.log('Step 3: Agent A publishes a PRIVATE skill...');
    const privateSkillRes = await fetch(`${API_BASE}/api/memory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            did: agentA.did(),
            visibility: 'private',
            name: 'Alpha Trading Signals',
            description: 'Premium trading signals.',
            context: { signal: 'BUY ETH', confidence: 0.99 }
        }),
    });
    const privateSkill = await privateSkillRes.json();
    console.log(`  Published Private CID: ${privateSkill.cid}\n`);

    // ── Step 4: Agent B Browses the Platform ───────────────────────
    console.log('Step 4: Agent B browses the Public Skills Registry (Platform API)...');
    const skillsRes = await fetch(`${API_BASE}/api/skills`);
    const skillsData = await skillsRes.json();
    console.log(`  Found ${skillsData.count} public skill(s):`);
    skillsData.skills.forEach((s: any) => {
        console.log(`    - [${s.name}] (CID: ${s.cid})`);
    });
    console.log('');

    // ── Step 5: Agent B Accesses Public Skill ──────────────────────
    console.log('Step 5: Agent B fetches Public Skill (No Auth required)...');
    const publicFetch = await fetch(`${API_BASE}/api/memory/${publicSkill.cid}`);
    const publicData = await publicFetch.json();
    console.log(`  Status: ${publicFetch.status}`);
    console.log(`  Verification: ${publicData.verification}`);
    console.log(`  Context: ${JSON.stringify(publicData.memory)}\n`);

    // ── Step 6: Agent A delegates to Agent B (Client-Side!) ────────
    console.log('Step 6: Agent A locally signs a UCAN + pushes to Platform...');

    // SDK does this locally using Agent A's private key. The server never signs!
    const delegation = await UcanService.issueDelegation(agentA, agentB, 'agent/read', 24);
    const ucanBase64 = await UcanService.delegationToBase64(delegation);

    console.log(`  -> Agent A generated UCAN token locally.`);

    // Agent A sends it to the Platform's registry for Agent B
    const pushDelegationRes = await fetch(`${API_BASE}/api/delegations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ucanBase64, memoryCids: [privateSkill.cid] }),
    });
    const pushResult = await pushDelegationRes.json();
    console.log(`  -> Server checked the math and stored it: ${pushResult.message}\n`);

    // ── Step 7: Agent B fetches their Delegations ──────────────────
    console.log('Step 7: Agent B polls Platform for their UCAN tokens...');
    const myDelegationsRes = await fetch(`${API_BASE}/api/delegations/${agentB.did()}`);
    const myDelegations = await myDelegationsRes.json();
    console.log(`  Agent B has ${myDelegations.count} token(s) waiting.`);
    const myToken = myDelegations.delegations[0].base64Token;

    // ── Step 8: Agent B fetches Private Skill with UCAN ────────────
    console.log('\nStep 8: Agent B fetches Private Skill using their UCAN Bearer Token...');
    const privateSuccess = await fetch(`${API_BASE}/api/memory/${privateSkill.cid}`, {
        headers: { 'Authorization': `Bearer ${myToken}` }
    });
    const privateData = await privateSuccess.json();
    console.log(`  Status: ${privateSuccess.status}`);
    console.log(`  Verification: ${privateData.verification}`);
    console.log(`  Context: ${JSON.stringify(privateData.memory)}\n`);

    console.log('🚀 PROD-READY PLATFORM FLOW COMPLETE!');
}

main().catch(err => {
    console.error('Demo failed:', err.message);
    process.exit(1);
});
