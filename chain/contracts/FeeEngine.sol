// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {CoreLaw} from "./CoreLaw.sol";

interface IAltanBankLedgerFeeOps {
    function transferBetweenAccounts(bytes32 fromId, bytes32 toId, address asset, uint256 amount, bytes32 memo) external;
}

/**
 * @title FeeEngine
 * @notice Движок расчёта и сбора комиссий
 * @dev Интегрирован с CoreLaw для определения размера комиссии (Статья 27)
 */
contract FeeEngine {
    address public owner;
    IAltanBankLedgerFeeOps public ledger;

    // CoreLaw Source of Truth
    CoreLaw public immutable coreLaw;

    // Where ALL protocol fees go (INOMAD INC)
    bytes32 public feeSinkAccountId;

    // Which contract is allowed to call collect (router/settlement/system contracts)
    mapping(address => bool) public isCollector;

    event OwnerChanged(address indexed oldOwner, address indexed newOwner);
    event LedgerSet(address indexed ledger);
    event FeeSinkSet(bytes32 indexed feeSinkAccountId);
    event CollectorSet(address indexed collector, bool ok);

    event FeeQuoted(uint256 amount, uint256 fee);
    event FeeCollected(bytes32 indexed payerAccountId, bytes32 indexed sinkAccountId, address indexed asset, uint256 fee, bytes32 memo);

    modifier onlyOwner() {
        require(msg.sender == owner, "NOT_OWNER");
        _;
    }

    modifier onlyCollector() {
        require(isCollector[msg.sender], "NOT_COLLECTOR");
        _;
    }

    constructor(
        address ledgerAddr, 
        bytes32 sinkAccountId,
        address _coreLaw
    ) {
        if (_coreLaw == address(0)) revert("ZERO_ADDR");
        
        owner = msg.sender;
        ledger = IAltanBankLedgerFeeOps(ledgerAddr);
        feeSinkAccountId = sinkAccountId;
        coreLaw = CoreLaw(_coreLaw);
        
        emit LedgerSet(ledgerAddr);
        emit FeeSinkSet(sinkAccountId);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "ZERO_ADDR");
        emit OwnerChanged(owner, newOwner);
        owner = newOwner;
    }

    function setLedger(address ledgerAddr) external onlyOwner {
        require(ledgerAddr != address(0), "ZERO_ADDR");
        ledger = IAltanBankLedgerFeeOps(ledgerAddr);
        emit LedgerSet(ledgerAddr);
    }

    function setFeeSink(bytes32 sinkAccountId) external onlyOwner {
        feeSinkAccountId = sinkAccountId;
        emit FeeSinkSet(sinkAccountId);
    }

    function setCollector(address collector, bool ok) external onlyOwner {
        require(collector != address(0), "ZERO_ADDR");
        isCollector[collector] = ok;
        emit CollectorSet(collector, ok);
    }

    /// @notice Рассчитать комиссию через CoreLaw
    function quoteFee(uint256 amount) public view returns (uint256) {
        return coreLaw.calculateNetworkFee(amount);
    }

    function collectFee(
        bytes32 payerAccountId,
        address asset,
        uint256 amount,
        bytes32 memo
    ) external onlyCollector returns (uint256 fee) {
        fee = quoteFee(amount);
        emit FeeQuoted(amount, fee);
        if (fee == 0) return 0;

        ledger.transferBetweenAccounts(
            payerAccountId,
            feeSinkAccountId,
            asset,
            fee,
            memo
        );

        emit FeeCollected(payerAccountId, feeSinkAccountId, asset, fee, memo);
    }
    
    /// @notice Получить BPS комиссии из CoreLaw (для совместимости)
    function getFeeBps() external view returns (uint16) {
        return coreLaw.NETWORK_FEE_BPS();
    }
}
