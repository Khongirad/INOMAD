// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./Altan.sol";

contract CentralBank is AccessControl {
    /// @dev Роль тех, кто имеет право вызывать эмиссию (TenRegistry, другие институты).
    bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");

    Altan public immutable altan;

    // политика (можно менять)
    uint256 public tenRewardPerSeat = 100 ether; // 100 ALTAN на seat после подтверждения десятки

    event TenRewardPerSeatUpdated(uint256 oldAmount, uint256 newAmount);
    event Issued(address indexed to, uint256 amount, address indexed issuer);

    error ZERO_ADDRESS();

    constructor(address altanToken) {
        if (altanToken == address(0)) revert ZERO_ADDRESS();
        altan = Altan(altanToken);

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);

        // На MVP: админ может эмитить напрямую.
        // Позже: можно не выдавать администратору ISSUER_ROLE, а выдавать только реестрам.
        _grantRole(ISSUER_ROLE, msg.sender);
    }

    function setTenRewardPerSeat(uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        emit TenRewardPerSeatUpdated(tenRewardPerSeat, amount);
        tenRewardPerSeat = amount;
    }

    /// @notice Общая эмиссия (в идеале только на BankAccount).
    function issue(address to, uint256 amount, string calldata reason) external onlyRole(ISSUER_ROLE) {
        if (to == address(0)) revert ZERO_ADDRESS();
        altan.mint(to, amount, reason);
        emit Issued(to, amount, msg.sender);
    }

    /// @notice Удобная функция: эмиссия награды за подтверждение десятки.
    function issueTenReward(address bankAccount) external onlyRole(ISSUER_ROLE) {
        if (bankAccount == address(0)) revert ZERO_ADDRESS();
        uint256 amount = tenRewardPerSeat;
        altan.mint(bankAccount, amount, "ten_reward");
        emit Issued(bankAccount, amount, msg.sender);
    }
}
