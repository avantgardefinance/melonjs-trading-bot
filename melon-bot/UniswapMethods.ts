import {
  ExchangeIdentifier,
  Hub,
  Trading,
  UniswapExchange,
  UniswapTradingAdapter,
  UniswapFactory,
  DeployedEnvironment,
  TokenDefinition,
} from '@melonproject/melonjs';
import BigNumber from 'bignumber.js';

// instantiate environment
// instantiate hub
// instantiate trading
// get token addresses for WETH and DAI
// get WETH and DAI balances
// find wethdai exchange address
// instantiate UniswapExchange with wethdai exchange

export class UniswapBot {
  managerAddress: string;
  hubAddress: string;
  environment: DeployedEnvironment;
  gasPrice: number;
  hub: Hub;
  makerToken: TokenDefinition;
  takerToken: TokenDefinition;

  constructor(
    managerAddress: string,
    hubAddress: string,
    environment: DeployedEnvironment,
    makerToken: string,
    takerToken: string
  ) {
    this.managerAddress = managerAddress;
    this.hubAddress = hubAddress;
    this.environment = environment;
    this.hub = new Hub(this.environment, this.hubAddress);
    this.gasPrice = 2000000000000;
    this.makerToken = this.environment.getToken(makerToken);
    this.takerToken = this.environment.getToken(takerToken);
  }

  public async checkPrice(amount: number) {
    // get the price in both directions - i.e. the price to buy the taker currency to sell the maker
    // and the price to sell the taker currency to buy the maker
    const tokenQuantity = new BigNumber(amount).multipliedBy(new BigNumber(10).exponentiatedBy(this.takerToken.decimals));
    const exchangeToken = this.makerToken.symbol === 'ETH' ? this.takerToken : this.makerToken;
    const factory = new UniswapFactory(this.environment, this.managerAddress); // what's 'From' again?
    const exchangeAddress = factory.getExchange(exchangeToken.address);
    const exchange = new UniswapExchange(this.environment, exchangeAddress);
    const makerQuantity =
      this.makerToken.symbol === 'ETH'
        ? await exchange.getTokenToEthInputPrice(tokenQuantity)
        : await exchange.getEthToTokenInputPrice(tokenQuantity);
    // return an object with both prices, both quantities        
    // pass it to trade
    return makerQuantity.dividedBy(token);
  }

  public async buy(maker: string, taker: string, amount?: number) {
    const makerToken = this.environment.getToken(maker);
    const takerToken = this.environment.getToken(taker);
    const takerQuantity = new BigNumber(amount).multipliedBy(new BigNumber(10).exponentiatedBy(takerToken.decimals));
  }
}

// store a json wallet and a password much like pricefeed updater
// kubernetes encrypted storage
// prompted for private keys upon running script
