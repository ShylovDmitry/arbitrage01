import { trade } from "./services/uniswapTrade";

async function main() {
  await trade();

  setInterval(async () => {
    await trade();
  }, 5 * 60 * 1000);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
