pragma solidity ^0.5.0;

import "./IERC777.sol";
import "./IERC777Recipient.sol";
import "./IERC777Sender.sol";
import "../../token/ERC20/ERC20Detailed.sol";
import "../../math/SafeMath.sol";
import "../../utils/Address.sol";
import "../IERC1820Registry.sol";

/**
 * @title ERC777 token implementation
 * @author etsvigun <utgarda@gmail.com>, Bertrand Masius <github@catageeks.tk>
 */
contract ERC777 is IERC777, ERC20Detailed {
    using SafeMath for uint256;
    using Address for address;

    IERC1820Registry private _erc1820 = IERC1820Registry(0x1820a4B7618BdE71Dce8cdc73aAB6C95905faD24);

    mapping(address => uint256) private _balances;

    uint256 private _totalSupply;

    uint256 private _granularity;

    bytes32 constant private TOKENS_SENDER_INTERFACE_HASH = keccak256("ERC777TokensSender");
    bytes32 constant private TOKENS_RECIPIENT_INTERFACE_HASH = keccak256("ERC777TokensRecipient");

    // This isn't ever read from - it's only used to respond to the defaultOperators query.
    address[] private _defaultOperatorsArray;

    // Immutable, but accounts may revoke them (tracked in __revokedDefaultOperators).
    mapping(address => bool) private _defaultOperators;

    // For each account, a mapping of its operators and revoked default operators.
    mapping(address => mapping(address => bool)) private _operators;
    mapping(address => mapping(address => bool)) private _revokedDefaultOperators;

    // ERC20-allowances
    mapping (address => mapping (address => uint256)) private _allowances;

    constructor(
        string memory name,
        string memory symbol,
        uint256 granularity,
        address[] memory defaultOperators
    ) public ERC20Detailed(name, symbol, 18) { // The spec requires that decimals be 18
        require(granularity > 0);

        _granularity = granularity;

        _defaultOperatorsArray = defaultOperators;
        for (uint256 i = 0; i < _defaultOperatorsArray.length; i++) {
            _defaultOperators[_defaultOperatorsArray[i]] = true;
        }

        // register interface
        _erc1820.setInterfaceImplementer(address(this), keccak256("ERC777Token"), address(this));
    }

    /**
     * @dev Send the amount of tokens from the address msg.sender to the address to
     * @param to address recipient address
     * @param amount uint256 amount of tokens to transfer
     * @param data bytes information attached to the send, and intended for the recipient (to)
     */
    function send(address to, uint256 amount, bytes calldata data) external {
        _send(msg.sender, msg.sender, to, amount, data, "");
    }

    /**
     * @dev Send the amount of tokens on behalf of the address from to the address to
     * @param from address token holder address.
     * @param to address recipient address
     * @param amount uint256 amount of tokens to transfer
     * @param data bytes information attached to the send, and intended for the recipient (to)
     * @param operatorData bytes extra information provided by the operator (if any)
     */
    function operatorSend(
        address from,
        address to,
        uint256 amount,
        bytes calldata data,
        bytes calldata operatorData
    )
    external
    {
        require(isOperatorFor(msg.sender, from));
        _send(msg.sender, from, to, amount, data, operatorData);
    }

    /**
     * @dev Transfer token to a specified address.
     * Required for ERC20 compatiblity. Note that transferring tokens this way may result in locked tokens (i.e. tokens
     * can be sent to a contract that does not implement the ERC777TokensRecipient interface).
     * @param to The address to transfer to.
     * @param value The amount to be transferred.
     */
    function transfer(address to, uint256 value) external returns (bool) {
        _send(msg.sender, msg.sender, to, value, "", "");
        return true;
    }

    /**
     * @dev Transfer tokens from one address to another.
     * Note that while this function emits an Approval event, this is not required as per the specification,
     * and other compliant implementations may not emit the event.
     * Required for ERC20 compatiblity. Note that transferring tokens this way may result in locked tokens (i.e. tokens
     * can be sent to a contract that does not implement the ERC777TokensRecipient interface).
     * @param from address The address which you want to send tokens from
     * @param to address The address which you want to transfer to
     * @param value uint256 the amount of tokens to be transferred
     */
    function transferFrom(address from, address to, uint256 value) external returns (bool) {
        _send(msg.sender, from, to, value, "", "");
        _approve(from, msg.sender, _allowances[from][msg.sender].sub(value));
        return true;
    }

    /**
     * @dev Burn the amount of tokens from the address msg.sender
     * @param amount uint256 amount of tokens to transfer
     * @param data bytes extra information provided by the token holder
     */
    function burn(uint256 amount, bytes calldata data) external {
        _burn(msg.sender, msg.sender, amount, data, "");
    }

    /**
     * @dev Burn the amount of tokens on behalf of the address from
     * @param from address token holder address.
     * @param amount uint256 amount of tokens to transfer
     * @param data bytes extra information provided by the token holder
     * @param operatorData bytes extra information provided by the operator (if any)
     */
    function operatorBurn(address from, uint256 amount, bytes calldata data, bytes calldata operatorData) external {
        require(isOperatorFor(msg.sender, from));
        _burn(msg.sender, from, amount, data, operatorData);
    }

    /**
     * @dev Authorize an operator for the sender
     * @param operator address to be authorized as operator
     */
    function authorizeOperator(address operator) external {
        require(msg.sender != operator);

        if (_defaultOperators[operator]) {
            delete _revokedDefaultOperators[msg.sender][operator];
        } else {
            _operators[msg.sender][operator] = true;
        }

        emit AuthorizedOperator(operator, msg.sender);
    }

    /**
     * @dev Revoke operator rights from one of the default operators
     * @param operator address to revoke operator rights from
     */
    function revokeOperator(address operator) external {
        require(operator != msg.sender);

        if (_defaultOperators[operator]) {
            _revokedDefaultOperators[msg.sender][operator] = true;
        } else {
            delete _operators[msg.sender][operator];
        }

        emit RevokedOperator(operator, msg.sender);
    }

    /**
     * @dev Approve the passed address to spend the specified amount of tokens on behalf of msg.sender.
     * Beware that changing an allowance with this method brings the risk that someone may use both the old
     * and the new allowance by unfortunate transaction ordering. One possible solution to mitigate this
     * race condition is to first reduce the spender's allowance to 0 and set the desired value afterwards:
     * https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
     * Required for ERC20 compatilibity.
     * @param spender The address which will spend the funds.
     * @param value The amount of tokens to be spent.
     */
    function approve(address spender, uint256 value) external returns (bool) {
        _approve(msg.sender, spender, value);
        return true;
    }

    /**
     * @dev Total number of tokens in existence
     */
    function totalSupply() public view returns (uint256) {
        return _totalSupply;
    }

    /**
     * @dev Gets the balance of the specified address.
     * @param tokenHolder The address to query the balance of.
        * @return uint256 representing the amount owned by the specified address.
     */
    function balanceOf(address tokenHolder) public view returns (uint256) {
        return _balances[tokenHolder];
    }

    /**
     * @dev Gets the token's granularity,
     * i.e. the smallest number of tokens (in the basic unit)
     * which may be minted, sent or burned at any time
     * @return uint256 granularity
     */
    function granularity() public view returns (uint256) {
        return _granularity;
    }

    /**
     * @dev Get the list of default operators as defined by the token contract.
     * @return address[] default operators
     */
    function defaultOperators() public view returns (address[] memory) {
        return _defaultOperatorsArray;
    }

    /**
     * @dev Indicate whether an address
     * is an operator of the tokenHolder address
     * @param operator address which may be an operator of tokenHolder
     * @param tokenHolder address of a token holder which may have the operator
     * address as an operator.
     */
    function isOperatorFor(
        address operator,
        address tokenHolder
    ) public view returns (bool) {
        return operator == tokenHolder ||
            (_defaultOperators[operator] && !_revokedDefaultOperators[tokenHolder][operator]) ||
            _operators[tokenHolder][operator];
    }

    /**
     * @dev Function to check the amount of tokens that an owner allowed to a spender.
     * Required for ERC20 compatibility.
     * @param owner address The address which owns the funds.
     * @param spender address The address which will spend the funds.
     * @return A uint256 specifying the amount of tokens still available for the spender.
     */
    function allowance(address owner, address spender) public view returns (uint256) {
        return _allowances[owner][spender];
    }

    /**
     * @dev Mint tokens. Does not check authorization of operator
     * @dev the caller may ckeck that operator is authorized before calling
     * @param operator address operator requesting the operation
     * @param to address token recipient address
     * @param amount uint256 amount of tokens to mint
     * @param userData bytes extra information defined by the token recipient (if any)
     * @param operatorData bytes extra information provided by the operator (if any)
     */
    function _mint(
        address operator,
        address to,
        uint256 amount,
        bytes memory userData,
        bytes memory operatorData
    )
    internal
    {
        require(to != address(0));
        require((amount % _granularity) == 0);

        // Update state variables
        _totalSupply = _totalSupply.add(amount);
        _balances[to] = _balances[to].add(amount);

        _callTokensReceived(operator, address(0), to, amount, userData, operatorData);

        emit Minted(operator, to, amount, userData, operatorData);
        emit Transfer(address(0), to, amount);
    }

    /**
     * @dev Send tokens
     * @param operator address operator requesting the transfer
     * @param from address token holder address
     * @param to address recipient address
     * @param amount uint256 amount of tokens to transfer
     * @param userData bytes extra information provided by the token holder (if any)
     * @param operatorData bytes extra information provided by the operator (if any)
     */
    function _send(
        address operator,
        address from,
        address to,
        uint256 amount,
        bytes memory userData,
        bytes memory operatorData
    )
    private
    {
        require(from != address(0));
        require(to != address(0));
        require((amount % _granularity) == 0);

        _callTokensToSend(operator, from, to, amount, userData, operatorData);

        // Update state variables
        _balances[from] = _balances[from].sub(amount);
        _balances[to] = _balances[to].add(amount);

        _callTokensReceived(operator, from, to, amount, userData, operatorData);

        emit Sent(operator, from, to, amount, userData, operatorData);
        emit Transfer(from, to, amount);
    }

    /**
     * @dev Burn tokens
     * @param operator address operator requesting the operation
     * @param from address token holder address
     * @param amount uint256 amount of tokens to burn
     * @param data bytes extra information provided by the token holder
     * @param operatorData bytes extra information provided by the operator (if any)
     */
    function _burn(
        address operator,
        address from,
        uint256 amount,
        bytes memory data,
        bytes memory operatorData
    )
    private
    {
        require(from != address(0));
        require((amount % _granularity) == 0);

        _callTokensToSend(operator, from, address(0), amount, data, operatorData);

        // Update state variables
        _totalSupply = _totalSupply.sub(amount);
        _balances[from] = _balances[from].sub(amount);

        emit Burned(operator, from, amount, data, operatorData);
        emit Transfer(from, address(0), amount);
    }

    function _approve(address owner, address spender, uint256 value) private {
        require(owner != address(0));
        require(spender != address(0));

        _allowances[owner][spender] = value;
        emit Approval(owner, spender, value);
    }

    /**
     * @dev Call from.tokensToSend() if the interface is registered
     * @param operator address operator requesting the transfer
     * @param from address token holder address
     * @param to address recipient address
     * @param amount uint256 amount of tokens to transfer
     * @param userData bytes extra information provided by the token holder (if any)
     * @param operatorData bytes extra information provided by the operator (if any)
     */
    function _callTokensToSend(
        address operator,
        address from,
        address to,
        uint256 amount,
        bytes memory userData,
        bytes memory operatorData
    )
    private
    {
        address implementer = _erc1820.getInterfaceImplementer(from, TOKENS_SENDER_INTERFACE_HASH);
        if (implementer != address(0)) {
            IERC777Sender(implementer).tokensToSend(operator, from, to, amount, userData, operatorData);
        }
    }

    /**
     * @dev Call to.tokensReceived() if the interface is registered. Reverts if the recipient is a contract but
     * tokensReceived() was not registered for the recipient
     * @param operator address operator requesting the transfer
     * @param from address token holder address
     * @param to address recipient address
     * @param amount uint256 amount of tokens to transfer
     * @param userData bytes extra information provided by the token holder (if any)
     * @param operatorData bytes extra information provided by the operator (if any)
     */
    function _callTokensReceived(
        address operator,
        address from,
        address to,
        uint256 amount,
        bytes memory userData,
        bytes memory operatorData
    )
    private
    {
        address implementer = _erc1820.getInterfaceImplementer(to, TOKENS_RECIPIENT_INTERFACE_HASH);
        if (implementer != address(0)) {
            IERC777Recipient(implementer).tokensReceived(operator, from, to, amount, userData, operatorData);
        } else {
            require(!to.isContract());
        }
    }
}
