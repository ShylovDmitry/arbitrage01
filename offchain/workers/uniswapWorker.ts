import { parentPort, workerData } from "worker_threads";
import { UniswapApiPool } from "../interfaces/uniswapApiPool";
import { UniswapApiTick } from "../interfaces/uniswapApiTick";
import { gql, GraphQLClient } from "graphql-request";
import { SubscriptionClient } from "subscriptions-transport-ws";
import ws from "ws";

const poolsLimit = workerData.poolsLimit;

const endpointHttp =
  "https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3";
const endpointWs = "wss://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3";

const client = new GraphQLClient(endpointHttp);
const clientWs = new SubscriptionClient(endpointWs, { reconnect: true }, ws);

const rawPoolsMap = new Map<
  string,
  Pick<UniswapApiPool, "liquidity" | "sqrtPrice" | "tick">
>();

async function getPoolIds(
  first: number,
  skip: number = 0
): Promise<{ id: string }[]> {
  const query = gql`
    query getPools($first: Int, $skip: Int) {
      pools(
        first: $first
        skip: $skip
        orderBy: volumeUSD
        orderDirection: desc
      ) {
        id
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

function subscribeToPool(
  poolId: string,
  { next }: { next(pool: UniswapApiPool): void }
) {
  const query = gql`
    subscription ($poolId: String) {
      pool(id: $poolId) {
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

  clientWs.request({ query, variables: { poolId } }).subscribe({
    next(results: any) {
      next(results.data.pool);
    },
    error(error: any) {
      console.error(error);
    },
    complete() {
      console.log("com");
    },
  });
}

function subscribeToPoolFake({ next }: { next(pool: UniswapApiPool): void }) {
  const query = gql`
    subscription aaa($poolId: String) {
      pool(id: $poolId) {
        id
      }
    }
  `;

  clientWs
    .request({
      query,
      variables: { poolId: "0x0002e63328169d7feea121f1e32e4f620abf0352" },
    })
    .subscribe({
      next(results: any) {
        console.log(results);
      },
      error(error: any) {
        console.error(error);
      },
      complete() {
        console.log("com");
      },
    });
}

async function next(pool: UniswapApiPool) {
  const rawPool = rawPoolsMap.get(pool.id);

  if (
    !rawPool ||
    rawPool.liquidity !== pool.liquidity ||
    rawPool.sqrtPrice !== pool.sqrtPrice ||
    rawPool.tick !== pool.tick
  ) {
    rawPoolsMap.set(pool.id, {
      liquidity: pool.liquidity,
      sqrtPrice: pool.sqrtPrice,
      tick: pool.tick,
    });

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

    parentPort!.postMessage([pool]);
  }
}

(async () => {
  const pools = await getPoolIds(poolsLimit);
  console.log(pools.length);

  subscribeToPoolFake({ next });
  // pools.forEach((pool) => {
  //   subscribeToPool(pool.id, { next });
  // });
})();
