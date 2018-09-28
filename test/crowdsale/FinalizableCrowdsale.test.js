const expectEvent = require('../helpers/expectEvent');
const { advanceBlock } = require('../helpers/advanceToBlock');
const { increaseTimeTo, duration } = require('../helpers/increaseTime');
const { latestTime } = require('../helpers/latestTime');
const shouldFail = require('../helpers/shouldFail');

const BigNumber = web3.BigNumber;

require('chai')
  .use(require('chai-bignumber')(BigNumber))
  .should();

const FinalizableCrowdsaleImpl = artifacts.require('FinalizableCrowdsaleImpl');
const ERC20 = artifacts.require('ERC20');

contract('FinalizableCrowdsale', function ([_, wallet, anyone]) {
  const rate = new BigNumber(1000);

  before(async function () {
    // Advance to the next block to correctly read time in the solidity "now" function interpreted by ganache
    await advanceBlock();
  });

  beforeEach(async function () {
    this.openingTime = (await latestTime()) + duration.weeks(1);
    this.closingTime = this.openingTime + duration.weeks(1);
    this.afterClosingTime = this.closingTime + duration.seconds(1);

    this.token = await ERC20.new();
    this.crowdsale = await FinalizableCrowdsaleImpl.new(
      this.openingTime, this.closingTime, rate, wallet, this.token.address
    );
  });

  it('cannot be finalized before ending', async function () {
    await shouldFail.reverting(this.crowdsale.finalize({ from: anyone }));
  });

  it('can be finalized by anyone after ending', async function () {
    await increaseTimeTo(this.afterClosingTime);
    await this.crowdsale.finalize({ from: anyone });
  });

  it('cannot be finalized twice', async function () {
    await increaseTimeTo(this.afterClosingTime);
    await this.crowdsale.finalize({ from: anyone });
    await shouldFail.reverting(this.crowdsale.finalize({ from: anyone }));
  });

  it('logs finalized', async function () {
    await increaseTimeTo(this.afterClosingTime);
    const { logs } = await this.crowdsale.finalize({ from: anyone });
    expectEvent.inLogs(logs, 'CrowdsaleFinalized');
  });
});
