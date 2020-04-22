const { Eth } = require('web3-eth');
const { HttpProvider } = require('web3-providers');
const { DeployedEnvironment } = require('@melonproject/melonjs');

// Instantiate the environment where you'll create your fund
const eth = new Eth(new HttpProvider(
  'https://mainnet.infura.io/v3/9136e09ace01493b86fed528cb6a87a5', 
  {  confirmTransactionBlocks: 1,}
  )
);
const deployment = fs.readFileSync('./deployment.json');
export const environment = new DeployedEnvironment(eth, deployment);