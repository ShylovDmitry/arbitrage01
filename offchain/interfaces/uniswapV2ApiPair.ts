export interface UniswapV2ApiPair {
  id: string;
  reserve0: string;
  reserve1: string;
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
