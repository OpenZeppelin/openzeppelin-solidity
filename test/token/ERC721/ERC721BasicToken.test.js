import shouldBehaveLikeERC721BasicToken from './ERC721BasicToken.behaviour';

const BigNumber = web3.BigNumber;
const ERC721BasicToken = artifacts.require('ERC721BasicTokenMock.sol');

require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

contract('ERC721BasicToken', function ([_, ...accounts]) {
  beforeEach(async function () {
    this.token = await ERC721BasicToken.new({ from: accounts[0] });
  });

  shouldBehaveLikeERC721BasicToken(accounts);
});
