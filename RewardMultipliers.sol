// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

/**
 * @title RewardMultipliers
 * @dev Smart contract for managing reward multipliers for different contribution types
 * @author Builder Rewards System
 */
contract RewardMultipliers is Ownable, ReentrancyGuard {
    using SafeMath for uint256;

    // Contribution types enum
    enum ContributionType {
        COMMIT,
        PULL_REQUEST,
        ISSUE,
        CODE_REVIEW,
        DEPLOYMENT,
        DOCUMENTATION,
        BUG_FIX,
        FEATURE,
        SECURITY_AUDIT,
        COMMUNITY_ENGAGEMENT
    }

    // Multiplier structure
    struct Multiplier {
        uint256 baseMultiplier;     // Base multiplier (100 = 1.0x)
        uint256 qualityBonus;       // Quality bonus (0-50 = 0-0.5x)
        uint256 timeBonus;          // Time-based bonus (0-25 = 0-0.25x)
        bool isActive;              // Whether this multiplier is active
        uint256 lastUpdated;       // Timestamp of last update
    }

    // Staking multiplier structure
    struct StakingMultiplier {
        uint256 stakingAmount;      // Amount staked
        uint256 multiplierBonus;    // Additional multiplier from staking
        uint256 stakingDuration;    // Duration of staking
        uint256 unlockTime;         // When staking can be withdrawn
    }

    // Mappings
    mapping(ContributionType => Multiplier) public multipliers;
    mapping(address => StakingMultiplier) public stakingMultipliers;
    mapping(address => uint256) public reputationScores;
    mapping(address => mapping(ContributionType => uint256)) public userContributions;

    // Constants
    uint256 public constant MAX_MULTIPLIER = 500; // 5.0x max
    uint256 public constant MIN_MULTIPLIER = 50;  // 0.5x min
    uint256 public constant BASE_MULTIPLIER = 100; // 1.0x base
    uint256 public constant QUALITY_THRESHOLD = 80; // Quality score threshold
    uint256 public constant TIME_BONUS_PERIOD = 7 days; // Time bonus period

    // Events
    event MultiplierUpdated(ContributionType indexed contributionType, uint256 newMultiplier);
    event QualityBonusUpdated(ContributionType indexed contributionType, uint256 newBonus);
    event StakingUpdated(address indexed user, uint256 amount, uint256 duration);
    event ReputationUpdated(address indexed user, uint256 newScore);
    event ContributionRecorded(address indexed user, ContributionType indexed contributionType, uint256 multiplier);

    constructor() {
        _initializeMultipliers();
    }

    /**
     * @dev Initialize default multipliers for all contribution types
     */
    function _initializeMultipliers() private {
        // Set default multipliers
        multipliers[ContributionType.COMMIT] = Multiplier(100, 10, 5, true, block.timestamp);
        multipliers[ContributionType.PULL_REQUEST] = Multiplier(150, 20, 10, true, block.timestamp);
        multipliers[ContributionType.ISSUE] = Multiplier(80, 5, 3, true, block.timestamp);
        multipliers[ContributionType.CODE_REVIEW] = Multiplier(120, 15, 8, true, block.timestamp);
        multipliers[ContributionType.DEPLOYMENT] = Multiplier(200, 25, 15, true, block.timestamp);
        multipliers[ContributionType.DOCUMENTATION] = Multiplier(90, 8, 4, true, block.timestamp);
        multipliers[ContributionType.BUG_FIX] = Multiplier(180, 22, 12, true, block.timestamp);
        multipliers[ContributionType.FEATURE] = Multiplier(160, 18, 10, true, block.timestamp);
        multipliers[ContributionType.SECURITY_AUDIT] = Multiplier(250, 30, 20, true, block.timestamp);
        multipliers[ContributionType.COMMUNITY_ENGAGEMENT] = Multiplier(70, 5, 2, true, block.timestamp);
    }

    /**
     * @dev Update multiplier for a specific contribution type
     * @param contributionType The type of contribution
     * @param newMultiplier The new base multiplier value
     */
    function updateMultiplier(ContributionType contributionType, uint256 newMultiplier) external onlyOwner {
        require(newMultiplier >= MIN_MULTIPLIER && newMultiplier <= MAX_MULTIPLIER, "Invalid multiplier range");
        
        multipliers[contributionType].baseMultiplier = newMultiplier;
        multipliers[contributionType].lastUpdated = block.timestamp;
        
        emit MultiplierUpdated(contributionType, newMultiplier);
    }

    /**
     * @dev Update quality bonus for a specific contribution type
     * @param contributionType The type of contribution
     * @param qualityBonus The new quality bonus value
     */
    function updateQualityBonus(ContributionType contributionType, uint256 qualityBonus) external onlyOwner {
        require(qualityBonus <= 50, "Quality bonus too high");
        
        multipliers[contributionType].qualityBonus = qualityBonus;
        multipliers[contributionType].lastUpdated = block.timestamp;
        
        emit QualityBonusUpdated(contributionType, qualityBonus);
    }

    /**
     * @dev Calculate total multiplier for a user's contribution
     * @param user The user address
     * @param contributionType The type of contribution
     * @param qualityScore The quality score (0-100)
     * @param isTimely Whether the contribution was made within time bonus period
     * @return The total multiplier value
     */
    function calculateMultiplier(
        address user,
        ContributionType contributionType,
        uint256 qualityScore,
        bool isTimely
    ) external view returns (uint256) {
        require(multipliers[contributionType].isActive, "Multiplier not active");
        require(qualityScore <= 100, "Invalid quality score");

        Multiplier memory mult = multipliers[contributionType];
        uint256 totalMultiplier = mult.baseMultiplier;

        // Add quality bonus if score is above threshold
        if (qualityScore >= QUALITY_THRESHOLD) {
            uint256 qualityMultiplier = mult.qualityBonus.mul(qualityScore).div(100);
            totalMultiplier = totalMultiplier.add(qualityMultiplier);
        }

        // Add time bonus if contribution is timely
        if (isTimely) {
            totalMultiplier = totalMultiplier.add(mult.timeBonus);
        }

        // Add staking multiplier
        if (stakingMultipliers[user].stakingAmount > 0) {
            totalMultiplier = totalMultiplier.add(stakingMultipliers[user].multiplierBonus);
        }

        // Add reputation multiplier
        uint256 reputationBonus = reputationScores[user].div(10); // 1% per 10 reputation points
        totalMultiplier = totalMultiplier.add(reputationBonus);

        // Ensure multiplier is within bounds
        if (totalMultiplier > MAX_MULTIPLIER) {
            totalMultiplier = MAX_MULTIPLIER;
        }
        if (totalMultiplier < MIN_MULTIPLIER) {
            totalMultiplier = MIN_MULTIPLIER;
        }

        return totalMultiplier;
    }

    /**
     * @dev Record a contribution and update user stats
     * @param user The user address
     * @param contributionType The type of contribution
     * @param qualityScore The quality score
     * @param isTimely Whether the contribution was timely
     */
    function recordContribution(
        address user,
        ContributionType contributionType,
        uint256 qualityScore,
        bool isTimely
    ) external onlyOwner nonReentrant {
        uint256 multiplier = this.calculateMultiplier(user, contributionType, qualityScore, isTimely);
        
        userContributions[user][contributionType] = userContributions[user][contributionType].add(1);
        
        // Update reputation score based on contribution
        _updateReputationScore(user, contributionType, qualityScore);
        
        emit ContributionRecorded(user, contributionType, multiplier);
    }

    /**
     * @dev Update user's reputation score
     * @param user The user address
     * @param contributionType The type of contribution
     * @param qualityScore The quality score
     */
    function _updateReputationScore(
        address user,
        ContributionType contributionType,
        uint256 qualityScore
    ) private {
        uint256 reputationIncrease = qualityScore.div(10); // 1 reputation per 10 quality points
        
        // Bonus reputation for high-value contributions
        if (contributionType == ContributionType.SECURITY_AUDIT || 
            contributionType == ContributionType.DEPLOYMENT) {
            reputationIncrease = reputationIncrease.mul(2);
        }
        
        reputationScores[user] = reputationScores[user].add(reputationIncrease);
        
        emit ReputationUpdated(user, reputationScores[user]);
    }

    /**
     * @dev Stake tokens to increase multiplier
     * @param amount The amount to stake
     * @param duration The staking duration in seconds
     */
    function stakeForMultiplier(uint256 amount, uint256 duration) external payable nonReentrant {
        require(amount > 0, "Amount must be greater than 0");
        require(duration >= 30 days, "Minimum staking duration is 30 days");
        require(msg.value == amount, "Incorrect ETH amount");

        StakingMultiplier storage staking = stakingMultipliers[msg.sender];
        
        // Calculate multiplier bonus based on amount and duration
        uint256 multiplierBonus = amount.div(1 ether).mul(5); // 5% per ETH staked
        if (duration >= 90 days) {
            multiplierBonus = multiplierBonus.mul(150).div(100); // 1.5x for 90+ days
        } else if (duration >= 60 days) {
            multiplierBonus = multiplierBonus.mul(125).div(100); // 1.25x for 60+ days
        }

        staking.stakingAmount = staking.stakingAmount.add(amount);
        staking.multiplierBonus = multiplierBonus;
        staking.stakingDuration = duration;
        staking.unlockTime = block.timestamp.add(duration);

        emit StakingUpdated(msg.sender, amount, duration);
    }

    /**
     * @dev Withdraw staked tokens
     */
    function withdrawStake() external nonReentrant {
        StakingMultiplier storage staking = stakingMultipliers[msg.sender];
        require(staking.stakingAmount > 0, "No staked amount");
        require(block.timestamp >= staking.unlockTime, "Staking period not completed");

        uint256 amount = staking.stakingAmount;
        
        // Reset staking data
        staking.stakingAmount = 0;
        staking.multiplierBonus = 0;
        staking.stakingDuration = 0;
        staking.unlockTime = 0;

        // Transfer staked amount back to user
        payable(msg.sender).transfer(amount);
    }

    /**
     * @dev Get multiplier information for a contribution type
     * @param contributionType The type of contribution
     * @return The multiplier information
     */
    function getMultiplier(ContributionType contributionType) external view returns (Multiplier memory) {
        return multipliers[contributionType];
    }

    /**
     * @dev Get user's contribution count for a specific type
     * @param user The user address
     * @param contributionType The type of contribution
     * @return The contribution count
     */
    function getUserContributions(address user, ContributionType contributionType) external view returns (uint256) {
        return userContributions[user][contributionType];
    }

    /**
     * @dev Get user's total contributions across all types
     * @param user The user address
     * @return The total contribution count
     */
    function getUserTotalContributions(address user) external view returns (uint256) {
        uint256 total = 0;
        for (uint256 i = 0; i < 10; i++) {
            total = total.add(userContributions[user][ContributionType(i)]);
        }
        return total;
    }

    /**
     * @dev Toggle multiplier active status
     * @param contributionType The type of contribution
     * @param isActive The new active status
     */
    function toggleMultiplier(ContributionType contributionType, bool isActive) external onlyOwner {
        multipliers[contributionType].isActive = isActive;
        multipliers[contributionType].lastUpdated = block.timestamp;
    }

    /**
     * @dev Emergency withdraw function for owner
     */
    function emergencyWithdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

    /**
     * @dev Get contract balance
     * @return The contract balance
     */
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }

    /**
     * @dev Get total rewards earned by user across all contribution types
     * @param user The user address to check
     * @return totalRewards The total rewards earned
     */
    function getTotalUserRewards(address user) external view returns (uint256 totalRewards) {
        for (uint256 i = 0; i < 10; i++) {
            ContributionType contributionType = ContributionType(i);
            uint256 contributions = userContributions[user][contributionType];
            uint256 multiplier = getEffectiveMultiplier(user, contributionType);
            totalRewards = totalRewards.add(contributions.mul(multiplier));
        }
        return totalRewards;
    }

    /**
     * @dev Get user's contribution streak for consistency bonus
     * @param user The user address
     * @return streak Number of consecutive days with contributions
     */
    function getUserStreak(address user) external view returns (uint256 streak) {
        // Implementation for tracking daily contribution streaks
        return reputationScores[user] / 100; // Simplified calculation based on reputation
    }
}
}
