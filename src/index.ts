import { TransactionReceipt } from 'web3-core';
import { UniswapBot } from './UniswapBot';
import { getGasPrice } from './utils/getGasPrice';

async function run(bot: UniswapBot) {
  try {
    console.log('CONSULTING THE ORACLE ==> ');
    const transaction = await bot.makeMeRich();

    if (!transaction) {
      console.log('NO TRADING BY ORDER OF THE ORACLE');
    } else {
      console.log('THE ORACLE SAYS TO TRADE');
      console.log('VALIDATING TRANSACTION');

      const receipt = await new Promise<TransactionReceipt>(async (resolve, reject) => {
        await transaction.validate();

        // query ethgasstation to figure out how much this'll cost
        console.log('FETCHING CURRENT GAS PRICE');
        const gasPrice = await getGasPrice(2);

        // instantiate the transactionOptions object
        console.log('ESTIMATION TRANSACTION GAS COST');
        const opts = await transaction.prepare({ gasPrice });

        // send the transaction using the options object
        console.log('SENDING TRANSACTION');
        const tx = transaction.send(opts);

        tx.once('transactionHash', (hash) => console.log(`PENDING TRANSACTION: https://etherscan.io/tx/${hash}`));
        tx.once('receipt', (receipt) => resolve(receipt));
        tx.once('error', (error) => reject(error));
      });

      console.log(`TRANSACTION SUCCESSFUL`);
      console.log(`GAS USED: ${receipt.gasUsed}`);
    }
  } catch (e) {
    console.error('THE BOT FAILED :*(');
    console.error(e);
  } finally {
    console.log('SCHEDULING NEXT ITERATION');
    setTimeout(() => {
      run(bot);
    }, 1000 * 60 * 1);
  }
}

(async function main() {
  console.log('FIRING UP THE BOT ==>');
  const hub = process.env.HUB_ADDRESS;
  run(await UniswapBot.create(hub, 'WETH', 'MLN'));
})();
