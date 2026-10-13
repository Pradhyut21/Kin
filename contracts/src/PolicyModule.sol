// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import "./StreamVault.sol";
import "./ApprovalQueue.sol";

/// @notice Deterministic spend protections. Software may propose a spend; only the stream student can submit it.
/// @dev Every execution, including a parent-approved request, rechecks current recipient bindings and hard caps.
contract PolicyModule is KinGuard {
    struct Policy { uint256 globalCap; uint256 approvalThreshold; uint256 weeklyLimit; bool active; }
    struct CategoryCap { uint256 limitPerPeriod; uint256 periodSeconds; uint256 spentThisPeriod; uint256 periodStart; }
    enum Denial { None, Inactive, InvalidRecipient, CategoryMismatch, ZeroAmount, Blocked, GlobalCap, CategoryCapExceeded, WeeklyCap, InsufficientBalance }

    StreamVault public immutable vault;
    ApprovalQueue public immutable approvalQueue;
    mapping(uint256 => Policy) public policies;
    mapping(uint256 => mapping(bytes32 => CategoryCap)) public categoryCaps;
    mapping(uint256 => mapping(address => bool)) public allowlist;
    mapping(uint256 => mapping(address => bool)) public blocklist;
    mapping(uint256 => mapping(address => bytes32)) public recipientCategory;
    mapping(uint256 => uint256) public weeklySpent;
    mapping(uint256 => uint256) public weekStart;
    mapping(uint256 => bytes32) public policyHash;

    error NotParent();
    error NotStudentAccount();
    error NotApprovalQueue();
    error InvalidConfiguration();
    error InvalidMemo();
    error SpendDenied(Denial reason);

    event PolicySet(uint256 indexed streamId, uint256 globalCap, uint256 approvalThreshold);
    event CategoryCapSet(uint256 indexed streamId, bytes32 indexed category, uint256 limit, uint256 period);
    event AllowlistUpdated(uint256 indexed streamId, address indexed recipient, bool allowed);
    event BlocklistUpdated(uint256 indexed streamId, address indexed recipient, bool blocked);
    event RecipientCategorySet(uint256 indexed streamId, address indexed recipient, bytes32 indexed category);
    event SpendExecuted(uint256 indexed streamId, address indexed recipient, uint256 amount, bytes32 category, string memo);
    event SpendQueued(uint256 indexed streamId, uint256 requestId, address recipient, uint256 amount);
    event PolicyHashUpdated(uint256 indexed streamId, bytes32 hash);

    constructor(address streamVault, address queue) {
        if (streamVault.code.length == 0 || queue.code.length == 0 || address(ApprovalQueue(queue).vault()) != streamVault) revert InvalidConfiguration();
        vault = StreamVault(streamVault);
        approvalQueue = ApprovalQueue(queue);
    }

    modifier onlyParent(uint256 streamId) {
        if (vault.getStream(streamId).parent != msg.sender) revert NotParent();
        _;
    }

    function setPolicy(uint256 streamId, uint256 globalCap, uint256 approvalThreshold, uint256 weeklyLimit, bytes32 hash) external onlyParent(streamId) {
        policies[streamId] = Policy(globalCap, approvalThreshold, weeklyLimit, true);
        policyHash[streamId] = hash;
        emit PolicySet(streamId, globalCap, approvalThreshold);
        emit PolicyHashUpdated(streamId, hash);
    }

    function setPolicyActive(uint256 streamId, bool active) external onlyParent(streamId) { policies[streamId].active = active; }

    function setCategoryCap(uint256 streamId, bytes32 category, uint256 limit, uint256 period) external onlyParent(streamId) {
        if (category == bytes32(0) || period == 0) revert InvalidConfiguration();
        CategoryCap storage cap = categoryCaps[streamId][category];
        // Changing a cap must not erase already-counted spending in a current window.
        if (cap.periodSeconds == 0 || block.timestamp >= cap.periodStart + cap.periodSeconds) {
            cap.spentThisPeriod = 0;
            cap.periodStart = block.timestamp;
        }
        cap.limitPerPeriod = limit;
        cap.periodSeconds = period;
        emit CategoryCapSet(streamId, category, limit, period);
    }

    /// @notice Parent registers the actual merchant address in a category. Caller labels cannot bypass a cap.
    /// @dev Setting category to zero revokes the recipient registration.
    function setRecipientCategory(uint256 streamId, address recipient, bytes32 category) external onlyParent(streamId) {
        if (recipient == address(0) || recipient == address(vault)) revert InvalidConfiguration();
        recipientCategory[streamId][recipient] = category;
        emit RecipientCategorySet(streamId, recipient, category);
    }

    /// @notice A trusted recipient may skip approval, but never hard caps, balance, or blocklist checks.
    function setAllowlist(uint256 streamId, address recipient, bool allowed) external onlyParent(streamId) {
        allowlist[streamId][recipient] = allowed;
        emit AllowlistUpdated(streamId, recipient, allowed);
    }

    function setBlocklist(uint256 streamId, address recipient, bool blocked) external onlyParent(streamId) {
        blocklist[streamId][recipient] = blocked;
        emit BlocklistUpdated(streamId, recipient, blocked);
    }

    function denialReason(uint256 streamId, address recipient, uint256 amount, bytes32 category) public view returns (Denial) {
        StreamVault.Stream memory stream = vault.getStream(streamId);
        Policy memory p = policies[streamId];
        if (!p.active || !stream.active) return Denial.Inactive;
        if (recipient == address(0) || recipient == address(vault)) return Denial.InvalidRecipient;
        if (category == bytes32(0) || recipientCategory[streamId][recipient] != category) return Denial.CategoryMismatch;
        if (amount == 0) return Denial.ZeroAmount;
        if (blocklist[streamId][recipient]) return Denial.Blocked;
        if (p.globalCap != 0 && amount > p.globalCap) return Denial.GlobalCap;
        CategoryCap storage cap = categoryCaps[streamId][category];
        uint256 cSpent = _currentCategorySpent(cap);
        if (cap.limitPerPeriod != 0 && (cSpent >= cap.limitPerPeriod || amount > cap.limitPerPeriod - cSpent)) return Denial.CategoryCapExceeded;
        uint256 wSpent = _currentWeeklySpent(streamId);
        if (p.weeklyLimit != 0 && (wSpent >= p.weeklyLimit || amount > p.weeklyLimit - wSpent)) return Denial.WeeklyCap;
        if (vault.streamedAmount(streamId) < amount) return Denial.InsufficientBalance;
        return Denial.None;
    }

    function canSpend(uint256 streamId, address recipient, uint256 amount, bytes32 category) external view returns (bool allowed, bool needsApproval) {
        allowed = denialReason(streamId, recipient, amount, category) == Denial.None;
        Policy memory p = policies[streamId];
        needsApproval = allowed && !allowlist[streamId][recipient] && p.approvalThreshold != 0 && amount > p.approvalThreshold;
    }

    function executeSpend(uint256 streamId, address recipient, uint256 amount, bytes32 category, string calldata memo) external nonReentrant {
        if (vault.getStream(streamId).student != msg.sender) revert NotStudentAccount();
        _requireAllowed(streamId, recipient, amount, category, memo);
        Policy memory p = policies[streamId];
        if (!allowlist[streamId][recipient] && p.approvalThreshold != 0 && amount > p.approvalThreshold) {
            uint256 requestId = approvalQueue.createRequest(streamId, recipient, amount, category, memo);
            emit SpendQueued(streamId, requestId, recipient, amount);
            return;
        }
        _execute(streamId, recipient, amount, category, memo);
    }

    function executeApprovedSpend(uint256 streamId, address recipient, uint256 amount, bytes32 category, string calldata memo) external nonReentrant {
        if (msg.sender != address(approvalQueue)) revert NotApprovalQueue();
        _requireAllowed(streamId, recipient, amount, category, memo);
        _execute(streamId, recipient, amount, category, memo);
    }

    function _requireAllowed(uint256 streamId, address recipient, uint256 amount, bytes32 category, string calldata memo) internal view {
        if (bytes(memo).length > 200) revert InvalidMemo();
        Denial reason = denialReason(streamId, recipient, amount, category);
        if (reason != Denial.None) revert SpendDenied(reason);
    }

    function _execute(uint256 streamId, address recipient, uint256 amount, bytes32 category, string calldata memo) internal {
        CategoryCap storage cap = categoryCaps[streamId][category];
        // Track amounts even when a cap is disabled, so toggling it cannot reset current spend.
        if (cap.periodSeconds != 0) {
            if (block.timestamp >= cap.periodStart + cap.periodSeconds) { cap.spentThisPeriod = 0; cap.periodStart = block.timestamp; }
            cap.spentThisPeriod += amount;
        }
        if (weekStart[streamId] == 0 || block.timestamp >= weekStart[streamId] + 7 days) { weeklySpent[streamId] = 0; weekStart[streamId] = block.timestamp; }
        weeklySpent[streamId] += amount;
        vault.executeWithdrawal(streamId, recipient, amount);
        emit SpendExecuted(streamId, recipient, amount, category, memo);
    }

    function _currentCategorySpent(CategoryCap storage cap) internal view returns (uint256) {
        if (cap.periodSeconds == 0 || block.timestamp >= cap.periodStart + cap.periodSeconds) return 0;
        return cap.spentThisPeriod;
    }

    function _currentWeeklySpent(uint256 streamId) internal view returns (uint256) {
        if (weekStart[streamId] == 0 || block.timestamp >= weekStart[streamId] + 7 days) return 0;
        return weeklySpent[streamId];
    }
}
