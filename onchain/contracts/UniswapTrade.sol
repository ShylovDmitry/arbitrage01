//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;
pragma abicoder v2;

import "@uniswap/swap-router-contracts/contracts/interfaces/IV3SwapRouter.sol";
import "@uniswap/lib/contracts/libraries/TransferHelper.sol";

//address constant WETH = 0xc778417E063141139Fce010982780140Aa0cD5Ab;
//uint24 constant fee0 = 3000;
//address constant DAI = 0xaD6D458402F60fD3Bd25163575031ACDce07538D;
//uint24 constant fee1 = 3000;
//address constant UNI = 0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984;
//uint24 constant fee2 = 3000;

contract UniswapTrade {
    address private constant WETH = 0xc778417E063141139Fce010982780140Aa0cD5Ab;
    address private constant SWAP_ROUTER_02 = 0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45;

    address public owner;

    event Trade(uint amountIn, uint amountOut, uint amountProfit);

    IV3SwapRouter public immutable swapRouter02 = IV3SwapRouter(SWAP_ROUTER_02);

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(owner == msg.sender, "Only owner");
        _;
    }

    function swap(bytes memory path) public payable onlyOwner returns(uint) {
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

        require(amountIn - amountOut > 0, "Trade not profitable"); // !!!!!
        emit Trade(amountIn, amountOut, amountIn - amountOut); // !!!!!

        return amountOut;
    }
}
