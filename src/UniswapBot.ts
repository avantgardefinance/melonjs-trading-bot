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
import { fromTokenBaseUnit } from './utils/fromTokenBaseUnit';
import { toTokenBaseUnit } from './utils/toTokenBaseUnit';
import { executeTransaction } from './utils/executeTransaction';

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
    // filter the holdings array to show only the tokens your bot cares about and add a couple of bits you'll need
    const botHoldings = balances
      .filter((holding) => {
        return (
          holding.address.toLowerCase() === this.tokenOne.address ||
          holding.address.toLowerCase() === this.tokenTwo.address
        );
      })
      .map((holding) => {
        // find the Token, which holds address/symbol etc. Things we'll need later.
        const token = holding.address.toLowerCase() === this.tokenOne.address ? this.tokenOne : this.tokenTwo;
        // standardize the amounts displayed
        const amount =
          holding.address === this.tokenOne.address
            ? toTokenBaseUnit(holding.amount, this.tokenOne.decimals)
            : toTokenBaseUnit(holding.amount, this.tokenTwo.decimals);
        return {
          token: token,
          amount: amount,
          quoteCurrency: amount.isZero(),
        };
      });
    console.log('bot holdings: ', botHoldings);
    // baseCurrency is the currency with holdings, quote currency is the currency without.
    // in the case where they're both non-zero, WETH is quote ccy (sell token buy WETH)
    const quoteCurrency = botHoldings.reduce((prev, curr) => {
      if (curr.quoteCurrency) {
        return curr.token;
      } else {
        return prev;
      }
    }, this.tokenOne);

    const quoteQuantity = botHoldings.reduce((prev, curr) => {
      if (curr.token === quoteCurrency) {
        return fromTokenBaseUnit(curr.amount, curr.token.decimals);
      } else {
        return prev;
      }
    }, new BigNumber(0));

    const baseCurrency = quoteCurrency === this.tokenOne ? this.tokenTwo : this.tokenOne;
    console.log('base currency: ', baseCurrency, 'quote currency: ', quoteCurrency, 'quoteQuantity: ', quoteQuantity);

    const priceObject = await this.getPrice(baseCurrency, quoteCurrency, quoteQuantity);

    console.log('price object: ', priceObject);
    // const random = Math.random();

    // if (random > 0.5) {
    //   console.log('THE ORACLE SAYS TO TRADE');
    //   await this.trade(priceObject);
    //   console.log('THE TRADE HAS OCCURRED');
    // }
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
    const factory = new UniswapFactory(this.environment, this.environment.deployment.uniswap.addr.UniswapFactory);

    // call the method to find the address
    const exchangeAddress = await factory.getExchange(exchangeToken.address);

    // instantiate the exchange contract
    const exchange = new UniswapExchange(this.environment, exchangeAddress);

    // find the size of the price you want to quote
    // const baseQuantity = fromTokenBaseUnit(amount, baseCurrency.decimals);
    // console.log('baseQuantity: ', baseQuantity)
    // call the correct method to get the price. If the base currency is WETH, you want to go ETH => token and vice versa
    const quoteQuantity =
      baseCurrency.symbol === 'WETH'
        ? await exchange.getEthToTokenInputPrice(amount) // quantity passed is in WETH if you're trying to sell WETH for MLN
        : await exchange.getTokenToEthInputPrice(amount); // quantity passed is in MLN if you're trying to sell MLN for WETH
    console.log('quote quantity ==>> ', quoteQuantity)
        const price = quoteQuantity.dividedBy(amount)
    console.log(quoteQuantity, "<<== price")
    return {
      baseCurrency: baseCurrency,
      quoteCurrency: quoteCurrency,
      priceInBase: price,
      priceInQuote: new BigNumber(1).dividedBy(price),
      sizeInBase: amount,
      sizeInQuote: amount.dividedBy(price).decimalPlaces(quoteCurrency.decimals),
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
    executeTransaction(transaction, options);
  }

  
}

// store a json wallet and a password much like pricefeed updater
// kubernetes encrypted storage
// prompted for private keys upon running script
