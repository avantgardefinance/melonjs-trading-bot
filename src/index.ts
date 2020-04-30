import { createEnvironment } from './environment';
import { UniswapBot } from './UniswapBot';

async function recursiveTradeCaller() {
  console.log('INSTANTIATING ENVIRONMENT ==>');
  const environment = createEnvironment();
  
  console.log('FIRING UP THE BOT ==>');
  const theBot = new UniswapBot(process.env.MANAGER_ADDRESS, process.env.HUB_ADDRESS, environment, 'WETH', 'MLN');
  
  console.log('CONSULTING THE ORACLE ==> ');
  const receipt = await theBot.magicFunction();
  receipt && console.log(`Transaction successful.`);
  receipt && console.log(`blockHash: ${receipt.blockHash}`);
  receipt && console.log(`transactionHash: ${receipt.transactionHash}`);
  receipt && console.log(`gasUsed: ${receipt.gasUsed}`)

  console.log('Going to sleep.')
  setTimeout(() => {
    recursiveTradeCaller();
  }, 1000 * 60 * 15);
}

recursiveTradeCaller();
