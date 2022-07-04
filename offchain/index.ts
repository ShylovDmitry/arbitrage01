import uniswapApiService, { UniswapApiPool } from "./services/uniswap.api";
import { createPool, getSwapPaths } from "./services/uniswap";
import { CurrencyAmount, Token } from "@uniswap/sdk-core";
import { ethers } from "ethers";
import { getToken } from "./helpers";

const WETH = getToken("WETH");

interface ProfitableSwapPath {
  amountIn: CurrencyAmount<Token>;
  profitAmount: CurrencyAmount<Token>;
  pool0: UniswapApiPool;
  pool1: UniswapApiPool;
  pool2: UniswapApiPool;
}

async function getProfitableSwapPaths(
  amountInEth: number,
  swapPaths: [UniswapApiPool, UniswapApiPool, UniswapApiPool][]
): Promise<ProfitableSwapPath[]> {
  const amountIn = CurrencyAmount.fromRawAmount(
    WETH,
    ethers.utils.parseUnits(amountInEth.toString(), WETH.decimals).toString()
  );

  const profitableSwapPaths: ProfitableSwapPath[] = [];
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

function displayProfit({
  amountIn,
  profitAmount,
  pool0,
  pool1,
  pool2,
}: ProfitableSwapPath) {
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

async function main() {
  const pools = await uniswapApiService.getAllPools();
  const swapPaths = await getSwapPaths(pools);

  console.time("ProfitableSwapPaths");

  const profit = await Promise.all([
    await getProfitableSwapPaths(0.5, swapPaths),
    await getProfitableSwapPaths(1, swapPaths),
    await getProfitableSwapPaths(1.5, swapPaths),
    await getProfitableSwapPaths(2, swapPaths),
    await getProfitableSwapPaths(2.5, swapPaths),
    await getProfitableSwapPaths(3, swapPaths),
  ]);

  const flat: ProfitableSwapPath[] = profit.flat();

  flat
    .sort((a, b) =>
      a.profitAmount.toExact().localeCompare(b.profitAmount.toExact())
    )
    .map(displayProfit);

  console.timeEnd("ProfitableSwapPaths");
}

main();
