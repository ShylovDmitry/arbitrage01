import uniswapToken from "@uniswap/default-token-list";
import { Token } from "@uniswap/sdk-core";
import { ChainId } from "@uniswap/sdk";
// import { ethers } from "ethers";
// import { POOL_ADDRESSES } from "./constants";
// import { PoolImmutables } from "./interfaces/poolImmutables";
// import { PoolState } from "./interfaces/poolState";

const uniswapTokenObj: {
  [key: string]: { [key: string]: typeof uniswapToken.tokens[0] };
} = {};
for (let i = 0; i < uniswapToken.tokens.length; i++) {
  const token = uniswapToken.tokens[i];
  if (typeof uniswapTokenObj[token.chainId] === "undefined") {
    uniswapTokenObj[token.chainId] = {};
  }
  uniswapTokenObj[token.chainId][token.symbol] = token;
}

export function getUniswapTokenObjByName(chainId: number, name: string) {
  return uniswapTokenObj[chainId][name];
}

export function getChainId() {
  return ChainId.MAINNET;
}

export function getToken(name: string): Token {
  const chainId = getChainId();
  const tokenObj = getUniswapTokenObjByName(chainId, name);
  return new Token(
    chainId,
    tokenObj.address,
    tokenObj.decimals,
    tokenObj.symbol,
    tokenObj.name
  );
}

// export function getUniswapTokenObjByAddress(chainId: number, address: string) {
//   return Object.values(uniswapTokenObj[chainId]).find(
//     (token) => token.address === address
//   );
// }

// export function getTokenByAddress(address: string): Token | null {
//   const chainId = getChainId();
//   const tokenObj = getUniswapTokenObjByAddress(chainId, address);
//   return tokenObj
//     ? new Token(
//         chainId,
//         tokenObj.address,
//         tokenObj.decimals,
//         tokenObj.symbol,
//         tokenObj.name
//       )
//     : null;
// }

// export function findPoolAddress(token0: Token, token1: Token): string {
//   return (
//     POOL_ADDRESSES[`${token0.symbol}_${token1.symbol}`] ||
//     POOL_ADDRESSES[`${token1.symbol}_${token0.symbol}`]
//   );
// }

// export async function getPoolImmutables(
//   poolContract: ethers.Contract
// ): Promise<PoolImmutables> {
//   const [factory, token0, token1, fee, tickSpacing, maxLiquidityPerTick] =
//     await Promise.all([
//       poolContract.factory(),
//       poolContract.token0(),
//       poolContract.token1(),
//       poolContract.fee(),
//       poolContract.tickSpacing(),
//       poolContract.maxLiquidityPerTick(),
//     ]);
//
//   return {
//     factory,
//     token0,
//     token1,
//     fee,
//     tickSpacing,
//     maxLiquidityPerTick,
//   };
// }

// export async function getPoolState(
//   poolContract: ethers.Contract
// ): Promise<PoolState> {
//   const [liquidity, slot] = await Promise.all([
//     poolContract.liquidity(),
//     poolContract.slot0(),
//   ]);
//
//   return {
//     liquidity,
//     sqrtPriceX96: slot[0],
//     tick: slot[1],
//     observationIndex: slot[2],
//     observationCardinality: slot[3],
//     observationCardinalityNext: slot[4],
//     feeProtocol: slot[5],
//     unlocked: slot[6],
//   };
// }
