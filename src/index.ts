import { createEnvironment } from './environment';
import { UniswapBot } from './UniswapBot';

(async () => {
  const environment = createEnvironment();
  const theBot = new UniswapBot(process.env.MANAGER_ADDRESS, process.env.HUB_ADDRESS, environment, 'WETH', 'MLN');
  const balances = await theBot.getBalances();
  console.log(balances);
  // console.log(theBot.tokenOne)
  // console.log(theBot.tokenTwo)
  await theBot.magicFunction(balances)
})();

// get balances
// get token names => loop through balance array, if environment.getToken('item.address').symbol() == 'WETH || 'MLN'
// add to bot balances object botBalances[symbol] = item.amount interpolated to real numbers
// pass botBalances to magicFunction
  // which passes balances to getPrice
  // and interprets the data that comes back
  // and passes to trade if conditions met
  




/**
 *   {
    address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    amount: 257663728943552889
  },

 */