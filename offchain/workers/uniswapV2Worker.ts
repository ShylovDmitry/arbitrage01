import { parentPort, workerData } from "worker_threads";
import { UniswapV2ApiPair } from "../interfaces/uniswapV2ApiPair";
import { gql, GraphQLClient } from "graphql-request";

const pairsLimit = workerData.pairsLimit;

const endpointHttp =
  "https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v2";

const client = new GraphQLClient(endpointHttp);

async function getPairs(
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
  const data = await client.request(query, { first, skip });
  return data.pairs;
}

async function next(pairs: UniswapV2ApiPair[]) {
  parentPort!.postMessage(pairs);
}

parentPort!.on("message", async () => {
  const numRequests = Math.floor(pairsLimit / 1000);
  const restRequests = pairsLimit % 1000;
  let requestLimits = [...Array(numRequests).keys()].map((val) =>
    val ? 1000 * val : 1000
  );
  if (restRequests) {
    requestLimits.push(restRequests);
  }

  try {
    const pairs = (
      await Promise.all(
        requestLimits.map((val, index) => getPairs(val, index * 1000))
      )
    ).flat();

    await next(pairs);
  } catch (e) {
    // console.error("ERROR", (e as Error).message);
  }
});
