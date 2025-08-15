/**
 * Base Builder Rewards Calculator Utility
 * 
 * This utility provides helper functions for calculating and managing
 * Base Builder Rewards across different contribution types.
 * 
 * @author Base Builder Rewards Team
 * @version 1.0.0
 */

const { ethers } = require('ethers');

/**
 * Contribution types supported by the Base Builder Rewards system
 */
const CONTRIBUTION_TYPES = {
    COMMIT: 0,
    PULL_REQUEST: 1,
    ISSUE: 2,
    CODE_REVIEW: 3,
    DOCUMENTATION: 4,
    TESTING: 5,
    DEPLOYMENT: 6,
    COMMUNITY: 7,
    TUTORIAL: 8,
    BRIDGE_USAGE: 9
};

/**
 * Base multipliers for different contribution types
 */
const BASE_MULTIPLIERS = {
    [CONTRIBUTION_TYPES.COMMIT]: 1.5,
    [CONTRIBUTION_TYPES.PULL_REQUEST]: 2.0,
    [CONTRIBUTION_TYPES.ISSUE]: 1.2,
    [CONTRIBUTION_TYPES.CODE_REVIEW]: 1.8,
    [CONTRIBUTION_TYPES.DOCUMENTATION]: 1.3,
    [CONTRIBUTION_TYPES.TESTING]: 1.7,
    [CONTRIBUTION_TYPES.DEPLOYMENT]: 2.5,
    [CONTRIBUTION_TYPES.COMMUNITY]: 1.2,
    [CONTRIBUTION_TYPES.TUTORIAL]: 1.4,
    [CONTRIBUTION_TYPES.BRIDGE_USAGE]: 3.0
};

/**
 * Calculate total rewards for a user across all contribution types
 * @param {Object} userContributions - Object mapping contribution types to counts
 * @param {Object} userMultipliers - Object mapping contribution types to user-specific multipliers
 * @returns {number} Total calculated rewards
 */
function calculateTotalRewards(userContributions, userMultipliers = {}) {
    let totalRewards = 0;
    
    for (const [type, count] of Object.entries(userContributions)) {
        const baseMultiplier = BASE_MULTIPLIERS[type] || 1.0;
        const userMultiplier = userMultipliers[type] || 1.0;
        const effectiveMultiplier = baseMultiplier * userMultiplier;
        
        totalRewards += count * effectiveMultiplier;
    }
    
    return totalRewards;
}

/**
 * Calculate streak bonus based on consecutive days of contributions
 * @param {number} streakDays - Number of consecutive days with contributions
 * @returns {number} Streak multiplier bonus
 */
function calculateStreakBonus(streakDays) {
    if (streakDays < 3) return 1.0;
    if (streakDays < 7) return 1.1;
    if (streakDays < 14) return 1.2;
    if (streakDays < 30) return 1.3;
    return 1.5; // Maximum streak bonus
}

/**
 * Validate contribution data format
 * @param {Object} contributions - Contribution data to validate
 * @returns {boolean} True if valid, false otherwise
 */
function validateContributions(contributions) {
    if (!contributions || typeof contributions !== 'object') {
        return false;
    }
    
    for (const [type, count] of Object.entries(contributions)) {
        if (!CONTRIBUTION_TYPES.hasOwnProperty(type) || typeof count !== 'number' || count < 0) {
            return false;
        }
    }
    
    return true;
}

/**
 * Format rewards for display
 * @param {number} rewards - Raw reward amount
 * @returns {string} Formatted reward string
 */
function formatRewards(rewards) {
    return `${rewards.toFixed(4)} ETH`;
}

module.exports = {
    CONTRIBUTION_TYPES,
    BASE_MULTIPLIERS,
    calculateTotalRewards,
    calculateStreakBonus,
    validateContributions,
    formatRewards
};
