import { CurrencyAmount, Token } from "@uniswap/sdk-core";
import { UniswapApiPool } from "../services/uniswap.api";

export interface ProfitableSwapPath {
  amountIn: CurrencyAmount<Token>;
  profitAmount: CurrencyAmount<Token>;
  pool0: UniswapApiPool;
  pool1: UniswapApiPool;
  pool2: UniswapApiPool;
}
