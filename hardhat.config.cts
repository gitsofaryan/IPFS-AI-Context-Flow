import type { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
require("dotenv").config();

const config: HardhatUserConfig = {
  solidity: "0.8.24",
  networks: {
    sephora: {
      url: "https://rpc.sephora.zama.ai",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
    filecoinCalibration: {
      url: "https://api.calibration.node.glif.io/rpc/v1",
      chainId: 314159,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    }
  },
};

export default config;
