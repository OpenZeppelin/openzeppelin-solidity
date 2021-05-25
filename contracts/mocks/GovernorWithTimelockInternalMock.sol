// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "../token/ERC20/extensions/IComp.sol";
import "../governance/Governor.sol";
import "../governance/extensions/GovernorWithTimelockInternal.sol";

contract GovernorWithTimelockInternalMock is GovernorWithTimelockInternal {
    IComp immutable internal _token;

    constructor(string memory name_, string memory version_, IComp token_, uint256 delay_)
    EIP712(name_, version_)
    GovernorWithTimelockInternal(delay_)
    {
        _token = token_;
    }

    receive() external payable {}

    function token()          public view          returns (IComp)   { return _token; }
    function votingOffset()   public pure override returns (uint256) { return 0;      }
    function votingDuration() public pure override returns (uint256) { return 7 days; } // FOR TESTING ONLY
    function maxScore()       public pure override returns (uint8)   { return 100;    } // default: 255 ?
    function requiredScore()  public pure override returns (uint8)   { return 50;     } // default: 128 ?

    function quorum(uint256 /*blockNumber*/) public pure override returns (uint256) {
        return 1;
    }

    function getVotes(address account, uint256 blockNumber) public view virtual override returns(uint256) {
        return _token.getPriorVotes(account, blockNumber);
    }

    function cancel(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 salt
    ) public returns (uint256 proposalId) {
        return _cancel(targets, values, calldatas, salt);
    }
}