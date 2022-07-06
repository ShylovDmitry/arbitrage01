import { trade } from "./services/uniswapTrade";

async function main() {
  const minProfitAmountEth = "0.003";

  await trade(minProfitAmountEth);

  setInterval(async () => {
    await trade(minProfitAmountEth);
  }, 5 * 60 * 1000);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
