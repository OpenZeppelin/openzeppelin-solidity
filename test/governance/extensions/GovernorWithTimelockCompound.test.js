const { BN, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');
const RLP = require('rlp');

const {
  runGovernorWorkflow,
} = require('../GovernorWorkflow.behavior');

const Token = artifacts.require('ERC20VotesMock');
const Timelock = artifacts.require('CompTimelock');
const Governance = artifacts.require('GovernorWithTimelockCompoundMock');
const CallReceiver = artifacts.require('CallReceiverMock');

function makeContractAddress (creator, nonce) {
  return web3.utils.toChecksumAddress(web3.utils.sha3(RLP.encode([creator, nonce])).slice(12).substring(14));
}

contract('Governance', function (accounts) {
  const [ voter ] = accounts;

  const name = 'OZ-Governance';
  const version = '0.0.1';
  const tokenName = 'MockToken';
  const tokenSymbol = 'MTKN';
  const tokenSupply = web3.utils.toWei('100');

  beforeEach(async () => {
    this.token = await Token.new(tokenName, tokenSymbol, voter, tokenSupply);

    // Need to predict governance address to set it as timelock admin with a delayed transfer
    const [ deployer ] = await web3.eth.getAccounts();
    const nonce = await web3.eth.getTransactionCount(deployer);
    const predictGovernance = makeContractAddress(deployer, nonce + 1);

    this.timelock = await Timelock.new(predictGovernance, 2 * 86400);
    this.governor = await Governance.new(name, version, this.token.address, this.timelock.address);
    this.receiver = await CallReceiver.new();
    await this.token.delegate(voter, { from: voter });
  });

  it('post deployment check', async () => {
    expect(await this.governor.token()).to.be.bignumber.equal(this.token.address);
    expect(await this.governor.votingDuration()).to.be.bignumber.equal('604800');
    expect(await this.governor.maxScore()).to.be.bignumber.equal('100');
    expect(await this.governor.requiredScore()).to.be.bignumber.equal('50');
    expect(await this.governor.quorum(0)).to.be.bignumber.equal('1');

    expect(await this.governor.timelock()).to.be.equal(this.timelock.address);
    expect(await this.timelock.admin()).to.be.equal(this.governor.address);
  });

  describe('nominal', () => {
    beforeEach(async () => {
      this.settings = {
        proposal: [
          [ this.receiver.address ],
          [ web3.utils.toWei('0') ],
          [ this.receiver.contract.methods.mockFunction().encodeABI() ],
          web3.utils.randomHex(32),
          '<proposal description>',
        ],
        voters: [
          { address: voter, support: new BN('100') },
        ],
        steps: {
          queue: { enable: true, delay: 7 * 86400 },
        },
      };
    });
    afterEach(async () => {
      const eta = await this.governor.proposalEta(this.id);
      expectEvent(
        this.receipts.propose,
        'ProposalCreated',
        { proposalId: this.id, votingDeadline: this.deadline },
      );
      expectEvent(
        this.receipts.queue,
        'ProposalQueued',
        { proposalId: this.id },
      );
      expectEvent.inTransaction(
        this.receipts.queue.transactionHash,
        this.timelock,
        'QueueTransaction',
        { eta },
      );
      expectEvent(
        this.receipts.execute,
        'ProposalExecuted',
        { proposalId: this.id },
      );
      expectEvent.inTransaction(
        this.receipts.execute.transactionHash,
        this.timelock,
        'ExecuteTransaction',
        { eta },
      );
      expectEvent.inTransaction(
        this.receipts.execute.transactionHash,
        this.receiver,
        'MockFunctionCalled',
      );
    });
    runGovernorWorkflow();
  });

  describe('not queued', () => {
    beforeEach(async () => {
      this.settings = {
        proposal: [
          [ this.receiver.address ],
          [ web3.utils.toWei('0') ],
          [ this.receiver.contract.methods.mockFunction().encodeABI() ],
          web3.utils.randomHex(32),
          '<proposal description>',
        ],
        voters: [
          { address: voter, support: new BN('100') },
        ],
        steps: {
          execute: { reason: 'GovernorWithTimelockCompound:execute: proposal not yet queued' },
        },
      };
    });
    runGovernorWorkflow();
  });

  describe('to early', () => {
    beforeEach(async () => {
      this.settings = {
        proposal: [
          [ this.receiver.address ],
          [ web3.utils.toWei('0') ],
          [ this.receiver.contract.methods.mockFunction().encodeABI() ],
          web3.utils.randomHex(32),
          '<proposal description>',
        ],
        voters: [
          { address: voter, support: new BN('100') },
        ],
        steps: {
          queue: { enable: true },
          execute: { reason: 'Timelock::executeTransaction: Transaction hasn\'t surpassed time lock' },
        },
      };
    });
    runGovernorWorkflow();
  });

  describe('re-queue / re-execute', () => {
    beforeEach(async () => {
      this.settings = {
        proposal: [
          [ this.receiver.address ],
          [ web3.utils.toWei('0') ],
          [ this.receiver.contract.methods.mockFunction().encodeABI() ],
          web3.utils.randomHex(32),
          '<proposal description>',
        ],
        voters: [
          { address: voter, support: new BN('100') },
        ],
        steps: {
          queue: { enable: true, delay: 7 * 86400 },
        },
      };
    });
    afterEach(async () => {
      await expectRevert(
        this.governor.queue(...this.settings.proposal.slice(0, -1)),
        'Governance: proposal not ready',
      );
      await expectRevert(
        this.governor.execute(...this.settings.proposal.slice(0, -1)),
        'Timelock::executeTransaction: Transaction hasn\'t been queued',
      );
    });
    runGovernorWorkflow();
  });

  describe('cancel before queue prevents scheduling', () => {
    beforeEach(async () => {
      this.settings = {
        proposal: [
          [ this.receiver.address ],
          [ web3.utils.toWei('0') ],
          [ this.receiver.contract.methods.mockFunction().encodeABI() ],
          web3.utils.randomHex(32),
          '<proposal description>',
        ],
        voters: [
          { address: voter, support: new BN('100') },
        ],
        steps: {
          execute: { enable: false },
        },
      };
    });
    afterEach(async () => {
      expectEvent(
        await this.governor.cancel(...this.settings.proposal.slice(0, -1)),
        'ProposalCanceled',
        { proposalId: this.id },
      );
      await expectRevert(
        this.governor.queue(...this.settings.proposal.slice(0, -1)),
        'Governance: proposal not ready',
      );
    });
    runGovernorWorkflow();
  });

  describe('cancel after queue prevents executin', () => {
    beforeEach(async () => {
      this.settings = {
        proposal: [
          [ this.receiver.address ],
          [ web3.utils.toWei('0') ],
          [ this.receiver.contract.methods.mockFunction().encodeABI() ],
          web3.utils.randomHex(32),
          '<proposal description>',
        ],
        voters: [
          { address: voter, support: new BN('100') },
        ],
        steps: {
          queue: { enable: true, delay: 7 * 86400 },
          execute: { enable: false },
        },
      };
    });
    afterEach(async () => {
      const receipt = await this.governor.cancel(...this.settings.proposal.slice(0, -1));
      expectEvent(
        receipt,
        'ProposalCanceled',
        { proposalId: this.id },
      );
      expectEvent.inTransaction(
        receipt.receipt.transactionHash,
        this.timelock,
        'CancelTransaction',
      );
      await expectRevert(
        this.governor.execute(...this.settings.proposal.slice(0, -1)),
        'Timelock::executeTransaction: Transaction hasn\'t been queued',
      );
    });
    runGovernorWorkflow();
  });

  describe('updateTimelock', () => {
    beforeEach(async () => {
      this.newTimelock = await Timelock.new(this.governor.address, 7 * 86400);
    });

    it('protected', async () => {
      await expectRevert(
        this.governor.updateTimelock(this.newTimelock.address),
        'GovernorWithTimelockCompound: caller must be timelock',
      );
    });

    describe('using workflow', () => {
      beforeEach(async () => {
        this.settings = {
          proposal: [
            [ this.governor.address ],
            [ web3.utils.toWei('0') ],
            [ this.governor.contract.methods.updateTimelock(this.newTimelock.address).encodeABI() ],
            web3.utils.randomHex(32),
            '<proposal description>',
          ],
          voters: [
            { address: voter, support: new BN('100') },
          ],
          steps: {
            queue: { enable: true, delay: 7 * 86400 },
          },
        };
      });
      afterEach(async () => {
        expectEvent(
          this.receipts.propose,
          'ProposalCreated',
          { proposalId: this.id, votingDeadline: this.deadline },
        );
        expectEvent(
          this.receipts.execute,
          'ProposalExecuted',
          { proposalId: this.id },
        );
        expectEvent(
          this.receipts.execute,
          'TimelockChange',
          { oldTimelock: this.timelock.address, newTimelock: this.newTimelock.address },
        );
        expect(await this.governor.timelock()).to.be.bignumber.equal(this.newTimelock.address);
      });
      runGovernorWorkflow();
    });
  });

  describe('transfer timelock to new governor', () => {
    beforeEach(async () => {
      this.newGovernor = await Governance.new(name, '0.0.2', this.token.address, this.timelock.address);
    });

    describe('using workflow', () => {
      beforeEach(async () => {
        this.settings = {
          proposal: [
            [ this.timelock.address ],
            [ web3.utils.toWei('0') ],
            [ this.timelock.contract.methods.setPendingAdmin(this.newGovernor.address).encodeABI() ],
            web3.utils.randomHex(32),
            '<proposal description>',
          ],
          voters: [
            { address: voter, support: new BN('100') },
          ],
          steps: {
            queue: { enable: true, delay: 7 * 86400 },
          },
        };
      });
      afterEach(async () => {
        expectEvent(
          this.receipts.propose,
          'ProposalCreated',
          { proposalId: this.id, votingDeadline: this.deadline },
        );
        expectEvent(
          this.receipts.execute,
          'ProposalExecuted',
          { proposalId: this.id },
        );
        expectEvent.inTransaction(
          this.receipts.execute.transactionHash,
          this.timelock,
          'NewPendingAdmin',
          { newPendingAdmin: this.newGovernor.address },
        );
        await this.newGovernor.__acceptAdmin();
        expect(await this.timelock.admin()).to.be.bignumber.equal(this.newGovernor.address);
      });
      runGovernorWorkflow();
    });
  });
});