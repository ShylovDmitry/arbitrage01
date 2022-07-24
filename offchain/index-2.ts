import { Worker } from "worker_threads";
import { ChainId } from "@uniswap/sdk";
import { Pair } from "@uniswap/v2-sdk";
import { Pool } from "@uniswap/v3-sdk";
import { CurrencyAmount, Token, WETH9 } from "@uniswap/sdk-core";
import { ethers } from "ethers";
import { UniswapApiPool } from "./interfaces/uniswapApiPool";
import { createPool } from "./services/uniswap";
import { createPair } from "./services/uniswapV2";
import cron from "node-cron";
import { UniswapV2ApiPair } from "./interfaces/uniswapV2ApiPair";

const WETH = WETH9[ChainId.MAINNET];

const pairsV2Map = new Map<string, Pair>();
const poolsV3Map = new Map<string, Pool>();

const pairNamesV2Map = new Map<string, Pair>();
const poolNamesV3Map = new Map<string, Pool[]>();
let workerV2IsFinished = false;
let workerV3IsFinished = false;

const workerV2 = new Worker("./offchain/workerProxy.js", {
  workerData: {
    path: "./workers/uniswapV2Worker.ts",
    pairsLimit: 500,
  },
});

workerV2.on("message", async (pairs: UniswapV2ApiPair[]) => {
  // console.info("Pairs are retrieved");

  pairsV2Map.clear();
  pairNamesV2Map.clear();

  pairs.map((pair) => {
    if (pair.token0.symbol === "WETH" || pair.token1.symbol === "WETH") {
      const tokenName =
        pair.token0.symbol === "WETH" ? pair.token1.symbol : pair.token0.symbol;

      pairsV2Map.set(pair.id, createPair(pair));

      pairNamesV2Map.set(tokenName, createPair(pair));
    }
  });

  workerV2IsFinished = true;
  await calculate();
});

const workerV3 = new Worker("./offchain/workerProxy.js", {
  workerData: {
    path: "./workers/uniswapV3Worker.ts",
    poolsLimit: 500,
  },
});

workerV3.on("message", async (pools: UniswapApiPool[]) => {
  // console.info("Pools are retrieved");

  poolsV3Map.clear();
  poolNamesV3Map.clear();

  pools.map((pool) => {
    if (pool.token0.symbol === "WETH" || pool.token1.symbol === "WETH") {
      const tokenName =
        pool.token0.symbol === "WETH" ? pool.token1.symbol : pool.token0.symbol;

      poolsV3Map.set(pool.id, createPool(pool));

      const pools = poolNamesV3Map.get(tokenName) || [];
      pools.push(createPool(pool));
      poolNamesV3Map.set(tokenName, pools);
    }
  });

  workerV3IsFinished = true;
  await calculate();
});

async function calculate() {
  if (!workerV2IsFinished || !workerV3IsFinished) {
    return;
  }
  console.log("calculating...");

  const resultPromises: any[] = [];
  pairNamesV2Map.forEach((pair, tokenName) => {
    const pools = poolNamesV3Map.get(tokenName) || [];
    if (!pools.length) {
      return;
    }

    resultPromises.push(
      pools.map(async (pool) => {
        const results = [];
        for (let i = 0.5; i <= 5; i += 0.5) {
          const amountIn = CurrencyAmount.fromRawAmount(
            WETH,
            ethers.utils.parseUnits(String(i), WETH.decimals).toString()
          );

          try {
            let amountOut: CurrencyAmount<Token>;

            [amountOut] = await pool.getOutputAmount(amountIn);
            [amountOut] = pair.getOutputAmount(amountOut);
            results.push({
              type: "V3 -> V2",
              tokenName,
              amountIn,
              amountOut,
              profitAmount: amountOut.subtract(amountIn),
            });

            [amountOut] = pair.getOutputAmount(amountIn);
            [amountOut] = await pool.getOutputAmount(amountOut);
            results.push({
              type: "V3 -> V2",
              tokenName,
              amountIn,
              amountOut,
              profitAmount: amountOut.subtract(amountIn),
            });
          } catch (e) {}
        }

        return results;
      })
    );
  });

  const results = await Promise.all(resultPromises.flat());

  results
    .flat()
    .filter((swap) => swap.profitAmount.greaterThan(0))
    .sort((a, b) => (a.profitAmount.greaterThan(b.profitAmount) ? 1 : -1))
    .map((swap) => {
      console.log(
        swap.tokenName,
        swap.type,
        swap.amountIn.toExact(),
        swap.amountOut.toExact(),
        swap.profitAmount.toExact(),
        `$${swap!.profitAmount.multiply(1500).toFixed(2)}`
      );
    });
}

cron.schedule("*/30 * * * * *", () => {
  console.info("Retrieving...", new Date().toString());
  workerV2IsFinished = false;
  workerV3IsFinished = false;
  workerV3.postMessage("run");
  workerV2.postMessage("run");
});
