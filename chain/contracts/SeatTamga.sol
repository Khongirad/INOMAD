// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/interfaces/IERC721.sol";

/**
 * SeatTamga = "печать/исполнитель/счет" для SeatSBT
 * - привязана к seatId (SeatSBT)
 * - controller = EOA (MVP)
 * Позже controller заменяем на Passkey/WebAuthn или AA / multisig.
 */
contract SeatTamga {
    using Address for address;

    address public immutable seatSbt;
    uint256 public immutable seatId;

    address public controller; // MVP: EOA

    error NotAuthorized();

    constructor(address _seatSbt, uint256 _seatId, address _controller) {
        seatSbt = _seatSbt;
        seatId = _seatId;
        controller = _controller;
    }

    modifier onlySeatOwnerOrController() {
        address seatOwner = IERC721(seatSbt).ownerOf(seatId);
        if (msg.sender != controller && msg.sender != seatOwner) revert NotAuthorized();
        _;
    }

    function setController(address newController) external onlySeatOwnerOrController {
        controller = newController;
    }

    function execute(address to, uint256 value, bytes calldata data)
        external
        onlySeatOwnerOrController
        returns (bytes memory)
    {
        return to.functionCallWithValue(data, value);
    }

    receive() external payable {}
}

contract SeatTamgaFactory {
    event TamgaCreated(uint256 indexed seatId, address tamga, address controller, bytes32 salt);

    address public immutable seatSbt;

    constructor(address _seatSbt) {
        seatSbt = _seatSbt;
    }

    function predictAddress(uint256 seatId, address controller, bytes32 salt) public view returns (address) {
        bytes memory bytecode = abi.encodePacked(
            type(SeatTamga).creationCode,
            abi.encode(seatSbt, seatId, controller)
        );
        bytes32 codeHash = keccak256(bytecode);
        return address(uint160(uint256(keccak256(abi.encodePacked(
            bytes1(0xff), address(this), salt, codeHash
        )))));
    }

    function createTamga(uint256 seatId, address controller, bytes32 salt) external returns (address tamga) {
        bytes memory bytecode = abi.encodePacked(
            type(SeatTamga).creationCode,
            abi.encode(seatSbt, seatId, controller)
        );
        assembly {
            tamga := create2(0, add(bytecode, 0x20), mload(bytecode), salt)
            if iszero(tamga) { revert(0, 0) }
        }
        emit TamgaCreated(seatId, tamga, controller, salt);
    }
}
