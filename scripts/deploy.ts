import { ethers } from "hardhat";

async function main() {
  console.log("Preparing to deploy Encrypted Agent Memory Zama Contract...");
  
  const EncryptedAgentMemory = await ethers.getContractFactory("EncryptedAgentMemory");
  const contract = await EncryptedAgentMemory.deploy();

  await contract.waitForDeployment();

  console.log(`\n✅ EncryptedAgentMemory deployed to: ${await contract.getAddress()}`);
  console.log("--------------------------------------------------");
  console.log("Web3 Data Flow:");
  console.log("1. Public Memory -> IPFS (Storacha)");
  console.log("2. Private Memory -> Zama fhEVM (This Contract)");
  console.log("3. Access Control -> UCAN Delegations");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
