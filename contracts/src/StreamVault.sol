// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @dev Small shared reentrancy guard. A reverted call also restores the lock.
abstract contract KinGuard {
    uint256 private entered;
    error ReentrantCall();
    modifier nonReentrant() {
        if (entered != 0) revert ReentrantCall();
        entered = 1;
        _;
        entered = 0;
    }
}

interface KinToken {
    function balanceOf(address account) external view returns (uint256);
}

/// @notice Escrows one approved ERC20 and accrues a recipient's entitlement over time.
/// @dev Pausing stops accrual and spending while retaining all already earned entitlement.
contract StreamVault is KinGuard {
    struct Stream {
        address parent;
        address student;
        address token;
        uint256 ratePerSecond;
        uint256 startTime;
        uint256 lastWithdrawn; // checkpoint time; retained name for existing readers
        uint256 depositedBalance; // escrow remaining, including earned entitlement
        bool active;
        uint256 accruedBalance;
    }

    address public immutable owner;
    address public immutable supportedToken;
    address public policyModule;
    mapping(uint256 => Stream) public streams;
    mapping(address => uint256) public studentStream;
    mapping(address => address) public authorizedParent;
    mapping(address => uint256) public parentStream; // most recent stream; parents can fund several students
    uint256 public nextStreamId = 1;

    error NotOwner();
    error NotParent();
    error NotPolicyModule();
    error AlreadyConfigured();
    error InvalidAddress();
    error UnsupportedToken();
    error StreamAlreadyExists();
    error ParentNotAuthorized();
    error StreamNotActive();
    error StreamAlreadyActive();
    error InsufficientBalance();
    error ZeroRate();
    error ZeroDeposit();
    error TransferFailed();
    error UnsupportedTokenBehavior();

    event PolicyModuleConfigured(address indexed policyModule);
    event ParentAuthorized(address indexed student, address indexed parent);
    event StreamCreated(uint256 indexed streamId, address indexed parent, address indexed student, address token, uint256 ratePerSecond, uint256 depositedBalance);
    event StreamFunded(uint256 indexed streamId, uint256 amount, uint256 newBalance);
    event Withdrawn(uint256 indexed streamId, address indexed to, uint256 amount);
    event RateUpdated(uint256 indexed streamId, uint256 newRatePerSecond);
    event StreamPaused(uint256 indexed streamId);
    event StreamResumed(uint256 indexed streamId);

    constructor(address token) {
        if (token == address(0) || token.code.length == 0) revert InvalidAddress();
        owner = msg.sender;
        supportedToken = token;
    }

    /// @notice Deployment wiring only; it cannot be changed after being configured.
    function setPolicyModule(address module) external {
        if (msg.sender != owner) revert NotOwner();
        if (policyModule != address(0)) revert AlreadyConfigured();
        if (module.code.length == 0) revert InvalidAddress();
        (bool ok, bytes memory result) = module.staticcall(abi.encodeWithSignature("vault()"));
        if (!ok || result.length != 32 || abi.decode(result, (address)) != address(this)) revert InvalidAddress();
        policyModule = module;
        emit PolicyModuleConfigured(module);
    }

    modifier onlyParent(uint256 streamId) {
        if (streams[streamId].parent != msg.sender) revert NotParent();
        _;
    }

    /// @notice A student grants one parent permission to create their stream, or revokes with address zero.
    /// @dev Prevents permissionless dust deposits from permanently reserving another student's stream slot.
    function authorizeParent(address parent) external {
        if (studentStream[msg.sender] != 0) revert StreamAlreadyExists();
        if (parent == msg.sender) revert InvalidAddress();
        authorizedParent[msg.sender] = parent;
        emit ParentAuthorized(msg.sender, parent);
    }

    function createStream(address student, address token, uint256 ratePerSecond, uint256 initialDeposit) external nonReentrant returns (uint256 streamId) {
        if (policyModule == address(0) || student == address(0) || student == msg.sender) revert InvalidAddress();
        if (token != supportedToken) revert UnsupportedToken();
        if (ratePerSecond == 0) revert ZeroRate();
        if (initialDeposit == 0) revert ZeroDeposit();
        if (studentStream[student] != 0) revert StreamAlreadyExists();
        if (authorizedParent[student] != msg.sender) revert ParentNotAuthorized();
        delete authorizedParent[student];
        streamId = nextStreamId++;
        streams[streamId] = Stream(msg.sender, student, token, ratePerSecond, block.timestamp, block.timestamp, initialDeposit, true, 0);
        studentStream[student] = streamId;
        parentStream[msg.sender] = streamId;
        _pullExact(msg.sender, initialDeposit);
        emit StreamCreated(streamId, msg.sender, student, token, ratePerSecond, initialDeposit);
    }

    function fund(uint256 streamId, uint256 amount) external nonReentrant onlyParent(streamId) {
        if (amount == 0) revert ZeroDeposit();
        Stream storage s = streams[streamId];
        // Checkpoint BEFORE adding funding: exhausted time must not consume a new deposit retroactively.
        _checkpoint(s);
        s.depositedBalance += amount;
        _pullExact(msg.sender, amount);
        emit StreamFunded(streamId, amount, s.depositedBalance);
    }

    function updateRate(uint256 streamId, uint256 newRate) external onlyParent(streamId) {
        if (newRate == 0) revert ZeroRate();
        Stream storage s = streams[streamId];
        _checkpoint(s);
        s.ratePerSecond = newRate;
        emit RateUpdated(streamId, newRate);
    }

    function pause(uint256 streamId) external onlyParent(streamId) {
        Stream storage s = streams[streamId];
        if (!s.active) revert StreamNotActive();
        _checkpoint(s);
        s.active = false;
        emit StreamPaused(streamId);
    }

    function resume(uint256 streamId) external onlyParent(streamId) {
        Stream storage s = streams[streamId];
        if (s.active) revert StreamAlreadyActive();
        s.lastWithdrawn = block.timestamp;
        s.active = true;
        emit StreamResumed(streamId);
    }

    function executeWithdrawal(uint256 streamId, address to, uint256 amount) external nonReentrant {
        if (msg.sender != policyModule) revert NotPolicyModule();
        if (to == address(0) || to == address(this)) revert InvalidAddress();
        if (amount == 0) revert ZeroDeposit();
        Stream storage s = streams[streamId];
        if (!s.active) revert StreamNotActive();
        _checkpoint(s);
        if (amount > s.accruedBalance) revert InsufficientBalance();
        s.accruedBalance -= amount;
        s.depositedBalance -= amount;
        uint256 beforeRecipient = KinToken(supportedToken).balanceOf(to);
        _callToken(abi.encodeWithSignature("transfer(address,uint256)", to, amount));
        if (KinToken(supportedToken).balanceOf(to) != beforeRecipient + amount) revert UnsupportedTokenBehavior();
        emit Withdrawn(streamId, to, amount);
    }

    function streamedAmount(uint256 streamId) external view returns (uint256) { return _earned(streams[streamId]); }
    function getStream(uint256 streamId) external view returns (Stream memory) { return streams[streamId]; }
    function streamFor(address student) external view returns (Stream memory) { return streams[studentStream[student]]; }

    function _earned(Stream storage s) internal view returns (uint256) {
        uint256 earned = s.accruedBalance;
        if (!s.active) return earned;
        uint256 remaining = s.depositedBalance - earned;
        uint256 elapsed = block.timestamp - s.lastWithdrawn;
        // Saturation before multiplication prevents overflow for large rates or long inactivity.
        if (elapsed > remaining / s.ratePerSecond) return s.depositedBalance;
        return earned + elapsed * s.ratePerSecond;
    }

    function _checkpoint(Stream storage s) internal {
        s.accruedBalance = _earned(s);
        s.lastWithdrawn = block.timestamp;
    }

    function _pullExact(address from, uint256 amount) internal {
        uint256 beforeVault = KinToken(supportedToken).balanceOf(address(this));
        _callToken(abi.encodeWithSignature("transferFrom(address,address,uint256)", from, address(this), amount));
        if (KinToken(supportedToken).balanceOf(address(this)) != beforeVault + amount) revert UnsupportedTokenBehavior();
    }

    function _callToken(bytes memory payload) internal {
        (bool ok, bytes memory result) = supportedToken.call(payload);
        if (!ok || (result.length != 0 && (result.length != 32 || !abi.decode(result, (bool))))) revert TransferFailed();
    }
}
