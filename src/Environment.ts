import { Eth } from 'web3-eth';
import { HttpProvider } from 'web3-providers';
import { DeployedEnvironment, DeploymentOutput } from '@melonproject/melonjs';

const fs = require('fs')

// Instantiate the environment where you'll create your fund
const eth = new Eth(
  new HttpProvider('https://mainnet.infura.io/v3/9136e09ace01493b86fed528cb6a87a5', { confirmTransactionBlocks: 1 })
);
// Read the deployment from the deployment JSON
const deployment: DeploymentOutput = fs.readFileSync('./deployments/mainnnet-deployment.json');

export const environment = new DeployedEnvironment(eth, deployment);
