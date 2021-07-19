const { expect } = require('chai');

function shouldBehaveLikeVestingWallet (makeSchedule, vestingFunction, checkRelease) {
  describe('vesting schedule', function () {
    it('check vesting schedule', async function () {
      for (const timestamp of await makeSchedule(this)) {
        expect(await this.mock.vestedAmount(this.token.address, timestamp))
          .to.be.bignumber.equal(await vestingFunction(this, timestamp));
      }
    });

    it('execute vesting schedule', async function () {
      const receipt = await this.mock.release(this.token.address);
      checkRelease(this, receipt, '0');

      let released = web3.utils.toBN(0);
      for (const timestamp of await makeSchedule(this)) {
        const vested = await vestingFunction(this, timestamp);
        await new Promise(resolve => web3.currentProvider.send({
          method: 'evm_setNextBlockTimestamp',
          params: [ timestamp.toNumber() ],
        }, resolve));

        const receipt = await this.mock.release(this.token.address);
        checkRelease(this, receipt, vested.sub(released));
        released = vested;
      }
    });
  });
}

module.exports = {
  shouldBehaveLikeVestingWallet,
};
