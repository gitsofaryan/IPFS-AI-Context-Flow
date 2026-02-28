import { StorachaService } from './lib/storacha.js';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

async function main() {
    console.log("🛠️ Testing Local Storage Persistence Fallback...");

    const testContext = {
        message: "Hello persistent world!",
        timestamp: new Date().toISOString(),
        randomId: Math.random().toString(36).substring(7)
    };

    console.log("1. Uploading memory (simulating missing Storacha space)...");
    const cid = await StorachaService.uploadMemory(testContext);
    console.log(`Generated CID: ${cid}`);

    const cachePath = path.join(process.cwd(), '.agent_storage', `${cid}.json`);
    const exists = await fs.access(cachePath).then(() => true).catch(() => false);
    
    if (exists) {
        console.log(`✅ Success: Data saved locally to ${cachePath}`);
    } else {
        console.error("❌ Failure: Local file not found.");
        process.exit(1);
    }

    console.log("2. Fetching memory back...");
    const fetched = await StorachaService.fetchMemory(cid);
    
    if (JSON.stringify(fetched) === JSON.stringify(testContext)) {
        console.log("✅ Success: Data retrieved matches original.");
    } else {
        console.error("❌ Failure: Data mismatch.");
        console.log("Expected:", testContext);
        console.log("Actual:", fetched);
        process.exit(1);
    }

    console.log("\n🎉 Production Hardening: Local Storage Reliability Verified.");
}

main().catch(console.error);
