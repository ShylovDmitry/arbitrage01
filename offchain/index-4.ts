import { gql, GraphQLClient } from "graphql-request";

const ethers = require("ethers");
import { BigNumber, Event } from "ethers";
import IUniswapV2Pair from "@uniswap/v2-core/build/IUniswapV2Pair.json";
import { CurrencyAmount, WETH9 } from "@uniswap/sdk-core";
import { calculateUniswapSwap } from "./helper-4";
import { UniswapV2ApiPair } from "./interfaces/uniswapV2ApiPair";
import { Token } from "@uniswap/sdk-core";
import { getChainId } from "./helpers";
import { ChainId } from "@uniswap/sdk";
const WETH = WETH9[ChainId.MAINNET];

const pairsLimit = 500;

interface SwapResult {
  ethIn: string;
  profitAmount: CurrencyAmount<Token>;
  pair0: UniswapV2ApiPair;
  pair1: UniswapV2ApiPair;
}

const uniEndpointHttp =
  "https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v2";
const uniClient = new GraphQLClient(uniEndpointHttp);

async function getUniswapPairs(
  first: number,
  skip: number = 0
): Promise<UniswapV2ApiPair[]> {
  const query = gql`
    query getPairs($first: Int, $skip: Int) {
      pairs(
        first: $first
        skip: $skip
        orderBy: volumeUSD
        orderDirection: desc
      ) {
        id
        reserve0
        reserve1
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
  const data = await uniClient.request(query, { first, skip });
  return data.pairs;
}

const sushiEndpointHttp =
  "https://api.thegraph.com/subgraphs/name/sushiswap/exchange";
const sushiClient = new GraphQLClient(sushiEndpointHttp);

async function getSushiswapPairs(
  first: number,
  skip: number = 0
): Promise<UniswapV2ApiPair[]> {
  const query = gql`
    query getPairs($first: Int, $skip: Int) {
      pairs(
        first: $first
        skip: $skip
        orderBy: volumeUSD
        orderDirection: desc
      ) {
        id
        reserve0
        reserve1
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
  const data = await sushiClient.request(query, { first, skip });
  return data.pairs;
}

const pairsMap = new Map<string, UniswapV2ApiPair>();
const tokensMap = new Map<string, Token>();
const matchMap = new Map<string, string>();

(async () => {
  console.log("Retrieving pairs...");
  const [uniPairs, sushiPairs] = await Promise.all([
    getUniswapPairs(pairsLimit),
    getSushiswapPairs(pairsLimit),
  ]);
  console.log("Finding matches...");

  const wethAddress = WETH.address.toLowerCase();
  uniPairs.forEach((uniPair) => {
    sushiPairs.forEach((sushiPair) => {
      if (
        uniPair.token0.id !== wethAddress &&
        uniPair.token1.id !== wethAddress
      ) {
        return;
      }

      if (
        (uniPair.token0.id === sushiPair.token0.id &&
          uniPair.token1.id === sushiPair.token1.id) ||
        (uniPair.token0.id === sushiPair.token1.id &&
          uniPair.token1.id === sushiPair.token0.id)
      ) {
        let token0 = new Token(
          getChainId(),
          uniPair.token0.id,
          Number(uniPair.token0.decimals),
          uniPair.token0.symbol,
          uniPair.token0.name
        );
        let token1 = new Token(
          getChainId(),
          uniPair.token1.id,
          Number(uniPair.token1.decimals),
          uniPair.token1.symbol,
          uniPair.token1.name
        );

        tokensMap.set(uniPair.token0.id, token0);
        tokensMap.set(uniPair.token1.id, token1);

        pairsMap.set(uniPair.id, {
          ...uniPair,
          reserve0: ethers.utils
            .parseUnits(uniPair.reserve0, uniPair.token0.decimals)
            .toString(),
          reserve1: ethers.utils
            .parseUnits(uniPair.reserve1, uniPair.token1.decimals)
            .toString(),
          type: "uni",
        });
        pairsMap.set(sushiPair.id, {
          ...sushiPair,
          reserve0: ethers.utils
            .parseUnits(sushiPair.reserve0, sushiPair.token0.decimals)
            .toString(),
          reserve1: ethers.utils
            .parseUnits(sushiPair.reserve1, sushiPair.token1.decimals)
            .toString(),
          type: "sushi",
        });

        matchMap.set(uniPair.id, sushiPair.id);
        matchMap.set(sushiPair.id, uniPair.id);
      }
    });
  });
  console.log("length", pairsMap.size);

  const wssUrl =
    "wss://mainnet.infura.io/ws/v3/22dfa83ef07a4867ad2e3d403560514d";
  const provider = new ethers.providers.WebSocketProvider(wssUrl);

  pairsMap.forEach((pair) => {
    const contract = new ethers.Contract(pair.id, IUniswapV2Pair.abi, provider);
    contract.on("Sync", (reserve0: BigNumber, reserve1: BigNumber, tx: Event) =>
      syncCallback(pair, reserve0, reserve1, tx)
    );
  });
  console.log("Subscribed");
})();

async function syncCallback(
  pair: UniswapV2ApiPair,
  reserve0: BigNumber,
  reserve1: BigNumber,
  tx: Event
) {
  pairsMap.set(pair.id, {
    ...pairsMap.get(pair.id)!,
    reserve0: reserve0.toString(),
    reserve1: reserve1.toString(),
  });
  const pair0 = pairsMap.get(pair.id)!;
  const pair1 = pairsMap.get(matchMap.get(pair.id)!)!;

  const result = [];
  for (let i = 0.5; i <= 3; i += 0.5) {
    const res1 = swap(String(i), pair0, pair1);
    if (res1) {
      result.push(res1);
    }
    const res2 = swap(String(i), pair1, pair0);
    if (res2) {
      result.push(res2);
    }
  }

  if (result.length) {
    const res = result.sort((a, b) =>
      a.profitAmount.greaterThan(b.profitAmount) ? -1 : 1
    )[0];

    console.log(
      new Date().toLocaleDateString(),
      new Date().toLocaleTimeString(),
      res.profitAmount.toExact(),
      res.pair0.type,
      res.pair1.type,
      res.pair0.token0.symbol,
      res.pair0.token1.symbol,
      res.ethIn
    );
  }
}

function swap(
  ethIn: string,
  pair0: UniswapV2ApiPair,
  pair1: UniswapV2ApiPair
): SwapResult | undefined {
  const inputAmount = CurrencyAmount.fromRawAmount(
    WETH,
    ethers.utils.parseUnits(ethIn, WETH.decimals).toString()
  );

  const reserve0Amount = CurrencyAmount.fromRawAmount(
    tokensMap.get(pair0.token0.id)!,
    pair0.reserve0
  );
  const reserve1Amount = CurrencyAmount.fromRawAmount(
    tokensMap.get(pair0.token1.id)!,
    pair0.reserve1
  );

  const outputAmount = calculateUniswapSwap(
    inputAmount,
    reserve0Amount,
    reserve1Amount
  );

  const reserve2Amount = CurrencyAmount.fromRawAmount(
    tokensMap.get(pair1.token0.id)!,
    pair1.reserve0
  );
  const reserve3Amount = CurrencyAmount.fromRawAmount(
    tokensMap.get(pair1.token1.id)!,
    pair1.reserve1
  );

  const outputAmount1 = calculateUniswapSwap(
    outputAmount,
    reserve2Amount,
    reserve3Amount
  );

  const profitAmount = outputAmount1.subtract(inputAmount);
  if (profitAmount.greaterThan(0)) {
    return {
      ethIn,
      profitAmount,
      pair0: pair0,
      pair1: pair1,
    };
  }
}
