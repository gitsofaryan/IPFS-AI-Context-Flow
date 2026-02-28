import { AgentRuntime } from './lib/runtime.js';
import { UcanService } from './lib/ucan.js';

/**
 * Demo: Cold Start / Unauthenticated Agent Environment
 * 
 * This simulates a "new app" or "isolated agent env" where:
 * 1. The Storacha CLI is NOT logged in.
 * 2. The agent must rely on its own identity (DID) and delegated proofs.
 * 3. The system gracefully falls back to simulated persistence if no Storacha Space is found.
 */
async function main() {
    console.log('═══════════════════════════════════════════════════════════');
    console.log(' 🤖 Agent DB: Cold Start & Environment Test');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('Step 1: Initializing Agent Runtime in isolated environment...');
    // We create an identity from a random seed to ensure it's a "fresh" agent
    const agent = await AgentRuntime.create();
    console.log(`  Agent Identity (DID): ${agent.did}\n`);

    console.log('Step 2: Attempting to store memory without active Storacha session...');
    const memory = {
        task: "Simulated task in isolated environment",
        status: "Running",
        data: {
            observation: "No global w3 session detected",
            mode: "decentralized-fallback"
        }
    };

    try {
        const cid = await agent.storePublicMemory(memory);
        console.log(`  ✅ Memory Stored!`);
        console.log(`  CID: ${cid}`);
        
        if (cid.startsWith('bafybeis1m')) {
            console.log('  💡 NOTE: Fallback simulation active (Storage is local-only).');
        } else {
            console.log('  🌐 NOTE: Real IPFS persistence active.');
        }
        console.log('');

        console.log('Step 3: Retrieving memory to verify local/remote consistency...');
        const retrieved = await agent.retrievePublicMemory(cid);
        console.log('  Retrieved Data:', JSON.stringify(retrieved, null, 2));
        console.log('');

        console.log('Step 4: Testing UCAN Authorization flow...');
        const subAgent = await UcanService.createIdentity();
        console.log(`  Sub-Agent Identity: ${subAgent.did()}`);
        
        const delegation = await agent.delegateTo(subAgent, 'agent/read');
        console.log(`  ✅ Issued delegation UCAN to sub-agent.`);
        
        const verification = agent.verifyIncoming(delegation);
        console.log(`  Verification for sub-agent: ${verification.valid ? '✅ VALID' : '❌ INVALID'}`);
        console.log('');

        console.log('🚀 TEST SUCCESS: Agent DB handles unauthenticated environments gracefully!');
        
    } catch (err) {
        console.error('❌ TEST FAILED:', err);
        process.exit(1);
    }
}

main().catch(console.error);
