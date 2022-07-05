import * as dotenv from "dotenv";
import { ethers } from "hardhat";

dotenv.config();

async function main() {
  const provider = new ethers.providers.InfuraProvider("mainnet", {
    projectId: process.env.INFURA_PROJECT_ID,
    projectSecret: process.env.INFURA_PROJECT_SECRET,
  });
  // const provider = ethers.providers.getDefaultProvider("mainnet");
  console.log(provider);

  // const a = await provider.getFeeData();
  // console.log(a);

  // provider.on("0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640", () => {
  provider.on(
    {
      address: "0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640",
    },
    (log, event) => {
      console.log(log, event);
    }
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
