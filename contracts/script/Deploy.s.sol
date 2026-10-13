// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import "../src/StreamVault.sol";
import "../src/PolicyModule.sol";
import "../src/ApprovalQueue.sol";

interface DeploymentVm {
    function envUint(string calldata) external returns (uint256);
    function envAddress(string calldata) external returns (address);
    function startBroadcast(uint256) external;
    function stopBroadcast() external;
}

/// @notice Deploys the escrow/policy foundation, then irreversibly completes dependency wiring.
/// @dev Requires PRIVATE_KEY and TOKEN_ADDRESS. No deployment was performed by this project edit.
contract DeployKin {
    DeploymentVm constant vm = DeploymentVm(address(uint160(uint256(keccak256("hevm cheat code")))));
    event ContractsDeployed(address streamVault, address approvalQueue, address policyModule, address supportedToken, uint256 chainId);
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address token = vm.envAddress("TOKEN_ADDRESS");
        vm.startBroadcast(deployerKey);
        StreamVault vault = new StreamVault(token);
        ApprovalQueue queue = new ApprovalQueue(address(vault));
        PolicyModule policy = new PolicyModule(address(vault), address(queue));
        queue.setPolicyModule(address(policy));
        vault.setPolicyModule(address(policy));
        vm.stopBroadcast();
        emit ContractsDeployed(address(vault), address(queue), address(policy), token, block.chainid);
        // KinAccount is a raw-P256 prototype and is deliberately excluded.
    }
}
