const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * Deployment script for BaseStakingRewards contract
 * Supports Base mainnet and testnet deployments
 */

async function main() {
    console.log("🚀 Starting BaseStakingRewards deployment...");
    
    // Get network information
    const network = await ethers.provider.getNetwork();
    console.log(`📡 Deploying to network: ${network.name} (Chain ID: ${network.chainId})`);
    
    // Get deployer account
    const [deployer] = await ethers.getSigners();
    console.log(`👤 Deploying with account: ${deployer.address}`);
    
    // Check deployer balance
    const balance = await deployer.getBalance();
    console.log(`💰 Account balance: ${ethers.utils.formatEther(balance)} ETH`);
    
    if (balance.lt(ethers.utils.parseEther("0.01"))) {
        console.warn("⚠️  Warning: Low balance detected. Ensure sufficient funds for deployment.");
    }
    
    // Deploy BaseStakingRewards contract
    console.log("\n📦 Deploying BaseStakingRewards contract...");
    const BaseStakingRewards = await ethers.getContractFactory("BaseStakingRewards");
    
    // Estimate gas for deployment
    const deploymentData = BaseStakingRewards.getDeployTransaction();
    const estimatedGas = await ethers.provider.estimateGas(deploymentData);
    console.log(`⛽ Estimated gas for deployment: ${estimatedGas.toString()}`);
    
    // Deploy with gas optimization for Base network
    const stakingContract = await BaseStakingRewards.deploy({
        gasLimit: estimatedGas.mul(120).div(100), // 20% buffer
    });
    
    console.log(`⏳ Deployment transaction hash: ${stakingContract.deployTransaction.hash}`);
    console.log("⏳ Waiting for deployment confirmation...");
    
    await stakingContract.deployed();
    
    console.log(`✅ BaseStakingRewards deployed to: ${stakingContract.address}`);
    
    // Verify deployment
    console.log("\n🔍 Verifying deployment...");
    const code = await ethers.provider.getCode(stakingContract.address);
    if (code === "0x") {
        throw new Error("❌ Contract deployment failed - no code at address");
    }
    console.log("✅ Contract code verified at deployment address");
    
    // Get deployment receipt
    const receipt = await stakingContract.deployTransaction.wait();
    console.log(`📊 Gas used: ${receipt.gasUsed.toString()}`);
    console.log(`💸 Transaction fee: ${ethers.utils.formatEther(receipt.gasUsed.mul(receipt.effectiveGasPrice))} ETH`);
    
    // Save deployment information
    const deploymentInfo = {
        network: network.name,
        chainId: network.chainId,
        contractAddress: stakingContract.address,
        deployerAddress: deployer.address,
        transactionHash: stakingContract.deployTransaction.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        gasPrice: receipt.effectiveGasPrice.toString(),
        timestamp: new Date().toISOString(),
        contractABI: BaseStakingRewards.interface.format("json")
    };
    
    // Create deployments directory if it doesn't exist
    const deploymentsDir = path.join(__dirname, "..", "deployments");
    if (!fs.existsSync(deploymentsDir)) {
        fs.mkdirSync(deploymentsDir, { recursive: true });
    }
    
    // Save deployment info to file
    const deploymentFile = path.join(deploymentsDir, `BaseStakingRewards-${network.name}-${Date.now()}.json`);
    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
    console.log(`📄 Deployment info saved to: ${deploymentFile}`);
    
    // Display setup instructions
    console.log("\n🎯 Next Steps:");
    console.log("1. Add staking pools using addPool() function");
    console.log("2. Transfer reward tokens to the contract");
    console.log("3. Set up monitoring and alerts");
    console.log("4. Update frontend configuration with new contract address");
    
    // Example pool setup for Base ecosystem tokens
    console.log("\n💡 Example Pool Setup:");
    console.log("// Add a pool for BASE token staking");
    console.log(`await stakingContract.addPool(`);
    console.log(`  "0x...", // BASE token address`);
    console.log(`  "0x...", // Reward token address`);
    console.log(`  ethers.utils.parseEther("1"), // 1 token per second reward rate`);
    console.log(`  ethers.utils.parseEther("10"), // Minimum 10 tokens to stake`);
    console.log(`  86400 // 1 day lock period`);
    console.log(`);`);
    
    // Network-specific instructions
    if (network.chainId === 8453) { // Base mainnet
        console.log("\n🌐 Base Mainnet Deployment Complete!");
        console.log("- Consider setting up Tenderly monitoring");
        console.log("- Add contract to Base ecosystem documentation");
        console.log("- Submit for Base ecosystem grants if applicable");
    } else if (network.chainId === 84531) { // Base Goerli testnet
        console.log("\n🧪 Base Testnet Deployment Complete!");
        console.log("- Test all functions thoroughly before mainnet");
        console.log("- Use Base testnet faucet for testing tokens");
    }
    
    return {
        contract: stakingContract,
        address: stakingContract.address,
        deploymentInfo
    };
}

// Handle deployment errors
main()
    .then((result) => {
        console.log("\n🎉 Deployment completed successfully!");
        console.log(`📍 Contract Address: ${result.address}`);
        process.exit(0);
    })
    .catch((error) => {
        console.error("\n❌ Deployment failed:");
        console.error(error);
        process.exit(1);
    });

// Export for use in other scripts
module.exports = { main };
