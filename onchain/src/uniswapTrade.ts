import * as dotenv from "dotenv";
import { ethers } from "hardhat";
import fs from "fs";
import { BigNumber } from "@ethersproject/bignumber";

dotenv.config();

export async function uniswapTrade(
  networkName: string,
  amountIn: BigNumber,
  profitAmount: BigNumber,
  token0: string,
  fee01: string,
  token1: string,
  fee12: string,
  token2: string,
  fee23: string,
  token3: string
) {
  const gasLimit = 350000;

  const provider = new ethers.providers.InfuraProvider(networkName, {
    projectId: process.env.INFURA_PROJECT_ID,
    projectSecret: process.env.INFURA_PROJECT_SECRET,
  });

  const { maxFeePerGas, maxPriorityFeePerGas, gasPrice } =
    await provider.getFeeData();
  console.log("feeData", { maxFeePerGas, maxPriorityFeePerGas, gasPrice });

  if (!gasPrice || !maxPriorityFeePerGas) {
    console.error(
      "ERROR: feeData does not exists: gasPrice, maxPriorityFeePerGas"
    );
    return;
  }

  const profitAmountLeft = profitAmount.sub(
    gasPrice.add(maxPriorityFeePerGas).mul(gasLimit)
  );
  if (profitAmountLeft.lte(0)) {
    console.error(
      `ERROR: Not Profitable after Fee ${ethers.utils.formatEther(
        profitAmountLeft
      )} ETH`
    );
    return;
  }

  // console.log(`---- PROFIT: ${ethers.utils.formatEther(profitAmountLeft)} ETH`);
  // return;

  const [deployer] = await ethers.getSigners();
  console.log("Account:", await deployer.getAddress());
  console.log(
    "Account balance BEFORE:",
    (await deployer.getBalance()).toString()
  );

  const { contactAddress, contactAbi } = getContactData(networkName);
  const contact = new ethers.Contract(contactAddress, contactAbi, provider);

  const path = ethers.utils.solidityPack(
    ["uint160", "uint24", "uint160", "uint24", "uint160", "uint24", "uint160"],
    [token0, fee01, token1, fee12, token2, fee23, token3]
  );

  console.log([token0, fee01, token1, fee12, token2, fee23, token3]);

  const trade = await contact
    .connect(deployer)
    .swap(path, { value: amountIn, maxPriorityFeePerGas, gasLimit });
  await trade.wait();

  console.log("UniswapTrade says:", trade);
  console.log(
    "Account balance AFTER:",
    (await deployer.getBalance()).toString()
  );
}

function getContactData(networkName: string) {
  const { UniswapTrade: contactAddress } = JSON.parse(
    String(
      fs.readFileSync(
        `${__dirname}/../data/${networkName}/UniswapTradeAddress.json`
      )
    )
  );
  const { abi: contactAbi } = JSON.parse(
    String(
      fs.readFileSync(`${__dirname}/../data/${networkName}/UniswapTrade.json`)
    )
  );

  return { contactAddress, contactAbi };
}
