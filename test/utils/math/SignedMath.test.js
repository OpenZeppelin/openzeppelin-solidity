const { BN, constants } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');
const { MAX_INT256 } = constants;

const SignedMathMock = artifacts.require('SignedMathMock');

contract('SignedMath', function (accounts) {
  const min = new BN('-1234');
  const max = new BN('5678');

  beforeEach(async function () {
    this.math = await SignedMathMock.new();
  });

  describe('max', function () {
    it('is correctly detected in first argument position', async function () {
      expect(await this.math.max(max, min)).to.be.bignumber.equal(max);
    });

    it('is correctly detected in second argument position', async function () {
      expect(await this.math.max(min, max)).to.be.bignumber.equal(max);
    });
  });

  describe('min', function () {
    it('is correctly detected in first argument position', async function () {
      expect(await this.math.min(min, max)).to.be.bignumber.equal(min);
    });

    it('is correctly detected in second argument position', async function () {
      expect(await this.math.min(max, min)).to.be.bignumber.equal(min);
    });
  });

  describe('average', function () {
    function bnAverage (a, b) {
      return a.add(b).divn(2);
    }

    it('is correctly calculated with two odd numbers', async function () {
      const a = new BN('57417');
      const b = new BN('95431');
      expect(await this.math.average(a, b)).to.be.bignumber.equal(bnAverage(a, b));
    });

    it('is correctly calculated with two even numbers', async function () {
      const a = new BN('42304');
      const b = new BN('84346');
      expect(await this.math.average(a, b)).to.be.bignumber.equal(bnAverage(a, b));
    });

    it('is correctly calculated with one even number and one odd number', async function () {
      const a = new BN('57417');
      const b = new BN('84346');
      expect(await this.math.average(a, b)).to.be.bignumber.equal(bnAverage(a, b));
    });

    it('is correctly calculated with two odd signed numbers', async function () {
      const a = new BN('-57417');
      const b = new BN('-95431');
      expect(await this.math.average(a, b)).to.be.bignumber.equal(bnAverage(a, b));
    });

    it('is correctly calculated with two even signed numbers', async function () {
      const a = new BN('-42304');
      const b = new BN('-84346');
      expect(await this.math.average(a, b)).to.be.bignumber.equal(bnAverage(a, b));
    });

    it('is correctly calculated with one even signed number and one odd signed number', async function () {
      const a = new BN('-57417');
      const b = new BN('-84346');
      expect(await this.math.average(a, b)).to.be.bignumber.equal(bnAverage(a, b));
    });

    it('is correctly calculated with one odd signed number and one odd number', async function () {
      const a = new BN('-57417');
      const b = new BN('95431');
      expect(await this.math.average(a, b)).to.be.bignumber.equal(bnAverage(a, b));
    });

    it('is correctly calculated with one even signed number and one even number', async function () {
      const a = new BN('-42304');
      const b = new BN('84346');
      expect(await this.math.average(a, b)).to.be.bignumber.equal(bnAverage(a, b));
    });

    it('is correctly calculated with one even number and one odd signed number and even its greater than odd, both in module', async function () {
      const a = new BN('2');
      const b = new BN('-1');

      expect(await this.math.average(a, b)).to.be.bignumber.equal(bnAverage(a, b));
    });

    it('is correctly calculated with one odd number and one even signed number and odd its greater than even, both in module', async function () {
      const a = new BN('3');
      const b = new BN('-2');

      expect(await this.math.average(a, b)).to.be.bignumber.equal(bnAverage(a, b));
    });


    it('is correctly calculated with one even number and one odd signed number and odd its greater than even, both in module', async function () {
      const a = new BN('2');
      const b = new BN('-3');

      expect(await this.math.average(a, b)).to.be.bignumber.equal(bnAverage(a, b));
    });

    it('is correctly calculated with one odd number and one even signed number and even its greater than odd, both in module', async function () {
      const a = new BN('3');
      const b = new BN('-4');

      expect(await this.math.average(a, b)).to.be.bignumber.equal(bnAverage(a, b));
    });

    it('is correctly calculated with one even signed number and one odd number and even its greater than odd, both in module', async function () {
      const a = new BN('-2');
      const b = new BN('1');

      expect(await this.math.average(a, b)).to.be.bignumber.equal(bnAverage(a, b));
    });

    it('is correctly calculated with one odd signed number and one even number and odd its greater than even, both in module', async function () {
      const a = new BN('-3');
      const b = new BN('2');

      expect(await this.math.average(a, b)).to.be.bignumber.equal(bnAverage(a, b));
    });

    it('is correctly calculated with one even signed number and one odd number and odd its greater than even, both in module', async function () {
      const a = new BN('-2');
      const b = new BN('3');

      expect(await this.math.average(a, b)).to.be.bignumber.equal(bnAverage(a, b));
    });

    it('is correctly calculated with one odd signed number and one even number and even its greater than odd, both in module', async function () {
      const a = new BN('-3');
      const b = new BN('4');

      expect(await this.math.average(a, b)).to.be.bignumber.equal(bnAverage(a, b));
    });

    it('is correctly calculated with two max int256 numbers', async function () {
      const a = MAX_INT256;

      expect(await this.math.average(a, a)).to.be.bignumber.equal(bnAverage(a, a));
    });

    it('is correctly calculated with two min int256 numbers', async function () {
      const a = MAX_INT256;

      expect(await this.math.average(a, a)).to.be.bignumber.equal(bnAverage(a, a));
    });
  });

  describe('ceilDiv', function () {
    it('does not round up on exact division, unsigned numbers', async function () {
      const a = new BN('10');
      const b = new BN('5');
      expect(await this.math.ceilDiv(a, b)).to.be.bignumber.equal('2');
    });

    it('does not round up on exact division, signed numbers', async function () {
      const a = new BN('-10');
      const b = new BN('-5');
      expect(await this.math.ceilDiv(a, b)).to.be.bignumber.equal('2');
    });

    it('does not round up on exact division', async function () {
      const a = new BN('-10');
      const b = new BN('5');
      expect(await this.math.ceilDiv(a, b)).to.be.bignumber.equal('-2');
    });

    it('rounds up on division with remainders, unsigned numbers', async function () {
      const a = new BN('42');
      const b = new BN('13');
      expect(await this.math.ceilDiv(a, b)).to.be.bignumber.equal('4');
    });

    it('rounds up on division with remainders signed numbers', async function () {
      const a = new BN('-42');
      const b = new BN('-13');
      expect(await this.math.ceilDiv(a, b)).to.be.bignumber.equal('4');
    });

    it('rounds up on division with remainders', async function () {
      const a = new BN('-42');
      const b = new BN('13');
      expect(await this.math.ceilDiv(a, b)).to.be.bignumber.equal('-4');
    });

    it('does not overflow', async function () {
      const b = new BN('2');
      const result = new BN('1').shln(254);
      expect(await this.math.ceilDiv(MAX_INT256, b)).to.be.bignumber.equal(result);
    });

    it('correctly computes max int256 divided by 1', async function () {
      const b = new BN('1');
      expect(await this.math.ceilDiv(MAX_INT256, b)).to.be.bignumber.equal(MAX_INT256);
    });
  });
});
