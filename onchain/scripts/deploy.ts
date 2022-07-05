import { artifacts, ethers } from "hardhat";
import fs from "fs";
import { Contract } from "ethers";
import hre from "hardhat";

async function main() {
  const networkName = hre.network.name;
  console.log("NETWORK:", networkName);

  const [deployer] = await ethers.getSigners();
  console.log("Account:", await deployer.getAddress());

  console.log(
    "Account balance BEFORE:",
    (await deployer.getBalance()).toString()
  );

  const UniswapTradeContact = await ethers.getContractFactory("UniswapTrade");
  const uniswapTrade = await UniswapTradeContact.deploy();

  await uniswapTrade.deployed();

  console.log("UniswapTrade deployed to:", uniswapTrade.address);
  console.log(
    "Account balance AFTER:",
    (await deployer.getBalance()).toString()
  );

  saveFrontendFiles(networkName, uniswapTrade);
}

function saveFrontendFiles(networkName: string, contact: Contract) {
  const contractsDir = __dirname + `/../data/${networkName}`;

  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir, { recursive: true });
  }

  fs.writeFileSync(
    contractsDir + "/UniswapTradeAddress.json",
    JSON.stringify({ UniswapTrade: contact.address }, undefined, 2)
  );

  const UniswapTradeArtifact = artifacts.readArtifactSync("UniswapTrade");

  fs.writeFileSync(
    contractsDir + "/UniswapTrade.json",
    JSON.stringify(UniswapTradeArtifact, null, 2)
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
