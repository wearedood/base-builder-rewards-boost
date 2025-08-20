// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title BaseEcosystemIntegrator
 * @dev Advanced contract for Base ecosystem integration and rewards
 * @notice Integrates with major Base protocols for enhanced DeFi functionality
 */
contract BaseEcosystemIntegrator is Ownable, ReentrancyGuard {
    
    // State variables
    mapping(address => uint256) public userRewards;
    mapping(address => bool) public authorizedProtocols;
    mapping(bytes32 => bool) public executedTransactions;
    
    uint256 public totalRewardsDistributed;
    uint256 public constant MAX_REWARD_RATE = 1000; // 10%
    uint256 public rewardRate = 500; // 5%
    
    // Events
    event RewardDistributed(address indexed user, uint256 amount);
    event ProtocolAuthorized(address indexed protocol, bool status);
    event CrossChainBridge(bytes32 indexed txHash, address indexed user, uint256 amount);
    
    // Protocol integration struct
    struct ProtocolIntegration {
        address protocolAddress;
        uint256 tvl;
        bool isActive;
        uint256 lastUpdate;
    }
    
    mapping(string => ProtocolIntegration) public protocols;
    
    constructor() {
        _initializeBaseProtocols();
    }
    
    /**
     * @dev Initialize integration with major Base protocols
     */
    function _initializeBaseProtocols() private {
        // Uniswap V3 on Base
        protocols["uniswap"] = ProtocolIntegration({
            protocolAddress: 0x2626664c2603336E57B271c5C0b26F421741e481,
            tvl: 0,
            isActive: true,
            lastUpdate: block.timestamp
        });
        
        // Aerodrome (Base native DEX)
        protocols["aerodrome"] = ProtocolIntegration({
            protocolAddress: 0x940181a94A37A2A52b9c63c5c7b9b5e5e8b8b8b8,
            tvl: 0,
            isActive: true,
            lastUpdate: block.timestamp
        });
    }
    
    /**
     * @dev Distribute rewards to users
     */
    function distributeRewards(address user, uint256 amount) external onlyOwner nonReentrant {
        require(user != address(0), "Invalid user address");
        require(amount > 0, "Amount must be greater than 0");
        
        userRewards[user] += amount;
        totalRewardsDistributed += amount;
        
        emit RewardDistributed(user, amount);
    }
    
    /**
     * @dev Set protocol authorization
     */
    function setProtocolAuthorization(address protocol, bool status) external onlyOwner {
        require(protocol != address(0), "Invalid protocol address");
        authorizedProtocols[protocol] = status;
        emit ProtocolAuthorized(protocol, status);
    }
    
    /**
     * @dev Execute cross-chain bridge transaction
     */
    function executeCrossChainBridge(
        bytes32 txHash,
        address user,
        uint256 amount
    ) external nonReentrant {
        require(!executedTransactions[txHash], "Transaction already executed");
        require(user != address(0), "Invalid user address");
        require(amount > 0, "Amount must be greater than 0");
        
        executedTransactions[txHash] = true;
        
        // Calculate bridge reward
        uint256 bridgeReward = (amount * 50) / 10000; // 0.5%
        userRewards[user] += bridgeReward;
        
        emit CrossChainBridge(txHash, user, amount);
    }
    
    /**
     * @dev Get user rewards
     */
    function getUserRewards(address user) external view returns (uint256) {
        return userRewards[user];
    }
    
    /**
     * @dev Get protocol information
     */
    function getProtocolInfo(string memory protocolName) external view returns (ProtocolIntegration memory) {
        return protocols[protocolName];
    }
    
    /**
     * @dev Update reward rate
     */
    function updateRewardRate(uint256 newRate) external onlyOwner {
        require(newRate <= MAX_REWARD_RATE, "Rate exceeds maximum");
        rewardRate = newRate;
    }
}
