import { Worker } from "worker_threads";
import { ChainId } from "@uniswap/sdk";
import { Pool } from "@uniswap/v3-sdk";
import { CurrencyAmount, Token, WETH9 } from "@uniswap/sdk-core";
import { ethers } from "ethers";
import { UniswapApiPool } from "./interfaces/uniswapApiPool";
import { createPool } from "./services/uniswap";

enum AppState {
  NONE,
  INITIALIZING,
  INITIALIZED,
}
let appState: AppState = AppState.INITIALIZING;
const poolsLimit = 101;

const WETH = WETH9[ChainId.MAINNET];

const poolsMap = new Map<string, Pool>();
const flowsMap = new Map<string, [string, string, string]>();
const poolToFlowsMap = new Map<string, Set<string>>();

console.info("Retrieving pools");
const worker = new Worker("./offchain/workerProxy.js", {
  workerData: {
    path: "./workers/uniswapWorker.ts",
    poolsLimit,
  },
});

worker.on("message", (pools: UniswapApiPool[]) => {
  pools.map((pool) => {
    poolsMap.set(pool.id, createPool(pool));
    poolToFlowsMap.set(pool.id, new Set());
  });

  console.log(poolsMap.size);
  if (appState === AppState.INITIALIZING && poolsMap.size === poolsLimit) {
    appState = AppState.INITIALIZED;
    console.info("Pools are retrieved");
    findFlows();
    calculate();
  }
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

function calculate() {
  const amountInEth = 1;
  const amountIn = CurrencyAmount.fromRawAmount(
    WETH,
    ethers.utils.parseUnits(amountInEth.toString(), WETH.decimals).toString()
  );

  const profitableSwaps: {
    flowKey: string;
    amountIn: CurrencyAmount<Token>;
    profitAmount: CurrencyAmount<Token>;
  }[] = [];
  flowsMap.forEach(async (pools, flowKey) => {
    const [amountOut0] = await poolsMap
      .get(pools[0])!
      .getOutputAmount(amountIn);
    const [amountOut1] = await poolsMap
      .get(pools[1])!
      .getOutputAmount(amountOut0);
    const [amountOut2] = await poolsMap
      .get(pools[2])!
      .getOutputAmount(amountOut1);

    const profitAmount = amountOut2.subtract(amountIn);

    // if (profitAmount.greaterThan(0)) {
    profitableSwaps.push({
      flowKey,
      amountIn,
      profitAmount,
    });
    // }
  });

  const minProfitAmount = CurrencyAmount.fromRawAmount(
    WETH,
    ethers.utils.parseUnits("0", WETH.decimals).toString()
  );
  profitableSwaps
    .filter((swap) => swap.profitAmount.greaterThan(minProfitAmount))
    .sort((a, b) =>
      a.profitAmount.toExact().localeCompare(b.profitAmount.toExact())
    )
    .map((swap) => {
      console.log(
        swap.flowKey,
        swap.amountIn.toExact(),
        swap.profitAmount.toExact()
      );
    });
}

// worker
// - parse and subscribe to pools (filter by liquidity) and ticks
// - send update for pools
// - bounce to send every 1 min? move to main
//
// main
// - keeps all pools -> Set pools[address] = pool
// - keeps all flows -> Map [pool, pool, pool][]
// - poolInFlow -> Set poolInFlow[address] = [1, 4, 5]
// - calculate

// import ws from "ws";
// const { SubscriptionClient } = require("subscriptions-transport-ws");
//
// const { request, gql, GraphQLClient } = require("graphql-request");
//
// (async () => {
//   const query = gql`
//     query pools {
//       pools(first: 1, orderBy: volumeUSD, orderDirection: desc) {
//         id
//         feeTier
//         sqrtPrice
//         liquidity
//         tick
//         token0 {
//           symbol
//         }
//         token1 {
//           symbol
//         }
//       }
//     }
//   `;
//
//   const result = await request(
//     "https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3",
//     query
//   );
//   console.log(result.pools);
//
//   console.log("-----");
//
//   // const queryWs = gql`
//   //   subscription pool {
//   //     pool(id: "${result.pools[0].id}") {
//   //       id
//   //       feeTier
//   //       sqrtPrice
//   //       liquidity
//   //       tick
//   //       token0 {
//   //         symbol
//   //       }
//   //       token1 {
//   //         symbol
//   //       }
//   //     }
//   //   }
//   // `;
//   //
//   // const clientWs = new SubscriptionClient(
//   //   "wss://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3",
//   //   { reconnect: true },
//   //   ws
//   // );
//   // const observable = clientWs.request({ query: queryWs });
//   // observable.subscribe({
//   //   next(results: any) {
//   //     console.log(results);
//   //   },
//   //   error(error: any) {
//   //     console.log(error);
//   //   },
//   //   complete() {
//   //     console.log("com");
//   //   },
//   // });
//
//   const queryWs = gql`
//     subscription pool {
//       ticks(where: {poolAddress: "${result.pools[0].id}"}) {
//         id
//         liquidityNet
//         liquidityGross
//       }
//     }
//   `;
//
//   const clientWs = new SubscriptionClient(
//     "wss://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3",
//     { reconnect: true },
//     ws
//   );
//   const observable = clientWs.request({ query: queryWs });
//   observable.subscribe({
//     next(results: any) {
//       console.log(results);
//     },
//     error(error: any) {
//       console.log(error);
//     },
//     complete() {
//       console.log("com");
//     },
//   });
// })();
