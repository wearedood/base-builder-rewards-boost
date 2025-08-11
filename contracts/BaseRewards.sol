// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title BaseRewards
 * @dev A reward token contract for Base Builder Rewards program
 * @notice This contract manages reward distribution for Base ecosystem contributors
 */
contract BaseRewards is ERC20, Ownable, ReentrancyGuard {
    
    // Events
    event RewardDistributed(address indexed recipient, uint256 amount, string reason);
    event BuilderRegistered(address indexed builder, string githubHandle);
    
    // State variables
    mapping(address => bool) public registeredBuilders;
    mapping(address => uint256) public builderScores;
    mapping(address => string) public builderGithubHandles;
    
    uint256 public constant REWARD_MULTIPLIER = 100; // 100 tokens per score point
    uint256 public totalRewardsDistributed

    // Contribution type multipliers
    mapping(uint256 => uint256) public contributionMultipliers;
    
    // Events for multiplier management
    event MultiplierSet(uint256 indexed contributionType, uint256 multiplier);
    event ContributionTypeDetected(address indexed builder, uint256 contributionType, string reason);;
    
    constructor() ERC20("Base Builder Rewards", "BBR") {
        _mint(msg.sender, 1000000 * 10**decimals()); // Initial supply
        
        // Initialize default contribution type multipliers
        contributionMultipliers[0] = 100; // Default/Unknown: 1x (100%)
        contributionMultipliers[1] = 150; // Smart Contract: 1.5x (150%)
        contributionMultipliers[2] = 120; // DeFi Protocol: 1.2x (120%)
        contributionMultipliers[3] = 130; // NFT/Gaming: 1.3x (130%)
        contributionMultipliers[4] = 110; // Infrastructure: 1.1x (110%)
        contributionMultipliers[5] = 140; // Developer Tools: 1.4x (140%)
    }
    
    /**
     * @dev Register a builder in the rewards program
     * @param githubHandle The builder's GitHub handle
     */
    function registerBuilder(string memory githubHandle) external {
        require(!registeredBuilders[msg.sender], "Builder already registered");
        require(bytes(githubHandle).length > 0, "GitHub handle cannot be empty");
        
        registeredBuilders[msg.sender] = true;
        builderGithubHandles[msg.sender] = githubHandle;
        
        emit BuilderRegistered(msg.sender, githubHandle);
    }

    /**
     * @dev Set multiplier for a specific contribution type
     * @param contributionType The type of contribution (0-5)
     * @param multiplier The multiplier value (100 = 1x, 150 = 1.5x, etc.)
     */
    function setMultiplier(uint256 contributionType, uint256 multiplier) external onlyOwner nonReentrant {
        require(contributionType <= 5, "Invalid contribution type");
        require(multiplier >= 50 && multiplier <= 300, "Multiplier must be between 0.5x and 3x");
        
        contributionMultipliers[contributionType] = multiplier;
        emit MultiplierSet(contributionType, multiplier);
    }
    
    /**
     * @dev Distribute rewards to a builder based on their score
     * @param builder The address of the builder
     * @param score The builder's current score
     * @param reason The reason for the reward
     */
    function distributeReward(
        address builder,
        uint256 score,
        string memory reason
    ) external onlyOwner nonReentrant {
        require(registeredBuilders[builder], "Builder not registered");
        require(score > builderScores[builder], "Score must be higher than current");
        require(contributionType <= 5, "Invalid contribution type");
        
        // Emit contribution type detection event
        emit ContributionTypeDetected(builder, contributionType, reason);
        
        uint256 scoreDifference = score - builderScores[builder];
        uint256 rewardAmount = scoreDifference * contributionMultipliers[contributionType];
        
        builderScores[builder] = score;
        totalRewardsDistributed += rewardAmount;
        
        _mint(builder, rewardAmount);
        
        emit RewardDistributed(builder, rewardAmount, reason);,
        uint256 contributionType
    }
    
    /**
     * @dev Get builder information
     * @param builder The address of the builder
     * @return registered Whether the builder is registered
     * @return score The builder's current score
     * @return githubHandle The builder's GitHub handle
     */
    function getBuilderInfo(address builder) 
        external 
        view 
        returns (bool registered, uint256 score, string memory githubHandle) 
    {
        return (
            registeredBuilders[builder],
            builderScores[builder],
            builderGithubHandles[builder]
        );
    }
    
    /**
     * @dev Emergency function to pause contract (inherited from Ownable)
     */
    function emergencyWithdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
}
