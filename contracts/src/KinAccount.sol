// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Experimental raw-P256 ERC-4337 v0.6 account. NOT a WebAuthn account.
/// @dev This prototype has no WebAuthn origin/challenge parsing, recovery, factory or bundler integration.
///      It is excluded from the deployment script. Use a reviewed passkey wallet provider for user funds.
contract KinAccount {
    struct UserOperation {
        address sender; uint256 nonce; bytes initCode; bytes callData; uint256 callGasLimit;
        uint256 verificationGasLimit; uint256 preVerificationGas; uint256 maxFeePerGas;
        uint256 maxPriorityFeePerGas; bytes paymasterAndData; bytes signature;
    }
    address public immutable entryPoint;
    bytes32 public immutable pubKeyX;
    bytes32 public immutable pubKeyY;
    error NotEntryPoint();
    error InvalidConfiguration();
    error ExecutionFailed();
    error InvalidBatch();

    constructor(address trustedEntryPoint, bytes32 x, bytes32 y) {
        if (trustedEntryPoint.code.length == 0 || x == bytes32(0) || y == bytes32(0)) revert InvalidConfiguration();
        entryPoint = trustedEntryPoint;
        pubKeyX = x;
        pubKeyY = y;
    }

    function validateUserOp(UserOperation calldata userOp, bytes32 userOpHash, uint256 missingAccountFunds) external returns (uint256) {
        if (msg.sender != entryPoint) revert NotEntryPoint();
        if (userOp.sender != address(this) || !_verifyP256Signature(userOpHash, userOp.signature)) return 1;
        if (missingAccountFunds != 0) {
            (bool funded,) = payable(entryPoint).call{value: missingAccountFunds}("");
            if (!funded) revert ExecutionFailed();
        }
        return 0;
    }

    function execute(address target, uint256 value, bytes calldata data) external {
        if (msg.sender != entryPoint) revert NotEntryPoint();
        (bool success,) = target.call{value: value}(data);
        if (!success) revert ExecutionFailed();
    }

    function executeBatch(address[] calldata targets, uint256[] calldata values, bytes[] calldata datas) external {
        if (msg.sender != entryPoint) revert NotEntryPoint();
        if (targets.length != values.length || targets.length != datas.length) revert InvalidBatch();
        for (uint256 i; i < targets.length; i++) {
            (bool success,) = targets[i].call{value: values[i]}(datas[i]);
            if (!success) revert ExecutionFailed();
        }
    }

    function _verifyP256Signature(bytes32 hash, bytes calldata signature) internal view returns (bool) {
        if (signature.length != 64) return false;
        bytes32 r = bytes32(signature[:32]);
        bytes32 s = bytes32(signature[32:64]);
        (bool ok, bytes memory result) = address(0x100).staticcall(abi.encode(hash, r, s, pubKeyX, pubKeyY));
        // An unsupported precompile returns no bytes and fails closed.
        return ok && result.length == 32 && abi.decode(result, (uint256)) == 1;
    }
    receive() external payable {}
}
