import { UcanService } from "./src/lib/ucan.js";

async function test() {
    console.log("Starting Library Integration Test...");
    
    const master = await UcanService.createIdentity();
    const sub = await UcanService.createIdentity();
    
    console.log("✅ Identities Generated:");
    console.log("   Master:", master.did());
    console.log("   Sub:   ", sub.did());
    
    const delegation = await UcanService.issueDelegation(master, sub, 'agent/read');
    
    console.log("✅ UCAN Delegation Issued:");
    console.log("   CID:", delegation.cid.toString());
    
    if (delegation.issuer.did() === master.did() && delegation.audience.did() === sub.did()) {
        console.log("\n🚀 TEST PASSED: Production libraries are ready for the Frontend!");
    } else {
        throw new Error("Validation Failed!");
    }
}

test().catch(err => {
    console.error("Test Failed:", err);
    process.exit(1);
});
