import { getToken } from "../helpers";
import uniswapApiService from "./uniswap.api";
import { ProfitableThreeSwapPath } from "../interfaces/profitableThreeSwapPath";
import { CurrencyAmount } from "@uniswap/sdk-core";
import { ethers } from "ethers";
import { createPool, generateThreeSwapPaths } from "./uniswap";
import { uniswapTrade } from "../../onchain/src/uniswapTrade";
import { UniswapApiPool } from "../interfaces/uniswapApiPool";

const WETH = getToken("WETH");

async function getProfitableThreeSwapPaths(
  amountInEth: number,
  swapPaths: [UniswapApiPool, UniswapApiPool, UniswapApiPool][]
): Promise<ProfitableThreeSwapPath[]> {
  const amountIn = CurrencyAmount.fromRawAmount(
    WETH,
    ethers.utils.parseUnits(amountInEth.toString(), WETH.decimals).toString()
  );

  const profitableSwapPaths: ProfitableThreeSwapPath[] = [];
  for (const [pool0, pool1, pool2] of swapPaths) {
    try {
      const [amountOut0] = await createPool(pool0).getOutputAmount(amountIn);
      const [amountOut1] = await createPool(pool1).getOutputAmount(amountOut0);
      const [amountOut2] = await createPool(pool2).getOutputAmount(amountOut1);

      const profitAmount = amountOut2.subtract(amountIn);

      if (profitAmount.greaterThan(0)) {
        profitableSwapPaths.push({
          amountIn,
          profitAmount,
          pool0,
          pool1,
          pool2,
        });
      }
    } catch (e) {
      // console.log(createPool(pool0), createPool(pool1), createPool(pool2));
      // console.error(e);
      // break;
    }
  }
  return profitableSwapPaths;
}

function displayThreeProfit({
  amountIn,
  profitAmount,
  pool0,
  pool1,
  pool2,
}: ProfitableThreeSwapPath) {
  console.log(`-----------------`);
  console.log(
    `[${pool0.token0.symbol}, ${pool0.token1.symbol}] [${pool1.token0.symbol}, ${pool1.token1.symbol}] [${pool2.token0.symbol}, ${pool2.token1.symbol}]`
  );
  console.log(
    `pool0: ${pool0.id} tokens [${pool0.token0.id} ${pool0.token1.id}] fee ${pool0.feeTier}`
  );
  console.log(
    `pool1: ${pool1.id} tokens [${pool1.token0.id} ${pool1.token1.id}] fee ${pool0.feeTier}`
  );
  console.log(
    `pool2: ${pool2.id} tokens [${pool2.token0.id} ${pool2.token1.id}] fee ${pool0.feeTier}`
  );
  console.log(`Input Amount: ${amountIn.toExact()} ETH`);
  console.log(
    `Profit: ${profitAmount.toExact()} ETH (~ ${profitAmount
      .multiply(1000)
      .toFixed(2)} USD)`
  );
  console.log(
    `Diff: ${profitAmount
      .multiply(Math.pow(10, WETH.decimals))
      .multiply(100)
      .divide(
        CurrencyAmount.fromRawAmount(
          WETH,
          ethers.utils.parseUnits("1", WETH.decimals).toString()
        )
      )
      .toFixed(4)}%`
  );
}

export async function tradeThree(minProfitAmountEth: string) {
  console.log(new Date().toString());

  console.info("INFO: retrieving pools...");
  console.time("a");
  const pools = await uniswapApiService.getAllPools();
  console.timeEnd("a");

  console.info("INFO: generating swaps...");
  const swapPaths = await generateThreeSwapPaths(pools);

  console.time("ProfitableSwapPaths");

  console.info(
    `INFO: finding profitable swaps for ${minProfitAmountEth} ETH...`
  );
  const profitableSwapsArray = await Promise.all([
    // await getProfitableThreeSwapPaths(0.1, swapPaths),
    // await getProfitableThreeSwapPaths(0.15, swapPaths),
    // await getProfitableThreeSwapPaths(0.3, swapPaths),
    // await getProfitableThreeSwapPaths(0.4, swapPaths),
    await getProfitableThreeSwapPaths(0.5, swapPaths),
    await getProfitableThreeSwapPaths(1, swapPaths),
    await getProfitableThreeSwapPaths(1.5, swapPaths),
    await getProfitableThreeSwapPaths(2, swapPaths),
    // await getProfitableThreeSwapPaths(2.5, swapPaths),
    // await getProfitableThreeSwapPaths(3, swapPaths),
  ]);

  const minProfitAmount = CurrencyAmount.fromRawAmount(
    WETH,
    ethers.utils.parseUnits(minProfitAmountEth, WETH.decimals).toString()
  );

  const profitableSwaps = profitableSwapsArray
    .flat()
    .filter((swap) => swap.profitAmount.greaterThan(minProfitAmount))
    .sort((a, b) =>
      a.profitAmount.toExact().localeCompare(b.profitAmount.toExact())
    );
  // profitableSwaps.map(displayThreeProfit);

  const mostProfitableSwap = profitableSwaps[profitableSwaps.length - 1];
  if (mostProfitableSwap) {
    console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!");
    console.log("----- Most Profitable -----");
    displayThreeProfit(mostProfitableSwap);

    const { amountIn, pool0, pool1, pool2, profitAmount } = mostProfitableSwap;

    await uniswapTrade(
      "mainnet",
      ethers.utils.parseUnits(amountIn.toExact(), WETH.decimals),
      ethers.utils.parseUnits(profitAmount.toExact(), WETH.decimals),
      pool0.token0.id.toLowerCase() === WETH.address.toLowerCase()
        ? pool0.token0.id
        : pool0.token1.id,
      pool0.feeTier,
      pool0.token0.id.toLowerCase() !== WETH.address.toLowerCase()
        ? pool0.token0.id
        : pool0.token1.id,
      pool1.feeTier,
      pool2.token0.id.toLowerCase() !== WETH.address.toLowerCase()
        ? pool2.token0.id
        : pool2.token1.id,
      pool2.feeTier,
      pool2.token0.id.toLowerCase() === WETH.address.toLowerCase()
        ? pool2.token0.id
        : pool2.token1.id
    );
  } else {
    console.log("No swaps");
  }

  console.timeEnd("ProfitableSwapPaths");
  console.log("");
}
