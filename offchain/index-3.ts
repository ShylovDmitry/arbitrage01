const ethers = require("ethers");
// import { BigNumber, Event } from "ethers";
// import { abi as IUniswapV3PoolABI } from "@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json";
// import IUniswapV2Pair from "@uniswap/v2-core/build/IUniswapV2Pair.json";

const wssUrl = "wss://mainnet.infura.io/ws/v3/22dfa83ef07a4867ad2e3d403560514d";
const provider = new ethers.providers.WebSocketProvider(wssUrl);

// 0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45
// 0x5ae401dc - multicall(uint256,bytes[])

//0xE592427A0AEce92De3Edee1F18E0157C05861564
// 0x414bf389 - exactInputSingle((address,address,uint24,address,uint256,uint256,uint256,uint160))	;
// 0xc04b8d59 - exactInput((bytes, address, uint256, uint256, uint256));
// 0xac9650d8 - multicall(bytes[])

provider.on("pending", async (txHash: string) => {
  if (!txHash) {
    return;
  }
  const tx = await provider.getTransaction(txHash);
  // const min = ethers.utils.parseEther("1");
  if (
    tx &&
    tx.to ===
      "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45" /* && tx.value.gt(min)*/
  ) {
    console.log(tx.hash);
    console.log(ethers.utils.formatEther(tx.value.toString()));
  }
});

//
//
//
// const contract = new ethers.Contract(
//   "0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640",
//   IUniswapV3PoolABI,
//   provider
// );
//
// contract.on(
//   "Swap",
//   async function (
//     sender: string,
//     recipient: string,
//     amount0: BigNumber,
//     amount1: BigNumber,
//     sqrtPriceX96: BigNumber,
//     liquidity: BigNumber,
//     tick: number,
//     transaction: Event
//   ) {
//     console.log(await transaction.getTransaction());
//     console.log(await transaction.getTransactionReceipt());
//   }
// );

//
//
//
// // 0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640
// const filter = {
//   // address: "0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640",
//   topics: [ethers.utils.id("Transfer(address,address,uint256)")],
//   // topics: [
//   //   ethers.utils.id(
//   //     "Swap(address,address,int256,int256,uint160,uint128,int24)"
//   //   ),
//   // ],
// };
// console.log(`[${new Date().toLocaleTimeString()}] Connecting via WebSocket...`);
// provider.on(filter, async (txHash: any) => {
//   // console.log(txHash);
//   const tx = await provider.getTransaction(txHash.transactionHash);
//   console.log(tx);
//   console.log(tx?.value.toString());
//   const info = await iface.parseTransaction(tx);
//   console.log(info);
// });

//
//
//
// (async () => {
//   const httpsUrl =
//     "https://mainnet.infura.io/v3/22dfa83ef07a4867ad2e3d403560514d";
//   const UniswapV2PairAddress = "0xb4e16d0168e52d35cacd2c6185b44281ec28c9dc";
//   const provider = new ethers.providers.JsonRpcProvider(httpsUrl);
//   const pair = new ethers.Contract(
//       UniswapV2PairAddress,
//       IUniswapV2Pair.abi,
//       provider
//   );
//   // console.log(pair);
//   console.time("a");
//   let reserves = await pair.getReserves();
//   console.timeEnd("a");
//   console.log(reserves[0].toString());
//   console.log(reserves[1].toString());
// })();
