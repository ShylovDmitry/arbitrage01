//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;
pragma abicoder v2;

import "@uniswap/swap-router-contracts/contracts/interfaces/IV3SwapRouter.sol";
import "@uniswap/lib/contracts/libraries/TransferHelper.sol";

contract UniswapTrade {
    address private constant WETH = 0xc778417E063141139Fce010982780140Aa0cD5Ab;
    address private constant SWAP_ROUTER_02 = 0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45;

    address public owner;

    event Trade(uint amountIn, uint amountOut);

    IV3SwapRouter public immutable swapRouter02 = IV3SwapRouter(SWAP_ROUTER_02);

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(owner == msg.sender, "Only Owner");
        _;
    }

    function swap(bytes memory path) public payable onlyOwner {
        uint amountIn = msg.value;

        TransferHelper.safeApprove(WETH, address(swapRouter02), amountIn);

        uint amountOut = swapRouter02.exactInput{value: amountIn}(
            IV3SwapRouter.ExactInputParams({
                path: path,
                recipient: msg.sender,
                amountIn: amountIn,
                amountOutMinimum: 0
            })
        );

        require(amountOut > amountIn, "Trade Not Profitable");
        emit Trade(amountIn, amountOut);
    }
}
