pragma solidity ^0.4.24;

import "./MintableToken.sol";


/**
 * @title Capped token
 * @dev Mintable token with a token cap.
 */
contract CappedToken is ERC20Mintable {

  uint256 public cap;

  constructor(uint256 _cap) public {
    require(_cap > 0);
    cap = _cap;
  }

  /**
   * @dev Function to mint tokens
   * @param _to The address that will receive the minted tokens.
   * @param _amount The amount of tokens to mint.
   * @return A boolean that indicates if the operation was successful.
   */
  function mint(
    address _to,
    uint256 _amount
  )
    public
    returns (bool)
  {
    require(totalSupply().add(_amount) <= cap);

    return super.mint(_to, _amount);
  }

}
