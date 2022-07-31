import { CurrencyAmount, Token } from "@uniswap/sdk-core";
import { JSBI } from "@uniswap/sdk";

export const ZERO = JSBI.BigInt(0);
export const _997 = JSBI.BigInt(997);
export const _1000 = JSBI.BigInt(1000);

export function calculateUniswapSwap(
  inputAmount: CurrencyAmount<Token>,
  reserve0: CurrencyAmount<Token>,
  reserve1: CurrencyAmount<Token>
): CurrencyAmount<Token> {
  if (
    JSBI.equal(reserve0.quotient, ZERO) ||
    JSBI.equal(reserve1.quotient, ZERO)
  ) {
    throw new Error("InsufficientReservesError");
  }
  const inputReserve = inputAmount.currency.equals(reserve0.currency)
    ? reserve0
    : reserve1;
  const outputReserve = inputAmount.currency.equals(reserve0.currency)
    ? reserve1
    : reserve0;

  const inputAmountWithFee = JSBI.multiply(inputAmount.quotient, _997);
  const numerator = JSBI.multiply(inputAmountWithFee, outputReserve.quotient);
  const denominator = JSBI.add(
    JSBI.multiply(inputReserve.quotient, _1000),
    inputAmountWithFee
  );
  const outputAmount = CurrencyAmount.fromRawAmount(
    inputAmount.currency.equals(reserve0.currency)
      ? reserve1.currency
      : reserve0.currency,
    JSBI.divide(numerator, denominator)
  );
  if (JSBI.equal(outputAmount.quotient, ZERO)) {
    throw new Error("InsufficientInputAmountError");
  }
  return outputAmount;
}
