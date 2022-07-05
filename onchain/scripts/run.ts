import * as dotenv from "dotenv";
import hre, { ethers } from "hardhat";
import { uniswapTrade } from "../src/uniswapTrade";

dotenv.config();

async function main() {
  const networkName = hre.network.name;
  console.log("NETWORK:", networkName);

  const WETH = "0xc778417E063141139Fce010982780140Aa0cD5Ab";
  const fee0 = "3000";
  const DAI = "0xaD6D458402F60fD3Bd25163575031ACDce07538D";
  const fee1 = "3000";
  const UNI = "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984";
  const fee2 = "3000";
  // const path = ethers.utils.solidityPack(
  //   ["uint160", "uint24", "uint160", "uint24", "uint160", "uint24", "uint160"],
  //   [WETH, fee0, DAI, fee1, UNI, fee2, WETH]
  // );
  const amountIn = ethers.utils.parseUnits("100", 9);

  await uniswapTrade(
    networkName,
    amountIn,
    WETH,
    fee0,
    DAI,
    fee1,
    UNI,
    fee2,
    WETH
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
