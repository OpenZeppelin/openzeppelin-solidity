const { expectThrow } = require('../helpers/expectThrow');
const expectEvent = require('../helpers/expectEvent');

const Superuser = artifacts.require('Superuser');

require('chai')
  .should();

contract('Superuser', function ([_, firstOwner, newSuperuser, newOwner, anyone]) {
  beforeEach(async function () {
    this.superuser = await Superuser.new({ from: firstOwner });
  });

  context('in normal conditions', () => {
    it('should set the owner as the default superuser', async function () {
      const ownerIsSuperuser = await this.superuser.isSuperuser(firstOwner);
      ownerIsSuperuser.should.be.eq(true);
    });

    it('should change superuser after transferring', async function () {
      await this.superuser.transferSuperuser(newSuperuser, { from: firstOwner });

      const ownerIsSuperuser = await this.superuser.isSuperuser(firstOwner);
      ownerIsSuperuser.should.be.eq(false);

      const newSuperuserIsSuperuser = await this.superuser.isSuperuser(newSuperuser);
      newSuperuserIsSuperuser.should.be.eq(true);
    });

    it('should change owner after the superuser transfers the ownership', async function () {
      await this.superuser.transferSuperuser(newSuperuser, { from: firstOwner });

      await expectEvent.inTransaction(
        this.superuser.transferOwnership(newOwner, { from: newSuperuser }),
        'OwnershipTransferred'
      );

      const currentOwner = await this.superuser.owner();
      currentOwner.should.be.eq(newOwner);
    });

    it('should change owner after the owner transfers the ownership', async function () {
      await expectEvent.inTransaction(
        this.superuser.transferOwnership(newOwner, { from: firstOwner }),
        'OwnershipTransferred'
      );

      const currentOwner = await this.superuser.owner();
      currentOwner.should.be.eq(newOwner);
    });
  });

  context('in adversarial conditions', () => {
    it('should prevent non-superusers from transfering the superuser role', async function () {
      await expectThrow(
        this.superuser.transferSuperuser(newOwner, { from: anyone })
      );
    });

    it('should prevent users that are not superuser nor owner from setting a new owner', async function () {
      await expectThrow(
        this.superuser.transferOwnership(newOwner, { from: anyone })
      );
    });
  });
});
