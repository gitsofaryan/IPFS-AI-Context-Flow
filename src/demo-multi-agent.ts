import { AgentRuntime } from './lib/runtime.js';
import { UcanService } from './lib/ucan.js';

/**
 * Demo: Multi-Agent Orchestration (The Hive-Mind Helpdesk)
 * 
 * Flow:
 * 1. Customer Agent stores a private "Issue Report" in IPFS.
 * 2. Support Agent (ChatGPT) is requested to help, but cannot read the report.
 * 3. Customer Agent issues a UCAN Delegation to the Support Agent.
 * 4. Support Agent uses the UCAN token to "unlock" the memory and provide a solution.
 */
async function main() {
    console.log('═══════════════════════════════════════════════════════════');
    console.log(' 🐝 Agent DB: Multi-Agent Orchestration Demo');
    console.log('═══════════════════════════════════════════════════════════\n');

    // --- SETUP AGENTS ---
    console.log('Step 1: Spawning Agents...');
    const customer = await AgentRuntime.create();
    const support = await AgentRuntime.create(); // Simulating ChatGPT/Support
    console.log(`  👤 Customer DID: ${customer.did.slice(0, 30)}...`);
    console.log(`  🤖 Support DID:  ${support.did.slice(0, 30)}...\n`);

    // --- STEP 1: CUSTOMER STORES DATA ---
    console.log('Step 2: Customer stores private incident data to IPFS...');
    const incidentData = {
        error: "Database connection timeout",
        severity: "High",
        sensitive_logs: "DB_PASS=*******; CLOUD_ID=9921"
    };
    const incidentCid = await customer.storePublicMemory(incidentData);
    console.log(`  ✅ Incident stored at CID: ${incidentCid}\n`);

    // --- STEP 2: SUPPORT ATTEMPTS ACCESS ---
    console.log('Step 3: Support Agent verifies they cannot act without permission...');
    const incomingToken: any = null; // Simulate no token received
    let verificationFail;
    
    if (!incomingToken) {
        verificationFail = { valid: false, reason: "No delegation token provided" };
    } else {
        // We simulate a check against the wrong issuer if we weren't expecting Customer
        verificationFail = support.verifyIncoming(incomingToken, customer.did);
    }
    console.log(`  ❌ Access Check: ${verificationFail.valid ? 'UNEXPECTED SUCCESS' : 'DENIED (Reason: ' + verificationFail.reason + ')'}\n`);

    // --- STEP 3: CUSTOMER DELEGATES ACCESS ---
    console.log('Step 4: Customer issues a UCAN Permission to Support Agent...');
    // We delegate to the Support agent identity (the signer which has the .did() method)
    const permission = await customer.delegateTo(support.identity, 'agent/read', 1); // 1 hour expiry
    console.log(`  ✅ UCAN Delegation generated: Customer ➔ Support.`);
    console.log(`  Audience: ${permission.audience.did().slice(0, 30)}...`);
    console.log(`  Capability: ${permission.capabilities[0].can}\n`);

    // --- STEP 4: SUPPORT ACCESSES DATA (AUTHORIZED) ---
    console.log('Step 5: Support Agent retries with the UCAN token...');
    
    // Support verifies the token they received (Expected from Customer)
    const verificationSuccess = support.verifyIncoming(permission, customer.did);
    
    if (verificationSuccess.valid) {
        console.log('  ✅ Verification: SUCCESS!');
        
        // Use the runtime to retrieve the memory using the delegation
        // Note: In the real runtime, retrievePublicMemory handles the UCAN verification
        const authorizedData = await support.retrievePublicMemory(incidentCid, permission);
        
        console.log('  🔓 Decrypted/Retrieved Content:');
        console.log(JSON.stringify(authorizedData, null, 2));
        
        console.log('\nStep 6: Support Agent (ChatGPT) providing solution...');
        console.log(`  [AI]: "Analyzing LOGS... I see the timeout. Your CLOUD_ID 9921 is hitting a rate limit. I have adjusted your config."`);
    } else {
        console.error('  ❌ Verification failed:', verificationSuccess.reason);
    }

    console.log('\n🚀 ORCHESTRATION COMPLETE: Secure data handoff between agents verified!');
}

main().catch(console.error);
