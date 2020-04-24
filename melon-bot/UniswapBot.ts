import {
  Accounting,
  Hub,
  Trading,
  UniswapExchange,
  UniswapTradingAdapter,
  UniswapFactory,
  DeployedEnvironment,
  TokenDefinition,
  FundHolding,
} from '@melonproject/melonjs';
import BigNumber from 'bignumber.js';

interface PriceQueryResult {
  baseCurrency: TokenDefinition;
  quoteCurrency: TokenDefinition;
  priceInBase: BigNumber;
  priceInQuote: BigNumber;
  sizeInBase: BigNumber;
  sizeInQuote: BigNumber;
  exchangeAddress: string;
}

export class UniswapBot {
  managerAddress: string;
  hubAddress: string;
  environment: DeployedEnvironment;
  gasPrice: number;
  hub: Hub;
  tokenOne: TokenDefinition;
  tokenTwo: TokenDefinition;

  constructor(
    managerAddress: string,
    hubAddress: string,
    environment: DeployedEnvironment,
    tokenOne: string,
    tokenTwo: string
  ) {
    this.managerAddress = managerAddress;
    this.hubAddress = hubAddress;
    this.environment = environment;
    this.hub = new Hub(this.environment, this.hubAddress);
    this.gasPrice = 2000000000000;
    this.tokenOne = this.environment.getToken(tokenOne);
    this.tokenTwo = this.environment.getToken(tokenTwo);
  }

  async magicFunction(balances: FundHolding[]) {
    const random = Math.random()
    const [tokenOneBalance] = balances.filter(token => token.address === this.tokenOne.address)
    const [tokenTwoBalance] = balances.filter(token => token.address === this.tokenTwo.address)
    if (random > .50 && tokenOneBalance.amount.isGreaterThan(0)){

    }
    if (random > .50 && tokenTwoBalance.amount.isGreaterThan(0)){

    }
    if (random <= .50 && tokenOneBalance.amount.isGreaterThan(0)){

    }
    if (random <= .50 && tokenTwoBalance.amount.isGreaterThan(0)){

    }
  }

  public async getBalances() {
    // find the fund's accounting address
    const accountingAddress = (await this.hub.getRoutes()).accounting;

    // and instantiate a js representation of the contract
    const accounting = new Accounting(this.environment, accountingAddress);

    // to call the getFundHoldings method
    const fundHoldings = await accounting.getFundHoldings();
    
    // which returns an array of hodlings.
    return fundHoldings as FundHolding[];
  }

  public async getPrice(baseCurrency: TokenDefinition, quoteCurrency: TokenDefinition, amount: BigNumber) {
    // Every uniswap exchange is WETH/someToken, and identified by the non-weth token
    const exchangeToken = baseCurrency.symbol === 'WETH' ? quoteCurrency : baseCurrency;

    // instantiate an exchange factory to find the correct address
    const factory = new UniswapFactory(this.environment, this.managerAddress);

    // call the method to find the address
    const exchangeAddress = await factory.getExchange(exchangeToken.address);

    // instantiate the exchange contract
    const exchange = new UniswapExchange(this.environment, exchangeAddress);

    // find the size of the price you want to quote
    const quoteQuantity = new BigNumber(amount).multipliedBy(new BigNumber(10).exponentiatedBy(quoteCurrency.decimals));

    // call the correct method to get the price. If the base currency is WETH, you want to go ETH => token and vice versa
    const price =
      baseCurrency.symbol === 'WETH'
        ? await exchange.getEthToTokenInputPrice(quoteQuantity)
        : await exchange.getTokenToEthInputPrice(quoteQuantity);

    return {
      baseCurrency: baseCurrency,
      quoteCurrency: quoteCurrency,
      priceInBase: price,
      priceInQuote: new BigNumber(1).dividedBy(price),
      sizeInBase: amount,
      sizeInQuote: amount.dividedBy(price),
      exchangeAddress: exchangeAddress,
    } as PriceQueryResult;
  }

  public async trade(priceInfo: PriceQueryResult) {
    // use the price query results to construct the uniswap order argument object
    const orderArgs = {
      makerQuantity: priceInfo.sizeInBase,
      takerQuantity: priceInfo.sizeInQuote,
      makerAsset: priceInfo.baseCurrency.address,
      takerAsset: priceInfo.quoteCurrency.address,
    };

    // find the fund's trading address
    const tradingAddress = (await this.hub.getRoutes()).trading;

    // and use it to instantiate the contract
    const trading = new Trading(this.environment, tradingAddress);

    // create the uniswap trading adapter
    const adapter = await UniswapTradingAdapter.create(this.environment, priceInfo.exchangeAddress, trading);

    // instantiate the transaction object
    const transaction = adapter.takeOrder(this.managerAddress, orderArgs);

    // instantiate the transactionOptions object
    const options = { gasPrice: this.gasPrice };

    // call the private method to execute the trade
    this.executeTransaction(transaction, options);
  }

  private executeTransaction(transaction, options) {
    return new Promise(async (resolve, reject) => {
      try {
        await transaction.validate();
        const opts = await transaction.prepare(options);
        const tx = transaction.send(opts);
        tx.once('transactionHash', (hash) => console.log(`Pending: ${hash}`));
        tx.once('receipt', (receipt) => resolve(receipt));
        tx.once('error', (error) => reject(error));
      } catch (error) {
        console.log(error);
        reject(error);
      }
    });
  }
}

// store a json wallet and a password much like pricefeed updater
// kubernetes encrypted storage
// prompted for private keys upon running script
