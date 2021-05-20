const { BN, expectEvent, time } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');

const Token = artifacts.require('ERC20VotesMock');
const Governance = artifacts.require('GovernanceMock');
const CallReceiver = artifacts.require('CallReceiverMock');

contract('Governance', function (accounts) {
  const [ voter ] = accounts;

  const name = 'OZ-Governance';
  const version = '0.0.1';
  const tokenName = 'MockToken';
  const tokenSymbol = 'MTKN';
  const tokenSupply = web3.utils.toWei('100');

  beforeEach(async () => {
    this.token = await Token.new(tokenName, tokenSymbol, voter, tokenSupply);
    this.governance = await Governance.new(name, version, this.token.address);
    this.receiver = await CallReceiver.new();
    await this.token.delegate(voter, { from: voter });
  });

  it('governance', async () => {
    expect(await this.governance.token()).to.be.bignumber.equal(this.token.address);
    expect(await this.governance.votingDuration()).to.be.bignumber.equal('604800');
    expect(await this.governance.quorum()).to.be.bignumber.equal('1');
    expect(await this.governance.maxScore()).to.be.bignumber.equal('100');
    expect(await this.governance.requiredScore()).to.be.bignumber.equal('50');
  });

  describe('workflow', () => {
    describe('with proposal', () => {
      beforeEach(async () => {
        this.proposal = [
          [ this.receiver.address ],
          [ new BN('0') ],
          [ this.receiver.contract.methods.mockFunction().encodeABI() ],
          web3.utils.randomHex(32),
        ];
        this.id = await this.governance.hashProposal(...this.proposal);
        this.voteSupport = new BN(100);
        this.receipts = {};
      });

      describe('with proposed', () => {
        beforeEach(async () => {
          ({ receipt: this.receipts.propose } = await this.governance.propose(
            ...this.proposal,
            '<proposal description>',
          ));
          expectEvent(this.receipts.propose, 'ProposalCreated');
        });

        describe('with vote', () => {
          beforeEach(async () => {
            ({ receipt: this.receipts.castVote } = await this.governance.castVote(
              this.id,
              this.voteSupport,
              { from: voter },
            ));
            expectEvent(this.receipts.castVote, 'VoteCast');
          });

          describe('after deadline', () => {
            beforeEach(async () => {
              ({ deadline: this.deadline } = await this.governance.viewProposal(this.id));
              await time.increaseTo(this.deadline.addn(1));
            });

            describe('with execute', () => {
              beforeEach(async () => {
                ({ receipt: this.receipts.execute } = await this.governance.execute(...this.proposal));
                expectEvent(this.receipts.execute, 'ProposalExecuted');
              });

              it('post check', async () => {
                expectEvent(this.receipts.propose, 'ProposalCreated', {
                  proposalId: this.id,
                  targets: this.proposal[0],
                  // values: this.proposal[1],
                  calldatas: this.proposal[2],
                  salt: this.proposal[3],
                  votingDeadline: this.deadline,
                });
                expectEvent(this.receipts.castVote, 'VoteCast', {
                  proposalId: this.id,
                  voter: voter,
                  support: this.voteSupport,
                  votes: tokenSupply,
                });
                expectEvent(this.receipts.execute, 'ProposalExecuted', {
                  proposalId: this.id,
                });
                expectEvent.inTransaction(
                  this.receipts.execute.transactionHash,
                  this.receiver,
                  'MockFunctionCalled',
                );
              });
            });
          });
        });
      });
    });
  });
});
