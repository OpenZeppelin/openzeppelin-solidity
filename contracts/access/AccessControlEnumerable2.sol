// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "./AccessControl.sol";
import "../utils/EnumerableSet.sol";

/**
 * @dev Contract module that allows children to implement role-based access
 * control mechanisms. Account to role enumerable version.
 *
 * Roles are referred to by their `bytes32` identifier. These should be exposed
 * in the external API and be unique. The best way to achieve this is by
 * using `public constant` hash digests:
 *
 * ```
 * bytes32 public constant MY_ROLE = keccak256("MY_ROLE");
 * ```
 *
 * Roles can be used to represent a set of permissions. To restrict access to a
 * function call, use {hasRole}:
 *
 * ```
 * function foo() public {
 *     require(hasRole(MY_ROLE, msg.sender));
 *     ...
 * }
 * ```
 *
 * Roles can be granted and revoked dynamically via the {grantRole} and
 * {revokeRole} functions. Each role has an associated admin role, and only
 * accounts that have a role's admin role can call {grantRole} and {revokeRole}.
 *
 * By default, the admin role for all roles is `DEFAULT_ADMIN_ROLE`, which means
 * that only accounts with this role will be able to grant or revoke other
 * roles. More complex role relationships can be created by using
 * {_setRoleAdmin}.
 *
 * WARNING: The `DEFAULT_ADMIN_ROLE` is also its own admin: it has permission to
 * grant and revoke this role. Extra precautions should be taken to secure
 * accounts that have been granted it.
 */
abstract contract AccessControlEnumerable2 is AccessControl {
    using EnumerableSet for EnumerableSet.Bytes32Set;

    mapping (address => EnumerableSet.Bytes32Set) private _addressRoles;

    /**
     * @dev Returns one of the roles that `account` has. `index` must be a
     * value between 0 and {getAddressRoleCount}, non-inclusive.
     *
     * Role not sorted in any particular way, and their ordering may change at
     * any point.
     *
     * WARNING: When using {getAddressRole} and {getAddressRoleCount}, make sure
     * you perform all queries on the same block. See the following
     * https://forum.openzeppelin.com/t/iterating-over-elements-on-enumerableset-in-openzeppelin-contracts/2296[forum post]
     * for more information.
     */
    function getAddressRole(address account, uint256 index) public view returns (bytes32) {
        return _addressRoles[account].at(index);
    }

    /**
     * @dev Returns the number of role that `account` has. Can be used
     * together with {getAddressRole} to enumerate all role of an account.
     */
    function getAddressRoleCount(address account) public view returns (uint256) {
        return _addressRoles[account].length();
    }

    /**
     * @dev Overload {_grantRole} to track enumerable memberships
     */
    function _grantRole(bytes32 role, address account) internal virtual override {
        super._grantRole(role, account);
        _addressRoles[account].add(role);
    }

    /**
     * @dev Overload {_revokeRole} to track enumerable memberships
     */
    function _revokeRole(bytes32 role, address account) internal virtual override {
        super._revokeRole(role, account);
        _addressRoles[account].remove(role);
    }
}