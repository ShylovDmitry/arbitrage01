import * as dotenv from "dotenv";

import { ethers } from "hardhat";

dotenv.config();

import { UniswapTrade } from "./../data/UniswapTradeAddress.json";
import { abi } from "./../data/UniswapTrade.json";

async function main() {
  const provider = new ethers.providers.InfuraProvider("ropsten", {
    projectId: process.env.INFURA_PROJECT_ID,
    projectSecret: process.env.INFURA_PROJECT_SECRET,
  });

  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);

  const gasPrice = await provider.getGasPrice();
  console.log("gasPrice", gasPrice.toString());

  const uniswapTrade = new ethers.Contract(UniswapTrade, abi, provider);

  const WETH = "0xc778417E063141139Fce010982780140Aa0cD5Ab";
  const fee0 = 3000;
  const DAI = "0xaD6D458402F60fD3Bd25163575031ACDce07538D";
  const fee1 = 3000;
  const UNI = "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984";
  const fee2 = 3000;
  const path = ethers.utils.solidityPack(
    ["uint160", "uint24", "uint160", "uint24", "uint160", "uint24", "uint160"],
    [WETH, fee0, DAI, fee1, UNI, fee2, WETH]
  );
  const amountIn = ethers.utils.parseUnits("100", 9); // gwei

  const a = await uniswapTrade
    .connect(wallet)
    .swap(path, { value: amountIn, gasPrice, gasLimit: 3000000 });
  await a.wait();

  console.log("UniswapTrade says:", a);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
