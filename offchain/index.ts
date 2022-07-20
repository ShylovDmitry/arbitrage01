import { Worker } from "worker_threads";
import { ChainId } from "@uniswap/sdk";
import { Pool } from "@uniswap/v3-sdk";
import { CurrencyAmount, Token, WETH9 } from "@uniswap/sdk-core";
import { ethers } from "ethers";
import { UniswapApiPool } from "./interfaces/uniswapApiPool";
import { createPool } from "./services/uniswap";
import cron from "node-cron";
import { uniswapTrade } from "../onchain/src/uniswapTrade";

let isPaused = false;
const poolsLimit = 1000;
const ignoreTokens = ["AMPL"];
const WETH = WETH9[ChainId.MAINNET];

const poolsMap = new Map<string, Pool>();
const flowsMap = new Map<string, [string, string, string]>();
const poolToFlowsMap = new Map<string, Set<string>>();

interface SwapResult {
  flowKey: string;
  poolAddresses: [string, string, string];
  amountIn: CurrencyAmount<Token>;
  profitAmount: CurrencyAmount<Token>;
}

const worker = new Worker("./offchain/workerProxy.js", {
  workerData: {
    path: "./workers/uniswapWorker.ts",
    poolsLimit,
  },
});

worker.on("message", async (pools: UniswapApiPool[]) => {
  console.info("Pools are retrieved");

  pools.map((pool) => {
    poolsMap.set(pool.id, createPool(pool));
    poolToFlowsMap.set(pool.id, new Set());
  });

  findFlows();
  await calculate();
});

function findFlows() {
  const ethPools = new Map<string, Pool>();
  const nonEthPools = new Map<string, Pool>();

  poolsMap.forEach((pool, poolAddress) => {
    if (pool.token0.symbol === "WETH" || pool.token1.symbol === "WETH") {
      ethPools.set(poolAddress, pool);
    } else {
      nonEthPools.set(poolAddress, pool);
    }
  });

  ethPools.forEach((pool0, pool0Address) => {
    ethPools.forEach((pool2, pool2Address) => {
      const findToken1 =
        pool0.token0.symbol === "WETH" ? pool0.token1 : pool0.token0;
      const findToken2 =
        pool2.token0.symbol === "WETH" ? pool2.token1 : pool2.token0;

      if (
        ignoreTokens.includes(findToken1.symbol!) ||
        ignoreTokens.includes(findToken2.symbol!)
      ) {
        return;
      }

      nonEthPools.forEach((pool1, pool1Address) => {
        if (
          (pool1.token0.address === findToken1.address &&
            pool1.token1.address === findToken2.address) ||
          (pool1.token0.address === findToken2.address &&
            pool1.token1.address === findToken1.address)
        ) {
          const flowKey = `${pool0.fee}-${findToken1.symbol}-${pool1.fee}-${findToken2.symbol}-${pool2.fee}`;

          flowsMap.set(flowKey, [pool0Address, pool1Address, pool2Address]);
          poolToFlowsMap.get(pool0Address)!.add(flowKey);
          poolToFlowsMap.get(pool1Address)!.add(flowKey);
          poolToFlowsMap.get(pool2Address)!.add(flowKey);
        }
      });
    });
  });
}

async function swap(
  amountIn: CurrencyAmount<Token>,
  poolAddresses: [string, string, string],
  flowKey: string
): Promise<SwapResult | null> {
  try {
    const [amountOut0] = await poolsMap
      .get(poolAddresses[0])!
      .getOutputAmount(amountIn);
    const [amountOut1] = await poolsMap
      .get(poolAddresses[1])!
      .getOutputAmount(amountOut0);
    const [amountOut2] = await poolsMap
      .get(poolAddresses[2])!
      .getOutputAmount(amountOut1);

    const profitAmount = amountOut2.subtract(amountIn);

    return {
      flowKey,
      poolAddresses,
      amountIn,
      profitAmount,
    };
  } catch (e) {
    // console.error(e);
  }

  return null;
}

async function calculate() {
  const amountIn1 = CurrencyAmount.fromRawAmount(
    WETH,
    ethers.utils.parseUnits("1", WETH.decimals).toString()
  );
  // const amountIn2 = CurrencyAmount.fromRawAmount(
  //   WETH,
  //   ethers.utils.parseUnits("2", WETH.decimals).toString()
  // );
  // const amountIn3 = CurrencyAmount.fromRawAmount(
  //   WETH,
  //   ethers.utils.parseUnits("3", WETH.decimals).toString()
  // );

  const promiseSwaps: Promise<SwapResult | null>[] = [];
  flowsMap.forEach((poolAddresses, flowKey) => {
    promiseSwaps.push(swap(amountIn1, poolAddresses, flowKey));
    // promiseSwaps.push(swap(amountIn2, poolAddresses, flowKey));
    // promiseSwaps.push(swap(amountIn3, poolAddresses, flowKey));
  });
  const swaps = await Promise.all(promiseSwaps);

  const profitableSwaps = swaps
    .filter((swap) => swap !== null && swap.profitAmount.greaterThan(0))
    .sort((a, b) => (a!.profitAmount.greaterThan(b!.profitAmount) ? -1 : 1));

  // profitableSwaps.map((swap) => {
  //   console.log(
  //     swap!.flowKey,
  //     swap!.amountIn.toExact(),
  //     swap!.profitAmount.toExact(),
  //     `$${swap!.profitAmount.multiply(1000).toFixed(2)}`
  //     // swap!.poolAddresses
  //   );
  // });

  let usedPoolAddresses: string[] = [];
  let totalProfitAmount = CurrencyAmount.fromRawAmount(
    WETH,
    ethers.utils.parseUnits("0", WETH.decimals).toString()
  );
  const bestProfitableSwaps: SwapResult[] = [];
  for (const profitableSwap of profitableSwaps) {
    if (
      profitableSwap!.poolAddresses.some((poolAddress) =>
        usedPoolAddresses.includes(poolAddress)
      )
    ) {
      continue;
    }
    usedPoolAddresses = [
      ...usedPoolAddresses,
      ...profitableSwap!.poolAddresses,
    ];

    bestProfitableSwaps.push(profitableSwap!);
    totalProfitAmount = totalProfitAmount.add(profitableSwap!.profitAmount);

    if (bestProfitableSwaps.length == 3) {
      break;
    }
  }

  console.log("-------");
  bestProfitableSwaps.map((swap) => {
    console.log(
      swap!.flowKey,
      swap!.amountIn.toExact(),
      swap!.profitAmount.toExact(),
      `$${swap!.profitAmount.multiply(1000).toFixed(2)}`
    );
  });
  console.log(
    "totalProfit",
    totalProfitAmount.toExact(),
    `$${totalProfitAmount.multiply(1000).toFixed(2)}`
  );

  const minTotalProfitAmount = CurrencyAmount.fromRawAmount(
    WETH,
    ethers.utils.parseUnits("0.003", WETH.decimals).toString()
  );
  if (totalProfitAmount.greaterThan(minTotalProfitAmount)) {
    const packKeys: string[] = ["uint160"];
    const packValues: string[] = [WETH.address];
    let lastTokenAddress = WETH.address;
    bestProfitableSwaps.forEach((bestProfitableSwap) => {
      bestProfitableSwap.poolAddresses.forEach((poolAddress) => {
        const pool = poolsMap.get(poolAddress)!;
        lastTokenAddress =
          lastTokenAddress === pool.token0.address
            ? pool.token1.address
            : pool.token0.address;

        packKeys.push("uint24");
        packValues.push(String(pool.fee));
        packKeys.push("uint160");
        packValues.push(lastTokenAddress);
      });
    });

    const path = ethers.utils.solidityPack(packKeys, packValues);
    const res = await uniswapTrade(
      "mainnet",
      ethers.utils.parseUnits(amountIn1.toExact(), WETH.decimals),
      ethers.utils.parseUnits(totalProfitAmount.toExact(), WETH.decimals),
      path
    );
    if (res) {
      isPaused = true;
    }
  }
}

cron.schedule("* * * * *", () => {
  if (!isPaused) {
    console.info("Retrieving pools", new Date().toString());
    worker.postMessage("run");
  }
});
