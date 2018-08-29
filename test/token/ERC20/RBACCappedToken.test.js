const { ether } = require('../../helpers/ether');
const { shouldBehaveLikeRBACMintableToken } = require('./RBACMintableToken.behavior');
const { shouldBehaveLikeERC20Mintable } = require('./MintableToken.behavior');
const { shouldBehaveLikeCappedToken } = require('./CappedToken.behavior');

const RBACCappedTokenMock = artifacts.require('RBACCappedTokenMock');

contract('RBACCappedToken', function ([_, owner, minter, ...otherAccounts]) {
  const cap = ether(1000);

  beforeEach(async function () {
    this.token = await RBACCappedTokenMock.new(cap, { from: owner });
    await this.token.addMinter(minter, { from: owner });
  });

  shouldBehaveLikeERC20Mintable(owner, minter, otherAccounts);
  shouldBehaveLikeRBACMintableToken(owner, otherAccounts);
  shouldBehaveLikeCappedToken(minter, otherAccounts, cap);
});
