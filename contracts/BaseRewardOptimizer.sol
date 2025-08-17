BaseRewardOptimizer.sol  // SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// Base Reward Optimizer Smart Contract
// Advanced reward calculation and distribution for Base Builder Rewards

contract BaseRewardOptimizer {
    address public owner;
    mapping(address => uint256) public builderScores;
    mapping(address => uint256) public rewardMultipliers;
    
    event ScoreUpdated(address indexed builder, uint256 newScore);
    event RewardDistributed(address indexed builder, uint256 amount);
    
    constructor() {
        owner = msg.sender;
    }
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this");
        _;
    }
    
    function updateBuilderScore(address builder, uint256 score) external onlyOwner {
        builderScores[builder] = score;
        emit ScoreUpdated(builder, score);
    }
    
    function calculateOptimalReward(address builder) external view returns (uint256) {
        uint256 baseScore = builderScores[builder];
        uint256 multiplier = rewardMultipliers[builder];
        
        if (multiplier == 0) multiplier = 100; // Default 1x multiplier
        
        return (baseScore * multiplier) / 100;
    }
    
    function setRewardMultiplier(address builder, uint256 multiplier) external onlyOwner {
        rewardMultipliers[builder] = multiplier;
    }
    
    function getBuilderRank(address builder) external view returns (uint256) {
        // Simplified ranking calculation
        return builderScores[builder] > 100 ? 1 : 2;
    }
}
