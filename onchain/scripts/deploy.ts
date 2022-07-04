import { artifacts, ethers } from "hardhat";
import fs from "fs";
import { Contract } from "ethers";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(
    "Deploying the contracts with the account:",
    await deployer.getAddress()
  );

  console.log("Account balance:", (await deployer.getBalance()).toString());

  const UniswapTradeContact = await ethers.getContractFactory("UniswapTrade");
  const uniswapTrade = await UniswapTradeContact.deploy();

  await uniswapTrade.deployed();

  console.log("UniswapTrade deployed to:", uniswapTrade.address);

  saveFrontendFiles(uniswapTrade);
}

function saveFrontendFiles(contact: Contract) {
  const contractsDir = __dirname + "/../data";

  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir);
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
