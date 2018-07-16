const { assertRevert } = require('../helpers/assertRevert');
const { getBouncerSigner } = require('../helpers/sign');
const makeInterfaceId = require('../helpers/makeInterfaceId');

const Bouncer = artifacts.require('BouncerMock');
const BouncerDelegateImpl = artifacts.require('BouncerDelegateImpl');

require('chai')
  .use(require('chai-as-promised'))
  .should();

const UINT_VALUE = 23;
const BYTES_VALUE = web3.toHex('test');
const INVALID_SIGNATURE = '0xabcd';

contract('Bouncer', ([_, owner, anyone, bouncerAddress, authorizedUser]) => {
  beforeEach(async function () {
    this.bouncer = await SignatureBouncer.new({ from: owner });
    this.roleBouncer = await this.bouncer.ROLE_BOUNCER();
  });

  it('should not allow anyone to add a delegate', async function () {
    await assertRevert(
      this.bouncer.addDelegate(delegate, { from: anyone })
    );
  });

  context('modifiers', () => {
    it('should allow valid signature for sender', async function () {
      await this.bouncer.onlyWithValidTicket(
        this.signFor(authorizedUser),
        { from: authorizedUser }
      );
    });

    it('does not allow adding an invalid address', async function () {
      await assertRevert(
        this.bouncer.onlyWithValidTicket(
          INVALID_SIGNATURE,
          { from: authorizedUser }
        )
      );
    });
    it('should allow valid signature with a valid method for sender', async function () {
      await this.bouncer.onlyWithValidTicketAndMethod(
        this.signFor(authorizedUser, 'onlyWithValidTicketAndMethod'),
        { from: authorizedUser }
      );
    });

    it('does not allow anyone to add a bouncer', async function () {
      await assertRevert(
        this.bouncer.onlyWithValidTicketAndMethod(
          INVALID_SIGNATURE,
          { from: authorizedUser }
        )
      );
    });
    it('should allow valid signature with a valid data for sender', async function () {
      await this.bouncer.onlyWithValidTicketAndData(
        UINT_VALUE,
        this.signFor(authorizedUser, 'onlyWithValidTicketAndData', [UINT_VALUE]),
        { from: authorizedUser }
      );
    });

    it('does not allow anyone to remove a bouncer', async function () {
      await this.bouncer.addBouncer(bouncerAddress, { from: owner });

      await assertRevert(
        this.bouncer.onlyWithValidTicketAndData(
          UINT_VALUE,
          INVALID_SIGNATURE,
          { from: authorizedUser }
        )
      );
    });
  });

  context('signatures', () => {
    it('should accept valid message for valid user', async function () {
      const isValid = await this.bouncer.checkValidTicket(
        authorizedUser,
        this.signFor(authorizedUser)
      );
      isValid.should.eq(true);
    });
    it('should not accept invalid message for valid user', async function () {
      const isValid = await this.bouncer.checkValidTicket(
        authorizedUser,
        this.signFor(anyone)
      );
      isValid.should.eq(false);
    });
    it('should not accept invalid message for invalid user', async function () {
      const isValid = await this.bouncer.checkValidTicket(
        anyone,
        'abcd'
      );
      isValid.should.eq(false);
    });
    it('should not accept valid message for invalid user', async function () {
      const isValid = await this.bouncer.checkValidTicket(
        anyone,
        this.signFor(authorizedUser)
      );
      isValid.should.eq(false);
    });
    it('should accept valid message with valid method for valid user', async function () {
      const isValid = await this.bouncer.checkValidTicketAndMethod(
        authorizedUser,
        this.signFor(authorizedUser, 'checkValidTicketAndMethod')
      );
      isValid.should.eq(true);
    });
    it('should not accept valid message with an invalid method for valid user', async function () {
      const isValid = await this.bouncer.checkValidTicketAndMethod(
        authorizedUser,
        this.signFor(authorizedUser, 'theWrongMethod')
      );
      isValid.should.eq(false);
    });
    it('should not accept valid message with a valid method for an invalid user', async function () {
      const isValid = await this.bouncer.checkValidTicketAndMethod(
        anyone,
        this.signFor(authorizedUser, 'checkValidTicketAndMethod')
      );
      isValid.should.eq(false);
    });
    it('should accept valid method with valid params for valid user', async function () {
      const isValid = await this.bouncer.checkValidTicketAndData(
        authorizedUser,
        BYTES_VALUE,
        UINT_VALUE,
        this.signFor(authorizedUser, 'checkValidTicketAndData', [authorizedUser, BYTES_VALUE, UINT_VALUE])
      );
      isValid.should.eq(true);
    });
    it('should not accept valid method with invalid params for valid user', async function () {
      const isValid = await this.bouncer.checkValidTicketAndData(
        authorizedUser,
        BYTES_VALUE,
        500,
        this.signFor(authorizedUser, 'checkValidTicketAndData', [authorizedUser, BYTES_VALUE, UINT_VALUE])
      );
      isValid.should.eq(false);
    });
    it('should not accept valid method with valid params for invalid user', async function () {
      const isValid = await this.bouncer.checkValidTicketAndData(
        anyone,
        BYTES_VALUE,
        UINT_VALUE,
        this.signFor(authorizedUser, 'checkValidTicketAndData', [authorizedUser, BYTES_VALUE, UINT_VALUE])
      );
      isValid.should.eq(false);
    });
  });

    describe('modifiers', () => {
      context('plain signature', () => {
        it('allows valid signature for sender', async function () {
          await this.bouncer.onlyWithValidSignature(this.signFor(authorizedUser), { from: authorizedUser });
        });

        it('does not allow invalid signature for sender', async function () {
          await assertRevert(
            this.bouncer.onlyWithValidSignature(INVALID_SIGNATURE, { from: authorizedUser })
          );
        });

        it('does not allow valid signature for other sender', async function () {
          await assertRevert(
            this.bouncer.onlyWithValidSignature(this.signFor(authorizedUser), { from: anyone })
          );
        });

        it('does not allow valid signature for method for sender', async function () {
          await assertRevert(
            this.bouncer.onlyWithValidSignature(this.signFor(authorizedUser, 'onlyWithValidSignature'),
              { from: authorizedUser })
          );
        });
      });

      context('method signature', () => {
        it('allows valid signature with correct method for sender', async function () {
          await this.bouncer.onlyWithValidSignatureAndMethod(
            this.signFor(authorizedUser, 'onlyWithValidSignatureAndMethod'), { from: authorizedUser }
          );
        });

        it('does not allow invalid signature with correct method for sender', async function () {
          await assertRevert(
            this.bouncer.onlyWithValidSignatureAndMethod(INVALID_SIGNATURE, { from: authorizedUser })
          );
        });

        it('does not allow valid signature with correct method for other sender', async function () {
          await assertRevert(
            this.bouncer.onlyWithValidSignatureAndMethod(
              this.signFor(authorizedUser, 'onlyWithValidSignatureAndMethod'), { from: anyone }
            )
          );
        });

        it('does not allow valid method signature with incorrect method for sender', async function () {
          await assertRevert(
            this.bouncer.onlyWithValidSignatureAndMethod(this.signFor(authorizedUser, 'theWrongMethod'),
              { from: authorizedUser })
          );
        });

        it('does not allow valid non-method signature method for sender', async function () {
          await assertRevert(
            this.bouncer.onlyWithValidSignatureAndMethod(this.signFor(authorizedUser), { from: authorizedUser })
          );
        });
      });

      context('method and data signature', () => {
        it('allows valid signature with correct method and data for sender', async function () {
          await this.bouncer.onlyWithValidSignatureAndData(UINT_VALUE,
            this.signFor(authorizedUser, 'onlyWithValidSignatureAndData', [UINT_VALUE]), { from: authorizedUser }
          );
        });

        it('does not allow invalid signature with correct method and data for sender', async function () {
          await assertRevert(
            this.bouncer.onlyWithValidSignatureAndData(UINT_VALUE, INVALID_SIGNATURE, { from: authorizedUser })
          );
        });

        it('does not allow valid signature with correct method and incorrect data for sender', async function () {
          await assertRevert(
            this.bouncer.onlyWithValidSignatureAndData(UINT_VALUE + 10,
              this.signFor(authorizedUser, 'onlyWithValidSignatureAndData', [UINT_VALUE]),
              { from: authorizedUser }
            )
          );
        });

        it('does not allow valid signature with correct method and data for other sender', async function () {
          await assertRevert(
            this.bouncer.onlyWithValidSignatureAndData(UINT_VALUE,
              this.signFor(authorizedUser, 'onlyWithValidSignatureAndData', [UINT_VALUE]),
              { from: anyone }
            )
          );
        });

        it('does not allow valid non-method signature for sender', async function () {
          await assertRevert(
            this.bouncer.onlyWithValidSignatureAndData(UINT_VALUE,
              this.signFor(authorizedUser), { from: authorizedUser }
            )
          );
        });
      });
    });

    context('signature validation', () => {
      context('plain signature', () => {
        it('validates valid signature for valid user', async function () {
          (await this.bouncer.checkValidSignature(authorizedUser, this.signFor(authorizedUser))).should.eq(true);
        });

        it('does not validate invalid signature for valid user', async function () {
          (await this.bouncer.checkValidSignature(authorizedUser, INVALID_SIGNATURE)).should.eq(false);
        });

        it('does not validate valid signature for anyone', async function () {
          (await this.bouncer.checkValidSignature(anyone, this.signFor(authorizedUser))).should.eq(false);
        });

        it('does not validate valid signature for method for valid user', async function () {
          (await this.bouncer.checkValidSignature(authorizedUser, this.signFor(authorizedUser, 'checkValidSignature'))
          ).should.eq(false);
        });
      });

      context('method signature', () => {
        it('validates valid signature with correct method for valid user', async function () {
          (await this.bouncer.checkValidSignatureAndMethod(authorizedUser,
            this.signFor(authorizedUser, 'checkValidSignatureAndMethod'))
          ).should.eq(true);
        });

        it('does not validate invalid signature with correct method for valid user', async function () {
          (await this.bouncer.checkValidSignatureAndMethod(authorizedUser, INVALID_SIGNATURE)).should.eq(false);
        });

        it('does not validate valid signature with correct method for anyone', async function () {
          (await this.bouncer.checkValidSignatureAndMethod(anyone,
            this.signFor(authorizedUser, 'checkValidSignatureAndMethod'))
          ).should.eq(false);
        });

        it('does not validate valid non-method signature with correct method for valid user', async function () {
          (await this.bouncer.checkValidSignatureAndMethod(authorizedUser, this.signFor(authorizedUser))
          ).should.eq(false);
        });
      });

      context('method and data signature', () => {
        it('validates valid signature with correct method and data for valid user', async function () {
          (await this.bouncer.checkValidSignatureAndData(authorizedUser, BYTES_VALUE, UINT_VALUE,
            this.signFor(authorizedUser, 'checkValidSignatureAndData', [authorizedUser, BYTES_VALUE, UINT_VALUE]))
          ).should.eq(true);
        });

        it('does not validate invalid signature with correct method and data for valid user', async function () {
          (await this.bouncer.checkValidSignatureAndData(authorizedUser, BYTES_VALUE, UINT_VALUE, INVALID_SIGNATURE)
          ).should.eq(false);
        });

        it('does not validate valid signature with correct method and incorrect data for valid user',
          async function () {
            (await this.bouncer.checkValidSignatureAndData(authorizedUser, BYTES_VALUE, UINT_VALUE + 10,
              this.signFor(authorizedUser, 'checkValidSignatureAndData', [authorizedUser, BYTES_VALUE, UINT_VALUE]))
            ).should.eq(false);
          }
        );

        it('does not validate valid signature with correct method and data for anyone', async function () {
          (await this.bouncer.checkValidSignatureAndData(anyone, BYTES_VALUE, UINT_VALUE,
            this.signFor(authorizedUser, 'checkValidSignatureAndData', [authorizedUser, BYTES_VALUE, UINT_VALUE]))
          ).should.eq(false);
        });

        it('does not validate valid non-method-data signature with correct method and data for valid user',
          async function () {
            (await this.bouncer.checkValidSignatureAndData(authorizedUser, BYTES_VALUE, UINT_VALUE,
              this.signFor(authorizedUser, 'checkValidSignatureAndData'))
            ).should.eq(false);
          }
        );
      });
    });
  });

  context('contract delegate', () => {
    context('not a delegate', () => {
      beforeEach(async function () {
        this.delegateContract = await BouncerDelegateImpl.new(true, this.bouncer.address, { from: owner });
      });

      it('should fail', async function () {
        await assertRevert(
          this.delegateContract.forward({ from: anyone })
        );
      });
    });

    context('invalid delegate', () => {
      beforeEach(async function () {
        this.delegateContract = await BouncerDelegateImpl.new(false, this.bouncer.address, { from: owner });
        await this.bouncer.addDelegate(this.delegateContract.address, { from: owner });
      });

      it('should be invalid', async function () {
        await assertRevert(
          this.delegateContract.forward({ from: anyone })
        );
      });
    });

    context('valid delegate', () => {
      beforeEach(async function () {
        this.delegateContract = await BouncerDelegateImpl.new(true, this.bouncer.address, { from: owner });
        await this.bouncer.addDelegate(this.delegateContract.address, { from: owner });
      });

      it('should support isValidSignature', async function () {
        const supported = await this.delegateContract.supportsInterface(makeInterfaceId([
          'isValidSignature(bytes32,bytes)',
        ]));
        supported.should.eq(true);
      });

      it('should be valid', async function () {
        await this.delegateContract.forward({ from: anyone });
      });
    });
  });
});
