import { createEnvironment } from './environment';
import { UniswapBot } from './UniswapBot';

(async () => {
  const environment = createEnvironment();
  const theBot = new UniswapBot(process.env.MANAGER_ADDRESS, process.env.HUB_ADDRESS, environment, 'WETH', 'MLN');
  const balances = await theBot.getBalances();
  console.log(balances);
})();
