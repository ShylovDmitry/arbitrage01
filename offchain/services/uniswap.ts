import { Pool } from '@uniswap/v3-sdk';
import { Token } from '@uniswap/sdk-core';
import { UniswapApiPool } from './uniswap.api';
import { getChainId } from '../helpers';

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

export async function getSwapPaths(
    pools: UniswapApiPool[]
): Promise<[UniswapApiPool, UniswapApiPool, UniswapApiPool][]> {
    const swapPaths: [UniswapApiPool, UniswapApiPool, UniswapApiPool][] = [];

    const ethPools = pools.filter(({ token0, token1 }) => token0.symbol === 'WETH' || token1.symbol === 'WETH');
    const nonEthPools = pools.filter(({ token0, token1 }) => token0.symbol !== 'WETH' && token1.symbol !== 'WETH');

    for (let i = 0; i < ethPools.length; i++) {
        const pool0 = ethPools[i];

        for (let j = 0; j < ethPools.length; j++) {
            if (i === j) continue;
            const pool2 = ethPools[j];

            const findToken0 = pool0.token0.symbol !== 'WETH' ? pool0.token0 : pool0.token1;
            const findToken1 = pool2.token0.symbol !== 'WETH' ? pool2.token0 : pool2.token1;

            nonEthPools
                .filter(({ token0, token1 }) => {
                    return (
                        (token0.id === findToken0.id && token1.id === findToken1.id) ||
                        (token0.id === findToken1.id && token1.id === findToken0.id)
                    );
                })
                .map((pool1) => {
                    swapPaths.push([pool0, pool1, pool2]);
                });
        }
    }
    return swapPaths;
}
