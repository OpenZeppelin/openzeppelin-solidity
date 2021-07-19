// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "../utils/math/SignedMath.sol";

contract SignedMathMock {
    function max(int256 a, int256 b) public pure returns (int256) {
        return SignedMath.max(a, b);
    }

    function min(int256 a, int256 b) public pure returns (int256) {
        return SignedMath.min(a, b);
    }

    function average(int256 a, int256 b) public pure returns (int256) {
        return SignedMath.average(a, b);
    }

    function ceilDiv(int256 a, int256 b) public pure returns (int256) {
        return SignedMath.ceilDiv(a, b);
    }
}
