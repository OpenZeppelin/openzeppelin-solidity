// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "./IGovernorWithTimelock.sol";
import "../Governor.sol";

abstract contract GovernorWithTimelockInternal is IGovernorWithTimelock, Governor {
    using Time for Time.Timer;

    mapping (uint256 => Time.Timer) private _executionTimers;
    uint256 private _delay;

    /**
     * @dev Emitted when the minimum delay for future operations is modified.
     */
    event DelayChange(uint256 oldDuration, uint256 newDuration);

    constructor(uint256 delay_) {
        _updateDelay(delay_);
    }

    function delay() public view virtual returns (uint256) {
        return _delay;
    }

    function updateDelay(uint256 newDelay) external virtual {
        require(msg.sender == address(this), "GovernorWithTimelockInternal: caller must be governor");
        _updateDelay(newDelay);
    }

    function _updateDelay(uint256 newDelay) internal virtual {
        emit DelayChange(_delay, newDelay);
        _delay = newDelay;
    }

    function timelock() public view virtual override returns (address) {
        return address(this);
    }

    function queue(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 salt
    )
    public virtual override returns (uint256 proposalId)
    {
        // _call is overriden to customize _execute action (while keeping the checks)
        proposalId = _execute(targets, values, calldatas, salt);
        uint256 eta = block.timestamp + delay();
        emit ProposalQueued(proposalId, eta);
    }

    function execute(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 salt
    )
    public payable virtual override returns (uint256 proposalId)
    {
        proposalId = hashProposal(targets, values, calldatas, salt);

        Time.Timer storage timer = _executionTimers[proposalId];
        require(timer.isExpired(), "Governance: proposal timelock not ready");
        timer.lock();

        // Use the non overloaded version
        Governor._calls(proposalId, targets, values, calldatas, salt);

        emit ProposalExecuted(proposalId);
    }

    function _cancel(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 salt
    )
    internal virtual override returns (uint256 proposalId)
    {
        proposalId = super._cancel(targets, values, calldatas, salt);
        _executionTimers[proposalId].lock();
    }

    function _calls(
        uint256 proposalId,
        address[] memory /*targets*/,
        uint256[] memory /*values*/,
        bytes[] memory /*calldatas*/,
        bytes32 /*salt*/
    )
    internal virtual override
    {
        // DO NOT EXECUTE, instead, start the execution timer
        _executionTimers[proposalId].setDeadline(block.timestamp + delay());
    }
}