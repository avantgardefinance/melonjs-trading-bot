import LRUCache from 'lru-cache';
import { Environment } from '@melonproject/melonjs';
import { Eth } from 'web3-eth';
import { HttpProvider, WebsocketProvider, HttpProviderOptions, WebsocketProviderOptions } from 'web3-providers';

export function createEnvironment(eth: Eth) {
  return new Environment(eth, {
    cache: new LRUCache(500),
  });
}

export function createProvider(endpoint: string, options?: HttpProviderOptions | WebsocketProviderOptions) {
  if (endpoint.startsWith('https://') || endpoint.startsWith('http://')) {
    return new HttpProvider(endpoint, options as HttpProviderOptions);
  }

  if (endpoint.startsWith('wss://') || endpoint.startsWith('ws://')) {
    return new WebsocketProvider(endpoint, options as WebsocketProviderOptions);
  }

  throw new Error('Invalid endpoint protocol.');
}

export function disconnectProvider(env: Environment) {
  const provider = env.client && (env.client.currentProvider as any);
  if (provider && provider.connection && typeof provider.connection.close === 'function') {
    provider.connection.close();
  }
}
