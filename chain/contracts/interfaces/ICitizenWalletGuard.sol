// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title ICitizenWalletGuard
 * @notice Interface for CitizenWalletGuard contract
 */
interface ICitizenWalletGuard {
    function checkTransaction(
        address wallet,
        address to,
        uint256 amount
    ) external view returns (bool allowed, string memory reason);
    
    function judicialFreeze(address wallet, bytes32 caseHash) external;
    function unlockWallet(address wallet) external;
    
    function JUSTICE_ROLE() external view returns (bytes32);
    function grantRole(bytes32 role, address account) external;
}
