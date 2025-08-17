BaseLiquidityManager.sol  // SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// Base Liquidity Manager - Advanced DeFi liquidity optimization
// Automated yield farming and liquidity provision on Base

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract BaseLiquidityManager is ReentrancyGuard, Ownable {
    struct LiquidityPool {
        address tokenA;
        address tokenB;
        uint256 totalLiquidity;
        uint256 currentAPR;
        bool isActive;
    }
    
    mapping(bytes32 => LiquidityPool) public pools;
    mapping(address => uint256) public userBalances;
    mapping(address => uint256) public rewardsClaimed;
    
    event LiquidityAdded(address indexed user, bytes32 poolId, uint256 amount);
    event RewardsDistributed(address indexed user, uint256 amount);
    event PoolOptimized(bytes32 poolId, uint256 newAPR);
    
    function addLiquidity(bytes32 poolId, uint256 amount) external nonReentrant {
        require(pools[poolId].isActive, "Pool not active");
        require(amount > 0, "Amount must be positive");
        
        userBalances[msg.sender] += amount;
        pools[poolId].totalLiquidity += amount;
        
        emit LiquidityAdded(msg.sender, poolId, amount);
    }
    
    function optimizePool(bytes32 poolId) external onlyOwner {
        LiquidityPool storage pool = pools[poolId];
        
        // Advanced APR calculation based on TVL and market conditions
        uint256 newAPR = calculateOptimalAPR(pool.totalLiquidity);
        pool.currentAPR = newAPR;
        
        emit PoolOptimized(poolId, newAPR);
    }
    
    function calculateOptimalAPR(uint256 tvl) internal pure returns (uint256) {
        // Dynamic APR based on liquidity depth
        if (tvl > 1000000 ether) return 800; // 8%
        if (tvl > 100000 ether) return 1200; // 12%
        return 1500; // 15% for smaller pools
    }
    
    function claimRewards() external nonReentrant {
        uint256 rewards = calculatePendingRewards(msg.sender);
        require(rewards > 0, "No rewards available");
        
        rewardsClaimed[msg.sender] += rewards;
        
        emit RewardsDistributed(msg.sender, rewards);
    }
    
    function calculatePendingRewards(address user) public view returns (uint256) {
        return userBalances[user] * 15 / 1000; // 1.5% base reward
    }
}
