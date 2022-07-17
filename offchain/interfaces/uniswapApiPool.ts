import { UniswapApiTick } from "./uniswapApiTick";

export interface UniswapApiPool {
  id: string;
  feeTier: string;
  sqrtPrice: string;
  liquidity: string;
  tick: string;
  ticks: UniswapApiTick[];
  token0: {
    id: string;
    name: string;
    symbol: string;
    decimals: string;
  };
  token1: {
    id: string;
    name: string;
    symbol: string;
    decimals: string;
  };
}
