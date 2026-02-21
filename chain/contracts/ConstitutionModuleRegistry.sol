// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * ConstitutionModuleRegistry (MVP)
 * - moduleKeys[]: enumerable list of keys
 * - moduleOf[key] -> address
 * - frozenModule[key] -> bool (if true, module cannot be changed)
 *
 * Key standard:
 *   bytes32 key = keccak256(bytes("SUPREME_COURT")) etc.
 *
 * Owner: deployer (later: route via Constitution process + timelock).
 */
contract ConstitutionModuleRegistry {
    error NotOwner();
    error InvalidInput();
    error Frozen();
    error KeyNotFound();

    event OwnerChanged(address indexed oldOwner, address indexed newOwner);
    event ModuleSet(bytes32 indexed key, address indexed module, bool frozen);
    event ModuleFrozen(bytes32 indexed key, bool frozen);

    address public owner;

    bytes32[] public moduleKeys;
    mapping(bytes32 => bool) internal keyExists;

    mapping(bytes32 => address) public moduleOf;
    mapping(bytes32 => bool) public frozenModule;

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor() {
        owner = msg.sender;
        emit OwnerChanged(address(0), msg.sender);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert InvalidInput();
        emit OwnerChanged(owner, newOwner);
        owner = newOwner;
    }

    function moduleKeysLength() external view returns (uint256) {
        return moduleKeys.length;
    }

    function moduleKeyAt(uint256 index) external view returns (bytes32) {
        return moduleKeys[index];
    }

    function setModule(bytes32 key, address module, bool freezeAfter) external onlyOwner {
        if (key == bytes32(0)) revert InvalidInput();
        if (module == address(0)) revert InvalidInput();

        if (!keyExists[key]) {
            keyExists[key] = true;
            moduleKeys.push(key);
        } else {
            if (frozenModule[key]) revert Frozen();
        }

        moduleOf[key] = module;

        if (freezeAfter) {
            frozenModule[key] = true;
        }

        emit ModuleSet(key, module, frozenModule[key]);
    }

    function setFrozen(bytes32 key, bool frozen) external onlyOwner {
        if (!keyExists[key]) revert KeyNotFound();
        frozenModule[key] = frozen;
        emit ModuleFrozen(key, frozen);
    }
}
