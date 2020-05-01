import BigNumber from 'bignumber.js';
import { toBigNumber } from '@melonproject/melonjs/utils/toBigNumber';

export function fromTokenBaseUnit(value: BigNumber | string | number, decimals: number): BigNumber {
  const val = toBigNumber(value ?? 'NaN');
  const dec = toBigNumber(decimals ?? 'NaN');
  return val.dividedBy(new BigNumber(10).exponentiatedBy(dec)).decimalPlaces(decimals);
}