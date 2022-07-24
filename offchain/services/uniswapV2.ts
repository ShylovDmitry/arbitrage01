import { CurrencyAmount, Token } from "@uniswap/sdk-core";
import { getChainId } from "../helpers";
import { UniswapV2ApiPair } from "../interfaces/uniswapV2ApiPair";
import { Pair } from "@uniswap/v2-sdk";
import { ethers } from "ethers";

export function createPair(pair: UniswapV2ApiPair): Pair {
  const token0 = new Token(
    getChainId(),
    pair.token0.id,
    Number(pair.token0.decimals),
    pair.token0.symbol,
    pair.token0.name
  );
  const token1 = new Token(
    getChainId(),
    pair.token1.id,
    Number(pair.token1.decimals),
    pair.token1.symbol,
    pair.token1.name
  );

  const currencyToken0 = CurrencyAmount.fromRawAmount(
    token0,
    ethers.utils.parseUnits(pair.reserve0, token0.decimals).toString()
  );

  const currencyToken1 = CurrencyAmount.fromRawAmount(
    token1,
    ethers.utils.parseUnits(pair.reserve1, token1.decimals).toString()
  );

  return new Pair(currencyToken0, currencyToken1);
}
