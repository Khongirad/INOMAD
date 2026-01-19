// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title Altan
 * @notice Sovereign settlement unit of the INOMAD KHURAL network.
 *
 * ALTAN is NOT a cryptocurrency:
 * - Not traded on exchanges
 * - Not permissionless
 * - All holders are KYC'd citizens/entities
 * - Official exchange rate set by AltanCentralBank
 *
 * Emission controlled by AltanCentralBank (MINTER_ROLE).
 * Burning controlled by AltanCentralBank (BURNER_ROLE).
 * Distribution to citizens via licensed banks (AltanBankOfSiberia).
 */
contract Altan is ERC20, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");

    // Central Bank address (Bank of Siberia)
    address public centralBank;

    event CentralBankSet(address indexed oldBank, address indexed newBank);
    event Minted(address indexed to, uint256 amount, string reason);
    event Burned(address indexed from, uint256 amount, string reason);

    error ZeroAddress();
    error ZeroAmount();

    constructor(address centralBank_) ERC20("Altan", "ALTAN") {
        if (centralBank_ == address(0)) revert ZeroAddress();

        centralBank = centralBank_;

        _grantRole(DEFAULT_ADMIN_ROLE, centralBank_);
        _grantRole(MINTER_ROLE, centralBank_);
        _grantRole(BURNER_ROLE, centralBank_);

        emit CentralBankSet(address(0), centralBank_);
    }

    /// @notice Mint ALTAN (only Central Bank)
    /// @param to Recipient address
    /// @param amount Amount to mint
    /// @param reason Audit trail reason (e.g., "budget allocation", "swap USD->ALTAN")
    function mint(address to, uint256 amount, string calldata reason) external onlyRole(MINTER_ROLE) {
        if (to == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();

        _mint(to, amount);
        emit Minted(to, amount, reason);
    }

    /// @notice Burn ALTAN (only Central Bank)
    /// @param from Address to burn from (must have approved)
    /// @param amount Amount to burn
    /// @param reason Audit trail reason (e.g., "swap ALTAN->USD")
    function burn(address from, uint256 amount, string calldata reason) external onlyRole(BURNER_ROLE) {
        if (from == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();

        _burn(from, amount);
        emit Burned(from, amount, reason);
    }

    /// @notice Transfer Central Bank role (governance action)
    function setCentralBank(address newBank) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (newBank == address(0)) revert ZeroAddress();

        address oldBank = centralBank;

        // Revoke roles from old bank
        _revokeRole(DEFAULT_ADMIN_ROLE, oldBank);
        _revokeRole(MINTER_ROLE, oldBank);
        _revokeRole(BURNER_ROLE, oldBank);

        // Grant roles to new bank
        _grantRole(DEFAULT_ADMIN_ROLE, newBank);
        _grantRole(MINTER_ROLE, newBank);
        _grantRole(BURNER_ROLE, newBank);

        centralBank = newBank;
        emit CentralBankSet(oldBank, newBank);
    }

    /// @notice Decimals = 18 (standard)
    function decimals() public pure override returns (uint8) {
        return 18;
    }
}
