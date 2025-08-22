/**
 * Base Network Utilities
 * Comprehensive utilities for interacting with Base blockchain
 * Optimized for Base Builder Rewards ecosystem
 */

const { ethers } = require("ethers");

// Base Network Configuration
const BASE_NETWORKS = {
    mainnet: {
        chainId: 8453,
        name: "Base",
        rpcUrl: "https://mainnet.base.org",
        explorerUrl: "https://basescan.org",
        nativeCurrency: {
            name: "Ethereum",
            symbol: "ETH",
            decimals: 18
        },
        multicallAddress: "0xcA11bde05977b3631167028862bE2a173976CA11"
    },
    testnet: {
        chainId: 84531,
        name: "Base Goerli",
        rpcUrl: "https://goerli.base.org",
        explorerUrl: "https://goerli.basescan.org",
        nativeCurrency: {
            name: "Ethereum",
            symbol: "ETH",
            decimals: 18
        },
        multicallAddress: "0xcA11bde05977b3631167028862bE2a173976CA11"
    }
};

// Common Base ecosystem token addresses
const BASE_TOKENS = {
    mainnet: {
        USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        WETH: "0x4200000000000000000000000000000000000006",
        cbETH: "0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22",
        // Add more as ecosystem grows
    },
    testnet: {
        USDC: "0xF175520C52418dfE19C8098071a252da48Cd1C19",
        WETH: "0x4200000000000000000000000000000000000006",
        // Testnet addresses
    }
};

class BaseNetworkUtils {
    constructor(network = "mainnet") {
        this.network = network;
        this.config = BASE_NETWORKS[network];
        
        if (!this.config) {
            throw new Error(`Unsupported network: ${network}`);
        }
        
        this.provider = new ethers.providers.JsonRpcProvider(this.config.rpcUrl);
        this.tokens = BASE_TOKENS[network] || {};
    }

    /**
     * Get network configuration
     */
    getNetworkConfig() {
        return this.config;
    }

    /**
     * Get provider instance
     */
    getProvider() {
        return this.provider;
    }

    /**
     * Check if connected to correct network
     */
    async validateNetwork() {
        try {
            const network = await this.provider.getNetwork();
            return network.chainId === this.config.chainId;
        } catch (error) {
            console.error("Network validation failed:", error);
            return false;
        }
    }

    /**
     * Get current gas price with Base optimization
     */
    async getOptimizedGasPrice() {
        try {
            const gasPrice = await this.provider.getGasPrice();
            // Base typically has lower gas prices, but add small buffer
            return gasPrice.mul(110).div(100); // 10% buffer
        } catch (error) {
            console.error("Failed to get gas price:", error);
            // Fallback gas price for Base (typically very low)
            return ethers.utils.parseUnits("0.001", "gwei");
        }
    }

    /**
     * Estimate gas with Base-specific optimizations
     */
    async estimateGasOptimized(transaction) {
        try {
            const estimate = await this.provider.estimateGas(transaction);
            // Add buffer for Base network
            return estimate.mul(120).div(100); // 20% buffer
        } catch (error) {
            console.error("Gas estimation failed:", error);
            throw error;
        }
    }

    /**
     * Get token information
     */
    getTokenAddress(symbol) {
        return this.tokens[symbol.toUpperCase()];
    }

    /**
     * Get all supported tokens
     */
    getSupportedTokens() {
        return Object.keys(this.tokens);
    }

    /**
     * Create ERC20 token contract instance
     */
    getTokenContract(tokenAddress, signer = null) {
        const abi = [
            "function name() view returns (string)",
            "function symbol() view returns (string)",
            "function decimals() view returns (uint8)",
            "function totalSupply() view returns (uint256)",
            "function balanceOf(address) view returns (uint256)",
            "function allowance(address owner, address spender) view returns (uint256)",
            "function transfer(address to, uint256 amount) returns (bool)",
            "function approve(address spender, uint256 amount) returns (bool)",
            "function transferFrom(address from, address to, uint256 amount) returns (bool)"
        ];
        
        const providerOrSigner = signer || this.provider;
        return new ethers.Contract(tokenAddress, abi, providerOrSigner);
    }

    /**
     * Get token balance for an address
     */
    async getTokenBalance(tokenAddress, userAddress) {
        try {
            const contract = this.getTokenContract(tokenAddress);
            const balance = await contract.balanceOf(userAddress);
            const decimals = await contract.decimals();
            
            return {
                raw: balance,
                formatted: ethers.utils.formatUnits(balance, decimals),
                decimals
            };
        } catch (error) {
            console.error("Failed to get token balance:", error);
            throw error;
        }
    }

    /**
     * Get ETH balance for an address
     */
    async getETHBalance(address) {
        try {
            const balance = await this.provider.getBalance(address);
            return {
                raw: balance,
                formatted: ethers.utils.formatEther(balance)
            };
        } catch (error) {
            console.error("Failed to get ETH balance:", error);
            throw error;
        }
    }

    /**
     * Wait for transaction confirmation with Base-specific settings
     */
    async waitForTransaction(txHash, confirmations = 1) {
        try {
            console.log(`⏳ Waiting for transaction: ${txHash}`);
            const receipt = await this.provider.waitForTransaction(txHash, confirmations);
            
            if (receipt.status === 1) {
                console.log(`✅ Transaction confirmed: ${this.config.explorerUrl}/tx/${txHash}`);
                return receipt;
            } else {
                throw new Error("Transaction failed");
            }
        } catch (error) {
            console.error("Transaction failed:", error);
            throw error;
        }
    }

    /**
     * Get transaction details
     */
    async getTransactionDetails(txHash) {
        try {
            const [tx, receipt] = await Promise.all([
                this.provider.getTransaction(txHash),
                this.provider.getTransactionReceipt(txHash)
            ]);

            return {
                transaction: tx,
                receipt: receipt,
                explorerUrl: `${this.config.explorerUrl}/tx/${txHash}`,
                gasUsed: receipt?.gasUsed,
                gasPrice: tx?.gasPrice,
                cost: receipt?.gasUsed?.mul(tx?.gasPrice || 0)
            };
        } catch (error) {
            console.error("Failed to get transaction details:", error);
            throw error;
        }
    }

    /**
     * Check if address is a contract
     */
    async isContract(address) {
        try {
            const code = await this.provider.getCode(address);
            return code !== "0x";
        } catch (error) {
            console.error("Failed to check if address is contract:", error);
            return false;
        }
    }

    /**
     * Get current block information
     */
    async getCurrentBlock() {
        try {
            const blockNumber = await this.provider.getBlockNumber();
            const block = await this.provider.getBlock(blockNumber);
            
            return {
                number: blockNumber,
                timestamp: block.timestamp,
                hash: block.hash,
                gasLimit: block.gasLimit,
                gasUsed: block.gasUsed
            };
        } catch (error) {
            console.error("Failed to get current block:", error);
            throw error;
        }
    }

    /**
     * Format address for display
     */
    formatAddress(address, chars = 4) {
        if (!address) return "";
        return `${address.slice(0, 2 + chars)}...${address.slice(-chars)}`;
    }

    /**
     * Validate Ethereum address
     */
    isValidAddress(address) {
        return ethers.utils.isAddress(address);
    }

    /**
     * Convert between units
     */
    parseUnits(value, decimals = 18) {
        return ethers.utils.parseUnits(value.toString(), decimals);
    }

    formatUnits(value, decimals = 18) {
        return ethers.utils.formatUnits(value, decimals);
    }

    /**
     * Get Base ecosystem metrics
     */
    async getEcosystemMetrics() {
        try {
            const block = await this.getCurrentBlock();
            const gasPrice = await this.getOptimizedGasPrice();
            
            return {
                network: this.config.name,
                chainId: this.config.chainId,
                currentBlock: block.number,
                blockTime: block.timestamp,
                gasPrice: this.formatUnits(gasPrice, "gwei"),
                explorerUrl: this.config.explorerUrl,
                supportedTokens: this.getSupportedTokens().length
            };
        } catch (error) {
            console.error("Failed to get ecosystem metrics:", error);
            throw error;
        }
    }

    /**
     * Batch multiple calls using multicall (if available)
     */
    async batchCall(calls) {
        // Implementation would depend on multicall contract availability
        // For now, execute calls sequentially
        const results = [];
        
        for (const call of calls) {
            try {
                const result = await call();
                results.push({ success: true, data: result });
            } catch (error) {
                results.push({ success: false, error: error.message });
            }
        }
        
        return results;
    }

    /**
     * Monitor Base network health
     */
    async getNetworkHealth() {
        try {
            const startTime = Date.now();
            const block = await this.getCurrentBlock();
            const responseTime = Date.now() - startTime;
            
            const timeSinceLastBlock = Date.now() / 1000 - block.timestamp;
            
            return {
                responsive: responseTime < 5000, // 5 second threshold
                responseTime,
                lastBlockAge: timeSinceLastBlock,
                healthy: responseTime < 5000 && timeSinceLastBlock < 60, // 1 minute threshold
                currentBlock: block.number
            };
        } catch (error) {
            return {
                responsive: false,
                healthy: false,
                error: error.message
            };
        }
    }
}

// Export utility functions
module.exports = {
    BaseNetworkUtils,
    BASE_NETWORKS,
    BASE_TOKENS,
    
    // Convenience functions
    createBaseProvider: (network = "mainnet") => {
        const config = BASE_NETWORKS[network];
        if (!config) throw new Error(`Unsupported network: ${network}`);
        return new ethers.providers.JsonRpcProvider(config.rpcUrl);
    },
    
    getBaseExplorerUrl: (network = "mainnet") => {
        const config = BASE_NETWORKS[network];
        return config?.explorerUrl || "https://basescan.org";
    },
    
    isBaseNetwork: (chainId) => {
        return Object.values(BASE_NETWORKS).some(network => network.chainId === chainId);
    }
};
