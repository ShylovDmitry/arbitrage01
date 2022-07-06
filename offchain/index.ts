import { trade } from "./services/uniswapTrade";

async function main() {
  const minProfitAmountEth = "0.003";

  try {
    await trade(minProfitAmountEth);
  } catch (e) {
    console.error(e);
  }

  setInterval(async () => {
    try {
      await trade(minProfitAmountEth);
    } catch (e) {
      console.error(e);
    }
  }, 5 * 60 * 1000);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
