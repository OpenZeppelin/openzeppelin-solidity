const { BN, constants, expectEvent, expectRevert } = require('openzeppelin-test-helpers');
const { ZERO_ADDRESS } = constants;
const { shouldSupportInterfaces } = require('../../introspection/SupportsInterface.behavior');

const ERC1155TokenReceiverMock = artifacts.require('ERC1155TokenReceiverMock');

function shouldBehaveLikeERC1155 ([minter, firstTokenHolder, secondTokenHolder, multiTokenHolder, recipient, proxy]) {
  const firstTokenId = new BN(1);
  const secondTokenId = new BN(2);
  const unknownTokenId = new BN(3);

  const firstAmount = new BN(1000);
  const secondAmount = new BN(2000);

  const RECEIVER_SINGLE_MAGIC_VALUE = '0xf23a6e61';
  const RECEIVER_BATCH_MAGIC_VALUE = '0xbc197c81';

  describe('like an ERC1155', function () {
    describe('balanceOf', function () {
      it('reverts when queried about the zero address', async function () {
        await expectRevert(
          this.token.balanceOf(ZERO_ADDRESS, firstTokenId),
          'ERC1155: balance query for the zero address'
        );
      });

      context('when accounts don\'t own tokens', function () {
        it('returns zero for given addresses', async function () {
          (await this.token.balanceOf(
            firstTokenHolder,
            firstTokenId
          )).should.be.bignumber.equal('0');

          (await this.token.balanceOf(
            secondTokenHolder,
            secondTokenId
          )).should.be.bignumber.equal('0');

          (await this.token.balanceOf(
            firstTokenHolder,
            unknownTokenId
          )).should.be.bignumber.equal('0');
        });
      });

      context('when accounts own some tokens', function () {
        beforeEach(async function () {
          await this.token.mint(firstTokenHolder, firstTokenId, firstAmount, '0x', {
            from: minter,
          });
          await this.token.mint(
            secondTokenHolder,
            secondTokenId,
            secondAmount,
            '0x',
            {
              from: minter,
            }
          );
        });

        it('returns the amount of tokens owned by the given addresses', async function () {
          (await this.token.balanceOf(
            firstTokenHolder,
            firstTokenId
          )).should.be.bignumber.equal(firstAmount);

          (await this.token.balanceOf(
            secondTokenHolder,
            secondTokenId
          )).should.be.bignumber.equal(secondAmount);

          (await this.token.balanceOf(
            firstTokenHolder,
            unknownTokenId
          )).should.be.bignumber.equal('0');
        });
      });
    });

    describe('balanceOfBatch', function () {
      it('reverts when input arrays don\'t match up', async function () {
        await expectRevert(
          this.token.balanceOfBatch(
            [firstTokenHolder, secondTokenHolder, firstTokenHolder, secondTokenHolder],
            [firstTokenId, secondTokenId, unknownTokenId]
          ),
          'ERC1155: accounts and IDs must have same lengths'
        );
      });

      it('reverts when one of the addresses is the zero address', async function () {
        await expectRevert(
          this.token.balanceOfBatch(
            [firstTokenHolder, secondTokenHolder, ZERO_ADDRESS],
            [firstTokenId, secondTokenId, unknownTokenId]
          ),
          'ERC1155: some address in batch balance query is zero'
        );
      });

      context('when accounts don\'t own tokens', function () {
        it('returns zeros for each account', async function () {
          const result = await this.token.balanceOfBatch(
            [firstTokenHolder, secondTokenHolder, firstTokenHolder],
            [firstTokenId, secondTokenId, unknownTokenId]
          );
          result.should.be.an('array');
          result[0].should.be.a.bignumber.equal('0');
          result[1].should.be.a.bignumber.equal('0');
          result[2].should.be.a.bignumber.equal('0');
        });
      });

      context('when accounts own some tokens', function () {
        beforeEach(async function () {
          await this.token.mint(firstTokenHolder, firstTokenId, firstAmount, '0x', {
            from: minter,
          });
          await this.token.mint(
            secondTokenHolder,
            secondTokenId,
            secondAmount,
            '0x',
            {
              from: minter,
            }
          );
        });

        it('returns amounts owned by each account in order passed', async function () {
          const result = await this.token.balanceOfBatch(
            [secondTokenHolder, firstTokenHolder, firstTokenHolder],
            [secondTokenId, firstTokenId, unknownTokenId]
          );
          result.should.be.an('array');
          result[0].should.be.a.bignumber.equal(secondAmount);
          result[1].should.be.a.bignumber.equal(firstAmount);
          result[2].should.be.a.bignumber.equal('0');
        });
      });
    });

    describe('setApprovalForAll', function () {
      let logs;
      beforeEach(async function () {
        ({ logs } = await this.token.setApprovalForAll(proxy, true, { from: multiTokenHolder }));
      });

      it('sets approval status which can be queried via isApprovedForAll', async function () {
        (await this.token.isApprovedForAll(multiTokenHolder, proxy)).should.be.equal(true);
      });

      it('emits an ApprovalForAll log', function () {
        expectEvent.inLogs(logs, 'ApprovalForAll', { account: multiTokenHolder, operator: proxy, approved: true });
      });

      it('can unset approval for an operator', async function () {
        await this.token.setApprovalForAll(proxy, false, { from: multiTokenHolder });
        (await this.token.isApprovedForAll(multiTokenHolder, proxy)).should.be.equal(false);
      });

      it('reverts if attempting to approve self as an operator', async function () {
        await expectRevert(
          this.token.setApprovalForAll(multiTokenHolder, true, { from: multiTokenHolder }),
          'ERC1155: cannot set approval status for self'
        );
      });
    });

    describe('safeTransferFrom', function () {
      beforeEach(async function () {
        await this.token.mint(multiTokenHolder, firstTokenId, firstAmount, '0x', {
          from: minter,
        });
        await this.token.mint(
          multiTokenHolder,
          secondTokenId,
          secondAmount,
          '0x',
          {
            from: minter,
          }
        );
      });

      it('reverts when transferring more than balance', async function () {
        await expectRevert(
          this.token.safeTransferFrom(multiTokenHolder, recipient, firstTokenId, firstAmount.addn(1), '0x', { from: multiTokenHolder }),
          'ERC1155: insufficient balance for transfer'
        );
      });

      it('reverts when transferring to zero address', async function () {
        await expectRevert(
          this.token.safeTransferFrom(multiTokenHolder, ZERO_ADDRESS, firstTokenId, firstAmount, '0x', { from: multiTokenHolder }),
          'ERC1155: target address must be non-zero'
        );
      });

      function transferWasSuccessful ({ operator, from, id, value }) {
        it('debits transferred balance from sender', async function () {
          const newBalance = await this.token.balanceOf(from, id);
          newBalance.should.be.a.bignumber.equal('0');
        });

        it('credits transferred balance to receiver', async function () {
          const newBalance = await this.token.balanceOf(this.toWhom, id);
          newBalance.should.be.a.bignumber.equal(value);
        });

        it('emits a TransferSingle log', function () {
          expectEvent.inLogs(this.transferLogs, 'TransferSingle', {
            operator,
            from,
            to: this.toWhom,
            id,
            value,
          });
        });
      }

      context('when called by the multiTokenHolder', async function () {
        beforeEach(async function () {
          this.toWhom = recipient;
          ({ logs: this.transferLogs } =
            await this.token.safeTransferFrom(multiTokenHolder, recipient, firstTokenId, firstAmount, '0x', {
              from: multiTokenHolder,
            }));
        });

        transferWasSuccessful.call(this, {
          operator: multiTokenHolder,
          from: multiTokenHolder,
          id: firstTokenId,
          value: firstAmount,
        });

        it('preserves existing balances which are not transferred by multiTokenHolder', async function () {
          const balance1 = await this.token.balanceOf(multiTokenHolder, secondTokenId);
          balance1.should.be.a.bignumber.equal(secondAmount);

          const balance2 = await this.token.balanceOf(recipient, secondTokenId);
          balance2.should.be.a.bignumber.equal('0');
        });
      });

      context('when called by an operator on behalf of the multiTokenHolder', function () {
        context('when operator is not approved by multiTokenHolder', function () {
          beforeEach(async function () {
            await this.token.setApprovalForAll(proxy, false, { from: multiTokenHolder });
          });

          it('reverts', async function () {
            await expectRevert(
              this.token.safeTransferFrom(multiTokenHolder, recipient, firstTokenId, firstAmount, '0x', {
                from: proxy,
              }),
              'ERC1155: need operator approval for 3rd party transfers'
            );
          });
        });

        context('when operator is approved by multiTokenHolder', function () {
          beforeEach(async function () {
            this.toWhom = recipient;
            await this.token.setApprovalForAll(proxy, true, { from: multiTokenHolder });
            ({ logs: this.transferLogs } =
              await this.token.safeTransferFrom(multiTokenHolder, recipient, firstTokenId, firstAmount, '0x', {
                from: proxy,
              }));
          });

          transferWasSuccessful.call(this, {
            operator: proxy,
            from: multiTokenHolder,
            id: firstTokenId,
            value: firstAmount,
          });

          it('preserves operator\'s balances not involved in the transfer', async function () {
            const balance = await this.token.balanceOf(proxy, firstTokenId);
            balance.should.be.a.bignumber.equal('0');
          });
        });
      });

      context('when sending to a valid receiver', function () {
        beforeEach(async function () {
          this.receiver = await ERC1155TokenReceiverMock.new(
            RECEIVER_SINGLE_MAGIC_VALUE, false,
            RECEIVER_BATCH_MAGIC_VALUE, false,
          );
        });

        context('without data', function () {
          beforeEach(async function () {
            this.toWhom = this.receiver.address;
            this.transferReceipt = await this.token.safeTransferFrom(
              multiTokenHolder,
              this.receiver.address,
              firstTokenId,
              firstAmount,
              '0x',
              { from: multiTokenHolder }
            );
            ({ logs: this.transferLogs } = this.transferReceipt);
          });

          transferWasSuccessful.call(this, {
            operator: multiTokenHolder,
            from: multiTokenHolder,
            id: firstTokenId,
            value: firstAmount,
          });

          it('should call onERC1155Received', async function () {
            await expectEvent.inTransaction(this.transferReceipt.tx, ERC1155TokenReceiverMock, 'Received', {
              operator: multiTokenHolder,
              from: multiTokenHolder,
              id: firstTokenId,
              value: firstAmount,
              data: null,
            });
          });
        });

        context('with data', function () {
          const data = '0xf00dd00d';
          beforeEach(async function () {
            this.toWhom = this.receiver.address;
            this.transferReceipt = await this.token.safeTransferFrom(
              multiTokenHolder,
              this.receiver.address,
              firstTokenId,
              firstAmount,
              data,
              { from: multiTokenHolder }
            );
            ({ logs: this.transferLogs } = this.transferReceipt);
          });

          transferWasSuccessful.call(this, {
            operator: multiTokenHolder,
            from: multiTokenHolder,
            id: firstTokenId,
            value: firstAmount,
          });

          it('should call onERC1155Received', async function () {
            await expectEvent.inTransaction(this.transferReceipt.tx, ERC1155TokenReceiverMock, 'Received', {
              operator: multiTokenHolder,
              from: multiTokenHolder,
              id: firstTokenId,
              value: firstAmount,
              data,
            });
          });
        });
      });

      context('to a receiver contract returning unexpected value', function () {
        beforeEach(async function () {
          this.receiver = await ERC1155TokenReceiverMock.new(
            '0x00c0ffee', false,
            RECEIVER_BATCH_MAGIC_VALUE, false,
          );
        });

        it('reverts', async function () {
          await expectRevert(
            this.token.safeTransferFrom(multiTokenHolder, this.receiver.address, firstTokenId, firstAmount, '0x', {
              from: multiTokenHolder,
            }),
            'ERC1155: got unknown value from onERC1155Received'
          );
        });
      });

      context('to a receiver contract that reverts', function () {
        beforeEach(async function () {
          this.receiver = await ERC1155TokenReceiverMock.new(
            RECEIVER_SINGLE_MAGIC_VALUE, true,
            RECEIVER_BATCH_MAGIC_VALUE, false,
          );
        });

        it('reverts', async function () {
          await expectRevert(
            this.token.safeTransferFrom(multiTokenHolder, this.receiver.address, firstTokenId, firstAmount, '0x', {
              from: multiTokenHolder,
            }),
            'ERC1155TokenReceiverMock: reverting on receive'
          );
        });
      });

      context('to a contract that does not implement the required function', function () {
        it('reverts', async function () {
          const invalidReceiver = this.token;
          await expectRevert.unspecified(
            this.token.safeTransferFrom(multiTokenHolder, invalidReceiver.address, firstTokenId, firstAmount, '0x', {
              from: multiTokenHolder,
            })
          );
        });
      });
    });

    describe('safeBatchTransferFrom', function () {
      beforeEach(async function () {
        await this.token.mint(multiTokenHolder, firstTokenId, firstAmount, '0x', {
          from: minter,
        });
        await this.token.mint(
          multiTokenHolder,
          secondTokenId,
          secondAmount,
          '0x',
          {
            from: minter,
          }
        );
      });

      it('reverts when transferring amount more than any of balances', async function () {
        await expectRevert(
          this.token.safeBatchTransferFrom(
            multiTokenHolder, recipient,
            [firstTokenId, secondTokenId],
            [firstAmount, secondAmount.addn(1)],
            '0x', { from: multiTokenHolder }
          ),
          'ERC1155: insufficient balance of some token type for transfer'
        );
      });

      it('reverts when ids array length doesn\'t match amounts array length', async function () {
        await expectRevert(
          this.token.safeBatchTransferFrom(
            multiTokenHolder, recipient,
            [firstTokenId],
            [firstAmount, secondAmount],
            '0x', { from: multiTokenHolder }
          ),
          'ERC1155: IDs and values must have same lengths'
        );
      });

      it('reverts when transferring to zero address', async function () {
        await expectRevert(
          this.token.safeBatchTransferFrom(
            multiTokenHolder, ZERO_ADDRESS,
            [firstTokenId, secondTokenId],
            [firstAmount, secondAmount],
            '0x', { from: multiTokenHolder }
          ),
          'ERC1155: target address must be non-zero'
        );
      });

      function batchTransferWasSuccessful ({ operator, from, ids, values }) {
        it('debits transferred balances from sender', async function () {
          const newBalances = await this.token.balanceOfBatch(new Array(ids.length).fill(from), ids);
          for (const newBalance of newBalances) {
            newBalance.should.be.a.bignumber.equal('0');
          }
        });

        it('credits transferred balances to receiver', async function () {
          const newBalances = await this.token.balanceOfBatch(new Array(ids.length).fill(this.toWhom), ids);
          for (let i = 0; i < newBalances.length; i++) {
            newBalances[i].should.be.a.bignumber.equal(values[i]);
          }
        });

        it('emits a TransferBatch log', function () {
          expectEvent.inLogs(this.transferLogs, 'TransferBatch', {
            operator,
            from,
            to: this.toWhom,
            // ids,
            // values,
          });
        });
      }

      context('when called by the multiTokenHolder', async function () {
        beforeEach(async function () {
          this.toWhom = recipient;
          ({ logs: this.transferLogs } =
            await this.token.safeBatchTransferFrom(
              multiTokenHolder, recipient,
              [firstTokenId, secondTokenId],
              [firstAmount, secondAmount],
              '0x', { from: multiTokenHolder }
            ));
        });

        batchTransferWasSuccessful.call(this, {
          operator: multiTokenHolder,
          from: multiTokenHolder,
          ids: [firstTokenId, secondTokenId],
          values: [firstAmount, secondAmount],
        });
      });

      context('when called by an operator on behalf of the multiTokenHolder', function () {
        context('when operator is not approved by multiTokenHolder', function () {
          beforeEach(async function () {
            await this.token.setApprovalForAll(proxy, false, { from: multiTokenHolder });
          });

          it('reverts', async function () {
            await expectRevert(
              this.token.safeBatchTransferFrom(
                multiTokenHolder, recipient,
                [firstTokenId, secondTokenId],
                [firstAmount, secondAmount],
                '0x', { from: proxy }
              ),
              'ERC1155: need operator approval for 3rd party transfers'
            );
          });
        });

        context('when operator is approved by multiTokenHolder', function () {
          beforeEach(async function () {
            this.toWhom = recipient;
            await this.token.setApprovalForAll(proxy, true, { from: multiTokenHolder });
            ({ logs: this.transferLogs } =
              await this.token.safeBatchTransferFrom(
                multiTokenHolder, recipient,
                [firstTokenId, secondTokenId],
                [firstAmount, secondAmount],
                '0x', { from: proxy },
              ));
          });

          batchTransferWasSuccessful.call(this, {
            operator: proxy,
            from: multiTokenHolder,
            ids: [firstTokenId, secondTokenId],
            values: [firstAmount, secondAmount],
          });

          it('preserves operator\'s balances not involved in the transfer', async function () {
            const balance1 = await this.token.balanceOf(proxy, firstTokenId);
            balance1.should.be.a.bignumber.equal('0');
            const balance2 = await this.token.balanceOf(proxy, secondTokenId);
            balance2.should.be.a.bignumber.equal('0');
          });
        });
      });

      context('when sending to a valid receiver', function () {
        beforeEach(async function () {
          this.receiver = await ERC1155TokenReceiverMock.new(
            RECEIVER_SINGLE_MAGIC_VALUE, false,
            RECEIVER_BATCH_MAGIC_VALUE, false,
          );
        });

        context('without data', function () {
          beforeEach(async function () {
            this.toWhom = this.receiver.address;
            this.transferReceipt = await this.token.safeBatchTransferFrom(
              multiTokenHolder, this.receiver.address,
              [firstTokenId, secondTokenId],
              [firstAmount, secondAmount],
              '0x', { from: multiTokenHolder },
            );
            ({ logs: this.transferLogs } = this.transferReceipt);
          });

          batchTransferWasSuccessful.call(this, {
            operator: multiTokenHolder,
            from: multiTokenHolder,
            ids: [firstTokenId, secondTokenId],
            values: [firstAmount, secondAmount],
          });

          it('should call onERC1155BatchReceived', async function () {
            await expectEvent.inTransaction(this.transferReceipt.tx, ERC1155TokenReceiverMock, 'BatchReceived', {
              operator: multiTokenHolder,
              from: multiTokenHolder,
              // ids: [firstTokenId, secondTokenId],
              // values: [firstAmount, secondAmount],
              data: null,
            });
          });
        });

        context('with data', function () {
          const data = '0xf00dd00d';
          beforeEach(async function () {
            this.toWhom = this.receiver.address;
            this.transferReceipt = await this.token.safeBatchTransferFrom(
              multiTokenHolder, this.receiver.address,
              [firstTokenId, secondTokenId],
              [firstAmount, secondAmount],
              data, { from: multiTokenHolder },
            );
            ({ logs: this.transferLogs } = this.transferReceipt);
          });

          batchTransferWasSuccessful.call(this, {
            operator: multiTokenHolder,
            from: multiTokenHolder,
            ids: [firstTokenId, secondTokenId],
            values: [firstAmount, secondAmount],
          });

          it('should call onERC1155Received', async function () {
            await expectEvent.inTransaction(this.transferReceipt.tx, ERC1155TokenReceiverMock, 'BatchReceived', {
              operator: multiTokenHolder,
              from: multiTokenHolder,
              // ids: [firstTokenId, secondTokenId],
              // values: [firstAmount, secondAmount],
              data,
            });
          });
        });
      });

      context('to a receiver contract returning unexpected value', function () {
        beforeEach(async function () {
          this.receiver = await ERC1155TokenReceiverMock.new(
            RECEIVER_SINGLE_MAGIC_VALUE, false,
            RECEIVER_SINGLE_MAGIC_VALUE, false,
          );
        });

        it('reverts', async function () {
          await expectRevert(
            this.token.safeBatchTransferFrom(
              multiTokenHolder, this.receiver.address,
              [firstTokenId, secondTokenId],
              [firstAmount, secondAmount],
              '0x', { from: multiTokenHolder },
            ),
            'ERC1155: got unknown value from onERC1155BatchReceived'
          );
        });
      });

      context('to a receiver contract that reverts', function () {
        beforeEach(async function () {
          this.receiver = await ERC1155TokenReceiverMock.new(
            RECEIVER_SINGLE_MAGIC_VALUE, false,
            RECEIVER_BATCH_MAGIC_VALUE, true,
          );
        });

        it('reverts', async function () {
          await expectRevert(
            this.token.safeBatchTransferFrom(
              multiTokenHolder, this.receiver.address,
              [firstTokenId, secondTokenId],
              [firstAmount, secondAmount],
              '0x', { from: multiTokenHolder },
            ),
            'ERC1155TokenReceiverMock: reverting on batch receive'
          );
        });
      });

      context('to a contract that does not implement the required function', function () {
        it('reverts', async function () {
          const invalidReceiver = this.token;
          await expectRevert.unspecified(
            this.token.safeBatchTransferFrom(
              multiTokenHolder, invalidReceiver.address,
              [firstTokenId, secondTokenId],
              [firstAmount, secondAmount],
              '0x', { from: multiTokenHolder },
            )
          );
        });
      });
    });

    shouldSupportInterfaces(['ERC165', 'ERC1155']);
  });
}

module.exports = {
  shouldBehaveLikeERC1155,
};