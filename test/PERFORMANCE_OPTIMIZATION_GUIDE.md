BaseRewardOptimizer.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title BaseRewardOptimizer
 * @dev Advanced reward optimization contract for Base Builder ecosystem
 * Implements dynamic reward calculation, performance analytics, and yield optimization
 * Features machine learning-inspired algorithms for reward prediction and optimization
 */
contract BaseRewardOptimizer is Ownable, ReentrancyGuard {
    using SafeMath for uint256;

    // Core data structures
    struct BuilderProfile {
        uint256 totalContributions;
        uint256 qualityScore;
        uint256 consistencyRating;
        uint256 innovationIndex;
        uint256 communityImpact;
        uint256 lastActivityTimestamp;
        uint256 streakDays;
        uint256 multiplierBonus;
        bool isActive;
        mapping(string => uint256) skillRatings;
    }

    struct OptimizationMetrics {
        uint256 baseRewardRate;
        uint256 performanceMultiplier;
        uint256 timeDecayFactor;
        uint256 qualityThreshold;
        uint256 innovationBonus;
        uint256 communityWeight;
        uint256 streakMultiplier;
        uint256 ecosystemContribution;
    }

    struct RewardPrediction {
        uint256 predictedReward;
        uint256 confidenceLevel;
        uint256 optimizationSuggestions;
        uint256 projectedGrowth;
        string[] recommendedActions;
    }

    // State variables
    mapping(address => BuilderProfile) public builderProfiles;
    mapping(address => uint256[]) public rewardHistory;
    mapping(string => uint256) public skillWeights;
    mapping(address => RewardPrediction) public predictions;
    
    OptimizationMetrics public metrics;
    IERC20 public rewardToken;
    
    uint256 public totalRewardsDistributed;
    uint256 public activeBuilders;
    uint256 public optimizationCycles;
    uint256 public constant PRECISION = 1e18;
    uint256 public constant MAX_MULTIPLIER = 5e18;
    uint256 public constant DECAY_RATE = 990; // 0.99 per day

    // Events
    event RewardOptimized(address indexed builder, uint256 oldReward, uint256 newReward, uint256 optimizationFactor);
    event ProfileUpdated(address indexed builder, uint256 qualityScore, uint256 innovationIndex);
    event PredictionGenerated(address indexed builder, uint256 predictedReward, uint256 confidence);
    event MetricsUpdated(uint256 baseRate, uint256 multiplier, uint256 threshold);
    event SkillRatingUpdated(address indexed builder, string skill, uint256 rating);

    constructor(address _rewardToken) {
        rewardToken = IERC20(_rewardToken);
        
        // Initialize optimization metrics
        metrics = OptimizationMetrics({
            baseRewardRate: 100e18,
            performanceMultiplier: 150,
            timeDecayFactor: 990,
            qualityThreshold: 75,
            innovationBonus: 200,
            communityWeight: 120,
            streakMultiplier: 110,
            ecosystemContribution: 180
        });

        // Initialize skill weights
        skillWeights["smart_contracts"] = 150;
        skillWeights["frontend"] = 120;
        skillWeights["backend"] = 130;
        skillWeights["defi"] = 160;
        skillWeights["nft"] = 140;
        skillWeights["dao"] = 135;
        skillWeights["security"] = 170;
        skillWeights["documentation"] = 110;
    }

    /**
     * @dev Calculate optimized reward for a builder
     * Uses advanced algorithms considering multiple factors
     */
    function calculateOptimizedReward(address builder) public view returns (uint256) {
        BuilderProfile storage profile = builderProfiles[builder];
        
        if (!profile.isActive) return 0;

        uint256 baseReward = metrics.baseRewardRate;
        
        // Quality multiplier with exponential scaling
        uint256 qualityMultiplier = _calculateQualityMultiplier(profile.qualityScore);
        
        // Innovation bonus with diminishing returns
        uint256 innovationMultiplier = _calculateInnovationMultiplier(profile.innovationIndex);
        
        // Community impact scaling
        uint256 communityMultiplier = _calculateCommunityMultiplier(profile.communityImpact);
        
        // Consistency and streak bonuses
        uint256 consistencyBonus = _calculateConsistencyBonus(profile.consistencyRating, profile.streakDays);
        
        // Time decay factor
        uint256 timeDecay = _calculateTimeDecay(profile.lastActivityTimestamp);
        
        // Skill-based multiplier
        uint256 skillMultiplier = _calculateSkillMultiplier(builder);

        uint256 totalMultiplier = qualityMultiplier
            .mul(innovationMultiplier).div(PRECISION)
            .mul(communityMultiplier).div(PRECISION)
            .mul(consistencyBonus).div(PRECISION)
            .mul(timeDecay).div(PRECISION)
            .mul(skillMultiplier).div(PRECISION);

        // Cap the multiplier to prevent extreme values
        if (totalMultiplier > MAX_MULTIPLIER) {
            totalMultiplier = MAX_MULTIPLIER;
        }

        return baseReward.mul(totalMultiplier).div(PRECISION);
    }

    /**
     * @dev Generate reward prediction using machine learning-inspired algorithms
     */
    function generateRewardPrediction(address builder) external returns (RewardPrediction memory) {
        BuilderProfile storage profile = builderProfiles[builder];
        
        uint256[] memory history = rewardHistory[builder];
        uint256 currentReward = calculateOptimizedReward(builder);
        
        // Trend analysis
        uint256 trendFactor = _analyzeTrend(history);
        
        // Growth projection
        uint256 projectedGrowth = _calculateGrowthProjection(profile, trendFactor);
        
        // Confidence calculation
        uint256 confidence = _calculatePredictionConfidence(history, profile);
        
        // Generate optimization suggestions
        uint256 optimizationScore = _generateOptimizationSuggestions(builder);
        
        RewardPrediction memory prediction = RewardPrediction({
            predictedReward: currentReward.mul(projectedGrowth).div(PRECISION),
            confidenceLevel: confidence,
            optimizationSuggestions: optimizationScore,
            projectedGrowth: projectedGrowth,
            recommendedActions: _getRecommendedActions(builder)
        });
        
        predictions[builder] = prediction;
        
        emit PredictionGenerated(builder, prediction.predictedReward, confidence);
        
        return prediction;
    }

    /**
     * @dev Update builder profile with new metrics
     */
    function updateBuilderProfile(
        address builder,
        uint256 contributions,
        uint256 qualityScore,
        uint256 innovationIndex,
        uint256 communityImpact
    ) external onlyOwner {
        BuilderProfile storage profile = builderProfiles[builder];
        
        // Update core metrics
        profile.totalContributions = profile.totalContributions.add(contributions);
        profile.qualityScore = qualityScore;
        profile.innovationIndex = innovationIndex;
        profile.communityImpact = communityImpact;
        
        // Update activity tracking
        uint256 daysSinceLastActivity = (block.timestamp - profile.lastActivityTimestamp) / 86400;
        
        if (daysSinceLastActivity <= 1) {
            profile.streakDays = profile.streakDays.add(1);
        } else {
            profile.streakDays = 1; // Reset streak
        }
        
        profile.lastActivityTimestamp = block.timestamp;
        profile.isActive = true;
        
        // Update consistency rating
        profile.consistencyRating = _calculateConsistencyRating(builder);
        
        if (!profile.isActive) {
            activeBuilders = activeBuilders.add(1);
        }
        
        emit ProfileUpdated(builder, qualityScore, innovationIndex);
    }

    /**
     * @dev Update skill rating for a builder
     */
    function updateSkillRating(address builder, string memory skill, uint256 rating) external onlyOwner {
        require(rating <= 100, "Rating must be <= 100");
        require(skillWeights[skill] > 0, "Invalid skill");
        
        builderProfiles[builder].skillRatings[skill] = rating;
        
        emit SkillRatingUpdated(builder, skill, rating);
    }

    /**
     * @dev Optimize reward distribution across all active builders
     */
    function optimizeRewardDistribution() external onlyOwner nonReentrant {
        optimizationCycles = optimizationCycles.add(1);
        
        // Dynamic adjustment of base metrics based on ecosystem performance
        _adjustOptimizationMetrics();
        
        emit MetricsUpdated(metrics.baseRewardRate, metrics.performanceMultiplier, metrics.qualityThreshold);
    }

    // Internal calculation functions
    function _calculateQualityMultiplier(uint256 qualityScore) internal view returns (uint256) {
        if (qualityScore < metrics.qualityThreshold) {
            return PRECISION.mul(qualityScore).div(100);
        }
        
        // Exponential bonus for high quality
        uint256 bonus = qualityScore.sub(metrics.qualityThreshold);
        return PRECISION.add(bonus.mul(metrics.performanceMultiplier).div(100));
    }

    function _calculateInnovationMultiplier(uint256 innovationIndex) internal view returns (uint256) {
        // Logarithmic scaling for innovation
        uint256 scaledInnovation = innovationIndex.mul(metrics.innovationBonus).div(100);
        return PRECISION.add(scaledInnovation.mul(PRECISION).div(200));
    }

    function _calculateCommunityMultiplier(uint256 communityImpact) internal view returns (uint256) {
        return PRECISION.add(communityImpact.mul(metrics.communityWeight).div(100));
    }

    function _calculateConsistencyBonus(uint256 consistencyRating, uint256 streakDays) internal view returns (uint256) {
        uint256 consistencyBonus = consistencyRating.mul(110).div(100);
        uint256 streakBonus = streakDays.mul(metrics.streakMultiplier).div(100);
        
        // Cap streak bonus
        if (streakBonus > 300) streakBonus = 300;
        
        return PRECISION.add(consistencyBonus.add(streakBonus));
    }

    function _calculateTimeDecay(uint256 lastActivity) internal view returns (uint256) {
        uint256 daysSinceActivity = (block.timestamp - lastActivity) / 86400;
        
        if (daysSinceActivity == 0) return PRECISION;
        
        // Exponential decay
        uint256 decay = PRECISION;
        for (uint256 i = 0; i < daysSinceActivity && i < 30; i++) {
            decay = decay.mul(metrics.timeDecayFactor).div(1000);
        }
        
        return decay;
    }

    function _calculateSkillMultiplier(address builder) internal view returns (uint256) {
        BuilderProfile storage profile = builderProfiles[builder];
        uint256 totalWeight = 0;
        uint256 weightedScore = 0;
        
        string[8] memory skills = ["smart_contracts", "frontend", "backend", "defi", "nft", "dao", "security", "documentation"];
        
        for (uint256 i = 0; i < skills.length; i++) {
            uint256 rating = profile.skillRatings[skills[i]];
            uint256 weight = skillWeights[skills[i]];
            
            if (rating > 0) {
                weightedScore = weightedScore.add(rating.mul(weight));
                totalWeight = totalWeight.add(weight);
            }
        }
        
        if (totalWeight == 0) return PRECISION;
        
        uint256 averageScore = weightedScore.div(totalWeight);
        return PRECISION.add(averageScore.mul(PRECISION).div(200));
    }

    function _analyzeTrend(uint256[] memory history) internal pure returns (uint256) {
        if (history.length < 2) return PRECISION;
        
        uint256 recentAvg = 0;
        uint256 olderAvg = 0;
        uint256 recentCount = history.length >= 5 ? 3 : history.length / 2;
        
        // Calculate recent average
        for (uint256 i = history.length - recentCount; i < history.length; i++) {
            recentAvg = recentAvg.add(history[i]);
        }
        recentAvg = recentAvg.div(recentCount);
        
        // Calculate older average
        uint256 olderCount = history.length - recentCount;
        for (uint256 i = 0; i < olderCount; i++) {
            olderAvg = olderAvg.add(history[i]);
        }
        olderAvg = olderAvg.div(olderCount);
        
        if (olderAvg == 0) return PRECISION;
        
        return recentAvg.mul(PRECISION).div(olderAvg);
    }

    function _calculateGrowthProjection(BuilderProfile storage profile, uint256 trendFactor) internal view returns (uint256) {
        uint256 baseGrowth = PRECISION;
        
        // Factor in quality improvement potential
        if (profile.qualityScore < 90) {
            baseGrowth = baseGrowth.add(PRECISION.div(20)); // 5% growth potential
        }
        
        // Factor in innovation trajectory
        if (profile.innovationIndex > 70) {
            baseGrowth = baseGrowth.add(PRECISION.div(10)); // 10% innovation bonus
        }
        
        // Apply trend factor
        return baseGrowth.mul(trendFactor).div(PRECISION);
    }

    function _calculatePredictionConfidence(uint256[] memory history, BuilderProfile storage profile) internal view returns (uint256) {
        uint256 confidence = 50; // Base confidence
        
        // More history = higher confidence
        if (history.length > 10) confidence = confidence.add(20);
        else if (history.length > 5) confidence = confidence.add(10);
        
        // Consistency increases confidence
        if (profile.consistencyRating > 80) confidence = confidence.add(15);
        
        // Recent activity increases confidence
        uint256 daysSinceActivity = (block.timestamp - profile.lastActivityTimestamp) / 86400;
        if (daysSinceActivity <= 1) confidence = confidence.add(15);
        
        return confidence > 95 ? 95 : confidence;
    }

    function _generateOptimizationSuggestions(address builder) internal view returns (uint256) {
        BuilderProfile storage profile = builderProfiles[builder];
        uint256 suggestions = 0;
        
        // Quality improvement suggestions
        if (profile.qualityScore < 80) suggestions = suggestions.add(1);
        
        // Innovation suggestions
        if (profile.innovationIndex < 70) suggestions = suggestions.add(2);
        
        // Community engagement suggestions
        if (profile.communityImpact < 60) suggestions = suggestions.add(4);
        
        // Consistency suggestions
        if (profile.streakDays < 7) suggestions = suggestions.add(8);
        
        return suggestions;
    }

    function _getRecommendedActions(address builder) internal view returns (string[] memory) {
        BuilderProfile storage profile = builderProfiles[builder];
        string[] memory actions = new string[](5);
        uint256 actionCount = 0;
        
        if (profile.qualityScore < 80) {
            actions[actionCount] = "Focus on code quality and documentation";
            actionCount++;
        }
        
        if (profile.innovationIndex < 70) {
            actions[actionCount] = "Explore new technologies and innovative solutions";
            actionCount++;
        }
        
        if (profile.communityImpact < 60) {
            actions[actionCount] = "Increase community engagement and collaboration";
            actionCount++;
        }
        
        if (profile.streakDays < 7) {
            actions[actionCount] = "Maintain daily contribution consistency";
            actionCount++;
        }
        
        actions[actionCount] = "Continue building on Base ecosystem";
        
        return actions;
    }

    function _calculateConsistencyRating(address builder) internal view returns (uint256) {
        uint256[] memory history = rewardHistory[builder];
        if (history.length < 3) return 50;
        
        uint256 variance = 0;
        uint256 average = 0;
        
        // Calculate average
        for (uint256 i = 0; i < history.length; i++) {
            average = average.add(history[i]);
        }
        average = average.div(history.length);
        
        // Calculate variance
        for (uint256 i = 0; i < history.length; i++) {
            uint256 diff = history[i] > average ? history[i] - average : average - history[i];
            variance = variance.add(diff.mul(diff));
        }
        variance = variance.div(history.length);
        
        // Convert to consistency rating (lower variance = higher consistency)
        uint256 consistency = variance == 0 ? 100 : (100 * PRECISION) / (variance + PRECISION);
        return consistency > 100 ? 100 : consistency;
    }

    function _adjustOptimizationMetrics() internal {
        // Dynamic adjustment based on ecosystem performance
        if (activeBuilders > 1000) {
            metrics.baseRewardRate = metrics.baseRewardRate.mul(110).div(100); // Increase by 10%
        }
        
        if (totalRewardsDistributed > 1000000e18) {
            metrics.qualityThreshold = metrics.qualityThreshold.add(5); // Raise quality bar
        }
    }

    // View functions
    function getBuilderProfile(address builder) external view returns (
        uint256 totalContributions,
        uint256 qualityScore,
        uint256 consistencyRating,
        uint256 innovationIndex,
        uint256 communityImpact,
        uint256 streakDays,
        bool isActive
    ) {
        BuilderProfile storage profile = builderProfiles[builder];
        return (
            profile.totalContributions,
            profile.qualityScore,
            profile.consistencyRating,
            profile.innovationIndex,
            profile.communityImpact,
            profile.streakDays,
            profile.isActive
        );
    }

    function getSkillRating(address builder, string memory skill) external view returns (uint256) {
        return builderProfiles[builder].skillRatings[skill];
    }

    function getRewardHistory(address builder) external view returns (uint256[] memory) {
        return rewardHistory[builder];
    }

    function getOptimizationMetrics() external view returns (OptimizationMetrics memory) {
        return metrics;
    }

    // Admin functions
    function updateOptimizationMetrics(
        uint256 baseRate,
        uint256 multiplier,
        uint256 threshold,
        uint256 innovationBonus
    ) external onlyOwner {
        metrics.baseRewardRate = baseRate;
        metrics.performanceMultiplier = multiplier;
        metrics.qualityThreshold = threshold;
        metrics.innovationBonus = innovationBonus;
        
        emit MetricsUpdated(baseRate, multiplier, threshold);
    }

    function updateSkillWeight(string memory skill, uint256 weight) external onlyOwner {
        skillWeights[skill] = weight;
    }

    function emergencyPause() external onlyOwner {
        // Emergency pause functionality
        metrics.baseRewardRate = 0;
    }

    function getEcosystemStats() external view returns (
        uint256 totalRewards,
        uint256 builders,
        uint256 cycles,
        uint256 avgReward
    ) {
        uint256 avgReward = activeBuilders > 0 ? totalRewardsDistributed.div(activeBuilders) : 0;
        return (totalRewardsDistributed, activeBuilders, optimizationCycles, avgReward);
    }
}
