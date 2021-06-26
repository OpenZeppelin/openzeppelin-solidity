const { expectRevert, time } = require('@openzeppelin/test-helpers');

async function getReceiptOrRevert (promise, error = undefined) {
  if (error) {
    await expectRevert(promise, error);
    return undefined;
  } else {
    const { receipt } = await promise;
    return receipt;
  }
}

function tryGet (obj, path = '') {
  try {
    return path.split('.').reduce((o, k) => o[k], obj);
  } catch (_) {
    return undefined;
  }
}

function runGovernorWorkflow () {
  beforeEach(async function () {
    this.receipts = {};
    this.salt = web3.utils.keccak256(this.settings.proposal.slice(-1).find(Boolean));
    this.id = await this.governor.hashProposal(...this.settings.proposal.slice(0, -1), this.salt);
  });

  it('run', async function () {
    // transfer tokens
    if (tryGet(this.settings, 'voters')) {
      for (const voter of this.settings.voters) {
        if (voter.weight) {
          await this.token.transfer(voter.voter, voter.weight, { from: this.settings.tokenHolder });
        }
      }
    }

    // propose
    if (this.governor.propose && tryGet(this.settings, 'steps.propose.enable') !== false) {
      this.receipts.propose = await getReceiptOrRevert(
        this.governor.methods['propose(address[],uint256[],bytes[],string)'](
          ...this.settings.proposal,
          { from: this.settings.proposer },
        ),
        tryGet(this.settings, 'steps.propose.error'),
      );

      if (tryGet(this.settings, 'steps.propose.error') === undefined) {
        this.deadline = await this.governor.proposalDeadline(this.id);
        this.snapshot = await this.governor.proposalSnapshot(this.id);
      }

      if (tryGet(this.settings, 'steps.propose.delay')) {
        await time.increase(tryGet(this.settings, 'steps.propose.delay'));
      }
    }

    // vote
    if (tryGet(this.settings, 'voters')) {
      this.receipts.castVote = [];
      for (const voter of this.settings.voters) {
        if (!voter.signature) {
          this.receipts.castVote.push(
            await getReceiptOrRevert(
              voter.reason
                ? this.governor.castVoteWithReason(this.id, voter.support, voter.reason, { from: voter.voter })
                : this.governor.castVote(this.id, voter.support, { from: voter.voter }),
              voter.error,
            ),
          );
        } else {
          const { v, r, s } = await voter.signature({ proposalId: this.id, support: voter.support });
          this.receipts.castVote.push(
            await getReceiptOrRevert(
              this.governor.castVoteBySig(this.id, voter.support, v, r, s),
              voter.error,
            ),
          );
        }
        if (tryGet(voter, 'delay')) {
          await time.increase(tryGet(voter, 'delay'));
        }
      }
    }

    // fast forward
    if (tryGet(this.settings, 'steps.wait.enable') !== false) {
      await time.advanceBlockTo(this.deadline);
    }

    // queue
    if (this.governor.queue && tryGet(this.settings, 'steps.queue.enable') !== false) {
      this.receipts.queue = await getReceiptOrRevert(
        this.governor.methods['queue(address[],uint256[],bytes[],bytes32)'](
          ...this.settings.proposal.slice(0, -1),
          this.salt,
          { from: this.settings.queuer },
        ),
        tryGet(this.settings, 'steps.queue.error'),
      );
      this.eta = await this.governor.proposalEta(this.id);
      if (tryGet(this.settings, 'steps.queue.delay')) {
        await time.increase(tryGet(this.settings, 'steps.queue.delay'));
      }
    }

    // execute
    if (this.governor.execute && tryGet(this.settings, 'steps.execute.enable') !== false) {
      this.receipts.execute = await getReceiptOrRevert(
        this.governor.methods['execute(address[],uint256[],bytes[],bytes32)'](
          ...this.settings.proposal.slice(0, -1),
          this.salt,
          { from: this.settings.executer },
        ),
        tryGet(this.settings, 'steps.execute.error'),
      );
      if (tryGet(this.settings, 'steps.execute.delay')) {
        await time.increase(tryGet(this.settings, 'steps.execute.delay'));
      }
    }
  });
}

module.exports = {
  runGovernorWorkflow,
};