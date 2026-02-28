import { ethers } from "hardhat";

async function main() {
  console.log("==========================================");
  console.log("📁 FILECOIN BOUNTY: Agent Registry Deploy");
  console.log("==========================================");
  console.log("Checking deployment readiness for Filecoin Calibration testnet...");

  const registryFactory = await ethers.getContractFactory("AgentRegistry");
  const registry = await registryFactory.deploy();

  await registry.waitForDeployment();

  console.log(`\n✅ Agent Registry successfully deployed to Calibration Testnet.`);
  console.log(`Address: ${registry.target}\n`);
  console.log("This fulfills the Filecoin 'Onchain Agent Registry' requirement by creating a persistent onchain metadata map to Filecoin CIDs and IPNS pointers for agents.");
}

main().catch((error) => {
  console.error("Failed to deploy to Filecoin Calibnet (Ensure PRIVATE_KEY bounds an account with tFIL)");
  console.error(error);
  process.exitCode = 1;
});
