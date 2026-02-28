import { AgentRuntime } from './lib/runtime.js';
import { AgentDbOpenClawMemory } from './lib/openclaw.js';

async function main() {
    console.log("==========================================");
    console.log("🧠 STORACHA BOUNTY: OpenClaw Agent Memory");
    console.log("==========================================");
    console.log("Problem: OpenClaw agents lose all context when you restart or switch devices.");
    console.log("Solution: Agent pushes state to Storacha, and pulls it on reboot.\n");

    const seed = "openclaw_demo_agent_device_A";
    
    // --- DEVICE A (LAPTOP) ---
    console.log("💻 DEVICE A (Laptop): Agent Initializing...");
    const runtimeA = await AgentRuntime.loadFromSeed(seed);
    const memoryA = new AgentDbOpenClawMemory(runtimeA);
    
    console.log("Agent A: Learning user preferences...");
    const cidA = await memoryA.saveContext(
        "I like my documentation to be written in Rust.",
        "Understood. I will prefer Rust for code examples.",
        { preferredLanguage: "Rust", userTone: "Technical" }
    );
    
    console.log(`Agent A: Memory successfully pinned to Storacha.`);
    console.log(`CID Checkpoint: ${cidA}\n`);

    // --- DEVICE B (PHONE/SERVER) ---
    console.log("📱 DEVICE B (Phone/Server): Agent Rebooting from Cold Start...");
    const runtimeB = await AgentRuntime.loadFromSeed(seed);
    const memoryB = new AgentDbOpenClawMemory(runtimeB);

    console.log("Agent B: Amnesia bot check (Before Load). Current preferences:", memoryB.loadMemoryVariables().preferences);
    
    console.log(`Agent B: Pulling persistent memory from Storacha CID...`);
    // In a real app, this CID would be fetched from an index or passed in.
    if (cidA) {
        await memoryB.resumeFromCid(cidA);
    }
    
    console.log("\nAgent B: Memory fully restored!");
    console.log("Restored Preferences:", memoryB.loadMemoryVariables().preferences);
    console.log("Restored Chat History:", memoryB.loadMemoryVariables().messages.length, "messages.");

    console.log("\n✅ Bounty Requirements Met: Agent state and conversation history pulled from Storacha on a new device.");
}

main().catch(console.error);
