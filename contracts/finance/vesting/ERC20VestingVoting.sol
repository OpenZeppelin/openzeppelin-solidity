// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../../token/ERC20/extensions/ERC20Votes.sol";
import "./ERC20VestingWallet.sol";

/**
 * @title ERC20VestingWalletVoting
 * @dev This is an extension to {ERC20VestingWallet} that allow the voting with tokens that are locked. The beneficiary can
 * delegate the voting power associated with vesting tokens to another wallet.
 */
contract ERC20VestingWalletVoting is ERC20VestingWallet {
    constructor(
        address beneficiaryAddress,
        uint256 startTimestamp,
        uint256 durationSeconds
    ) ERC20VestingWallet(beneficiaryAddress, startTimestamp, durationSeconds) {}

    /**
     * @dev Delegate the voting right of tokens currently vesting
     */
    function delegate(address token, address delegatee) public virtual onlyBeneficiary() {
        ERC20Votes(token).delegate(delegatee);
    }
}
