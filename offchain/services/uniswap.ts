import { Pool } from "@uniswap/v3-sdk";
import { Token } from "@uniswap/sdk-core";
import { UniswapApiPool } from "./uniswap.api";
import { getChainId } from "../helpers";

export function createPool(pool: UniswapApiPool): Pool {
  const token0 = new Token(
    getChainId(),
    pool.token0.id,
    Number(pool.token0.decimals),
    pool.token0.symbol,
    pool.token0.name
  );
  const token1 = new Token(
    getChainId(),
    pool.token1.id,
    Number(pool.token1.decimals),
    pool.token1.symbol,
    pool.token1.name
  );

  return new Pool(
    token0,
    token1,
    Number(pool.feeTier),
    pool.sqrtPrice,
    pool.liquidity,
    Number(pool.tick),
    pool.ticks
      .map((tick) => ({
        ...tick,
        index: Number(tick.index),
      }))
      .sort((a, b) => a.index - b.index)
  );
}

export async function generateThreeSwapPaths(
  pools: UniswapApiPool[]
): Promise<[UniswapApiPool, UniswapApiPool, UniswapApiPool][]> {
  const swapPaths: [UniswapApiPool, UniswapApiPool, UniswapApiPool][] = [];

  const ethPools = pools.filter(
    ({ token0, token1 }) => token0.symbol === "WETH" || token1.symbol === "WETH"
  );
  const nonEthPools = pools.filter(
    ({ token0, token1 }) => token0.symbol !== "WETH" && token1.symbol !== "WETH"
  );

  for (let i = 0; i < ethPools.length; i++) {
    const pool0 = ethPools[i];

    for (let j = 0; j < ethPools.length; j++) {
      if (i === j) continue;
      const pool2 = ethPools[j];

      const findToken1 =
        pool0.token0.symbol !== "WETH" ? pool0.token0 : pool0.token1;
      const findToken2 =
        pool2.token0.symbol !== "WETH" ? pool2.token0 : pool2.token1;

      nonEthPools
        .filter(
          ({ token0, token1 }) =>
            (token0.id === findToken1.id && token1.id === findToken2.id) ||
            (token0.id === findToken2.id && token1.id === findToken1.id)
        )
        .forEach((pool1) => {
          swapPaths.push([pool0, pool1, pool2]);
        });
    }
  }
  return swapPaths;
}

export async function generateFourSwapPaths(
  pools: UniswapApiPool[]
): Promise<[UniswapApiPool, UniswapApiPool, UniswapApiPool, UniswapApiPool][]> {
  const swapPaths: [
    UniswapApiPool,
    UniswapApiPool,
    UniswapApiPool,
    UniswapApiPool
  ][] = [];

  const ethPools = getEthPools(pools);
  const nonEthPools = getNonEthPools(pools);

  for (let i = 0; i < ethPools.length; i++) {
    const pool0 = ethPools[i];

    for (let j = 0; j < ethPools.length; j++) {
      if (i === j) continue;
      const pool3 = ethPools[j];

      const findToken1 =
        pool0.token0.symbol !== "WETH" ? pool0.token0 : pool0.token1;
      const findToken3 =
        pool3.token0.symbol !== "WETH" ? pool3.token0 : pool3.token1;

      const nonEthPools1 = nonEthPools.filter(({ token0, token1 }) => {
        return token0.id === findToken1.id || token1.id === findToken1.id;
      });

      for (let k = 0; k < nonEthPools1.length; k++) {
        const pool1 = nonEthPools1[k];

        const findToken2 =
          pool1.token0.symbol !== findToken1.symbol
            ? pool1.token0
            : pool1.token1;

        nonEthPools
          .filter(
            ({ token0, token1 }) =>
              (token0.id === findToken2.id && token1.id === findToken3.id) ||
              (token0.id === findToken3.id && token1.id === findToken2.id)
          )
          .forEach((pool2) => {
            swapPaths.push([pool0, pool1, pool2, pool3]);
          });
      }
    }
  }
  return swapPaths;
}

export function getEthPools(pools: UniswapApiPool[]): UniswapApiPool[] {
  return pools.filter(
    ({ token0, token1 }) => token0.symbol === "WETH" || token1.symbol === "WETH"
  );
}

export function getNonEthPools(pools: UniswapApiPool[]): UniswapApiPool[] {
  return pools.filter(
    ({ token0, token1 }) => token0.symbol !== "WETH" && token1.symbol !== "WETH"
  );
}
