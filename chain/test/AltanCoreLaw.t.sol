// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../contracts/CoreLaw.sol";
import "../contracts/Altan.sol";

/**
 * @title AltanCoreLawTest
 * @notice Тесты соответствия Altan контракта CoreLaw
 */
contract AltanCoreLawTest is Test {
    CoreLaw public coreLaw;
    Altan public altan;

    address public khural = address(0x1);
    address public centralBank = address(0x2);
    address public treasury = address(0x3);
    address public alice = address(0x4);
    address public bob = address(0x5);

    uint256 constant INITIAL_MAX_SUPPLY = 1_000_000_000 * 1e6; // 1 млрд Алтан

    function setUp() public {
        // Деплой CoreLaw
        coreLaw = new CoreLaw();

        // Деплой Altan с CoreLaw
        altan = new Altan(
            address(coreLaw),
            khural,
            centralBank,
            treasury,
            INITIAL_MAX_SUPPLY
        );
    }

    /*//////////////////////////////////////////////////////////////
                    ТЕСТЫ ИНТЕГРАЦИИ С CORELAW
    //////////////////////////////////////////////////////////////*/

    function test_CoreLawIntegration() public view {
        // Проверить, что Altan ссылается на CoreLaw
        assertEq(address(altan.coreLaw()), address(coreLaw));
    }

    function test_CoreLawIntegrity() public view {
        // Проверить целостность CoreLaw
        assertTrue(altan.verifyCoreLawIntegrity());
    }

    function test_CurrencyNameFromCoreLaw() public view {
        // Название из CoreLaw Статья 26
        assertEq(altan.name(), coreLaw.CURRENCY_NAME());
        assertEq(altan.name(), unicode"Алтан");
    }

    function test_CurrencySymbolFromCoreLaw() public view {
        // Символ из CoreLaw Статья 26
        assertEq(altan.symbol(), coreLaw.CURRENCY_SYMBOL());
        assertEq(altan.symbol(), "ALTAN");
    }

    function test_CurrencyDecimalsFromCoreLaw() public view {
        // Decimals из CoreLaw Статья 26
        assertEq(altan.decimals(), coreLaw.CURRENCY_DECIMALS());
        assertEq(altan.decimals(), 6);
    }

    /*//////////////////////////////////////////////////////////////
                ТЕСТЫ КОМИССИИ 0.03% (СТАТЬЯ 27)
    //////////////////////////////////////////////////////////////*/

    function test_NetworkFeeFromCoreLaw() public {
        // Эмиссия для Alice
        vm.prank(centralBank);
        altan.mint(alice, 1_000_000 * 1e6, "test");

        uint256 transferAmount = 100_000 * 1e6; // 100,000 Алтан
        
        // Рассчитать комиссию из CoreLaw
        uint256 expectedFee = coreLaw.calculateNetworkFee(transferAmount);
        
        // Проверить, что это 0.03%
        assertEq(expectedFee, (transferAmount * 3) / 10000);
        
        // Перевод
        uint256 aliceBalanceBefore = altan.balanceOf(alice);
        uint256 bobBalanceBefore = altan.balanceOf(bob);
        uint256 treasuryBalanceBefore = altan.balanceOf(treasury);

        vm.prank(alice);
        altan.transfer(bob, transferAmount);

        // Проверить балансы
        assertEq(altan.balanceOf(alice), aliceBalanceBefore - transferAmount - expectedFee);
        assertEq(altan.balanceOf(bob), bobBalanceBefore + transferAmount);
        assertEq(altan.balanceOf(treasury), treasuryBalanceBefore + expectedFee);
    }

    function test_FeeExemptSystemContracts() public {
        // Казна освобождена от комиссии
        assertTrue(altan.feeExempt(treasury));
        assertTrue(altan.feeExempt(address(altan)));
    }

    function test_MinTransferForFee() public {
        // Эмиссия для Alice
        vm.prank(centralBank);
        altan.mint(alice, 10_000 * 1e6, "test");

        // Маленький перевод (меньше MIN_TRANSFER_FOR_FEE)
        uint256 smallAmount = 500; // 0.0005 Алтан
        
        uint256 fee = coreLaw.calculateNetworkFee(smallAmount);
        assertEq(fee, 0); // Комиссия должна быть 0

        vm.prank(alice);
        altan.transfer(bob, smallAmount);

        // Bob должен получить всю сумму без комиссии
        assertEq(altan.balanceOf(bob), smallAmount);
    }

    /*//////////////////////////////////////////////////////////////
                ТЕСТЫ ЭМИССИИ (СТАТЬЯ 26)
    //////////////////////////////////////////////////////////////*/

    function test_OnlyCentralBankCanMint() public {
        // Только Центральный Банк может чеканить
        vm.prank(centralBank);
        altan.mint(alice, 1000 * 1e6, "test");
        assertEq(altan.balanceOf(alice), 1000 * 1e6);

        // Другие не могут
        vm.prank(alice);
        vm.expectRevert();
        altan.mint(bob, 1000 * 1e6, "test");
    }

    function test_OnlyCentralBankCanBurn() public {
        // Эмиссия
        vm.prank(centralBank);
        altan.mint(alice, 1000 * 1e6, "test");

        // Только Центральный Банк может сжигать
        vm.prank(centralBank);
        altan.burn(alice, 500 * 1e6, "test");
        assertEq(altan.balanceOf(alice), 500 * 1e6);

        // Другие не могут
        vm.prank(bob);
        vm.expectRevert();
        altan.burn(alice, 100 * 1e6, "test");
    }

    function test_VoluntaryBurn() public {
        // Эмиссия
        vm.prank(centralBank);
        altan.mint(alice, 1000 * 1e6, "test");

        // Alice может добровольно сжечь свои токены
        vm.prank(alice);
        altan.burnOwn(300 * 1e6);
        assertEq(altan.balanceOf(alice), 700 * 1e6);
    }

    /*//////////////////////////////////////////////////////////////
                    ТЕСТЫ УТИЛИТ
    //////////////////////////////////////////////////////////////*/

    function test_GetTransferDetails() public view {
        uint256 amount = 100_000 * 1e6;
        
        (uint256 fee, uint256 recipientReceives, uint256 totalFromSender) = 
            altan.getTransferDetails(amount);
        
        assertEq(fee, coreLaw.calculateNetworkFee(amount));
        assertEq(recipientReceives, amount);
        assertEq(totalFromSender, amount + fee);
    }

    function test_CanTransfer() public {
        // Эмиссия
        vm.prank(centralBank);
        altan.mint(alice, 1000 * 1e6, "test");

        uint256 amount = 500 * 1e6;
        uint256 fee = coreLaw.calculateNetworkFee(amount);

        // Alice может перевести
        assertTrue(altan.canTransfer(alice, amount));

        // Bob не может (нет средств)
        assertFalse(altan.canTransfer(bob, amount));
    }

    function test_GetStats() public {
        // Эмиссия
        vm.prank(centralBank);
        altan.mint(alice, 1_000_000 * 1e6, "test");

        // Перевод для генерации комиссии
        vm.prank(alice);
        altan.transfer(bob, 100_000 * 1e6);

        (uint256 supply, uint256 maxSupp, uint256 feesCollected, uint256 treasuryBalance) = 
            altan.getStats();

        assertEq(supply, 1_000_000 * 1e6);
        assertEq(maxSupp, INITIAL_MAX_SUPPLY);
        assertGt(feesCollected, 0);
        assertEq(treasuryBalance, feesCollected);
    }

    /*//////////////////////////////////////////////////////////////
                ТЕСТЫ СООТВЕТСТВИЯ CORELAW
    //////////////////////////////////////////////////////////////*/

    function test_CanReadCoreLawArticles() public view {
        // Можно прочитать статьи CoreLaw через Altan
        string memory article26 = altan.getCoreLawArticle(26);
        assertTrue(bytes(article26).length > 0);
        
        string memory article27 = altan.getCoreLawArticle(27);
        assertTrue(bytes(article27).length > 0);
    }

    function test_RevertIfInvalidCoreLaw() public {
        // Попытка создать Altan с невалидным CoreLaw должна провалиться
        vm.expectRevert();
        new Altan(
            address(0),
            khural,
            centralBank,
            treasury,
            INITIAL_MAX_SUPPLY
        );
    }
}
