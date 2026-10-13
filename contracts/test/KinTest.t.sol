// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import "../src/StreamVault.sol";
import "../src/PolicyModule.sol";
import "../src/ApprovalQueue.sol";

interface Vm {
    function warp(uint256) external;
    function prank(address) external;
    function startPrank(address) external;
    function stopPrank() external;
    function expectRevert() external;
    function expectRevert(bytes4) external;
}

/// @dev Test token only. It is not an issued stablecoin and must never be presented as one.
contract MockUSDC {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    bool public feeEnabled;
    function decimals() external pure returns (uint8) { return 6; }
    function mint(address to, uint256 amount) external { balanceOf[to] += amount; }
    function setFee(bool enabled) external { feeEnabled = enabled; }
    function approve(address spender, uint256 amount) external returns (bool) { allowance[msg.sender][spender] = amount; return true; }
    function transfer(address to, uint256 amount) external returns (bool) { _transfer(msg.sender, to, amount); return true; }
    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 approved = allowance[from][msg.sender];
        require(approved >= amount, "allowance");
        if (approved != type(uint256).max) allowance[from][msg.sender] -= amount;
        _transfer(from, to, amount);
        return true;
    }
    function _transfer(address from, address to, uint256 amount) internal {
        require(balanceOf[from] >= amount, "balance");
        balanceOf[from] -= amount;
        balanceOf[to] += feeEnabled ? amount - amount / 100 : amount;
    }
}

contract KinTest {
    Vm constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));
    StreamVault vault;
    ApprovalQueue queue;
    PolicyModule policy;
    MockUSDC token;
    address parent = address(0x1001);
    address student = address(0x1002);
    address merchant = address(0x1003);
    address outsider = address(0x1004);
    bytes32 constant CATEGORY = keccak256("groceries");

    function setUp() public {
        vm.warp(1000000);
        token = new MockUSDC();
        vault = new StreamVault(address(token));
        queue = new ApprovalQueue(address(vault));
        policy = new PolicyModule(address(vault), address(queue));
        queue.setPolicyModule(address(policy));
        vault.setPolicyModule(address(policy));
        token.mint(parent, 2000000);
        vm.prank(student); vault.authorizeParent(parent);
        vm.startPrank(parent);
        token.approve(address(vault), type(uint256).max);
        vault.createStream(student, address(token), 100, 1000000);
        policy.setPolicy(1, 0, 0, 0, keccak256("initial"));
        policy.setRecipientCategory(1, merchant, CATEGORY);
        policy.setCategoryCap(1, CATEGORY, 1000000, 7 days);
        vm.stopPrank();
        vm.warp(block.timestamp + 100);
    }

    function _spend(uint256 amount) internal { vm.prank(student); policy.executeSpend(1, merchant, amount, CATEGORY, "groceries"); }
    function _queued() internal returns (uint256) {
        vm.prank(parent); policy.setPolicy(1, 0, 1000, 0, keccak256("approval"));
        _spend(2000);
        return queue.nextRequestId() - 1;
    }
    function _eq(uint256 a, uint256 b) internal pure { require(a == b, "assert equal"); }

    function test_DustDepositCannotReserveVictimStream() public {
        vm.prank(parent); vm.expectRevert(StreamVault.ParentNotAuthorized.selector);
        vault.createStream(outsider, address(token), 100, 1);
        _eq(vault.studentStream(outsider), 0);
    }
    function test_ConsentBoundToCorrectParent() public {
        vm.prank(outsider); vault.authorizeParent(merchant);
        vm.prank(parent); vm.expectRevert(StreamVault.ParentNotAuthorized.selector);
        vault.createStream(outsider, address(token), 100, 1000);
        require(vault.authorizedParent(outsider) == merchant, "wrong parent cannot consume consent");
    }
    function test_ConsentConsumedOnceAndCannotReplay() public {
        require(vault.authorizedParent(student) == address(0), "consent consumed");
        vm.prank(parent); vm.expectRevert(StreamVault.StreamAlreadyExists.selector);
        vault.createStream(student, address(token), 100, 1000);
        vm.prank(student); vm.expectRevert(StreamVault.StreamAlreadyExists.selector); vault.authorizeParent(parent);
    }
    function test_StudentCanRevokeConsentBeforeCreation() public {
        vm.prank(outsider); vault.authorizeParent(parent);
        vm.prank(outsider); vault.authorizeParent(address(0));
        vm.prank(parent); vm.expectRevert(StreamVault.ParentNotAuthorized.selector);
        vault.createStream(outsider, address(token), 100, 1000);
        vm.prank(outsider); vault.authorizeParent(parent);
        vm.prank(parent); vault.createStream(outsider, address(token), 100, 1000);
        _eq(vault.studentStream(outsider), 2);
        require(vault.authorizedParent(outsider) == address(0), "consent consumed");
    }
    function test_PartialWithdrawRetainsAccrual() public {
        _eq(vault.streamedAmount(1), 10000);
        _spend(1000);
        _eq(vault.streamedAmount(1), 9000);
        _spend(500);
        _eq(vault.streamedAmount(1), 8500);
    }
    function test_PauseResumeRetainsEarnedMoney() public {
        vm.prank(parent); vault.pause(1);
        vm.warp(block.timestamp + 1000);
        _eq(vault.streamedAmount(1), 10000);
        vm.prank(student); vm.expectRevert(); policy.executeSpend(1, merchant, 1000, CATEGORY, "paused");
        vm.prank(parent); vault.resume(1);
        vm.warp(block.timestamp + 10);
        _eq(vault.streamedAmount(1), 11000);
    }
    function test_RateChangePreservesOldAccrual() public {
        vm.prank(parent); vault.updateRate(1, 200);
        vm.warp(block.timestamp + 10);
        _eq(vault.streamedAmount(1), 12000);
    }
    function test_TopUpDoesNotAccrueRetroactively() public {
        vm.warp(block.timestamp + 20000);
        _eq(vault.streamedAmount(1), 1000000);
        vm.prank(parent); vault.fund(1, 100000);
        _eq(vault.streamedAmount(1), 1000000);
        vm.warp(block.timestamp + 10);
        _eq(vault.streamedAmount(1), 1001000);
    }
    function test_OnlyParentApprovesAndDeclines() public {
        uint256 id = _queued();
        vm.prank(outsider); vm.expectRevert(ApprovalQueue.NotParentOfStream.selector); queue.approve(id);
        vm.prank(student); vm.expectRevert(ApprovalQueue.NotParentOfStream.selector); queue.decline(id);
        require(!queue.getRequest(id).executed, "not resolved");
    }
    function test_ApproveRetainsCategoryAndPreventsReplay() public {
        uint256 id = _queued();
        require(queue.getRequest(id).category == CATEGORY, "category retained");
        require(queue.getRequest(id).student == student, "student retained");
        vm.prank(parent); queue.approve(id);
        _eq(token.balanceOf(merchant), 2000);
        _eq(vault.streamedAmount(1), 8000);
        vm.prank(parent); vm.expectRevert(ApprovalQueue.RequestAlreadyExecuted.selector); queue.approve(id);
    }
    function test_DeclineNeverPaysAndCannotApproveLater() public {
        uint256 id = _queued();
        vm.prank(parent); queue.decline(id);
        _eq(token.balanceOf(merchant), 0);
        vm.prank(parent); vm.expectRevert(); queue.approve(id);
    }
    function test_ExpiryUsesExactBoundary() public {
        uint256 id = _queued();
        vm.warp(queue.getRequest(id).expiresAt);
        _eq(queue.getPending(1).length, 0);
        vm.prank(parent); vm.expectRevert(ApprovalQueue.RequestExpiredError.selector); queue.approve(id);
    }
    function test_NonexistentRequestRejected() public {
        vm.prank(parent); vm.expectRevert(ApprovalQueue.RequestNotFound.selector); queue.approve(999);
    }
    function test_ApprovedSpendRechecksGlobalCap() public {
        uint256 id = _queued();
        vm.prank(parent); policy.setPolicy(1, 1500, 1000, 0, bytes32(0));
        vm.prank(parent); vm.expectRevert(); queue.approve(id);
        require(!queue.getRequest(id).executed, "failure rolls back approval");
    }
    function test_ApprovedSpendRechecksBlocklist() public {
        uint256 id = _queued();
        vm.prank(parent); policy.setBlocklist(1, merchant, true);
        vm.prank(parent); vm.expectRevert(); queue.approve(id);
    }
    function test_ApprovedSpendRechecksPolicyAndPause() public {
        uint256 id = _queued();
        vm.prank(parent); policy.setPolicyActive(1, false);
        vm.prank(parent); vm.expectRevert(); queue.approve(id);
        vm.prank(parent); policy.setPolicyActive(1, true);
        vm.prank(parent); vault.pause(1);
        vm.prank(parent); vm.expectRevert(); queue.approve(id);
    }
    function test_ApprovedSpendRechecksCategoryAndWeeklyCap() public {
        uint256 id = _queued();
        vm.prank(parent); policy.setCategoryCap(1, CATEGORY, 1500, 7 days);
        vm.prank(parent); vm.expectRevert(); queue.approve(id);
        vm.prank(parent); policy.setCategoryCap(1, CATEGORY, 10000, 7 days);
        vm.prank(parent); policy.setPolicy(1, 0, 1000, 1500, bytes32(0));
        vm.prank(parent); vm.expectRevert(); queue.approve(id);
    }
    function test_ApprovedSpendRechecksCurrentEarnedBalance() public {
        uint256 id = _queued();
        vm.prank(parent); policy.setAllowlist(1, merchant, true);
        _spend(9000);
        vm.prank(parent); vm.expectRevert(); queue.approve(id);
    }
    function test_RecipientCategoryCannotBeSpoofedOrChangedWhilePending() public {
        vm.prank(student); vm.expectRevert(); policy.executeSpend(1, merchant, 500, keccak256("rent"), "spoof");
        uint256 id = _queued();
        vm.prank(parent); policy.setRecipientCategory(1, merchant, keccak256("rent"));
        vm.prank(parent); vm.expectRevert(); queue.approve(id);
    }
    function test_AllowlistSkipsOnlyApproval() public {
        vm.prank(parent); policy.setAllowlist(1, merchant, true);
        vm.prank(parent); policy.setPolicy(1, 500, 100, 0, bytes32(0));
        (bool allowed,) = policy.canSpend(1, merchant, 600, CATEGORY);
        require(!allowed, "allowlist cannot bypass global cap");
        vm.prank(parent); policy.setPolicy(1, 0, 100, 0, bytes32(0));
        vm.prank(parent); policy.setCategoryCap(1, CATEGORY, 500, 7 days);
        (allowed,) = policy.canSpend(1, merchant, 600, CATEGORY);
        require(!allowed, "allowlist cannot bypass category cap");
    }
    function test_DisabledWeeklyCapStillCountsSpending() public {
        _spend(1000);
        vm.prank(parent); policy.setPolicy(1, 0, 0, 1500, bytes32(0));
        (bool allowed,) = policy.canSpend(1, merchant, 600, CATEGORY);
        require(!allowed, "tracked while disabled");
    }
    function test_CapEditDoesNotEraseSpend() public {
        _spend(1000);
        vm.prank(parent); policy.setCategoryCap(1, CATEGORY, 1500, 7 days);
        (bool allowed,) = policy.canSpend(1, merchant, 600, CATEGORY);
        require(!allowed, "no reset on edit");
    }
    function test_UnauthorizedExecutionAndWiringRejected() public {
        vm.prank(parent); vm.expectRevert(); policy.executeSpend(1, merchant, 500, CATEGORY, "wrong role");
        vm.prank(outsider); vm.expectRevert(); policy.setPolicy(1, 0, 0, 0, bytes32(0));
        vm.prank(outsider); vm.expectRevert(); vault.executeWithdrawal(1, merchant, 500);
        vm.prank(outsider); vm.expectRevert(); queue.createRequest(1, merchant, 500, CATEGORY, "fake");
        vm.expectRevert(); vault.setPolicyModule(address(policy));
        vm.expectRevert(); queue.setPolicyModule(address(policy));
    }
    function test_FeeTokenCannotConsumeUncreditedFunds() public {
        token.setFee(true);
        vm.prank(student); vm.expectRevert(); policy.executeSpend(1, merchant, 1000, CATEGORY, "fee");
        _eq(vault.streamedAmount(1), 10000);
        _eq(token.balanceOf(merchant), 0);
        vm.prank(parent); vm.expectRevert(); vault.fund(1, 10000);
    }
    function testFuzz_SaturatedAccrualCannotExceedEscrow(uint128 rate, uint32 secondsElapsed) public {
        vm.prank(parent); vault.updateRate(1, uint256(rate) + 1);
        vm.warp(block.timestamp + secondsElapsed);
        require(vault.streamedAmount(1) <= vault.getStream(1).depositedBalance, "escrow cap");
    }
    function test_MaxRateDoesNotOverflow() public {
        vm.prank(parent); vault.updateRate(1, type(uint256).max);
        vm.warp(block.timestamp + 2);
        _eq(vault.streamedAmount(1), 1000000);
    }
}
