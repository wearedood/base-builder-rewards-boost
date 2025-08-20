/**
 * Base Ecosystem Metrics Tracker
 * 
 * Comprehensive utility for tracking and analyzing Base blockchain ecosystem metrics
 * including network statistics, DeFi protocols, builder activity, and rewards data.
 * 
 * @author wearedood
 * @version 1.0.0
 * @license MIT
 */

const axios = require('axios');
const { ethers } = require('ethers');

class BaseEcosystemMetrics {
    constructor(config = {}) {
        this.baseRpcUrl = config.baseRpcUrl || 'https://mainnet.base.org';
        this.provider = new ethers.JsonRpcProvider(this.baseRpcUrl);
        this.cache = new Map();
        this.cacheTimeout = config.cacheTimeout || 300000; // 5 minutes
        
        // API endpoints for external data
        this.endpoints = {
            defillama: 'https://api.llama.fi',
            coingecko: 'https://api.coingecko.com/api/v3',
            builderRewards: 'https://api.builderscore.xyz',
            baseApi: 'https://api.base.org'
        };
    }

    /**
     * Get comprehensive Base network statistics
     * @returns {Promise<Object>} Network metrics including block info, gas prices, TPS
     */
    async getNetworkMetrics() {
        const cacheKey = 'network_metrics';
        const cached = this.getCachedData(cacheKey);
        if (cached) return cached;

        try {
            const [
                latestBlock,
                gasPrice,
                blockWithTransactions
            ] = await Promise.all([
                this.provider.getBlock('latest'),
                this.provider.getFeeData(),
                this.provider.getBlock('latest', true)
            ]);

            // Calculate TPS based on recent blocks
            const tps = await this.calculateTPS();
            
            const metrics = {
                blockNumber: latestBlock.number,
                blockTime: latestBlock.timestamp,
                gasPrice: {
                    standard: ethers.formatUnits(gasPrice.gasPrice, 'gwei'),
                    maxFee: ethers.formatUnits(gasPrice.maxFeePerGas, 'gwei'),
                    maxPriority: ethers.formatUnits(gasPrice.maxPriorityFeePerGas, 'gwei')
                },
                transactionsInLatestBlock: blockWithTransactions.transactions.length,
                estimatedTPS: tps,
                networkUtilization: this.calculateNetworkUtilization(blockWithTransactions),
                timestamp: Date.now()
            };

            this.setCachedData(cacheKey, metrics);
            return metrics;
        } catch (error) {
            console.error('Error fetching network metrics:', error);
            throw new Error(`Failed to fetch network metrics: ${error.message}`);
        }
    }

    /**
     * Get DeFi protocol metrics for Base ecosystem
     * @returns {Promise<Object>} DeFi metrics including TVL, protocols, yields
     */
    async getDeFiMetrics() {
        const cacheKey = 'defi_metrics';
        const cached = this.getCachedData(cacheKey);
        if (cached) return cached;

        try {
            // Fetch Base chain TVL data
            const tvlResponse = await axios.get(`${this.endpoints.defillama}/v2/chains`);
            const baseChainData = tvlResponse.data.find(chain => 
                chain.name.toLowerCase() === 'base'
            );

            // Fetch Base protocols
            const protocolsResponse = await axios.get(
                `${this.endpoints.defillama}/protocols`
            );
            const baseProtocols = protocolsResponse.data.filter(protocol =>
                protocol.chains && protocol.chains.includes('Base')
            );

            // Calculate metrics
            const totalTVL = baseChainData ? baseChainData.tvl : 0;
            const protocolCount = baseProtocols.length;
            const topProtocols = baseProtocols
                .sort((a, b) => b.tvl - a.tvl)
                .slice(0, 10)
                .map(p => ({
                    name: p.name,
                    tvl: p.tvl,
                    category: p.category,
                    change24h: p.change_24h
                }));

            const metrics = {
                totalTVL,
                protocolCount,
                topProtocols,
                averageTVLPerProtocol: totalTVL / protocolCount,
                dominanceIndex: this.calculateDominanceIndex(baseProtocols),
                timestamp: Date.now()
            };

            this.setCachedData(cacheKey, metrics);
            return metrics;
        } catch (error) {
            console.error('Error fetching DeFi metrics:', error);
            throw new Error(`Failed to fetch DeFi metrics: ${error.message}`);
        }
    }

    /**
     * Get Builder Rewards ecosystem metrics
     * @returns {Promise<Object>} Builder rewards data and leaderboard info
     */
    async getBuilderRewardsMetrics() {
        const cacheKey = 'builder_rewards_metrics';
        const cached = this.getCachedData(cacheKey);
        if (cached) return cached;

        try {
            // Note: This would integrate with actual Builder Rewards API
            // For now, providing structure for when API becomes available
            const metrics = {
                totalRewardsDistributed: 0, // Would fetch from API
                activeBuilders: 0,
                weeklyRewardPool: 2, // ETH
                topBuilders: [], // Would fetch leaderboard
                averageScore: 0,
                githubContributions: {
                    totalRepos: 0,
                    activeContributors: 0,
                    weeklyCommits: 0
                },
                contractDeployments: {
                    totalContracts: 0,
                    weeklyDeployments: 0,
                    gasUsed: 0
                },
                timestamp: Date.now(),
                note: 'Builder Rewards API integration pending'
            };

            this.setCachedData(cacheKey, metrics);
            return metrics;
        } catch (error) {
            console.error('Error fetching Builder Rewards metrics:', error);
            throw new Error(`Failed to fetch Builder Rewards metrics: ${error.message}`);
        }
    }

    /**
     * Get comprehensive ecosystem health score
     * @returns {Promise<Object>} Overall ecosystem health metrics
     */
    async getEcosystemHealth() {
        try {
            const [networkMetrics, defiMetrics, builderMetrics] = await Promise.all([
                this.getNetworkMetrics(),
                this.getDeFiMetrics(),
                this.getBuilderRewardsMetrics()
            ]);

            // Calculate health scores (0-100)
            const networkHealth = this.calculateNetworkHealth(networkMetrics);
            const defiHealth = this.calculateDeFiHealth(defiMetrics);
            const builderHealth = this.calculateBuilderHealth(builderMetrics);

            const overallHealth = (networkHealth + defiHealth + builderHealth) / 3;

            return {
                overallHealth: Math.round(overallHealth),
                breakdown: {
                    network: Math.round(networkHealth),
                    defi: Math.round(defiHealth),
                    builders: Math.round(builderHealth)
                },
                metrics: {
                    network: networkMetrics,
                    defi: defiMetrics,
                    builders: builderMetrics
                },
                recommendations: this.generateRecommendations(
                    networkHealth, 
                    defiHealth, 
                    builderHealth
                ),
                timestamp: Date.now()
            };
        } catch (error) {
            console.error('Error calculating ecosystem health:', error);
            throw new Error(`Failed to calculate ecosystem health: ${error.message}`);
        }
    }

    // Helper methods
    async calculateTPS() {
        try {
            const latestBlock = await this.provider.getBlock('latest');
            const previousBlock = await this.provider.getBlock(latestBlock.number - 10);
            
            const timeDiff = latestBlock.timestamp - previousBlock.timestamp;
            const blockDiff = 10;
            
            // Estimate based on average transactions per block
            const avgTxPerBlock = 50; // Base network average
            return (avgTxPerBlock * blockDiff) / timeDiff;
        } catch (error) {
            return 0; // Fallback
        }
    }

    calculateNetworkUtilization(block) {
        if (!block.gasUsed || !block.gasLimit) return 0;
        return (Number(block.gasUsed) / Number(block.gasLimit)) * 100;
    }

    calculateDominanceIndex(protocols) {
        if (protocols.length === 0) return 0;
        const totalTVL = protocols.reduce((sum, p) => sum + (p.tvl || 0), 0);
        const topProtocolTVL = Math.max(...protocols.map(p => p.tvl || 0));
        return totalTVL > 0 ? (topProtocolTVL / totalTVL) * 100 : 0;
    }

    calculateNetworkHealth(metrics) {
        // Health based on TPS, gas prices, and utilization
        let score = 100;
        
        if (metrics.estimatedTPS < 1) score -= 20;
        if (parseFloat(metrics.gasPrice.standard) > 0.1) score -= 15;
        if (metrics.networkUtilization > 90) score -= 10;
        
        return Math.max(0, score);
    }

    calculateDeFiHealth(metrics) {
        // Health based on TVL growth and protocol diversity
        let score = 100;
        
        if (metrics.totalTVL < 100000000) score -= 20; // Less than $100M
        if (metrics.protocolCount < 10) score -= 15;
        if (metrics.dominanceIndex > 50) score -= 10; // Too centralized
        
        return Math.max(0, score);
    }

    calculateBuilderHealth(metrics) {
        // Placeholder for builder ecosystem health
        return 75; // Default score until API integration
    }

    generateRecommendations(networkHealth, defiHealth, builderHealth) {
        const recommendations = [];
        
        if (networkHealth < 70) {
            recommendations.push('Network congestion detected - consider L2 scaling solutions');
        }
        if (defiHealth < 70) {
            recommendations.push('DeFi ecosystem needs more protocol diversity');
        }
        if (builderHealth < 70) {
            recommendations.push('Increase builder incentives and developer tools');
        }
        
        return recommendations;
    }

    // Cache management
    getCachedData(key) {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.data;
        }
        return null;
    }

    setCachedData(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    clearCache() {
        this.cache.clear();
    }
}

module.exports = BaseEcosystemMetrics;
