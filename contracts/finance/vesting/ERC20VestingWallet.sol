// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../../token/ERC20/utils/SafeERC20.sol";
import "../../utils/Context.sol";

/**
 * @title ERC20VestingWallet
 * @dev This contract handles the vesting of ERC20 tokens for a given beneficiary. Custody of multiple tokens can be
 * given to this contract, which will release the token to the beneficiary following a given vesting schedule. The
 * vesting schedule is customizable through the {vestedAmount} function.
 *
 * Any token transferred to this contract will follow the vesting schedule as if they were locked from the beginning.
 * Consequently, if the vesting has already started, any amount of tokens sent to this contract will (at least partly)
 * be immediately releasable.
 */
contract ERC20VestingWallet is Context {
    event TokensReleased(address token, uint256 amount);

    mapping(address => uint256) private _released;
    address private immutable _beneficiary;
    uint256 private immutable _start;
    uint256 private immutable _duration;

    modifier onlyBeneficiary() {
        require(beneficiary() == _msgSender(), "ERC20VestingWallet: access restricted to beneficiary");
        _;
    }

    /**
     * @dev Set the beneficiary, start timestamp and vesting duration of the vesting wallet.
     */
    constructor(
        address beneficiaryAddress,
        uint256 startTimestamp,
        uint256 durationSeconds
    ) {
        require(beneficiaryAddress != address(0), "ERC20VestingWallet: beneficiary is zero address");
        _beneficiary = beneficiaryAddress;
        _start = startTimestamp;
        _duration = durationSeconds;
    }

    /**
     * @dev Getter for the beneficiary address.
     */
    function beneficiary() public view virtual returns (address) {
        return _beneficiary;
    }

    /**
     * @dev Getter for the start timestamp.
     */
    function start() public view virtual returns (uint256) {
        return _start;
    }

    /**
     * @dev Getter for the vesting duration.
     */
    function duration() public view virtual returns (uint256) {
        return _duration;
    }

    /**
     * @dev Amont of token already released
     */
    function released(address token) public view returns (uint256) {
        return _released[token];
    }

    /**
     * @dev Release the tokens that have already vested.
     *
     * Emits a {TokensReleased} event.
     */
    function release(address token) public virtual {
        uint256 releasable = vestedAmount(token, block.timestamp) - released(token);
        _released[token] += releasable;
        emit TokensReleased(token, releasable);
        SafeERC20.safeTransfer(IERC20(token), beneficiary(), releasable);
    }

    /**
     * @dev Calculates the amount that has already vested. Default implementation is a linear vesting curve.
     */
    function vestedAmount(address token, uint256 timestamp) public view virtual returns (uint256) {
        if (timestamp < start()) {
            return 0;
        } else if (timestamp >= start() + duration()) {
            return _historicalBalance(token);
        } else {
            return (_historicalBalance(token) * (timestamp - start())) / duration();
        }
    }

    /**
     * @dev Calculates the historical balance (current balance + already released balance).
     */
    function _historicalBalance(address token) internal view virtual returns (uint256) {
        return IERC20(token).balanceOf(address(this)) + released(token);
    }
}
