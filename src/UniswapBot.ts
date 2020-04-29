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
  SendOptions,
} from '@melonproject/melonjs';
import { TransactionReceipt } from 'web3-core';
import BigNumber from 'bignumber.js';
import { fromTokenBaseUnit } from './utils/fromTokenBaseUnit';
import { toTokenBaseUnit } from './utils/toTokenBaseUnit';
import { getGasPrice } from './utils/getGasPrice';

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
    this.tokenOne = this.environment.getToken(tokenOne);
    this.tokenTwo = this.environment.getToken(tokenTwo);
  }

  async magicFunction() {
    // get your fund's current balances
    const balances = await this.getBalances();
    // if you have a zero balance, the getBalances method will return only 1/2 objects that you care about
    // if you have a balance in both, the map function has logic to suss out the one with lower holdings

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

        // return an object with all the info you'll need. (quoteCurrency in this case is specific to my trading strategy)
        return {
          token: token,
          amount: amount,
          baseCurrency: amount.isGreaterThan(0.1), //
        };
      });

    /**
     * Specific to my strategy, where we are either long MLN or long ETH but never long both,
     * baseCurrency is the currency with holdings, quote currency is the currency without.
     * It will be the case that they're both non-zero only if the bot starts running
     * with balances that it has not traded. In that case, I've set MLN to be
     * the base ccy (bot will sell MLN balance buy WETH)
     */
    const baseCurrency = botHoldings.reduce((prev, curr) => {
      if (curr.baseCurrency) {
        return curr.token;
      } else {
        return prev;
      }
    }, this.tokenTwo);

    // token amounts come back from the accounting contract in WEI
    const baseQuantity = botHoldings.reduce((prev, curr) => {
      if (curr.token === baseCurrency) {
        return fromTokenBaseUnit(curr.amount, curr.token.decimals);
      } else {
        return prev;
      }
    }, new BigNumber(0));

    // the non-quote currency
    const quoteCurrency = baseCurrency === this.tokenOne ? this.tokenTwo : this.tokenOne;

    // pass them all to the getPrice function to see what the rates are
    const priceObject = await this.getPrice(baseCurrency, quoteCurrency, baseQuantity);

    const random = Math.random();

    if (random > 0.5) {
      console.log('THE ORACLE SAYS TO TRADE');
      return this.trade(priceObject);
    } else {
      console.log('NO TRADING BY ORDER OF THE ORACLE');
      return;
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
    try {
      // instantiate an exchange factory to find the correct address
      const factory = new UniswapFactory(this.environment, this.environment.deployment.uniswap.addr.UniswapFactory);

      // call the method to find the address
      const exchangeAddress = await factory.getExchange(exchangeToken.address);

      // instantiate the exchange contract
      const exchange = new UniswapExchange(this.environment, exchangeAddress);

      // call the correct method to get the price. If the base currency is WETH, you want to go ETH => token and vice versa
      const quoteQuantity =
        baseCurrency.symbol === 'WETH'
          ? await exchange.getEthToTokenInputPrice(amount) // quantity passed is in WETH if you're trying to sell WETH for MLN
          : await exchange.getTokenToEthInputPrice(amount); // quantity passed is in MLN if you're trying to sell MLN for WETH

      // price will be important if you're doing any TA. My magicFunction doesn't use it but I've included it anyway.
      const priceInBase = quoteQuantity.dividedBy(amount);
      const priceInQuote = new BigNumber(1).dividedBy(priceInBase);

      return {
        baseCurrency: baseCurrency,
        quoteCurrency: quoteCurrency,
        priceInBase: priceInBase,
        priceInQuote: priceInQuote,
        sizeInBase: amount,
        sizeInQuote: quoteQuantity,
        exchangeAddress: exchangeAddress,
      } as PriceQueryResult;
    } catch (error) {
      console.log(error);
      return `An error occurred while fetching prices: ${error}`
    }
  }

  public async trade(priceInfo: PriceQueryResult) {
    // adjust the target amount of token to buy
    const slippage = 0.97;

    // use the price query results to construct the uniswap order argument object
    const orderArgs = {
      makerQuantity: priceInfo.sizeInQuote.integerValue().multipliedBy(slippage),
      takerQuantity: priceInfo.sizeInBase.integerValue(),
      makerAsset: priceInfo.quoteCurrency.address,
      takerAsset: priceInfo.baseCurrency.address,
    };

    console.log(
      `Buying ${orderArgs.makerQuantity} ${priceInfo.quoteCurrency.symbol} by selling ${orderArgs.takerQuantity} ${priceInfo.baseCurrency.symbol}`
    );

    // find the fund's trading address
    const tradingAddress = (await this.hub.getRoutes()).trading;

    // and use it to instantiate the contract
    const trading = new Trading(this.environment, tradingAddress);

    // create the uniswap trading adapter
    const adapter = await UniswapTradingAdapter.create(
      this.environment,
      this.environment.deployment.melon.addr.UniswapAdapter,
      trading
    );

    // instantiate the transaction object
    const transaction = adapter.takeOrder(this.managerAddress, orderArgs);

    // query ethgasstation to figure out how much this'll cost
    const gasPrice = await getGasPrice(2);

    // instantiate the transactionOptions object
    const options: SendOptions = { gasPrice: gasPrice, gas: 1000000 };
    try {
      const opts = await transaction.prepare(options);

      const receipt = await transaction.send(opts);
      // call the imported util method to execute the trade
      return receipt as TransactionReceipt;
    } catch (error) {
      console.log(error);
      `An error occurred while trading: ${error}`
    }
  }
}
