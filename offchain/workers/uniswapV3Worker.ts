import { parentPort, workerData } from "worker_threads";
import { UniswapApiPool } from "../interfaces/uniswapApiPool";
import { UniswapApiTick } from "../interfaces/uniswapApiTick";
import { gql, GraphQLClient } from "graphql-request";

const poolsLimit = workerData.poolsLimit;

const endpointHttp =
  "https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3";

const client = new GraphQLClient(endpointHttp);

async function getPools(
  first: number,
  skip: number = 0
): Promise<UniswapApiPool[]> {
  const query = gql`
    query getPools($first: Int, $skip: Int) {
      pools(
        first: $first
        skip: $skip
        orderBy: volumeUSD
        orderDirection: desc
      ) {
        id
        feeTier
        sqrtPrice
        liquidity
        tick
        ticks(first: 1000) {
          index: tickIdx
          liquidityNet
          liquidityGross
        }
        token0 {
          id
          name
          symbol
          decimals
        }
        token1 {
          id
          name
          symbol
          decimals
        }
      }
    }
  `;
  const data = await client.request(query, { first, skip });
  return data.pools;
}

async function getTicksForPool(
  poolId: string,
  ticksFirst: number,
  ticksSkip: number
): Promise<UniswapApiTick[]> {
  const query = gql`
    query getTicks($poolId: String, $ticksFirst: Int, $ticksSkip: Int) {
      pool(id: $poolId) {
        ticks(first: $ticksFirst, skip: $ticksSkip) {
          index: tickIdx
          liquidityNet
          liquidityGross
        }
      }
    }
  `;

  const data = await client.request(query, { poolId, ticksFirst, ticksSkip });
  return data.pool.ticks;
}

async function next(pools: UniswapApiPool[]) {
  await Promise.all(
    pools.map(async (pool) => {
      if (pool.ticks.length === 1000) {
        let ticks: UniswapApiTick[];
        const ticksLimit = pool.ticks.length;
        let ticksSkip = 0;

        do {
          ticksSkip += ticksLimit;
          ticks = await getTicksForPool(pool.id, ticksLimit, ticksSkip);
          pool.ticks = [...pool.ticks, ...ticks];
        } while (ticks.length > 0);
      }
      return pool;
    })
  );

  parentPort!.postMessage(pools);
}

parentPort!.on("message", async () => {
  const numRequests = Math.floor(poolsLimit / 1000);
  const restRequests = poolsLimit % 1000;
  let requestLimits = [...Array(numRequests).keys()].map((val) =>
    val ? 1000 * val : 1000
  );
  if (restRequests) {
    requestLimits.push(restRequests);
  }

  try {
    const pools = (
      await Promise.all(
        requestLimits.map((val, index) => getPools(val, index * 1000))
      )
    ).flat();

    await next(pools);
  } catch (e) {
    // console.error("ERROR", (e as Error).message);
  }
});

// (async () => {
//   const numRequests = Math.floor(poolsLimit / 1000);
//   const restRequests = poolsLimit % 1000;
//   let requests = [...Array(numRequests).keys()].map((val) =>
//     val ? 1000 * val : 1000
//   );
//   if (restRequests) {
//     requests.push(restRequests);
//   }
//
//   try {
//     // const pools = await getPools(poolsLimit);
//     const pools = (
//       await Promise.all(
//         requests.map((val, index) => getPools(val, index * 1000))
//       )
//     ).flat();
//
//     await next(pools);
//   } catch (e) {
//     console.error("ERROR", (e as Error).message);
//   }
// })();

// cron.schedule("* * * * *", async () => {
//   try {
//     const pools = await getPools(poolsLimit);
//     await next(pools);
//   } catch (e) {
//     console.error("ERROR", (e as Error).message);
//   }
// });
