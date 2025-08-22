  const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("BaseLiquidityManager", function () {
  async function deployBaseLiquidityManagerFixture() {
    const [owner, user1, user2, user3] = await ethers.getSigners();

    // Deploy mock tokens
    const MockToken = await ethers.getContractFactory("MockERC20");
    const tokenA = await MockToken.deploy("Token A", "TKNA", ethers.utils.parseEther("1000000"));
    const tokenB = await MockToken.deploy("Token B", "TKNB", ethers.utils.parseEther("1000000"));

    // Deploy BaseLiquidityManager
    const BaseLiquidityManager = await ethers.getContractFactory("BaseLiquidityManager");
    const liquidityManager = await BaseLiquidityManager.deploy();

    // Transfer tokens to users
    await tokenA.transfer(user1.address, ethers.utils.parseEther("10000"));
    await tokenA.transfer(user2.address, ethers.utils.parseEther("10000"));
    await tokenB.transfer(user1.address, ethers.utils.parseEther("10000"));
    await tokenB.transfer(user2.address, ethers.utils.parseEther("10000"));

    return { liquidityManager, tokenA, tokenB, owner, user1, user2, user3 };
  }

  describe("Deployment", function () {
    it("Should deploy with correct initial state", async function () {
      const { liquidityManager } = await loadFixture(deployBaseLiquidityManagerFixture);
      
      expect(await liquidityManager.poolCount()).to.equal(0);
      expect(await liquidityManager.totalValueLocked()).to.equal(0);
      expect(await liquidityManager.MAX_FEE_RATE()).to.equal(1000);
      expect(await liquidityManager.PRECISION()).to.equal(ethers.utils.parseEther("1"));
    });

    it("Should set correct Base network parameters", async function () {
      const { liquidityManager } = await loadFixture(deployBaseLiquidityManagerFixture);
      
      expect(await liquidityManager.BASE_GAS_LIMIT()).to.equal(30000000);
      expect(await liquidityManager.baseFeeMultiplier()).to.equal(110);
    });
  });

  describe("Pool Creation", function () {
    it("Should create a new pool successfully", async function () {
      const { liquidityManager, tokenA, tokenB, owner } = await loadFixture(deployBaseLiquidityManagerFixture);
      
      const feeRate = 300; // 3%
      await expect(liquidityManager.connect(owner).createPool(tokenA.address, tokenB.address, feeRate))
        .to.emit(liquidityManager, "PoolCreated")
        .withArgs(0, tokenA.address, tokenB.address, feeRate);

      const poolInfo = await liquidityManager.getPoolInfo(0);
      expect(poolInfo.tokenA).to.equal(tokenA.address);
      expect(poolInfo.tokenB).to.equal(tokenB.address);
      expect(poolInfo.feeRate).to.equal(feeRate);
      expect(poolInfo.active).to.be.true;
    });

    it("Should reject pool creation with invalid parameters", async function () {
      const { liquidityManager, tokenA, tokenB, owner } = await loadFixture(deployBaseLiquidityManagerFixture);
      
      // Invalid token addresses
      await expect(liquidityManager.connect(owner).createPool(ethers.constants.AddressZero, tokenB.address, 300))
        .to.be.revertedWith("Invalid token addresses");

      // Same token addresses
      await expect(liquidityManager.connect(owner).createPool(tokenA.address, tokenA.address, 300))
        .to.be.revertedWith("Tokens must be different");

      // Fee rate too high
      await expect(liquidityManager.connect(owner).createPool(tokenA.address, tokenB.address, 1001))
        .to.be.revertedWith("Fee rate too high");
    });

    it("Should only allow owner to create pools", async function () {
      const { liquidityManager, tokenA, tokenB, user1 } = await loadFixture(deployBaseLiquidityManagerFixture);
      
      await expect(liquidityManager.connect(user1).createPool(tokenA.address, tokenB.address, 300))
        .to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Liquidity Management", function () {
    beforeEach(async function () {
      const fixture = await loadFixture(deployBaseLiquidityManagerFixture);
      this.liquidityManager = fixture.liquidityManager;
      this.tokenA = fixture.tokenA;
      this.tokenB = fixture.tokenB;
      this.owner = fixture.owner;
      this.user1 = fixture.user1;
      this.user2 = fixture.user2;

      // Create a pool
      await this.liquidityManager.connect(this.owner).createPool(this.tokenA.address, this.tokenB.address, 300);
    });

    it("Should add liquidity successfully", async function () {
      const amountA = ethers.utils.parseEther("100");
      const amountB = ethers.utils.parseEther("100");
      const lockDuration = 86400; // 1 day

      // Approve tokens
      await this.tokenA.connect(this.user1).approve(this.liquidityManager.address, amountA);
      await this.tokenB.connect(this.user1).approve(this.liquidityManager.address, amountB);

      await expect(this.liquidityManager.connect(this.user1).addLiquidity(0, amountA, amountB, 0, lockDuration))
        .to.emit(this.liquidityManager, "LiquidityAdded");

      const poolInfo = await this.liquidityManager.getPoolInfo(0);
      expect(poolInfo.reserveA).to.equal(amountA);
      expect(poolInfo.reserveB).to.equal(amountB);
    });

    it("Should calculate shares correctly for initial liquidity", async function () {
      const amountA = ethers.utils.parseEther("100");
      const amountB = ethers.utils.parseEther("200");
      const lockDuration = 86400;

      await this.tokenA.connect(this.user1).approve(this.liquidityManager.address, amountA);
      await this.tokenB.connect(this.user1).approve(this.liquidityManager.address, amountB);

      await this.liquidityManager.connect(this.user1).addLiquidity(0, amountA, amountB, 0, lockDuration);

      const userPosition = await this.liquidityManager.userPositions(0, this.user1.address);
      const expectedShares = ethers.utils.parseEther("141.421356237309504880"); // sqrt(100 * 200)
      expect(userPosition.shares).to.be.closeTo(expectedShares, ethers.utils.parseEther("0.1"));
    });

    it("Should remove liquidity successfully after lock period", async function () {
      const amountA = ethers.utils.parseEther("100");
      const amountB = ethers.utils.parseEther("100");
      const lockDuration = 1; // 1 second for testing

      // Add liquidity
      await this.tokenA.connect(this.user1).approve(this.liquidityManager.address, amountA);
      await this.tokenB.connect(this.user1).approve(this.liquidityManager.address, amountB);
      await this.liquidityManager.connect(this.user1).addLiquidity(0, amountA, amountB, 0, lockDuration);

      // Wait for lock period
      await ethers.provider.send("evm_increaseTime", [2]);
      await ethers.provider.send("evm_mine");

      const userPosition = await this.liquidityManager.userPositions(0, this.user1.address);
      const shares = userPosition.shares;

      const balanceABefore = await this.tokenA.balanceOf(this.user1.address);
      const balanceBBefore = await this.tokenB.balanceOf(this.user1.address);

      await expect(this.liquidityManager.connect(this.user1).removeLiquidity(0, shares, 0, 0))
        .to.emit(this.liquidityManager, "LiquidityRemoved");

      const balanceAAfter = await this.tokenA.balanceOf(this.user1.address);
      const balanceBAfter = await this.tokenB.balanceOf(this.user1.address);

      expect(balanceAAfter.sub(balanceABefore)).to.equal(amountA);
      expect(balanceBAfter.sub(balanceBBefore)).to.equal(amountB);
    });

    it("Should reject liquidity removal during lock period", async function () {
      const amountA = ethers.utils.parseEther("100");
      const amountB = ethers.utils.parseEther("100");
      const lockDuration = 86400; // 1 day

      await this.tokenA.connect(this.user1).approve(this.liquidityManager.address, amountA);
      await this.tokenB.connect(this.user1).approve(this.liquidityManager.address, amountB);
      await this.liquidityManager.connect(this.user1).addLiquidity(0, amountA, amountB, 0, lockDuration);

      const userPosition = await this.liquidityManager.userPositions(0, this.user1.address);
      const shares = userPosition.shares;

      await expect(this.liquidityManager.connect(this.user1).removeLiquidity(0, shares, 0, 0))
        .to.be.revertedWith("Position still locked");
    });
  });

  describe("Yield Strategies", function () {
    beforeEach(async function () {
      const fixture = await loadFixture(deployBaseLiquidityManagerFixture);
      this.liquidityManager = fixture.liquidityManager;
      this.tokenA = fixture.tokenA;
      this.tokenB = fixture.tokenB;
      this.owner = fixture.owner;
      this.user1 = fixture.user1;

      await this.liquidityManager.connect(this.owner).createPool(this.tokenA.address, this.tokenB.address, 300);
    });

    it("Should add yield strategy successfully", async function () {
      const protocolAddress = this.user1.address; // Mock protocol
      const allocation = 5000; // 50%
      const minDeposit = ethers.utils.parseEther("10");
      const maxDeposit = ethers.utils.parseEther("1000");

      await expect(this.liquidityManager.connect(this.owner).addYieldStrategy(0, protocolAddress, allocation, minDeposit, maxDeposit))
        .to.emit(this.liquidityManager, "StrategyAdded")
        .withArgs(0, protocolAddress, allocation);
    });

    it("Should reject invalid yield strategy parameters", async function () {
      // Invalid protocol address
      await expect(this.liquidityManager.connect(this.owner).addYieldStrategy(0, ethers.constants.AddressZero, 5000, 0, 0))
        .to.be.revertedWith("Invalid protocol address");

      // Allocation too high
      await expect(this.liquidityManager.connect(this.owner).addYieldStrategy(0, this.user1.address, 10001, 0, 0))
        .to.be.revertedWith("Allocation too high");

      // Non-existent pool
      await expect(this.liquidityManager.connect(this.owner).addYieldStrategy(999, this.user1.address, 5000, 0, 0))
        .to.be.revertedWith("Pool does not exist");
    });
  });

  describe("Rebalancing", function () {
    beforeEach(async function () {
      const fixture = await loadFixture(deployBaseLiquidityManagerFixture);
      this.liquidityManager = fixture.liquidityManager;
      this.tokenA = fixture.tokenA;
      this.tokenB = fixture.tokenB;
      this.owner = fixture.owner;
      this.user1 = fixture.user1;

      await this.liquidityManager.connect(this.owner).createPool(this.tokenA.address, this.tokenB.address, 300);
    });

    it("Should execute rebalancing when threshold is exceeded", async function () {
      // Add initial liquidity
      const amountA = ethers.utils.parseEther("100");
      const amountB = ethers.utils.parseEther("100");
      
      await this.tokenA.connect(this.user1).approve(this.liquidityManager.address, amountA);
      await this.tokenB.connect(this.user1).approve(this.liquidityManager.address, amountB);
      await this.liquidityManager.connect(this.user1).addLiquidity(0, amountA, amountB, 0, 1);

      // Test rebalancing (this would need more complex setup in real scenario)
      await expect(this.liquidityManager.rebalancePool(0))
        .to.not.be.reverted;
    });
  });

  describe("Emergency Functions", function () {
    beforeEach(async function () {
      const fixture = await loadFixture(deployBaseLiquidityManagerFixture);
      this.liquidityManager = fixture.liquidityManager;
      this.tokenA = fixture.tokenA;
      this.owner = fixture.owner;
      this.user1 = fixture.user1;
    });

    it("Should pause and unpause contract", async function () {
      await this.liquidityManager.connect(this.owner).pause();
      expect(await this.liquidityManager.paused()).to.be.true;

      await this.liquidityManager.connect(this.owner).unpause();
      expect(await this.liquidityManager.paused()).to.be.false;
    });

    it("Should allow emergency withdrawal by owner", async function () {
      const amount = ethers.utils.parseEther("100");
      await this.tokenA.transfer(this.liquidityManager.address, amount);

      const balanceBefore = await this.tokenA.balanceOf(this.owner.address);
      await this.liquidityManager.connect(this.owner).emergencyWithdraw(this.tokenA.address, amount);
      const balanceAfter = await this.tokenA.balanceOf(this.owner.address);

      expect(balanceAfter.sub(balanceBefore)).to.equal(amount);
    });

    it("Should reject emergency functions from non-owner", async function () {
      await expect(this.liquidityManager.connect(this.user1).pause())
        .to.be.revertedWith("Ownable: caller is not the owner");

      await expect(this.liquidityManager.connect(this.user1).emergencyWithdraw(this.tokenA.address, 100))
        .to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Gas Optimization Tests", function () {
    it("Should use Base network gas optimizations", async function () {
      const { liquidityManager, tokenA, tokenB, owner, user1 } = await loadFixture(deployBaseLiquidityManagerFixture);
      
      // Create pool
      await liquidityManager.connect(owner).createPool(tokenA.address, tokenB.address, 300);
      
      // Test gas usage for liquidity operations
      const amountA = ethers.utils.parseEther("100");
      const amountB = ethers.utils.parseEther("100");
      
      await tokenA.connect(user1).approve(liquidityManager.address, amountA);
      await tokenB.connect(user1).approve(liquidityManager.address, amountB);
      
      const tx = await liquidityManager.connect(user1).addLiquidity(0, amountA, amountB, 0, 1);
      const receipt = await tx.wait();
      
      // Verify gas usage is within Base network limits
      expect(receipt.gasUsed).to.be.below(await liquidityManager.BASE_GAS_LIMIT());
    });
  });

  describe("Integration Tests", function () {
    it("Should handle multiple users and complex scenarios", async function () {
      const { liquidityManager, tokenA, tokenB, owner, user1, user2 } = await loadFixture(deployBaseLiquidityManagerFixture);
      
      // Create pool
      await liquidityManager.connect(owner).createPool(tokenA.address, tokenB.address, 300);
      
      // Multiple users add liquidity
      const amount1A = ethers.utils.parseEther("100");
      const amount1B = ethers.utils.parseEther("100");
      const amount2A = ethers.utils.parseEther("200");
      const amount2B = ethers.utils.parseEther("200");
      
      // User 1 adds liquidity
      await tokenA.connect(user1).approve(liquidityManager.address, amount1A);
      await tokenB.connect(user1).approve(liquidityManager.address, amount1B);
      await liquidityManager.connect(user1).addLiquidity(0, amount1A, amount1B, 0, 1);
      
      // User 2 adds liquidity
      await tokenA.connect(user2).approve(liquidityManager.address, amount2A);
      await tokenB.connect(user2).approve(liquidityManager.address, amount2B);
      await liquidityManager.connect(user2).addLiquidity(0, amount2A, amount2B, 0, 1);
      
      // Verify total reserves
      const poolInfo = await liquidityManager.getPoolInfo(0);
      expect(poolInfo.reserveA).to.equal(amount1A.add(amount2A));
      expect(poolInfo.reserveB).to.equal(amount1B.add(amount2B));
      
      // Verify TVL
      const expectedTVL = amount1A.add(amount1B).add(amount2A).add(amount2B);
      expect(await liquidityManager.totalValueLocked()).to.equal(expectedTVL);
    });
  });
});
