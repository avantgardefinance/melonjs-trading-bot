import { Eth } from 'web3-eth';
import { createProvider, createEnvironment } from './environment';
import { UniswapBot } from './UniswapBot';

require('dotenv').config();

async function setup() {
  const provider = createProvider(process.env.PROVIDER_ENDPOINT);
  const client = new Eth(provider, {
    transactionConfirmationBlocks: 1,
  });

  const wallet = client.accounts.privateKeyToAccount(process.env.ETH_PRIVATE_KEY);
  client.accounts.wallet.add(wallet);

  const account = () => Promise.resolve(wallet.address);

  const environment = createEnvironment(client);
  return { account, environment };
}
const { environment } = await setup();

const theBot = new UniswapBot(process.env.MANAGER_ADDRESS, process.env.HUB_ADDRESS, environment, 'WETH', 'MLN')
