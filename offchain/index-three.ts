import { tradeThree } from "./services/uniswapTradeThree";

async function main() {
  const minProfitAmountEth = "0.003";

  try {
    await tradeThree(minProfitAmountEth);
  } catch (e: any) {
    console.log("ERROR", e?.message);
    // console.error(e);
  }

  setInterval(async () => {
    try {
      await tradeThree(minProfitAmountEth);
    } catch (e: any) {
      console.log("ERROR", e?.message);
      // console.error(e);
    }
  }, 5 * 60 * 1000);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
