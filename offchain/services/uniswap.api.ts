import axios from "axios";
import axiosRetry from "axios-retry";
import { UniswapApiTick } from "../interfaces/uniswapApiTick";
import { UniswapApiPool } from "../interfaces/uniswapApiPool";

axiosRetry(axios, { retries: 3, retryDelay: axiosRetry.exponentialDelay });

const endpoint = "https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3";

async function getTicksForPool(
  poolId: string,
  ticksFirst: number,
  ticksSkip: number
): Promise<UniswapApiTick[]> {
  const response = await axios({
    url: endpoint,
    method: "post",
    data: {
      query: `query TicksForPool($poolId: String, $ticksFirst: Int, $ticksSkip: Int) {
                pool(id: $poolId) {
                    ticks(first: $ticksFirst, skip: $ticksSkip) {
                      index: tickIdx
                      liquidityNet
                      liquidityGross
                    }
                }
            }`,
      variables: {
        poolId,
        ticksFirst,
        ticksSkip,
      },
    },
  });

  if (response.data.errors) {
    console.log("ERROR");
    console.log(response.data);
  }
  // console.log(response.data.errors);
  // console.log(response.data.data.pool.ticks);
  return response.data.data.pool.ticks;
}

async function getPools(
  first: number,
  skip: number
): Promise<UniswapApiPool[]> {
  const response = await axios({
    url: endpoint,
    method: "post",
    data: {
      query: `query Pools($first: Int, $skip: Int) {
                pools(first: $first, skip: $skip, orderBy: volumeUSD, orderDirection: desc) {
                    id
                    feeTier
                    sqrtPrice
                    liquidity
                    tick
                    ticks {
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
            }`,
      variables: {
        first,
        skip,
      },
    },
  });

  // console.log(response.data.errors);
  const pools: UniswapApiPool[] = response.data.data.pools;

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
  return pools;
}

export async function getAllPools(): Promise<UniswapApiPool[]> {
  const limit = 1000;
  const result = await Promise.all(
    [...Array(1).keys()].map((val) => getPools(limit, val * limit))
  );
  return result.flat();
}

export default {
  getAllPools,
};
