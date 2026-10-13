// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import "./StreamVault.sol";

interface KinApprovedPolicy {
    function vault() external view returns (address);
    function approvalQueue() external view returns (address);
    function executeApprovedSpend(uint256 streamId, address recipient, uint256 amount, bytes32 category, string calldata memo) external;
}

/// @notice Single-use, expiring requests authenticated to their stream's funding parent.
contract ApprovalQueue is KinGuard {
    struct PendingRequest {
        uint256 id;
        uint256 streamId;
        address student;
        address recipient;
        uint256 amount;
        bytes32 category;
        string memo;
        uint256 createdAt;
        uint256 expiresAt;
        bool executed;
        bool approved;
        address parent;
    }

    StreamVault public immutable vault;
    address public immutable owner;
    address public policyModule;
    mapping(uint256 => PendingRequest) public requests;
    mapping(uint256 => uint256[]) public pendingByStream;
    uint256 public nextRequestId = 1;
    uint256 public constant EXPIRY_DURATION = 48 hours;

    error NotOwner();
    error NotPolicyModule();
    error NotParentOfStream();
    error RequestNotFound();
    error RequestAlreadyExecuted();
    error RequestExpiredError();
    error InvalidAddress();
    error InvalidRequest();
    error AlreadyConfigured();

    event PolicyModuleConfigured(address indexed policyModule);
    event RequestCreated(uint256 indexed requestId, uint256 indexed streamId, address indexed student, address recipient, uint256 amount, string memo, uint256 expiresAt);
    event RequestApproved(uint256 indexed requestId, address approvedBy);
    event RequestDeclined(uint256 indexed requestId, address declinedBy);

    constructor(address streamVault) {
        if (streamVault.code.length == 0) revert InvalidAddress();
        vault = StreamVault(streamVault);
        owner = msg.sender;
    }

    function setPolicyModule(address module) external {
        if (msg.sender != owner) revert NotOwner();
        if (policyModule != address(0)) revert AlreadyConfigured();
        if (module.code.length == 0) revert InvalidAddress();
        if (KinApprovedPolicy(module).vault() != address(vault) || KinApprovedPolicy(module).approvalQueue() != address(this)) revert InvalidAddress();
        policyModule = module;
        emit PolicyModuleConfigured(module);
    }

    function createRequest(uint256 streamId, address recipient, uint256 amount, bytes32 category, string calldata memo) external nonReentrant returns (uint256 requestId) {
        if (msg.sender != policyModule) revert NotPolicyModule();
        StreamVault.Stream memory stream = vault.getStream(streamId);
        if (stream.parent == address(0) || recipient == address(0) || amount == 0 || category == bytes32(0) || bytes(memo).length > 200) revert InvalidRequest();
        requestId = nextRequestId++;
        uint256 expiry = block.timestamp + EXPIRY_DURATION;
        requests[requestId] = PendingRequest(requestId, streamId, stream.student, recipient, amount, category, memo, block.timestamp, expiry, false, false, stream.parent);
        pendingByStream[streamId].push(requestId);
        emit RequestCreated(requestId, streamId, stream.student, recipient, amount, memo, expiry);
    }

    function approve(uint256 requestId) external nonReentrant {
        PendingRequest storage req = requests[requestId];
        _validate(req);
        req.executed = true;
        req.approved = true;
        // Callback applies the CURRENT full hard policy. Any failure reverts request resolution as well.
        KinApprovedPolicy(policyModule).executeApprovedSpend(req.streamId, req.recipient, req.amount, req.category, req.memo);
        emit RequestApproved(requestId, msg.sender);
    }

    function decline(uint256 requestId) external nonReentrant {
        PendingRequest storage req = requests[requestId];
        _validate(req);
        req.executed = true;
        emit RequestDeclined(requestId, msg.sender);
    }

    function getRequest(uint256 requestId) external view returns (PendingRequest memory) { return requests[requestId]; }

    /// @dev Demo convenience. A production indexer should paginate the monotonically growing history.
    function getPending(uint256 streamId) external view returns (uint256[] memory ids) {
        uint256[] storage all = pendingByStream[streamId];
        uint256 count;
        for (uint256 i; i < all.length; i++) if (!requests[all[i]].executed && block.timestamp < requests[all[i]].expiresAt) count++;
        ids = new uint256[](count);
        uint256 next;
        for (uint256 i; i < all.length; i++) if (!requests[all[i]].executed && block.timestamp < requests[all[i]].expiresAt) ids[next++] = all[i];
    }

    function _validate(PendingRequest storage req) internal view {
        if (req.id == 0) revert RequestNotFound();
        if (msg.sender != req.parent || vault.getStream(req.streamId).parent != msg.sender) revert NotParentOfStream();
        if (req.executed) revert RequestAlreadyExecuted();
        if (block.timestamp >= req.expiresAt) revert RequestExpiredError();
    }
}
