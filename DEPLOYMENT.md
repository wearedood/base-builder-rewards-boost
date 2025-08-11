docs/API.md# BaseRewards API Documentation

## Overview

The BaseRewards smart contract provides a comprehensive API for managing builder rewards on the Base network. This documentation covers all available functions, events, and integration patterns.

## Contract Address

- **Mainnet**: `TBD` (To be deployed)
- **Testnet**: `TBD` (To be deployed)
- **Network**: Base (Chain ID: 8453)

## Core Functions

### Builder Management

#### `registerBuilder(address builder)`

**Description**: Registers a new builder in the rewards program.

**Parameters**:
- `builder` (address): The wallet address of the builder to register

**Access**: Owner only

**Events Emitted**: `BuilderRegistered(address indexed builder)`

**Example**:
```javascript
const tx = await baseRewards.registerBuilder("0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b9");
await tx.wait();
```

#### `isRegisteredBuilder(address builder) # BaseRewards API Documentation

## Overview

The BaseRewards smart contract provides a comprehensive API for managing builder rewards on the Base network.

## Contract Address

- **Network**: Base (Chain ID: 8453)
- **Mainnet**: TBD (To be deployed)
- **Testnet**: TBD (To be deployed)

## Core Functions

### Builder Management

#### `registerBuilder(address builder)`

Registers a new builder in the rewards program.

**Parameters**:
- `builder` (address): The wallet address of the builder

**Access**: Owner only

**Events**: `BuilderRegistered(address indexed builder)`

```javascript
const tx = await baseRewards.registerBuilder(builderAddress);
await tx.wait();
```

#### `isRegisteredBuilder(address builder) # BaseRewards API Documentation

## Overview

The BaseRewards smart contract provides a comprehensive API for managing builder rewards on the Base network.

## Contract Functions

### registerBuilder(address builder)
Registers a new builder in the rewards program.
- Access: Owner only
- Events: BuilderRegistered

### updateBuilderScore(address builder, uint256 newScore)  
Updates a builder's activity score.
- Access: Owner only
- Events: ScoreUpdated

### claimRewards()
Allows registered builders to claim pending rewards.
- Access: Registered builders only
- Events: RewardsClaimed

### calculatePendingRewards(address builder)
Calculates pending rewards for a builder.

## Integration Example

```javascript
const { ethers } = require('ethers');
const provider = new ethers.providers.JsonRpcProvider('https://mainnet.base.org');
const baseRewards = new ethers.Contract(contractAddress, contractABI, provider);

// Check if registered
const isRegistered = await baseRewards.isRegisteredBuilder(userAddress);

// Get current score
const score = await baseRewards.builderScores(userAddress);

// Calculate pending rewards
const pending = await baseRewards.calculatePendingRewards(userAddress);

// Claim rewards (with signer)
const signer = new ethers.Wallet(privateKey, provider);
const contract = baseRewards.connect(signer);
const tx = await contract.claimRewards();
await tx.wait();# BaseRewards Deployment Guide

## Prerequisites

- Node.js v16+ installed
- Hardhat development environment
- Base network RPC access
- Wallet with ETH for gas fees
- BaseScan API key for verification

## Installation

```bash
npm install
# or
yarn install
```

## Environment Setup

Create a `.env` file in the root directory:

```env
PRIVATE_KEY=your_private_key_here
BASE_RPC_URL=https://mainnet.base.org
BASE_GOERLI_RPC_URL=https://goerli.base.org
BASESCAN_API_KEY=your_basescan_api_key
```

## Compilation

```bash
npx hardhat compile
```

## Testing

Run the test suite before deployment:

```bash
npx hardhat test
```

## Deployment

### Deploy to Base Goerli (Testnet)

```bash
npx hardhat run scripts/deploy.js --network base-goerli
```

### Deploy to Base Mainnet

```bash
npx hardhat run scripts/deploy.js --network base-mainnet
```

## Post-Deployment Steps

1. **Verify Contract**
   ```bash
   npx hardhat verify --network base-mainnet CONTRACT_ADDRESS INITIAL_SUPPLY REWARD_RATE
   ```

2. **Register Initial Builders**
   ```bash
   npx hardhat run scripts/register-builders.js --network base-mainnet
   ```

3. **Set Initial Scores**
   ```bash
   npx hardhat run scripts/set-scores.js --network base-mainnet
   ```

## Configuration Parameters

- **Initial Supply**: 1,000,000 tokens (1e24 wei)
- **Reward Rate**: 100 tokens per score point (1e20 wei)
- **Decimals**: 18 (standard ERC20)

## Network Configuration

### Base Mainnet
- Chain ID: 8453
- RPC URL: https://mainnet.base.org
- Block Explorer: https://basescan.org

### Base Goerli Testnet  
- Chain ID: 84531
- RPC URL: https://goerli.base.org
- Block Explorer: https://goerli.basescan.org

## Gas Optimization

- Use appropriate gas limits for each function
- Consider batch operations for multiple builders
- Monitor gas prices on Base network
- Use multicall for efficient batch updates

## Security Checklist

- [ ] Private keys stored securely
- [ ] Contract verified on BaseScan
- [ ] Owner address confirmed
- [ ] Initial parameters validated
- [ ] Access controls tested
- [ ] Emergency procedures documented

## Monitoring

After deployment, monitor:

- Contract balance and token distribution
- Builder registration events
- Score update frequency
- Reward claim patterns
- Gas usage optimization opportunities

## Troubleshooting

### Common Issues

1. **Insufficient Gas**
   - Increase gas limit in hardhat.config.js
   - Check current Base network gas prices

2. **RPC Connection Issues**
   - Verify RPC URL in .env file
   - Try alternative RPC endpoints

3. **Verification Failures**
   - Ensure constructor parameters match deployment
   - Check BaseScan API key validity

### Support Resources

- [Base Documentation](https://docs.base.org)
- [Hardhat Documentation](https://hardhat.org/docs)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts)

## Upgrade Path

For future upgrades:

1. Deploy new contract version
2. Migrate builder data if needed
3. Update frontend integrations
4. Communicate changes to builders

---

*Deployment guide for BaseRewards v1.0.0*
*Base Builder Rewards Program*
```

## Gas Estimates

- registerBuilder: ~50,000 gas
- updateBuilderScore: ~45,000 gas  
- claimRewards: ~65,000 gas
- View functions: ~25,000 gas

## Security Features

- Access control for admin functions
- Reentrancy protection
- Integer overflow protection
- Comprehensive event logging

---

Base Builder Rewards API v1.0.0
