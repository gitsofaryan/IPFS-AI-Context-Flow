import { AgentRuntime } from './lib/runtime.js';

async function main() {
    console.log("🔒 Testing Production Hardening: ECIES Private Memory Storage...");

    const agent = await AgentRuntime.loadFromSeed("private_vault_agent_test");
    console.log(`Agent DID: ${agent.did}`);

    const privateSecrets = {
        vault_code: "1234-5678-ABCD",
        trading_strategy: "buy low, sell high",
        user_ssn: "000-00-0000"
    };

    console.log("1. Storing private memory (Encrypted via ECIES)...");
    const cid = await agent.storePrivateMemory(privateSecrets);
    console.log(`Private Memory saved to IPFS (Encrypted): ${cid}`);

    console.log("2. Attempting to retrieve and decrypt...");
    const decrypted = await agent.retrievePrivateMemory(cid);
    
    if (JSON.stringify(decrypted) === JSON.stringify(privateSecrets)) {
        console.log("✅ Success: Private memory successfully decrypted and matches original.");
    } else {
        console.error("❌ Failure: Decryption yielded incorrect data.");
        process.exit(1);
    }

    // Optional: Show that it fails for another agent (conceptually)
    console.log("3. Verifying unauthorized access fails (simulation)...");
    const agentB = await AgentRuntime.loadFromSeed("different_agent");
    try {
        await agentB.retrievePrivateMemory(cid);
        console.error("❌ Failure: Different agent was able to decrypt!");
        process.exit(1);
    } catch (err) {
        console.log("✅ Success: Different agent failed to decrypt (as expected).");
    }

    console.log("\n🎉 Security Hardening: ECIES Private Storage Verified.");
}

main().catch(console.error);
