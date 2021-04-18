// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "../ERC20.sol";

abstract contract ERC20Wrapper is ERC20 {
    IERC20 immutable public underlying;

    constructor(IERC20 underlyingToken) {
        underlying = underlyingToken;
    }

    function depositFor(address account, uint256 amount) public virtual returns (bool) {
        require(underlying.transferFrom(_msgSender(), address(this), amount));
        _mint(account, amount);
        return true;
    }

    function withdrawTo(address account, uint256 amount) public virtual returns (bool) {
        _burn(_msgSender(), amount);
        require(underlying.transfer(account, amount));
        return true;
    }
}
