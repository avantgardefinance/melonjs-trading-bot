import axios from 'axios';
import { toWei } from 'web3-utils';

export async function getGasPrice(maxWait: number) {
  try {
    const response = await axios.get('https://ethgasstation.info/json/ethgasAPI.json');
    const data = response.data.gasPriceRange;
    const price = Object.keys(data).find(price => parseFloat(data[price]) <= maxWait);
    return toWei(`${(price || response.data.fast) / 10}`, 'gwei');
  } catch (error) {
    throw new Error(`Failed to fetch gas price data: ${error}`);
  }
}
