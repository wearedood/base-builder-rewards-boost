const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("BaseStakingRewards", function () {
    let stakingContract;
    let stakingToken;
    let rewardToken;
    let owner;
    let user1;
    let user2;
    
    const REWARD_PER_SECOND = ethers.utils.parseEther("1");
    const MIN_STAKE_AMOUNT = ethers.utils.parseEther("10");
    const LOCK_PERIOD = 86400; // 1 day
    const INITIAL_SUPPLY = ethers.utils.parseEther("1000000");

    beforeEach(async function () {
        [owner, user1, user2] = await ethers.getSigners();

        // Deploy mock ERC20 tokens
        const MockERC20 = await ethers.getContractFactory("MockERC20");
        stakingToken = await MockERC20.deploy("Staking Token", "STAKE", INITIAL_SUPPLY);
        rewardToken = await MockERC20.deploy("Reward Token", "REWARD", INITIAL_SUPPLY);

        // Deploy staking contract
        const BaseStakingRewards = await ethers.getContractFactory("BaseStakingRewards");
        stakingContract = await BaseStakingRewards.deploy();

        // Transfer tokens to users
        await stakingToken.transfer(user1.address, ethers.utils.parseEther("10000"));
        await stakingToken.transfer(user2.address, ethers.utils.parseEther("10000"));
        
        // Transfer reward tokens to staking contract
        await rewardToken.transfer(stakingContract.address, ethers.utils.parseEther("100000"));

        // Add a staking pool
        await stakingContract.addPool(
            stakingToken.address,
            rewardToken.address,
            REWARD_PER_SECOND,
            MIN_STAKE_AMOUNT,
            LOCK_PERIOD
        );
    });

    describe("Pool Management", function () {
        it("Should add a new pool correctly", async function () {
            const poolInfo = await stakingContract.poolInfo(0);
            expect(poolInfo.stakingToken).to.equal(stakingToken.address);
            expect(poolInfo.rewardToken).to.equal(rewardToken.address);
            expect(poolInfo.rewardPerSecond).to.equal(REWARD_PER_SECOND);
            expect(poolInfo.minStakeAmount).to.equal(MIN_STAKE_AMOUNT);
            expect(poolInfo.lockPeriod).to.equal(LOCK_PERIOD);
        });

        it("Should update reward rate", async function () {
            const newRate = ethers.utils.parseEther("2");
            await stakingContract.updateRewardRate(0, newRate);
            
            const poolInfo = await stakingContract.poolInfo(0);
            expect(poolInfo.rewardPerSecond).to.equal(newRate);
        });

        it("Should only allow owner to add pools", async function () {
            await expect(
                stakingContract.connect(user1).addPool(
                    stakingToken.address,
                    rewardToken.address,
                    REWARD_PER_SECOND,
                    MIN_STAKE_AMOUNT,
                    LOCK_PERIOD
                )
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });
    });

    describe("Staking", function () {
        beforeEach(async function () {
            // Approve staking contract to spend tokens
            await stakingToken.connect(user1).approve(
                stakingContract.address, 
                ethers.utils.parseEther("1000")
            );
            await stakingToken.connect(user2).approve(
                stakingContract.address, 
                ethers.utils.parseEther("1000")
            );
        });

        it("Should allow users to stake tokens", async function () {
            const stakeAmount = ethers.utils.parseEther("100");
            
            await stakingContract.connect(user1).deposit(0, stakeAmount);
            
            const userInfo = await stakingContract.userInfo(0, user1.address);
            expect(userInfo.amount).to.equal(stakeAmount);
            expect(userInfo.active).to.be.true;
            
            const poolInfo = await stakingContract.poolInfo(0);
            expect(poolInfo.totalStaked).to.equal(stakeAmount);
        });

        it("Should reject stakes below minimum amount", async function () {
            const stakeAmount = ethers.utils.parseEther("5"); // Below minimum
            
            await expect(
                stakingContract.connect(user1).deposit(0, stakeAmount)
            ).to.be.revertedWith("Amount below minimum stake");
        });

        it("Should calculate pending rewards correctly", async function () {
            const stakeAmount = ethers.utils.parseEther("100");
            
            await stakingContract.connect(user1).deposit(0, stakeAmount);
            
            // Fast forward time
            await time.increase(3600); // 1 hour
            
            const pendingReward = await stakingContract.pendingReward(0, user1.address);
            const expectedReward = REWARD_PER_SECOND.mul(3600);
            
            expect(pendingReward).to.be.closeTo(expectedReward, ethers.utils.parseEther("1"));
        });

        it("Should handle multiple stakers correctly", async function () {
            const stakeAmount1 = ethers.utils.parseEther("100");
            const stakeAmount2 = ethers.utils.parseEther("200");
            
            await stakingContract.connect(user1).deposit(0, stakeAmount1);
            await time.increase(1800); // 30 minutes
            await stakingContract.connect(user2).deposit(0, stakeAmount2);
            await time.increase(1800); // Another 30 minutes
            
            const pending1 = await stakingContract.pendingReward(0, user1.address);
            const pending2 = await stakingContract.pendingReward(0, user2.address);
            
            // User1 should have more rewards as they staked earlier
            expect(pending1).to.be.gt(pending2);
        });
    });

    describe("Withdrawals", function () {
        beforeEach(async function () {
            await stakingToken.connect(user1).approve(
                stakingContract.address, 
                ethers.utils.parseEther("1000")
            );
            
            const stakeAmount = ethers.utils.parseEther("100");
            await stakingContract.connect(user1).deposit(0, stakeAmount);
        });

        it("Should prevent withdrawal before lock period", async function () {
            const withdrawAmount = ethers.utils.parseEther("50");
            
            await expect(
                stakingContract.connect(user1).withdraw(0, withdrawAmount)
            ).to.be.revertedWith("Tokens still locked");
        });

        it("Should allow withdrawal after lock period", async function () {
            const withdrawAmount = ethers.utils.parseEther("50");
            
            // Fast forward past lock period
            await time.increase(LOCK_PERIOD + 1);
            
            const balanceBefore = await stakingToken.balanceOf(user1.address);
            await stakingContract.connect(user1).withdraw(0, withdrawAmount);
            const balanceAfter = await stakingToken.balanceOf(user1.address);
            
            expect(balanceAfter.sub(balanceBefore)).to.equal(withdrawAmount);
            
            const userInfo = await stakingContract.userInfo(0, user1.address);
            expect(userInfo.amount).to.equal(ethers.utils.parseEther("50"));
        });

        it("Should distribute rewards on withdrawal", async function () {
            await time.increase(LOCK_PERIOD + 3600); // Lock period + 1 hour
            
            const rewardBalanceBefore = await rewardToken.balanceOf(user1.address);
            await stakingContract.connect(user1).withdraw(0, ethers.utils.parseEther("50"));
            const rewardBalanceAfter = await rewardToken.balanceOf(user1.address);
            
            expect(rewardBalanceAfter).to.be.gt(rewardBalanceBefore);
        });

        it("Should allow emergency withdrawal", async function () {
            const userInfoBefore = await stakingContract.userInfo(0, user1.address);
            const balanceBefore = await stakingToken.balanceOf(user1.address);
            
            await stakingContract.connect(user1).emergencyWithdraw(0);
            
            const balanceAfter = await stakingToken.balanceOf(user1.address);
            const userInfoAfter = await stakingContract.userInfo(0, user1.address);
            
            expect(balanceAfter.sub(balanceBefore)).to.equal(userInfoBefore.amount);
            expect(userInfoAfter.amount).to.equal(0);
            expect(userInfoAfter.active).to.be.false;
        });
    });

    describe("Reward Harvesting", function () {
        beforeEach(async function () {
            await stakingToken.connect(user1).approve(
                stakingContract.address, 
                ethers.utils.parseEther("1000")
            );
            
            const stakeAmount = ethers.utils.parseEther("100");
            await stakingContract.connect(user1).deposit(0, stakeAmount);
        });

        it("Should allow harvesting rewards without withdrawing stake", async function () {
            await time.increase(3600); // 1 hour
            
            const rewardBalanceBefore = await rewardToken.balanceOf(user1.address);
            await stakingContract.connect(user1).harvest(0);
            const rewardBalanceAfter = await rewardToken.balanceOf(user1.address);
            
            expect(rewardBalanceAfter).to.be.gt(rewardBalanceBefore);
            
            // Stake should remain unchanged
            const userInfo = await stakingContract.userInfo(0, user1.address);
            expect(userInfo.amount).to.equal(ethers.utils.parseEther("100"));
        });

        it("Should reset reward debt after harvesting", async function () {
            await time.increase(3600);
            
            await stakingContract.connect(user1).harvest(0);
            
            // Pending rewards should be near zero after harvest
            const pendingAfterHarvest = await stakingContract.pendingReward(0, user1.address);
            expect(pendingAfterHarvest).to.be.lt(ethers.utils.parseEther("0.1"));
        });
    });

    describe("View Functions", function () {
        it("Should return correct pool length", async function () {
            expect(await stakingContract.poolLength()).to.equal(1);
            
            // Add another pool
            await stakingContract.addPool(
                stakingToken.address,
                rewardToken.address,
                REWARD_PER_SECOND,
                MIN_STAKE_AMOUNT,
                LOCK_PERIOD
            );
            
            expect(await stakingContract.poolLength()).to.equal(2);
        });

        it("Should return correct user stake info", async function () {
            await stakingToken.connect(user1).approve(
                stakingContract.address, 
                ethers.utils.parseEther("1000")
            );
            
            const stakeAmount = ethers.utils.parseEther("100");
            await stakingContract.connect(user1).deposit(0, stakeAmount);
            
            const stakeInfo = await stakingContract.getUserStakeInfo(0, user1.address);
            expect(stakeInfo.amount).to.equal(stakeAmount);
            expect(stakeInfo.active).to.be.true;
            expect(stakeInfo.unlockTime).to.be.gt(await time.latest());
        });
    });

    describe("Edge Cases", function () {
        it("Should handle zero total staked correctly", async function () {
            // Update pool when no one has staked
            await stakingContract.updatePool(0);
            
            const poolInfo = await stakingContract.poolInfo(0);
            expect(poolInfo.accRewardPerShare).to.equal(0);
        });

        it("Should handle insufficient reward token balance", async function () {
            // Drain reward tokens from contract
            await rewardToken.transferFrom(
                stakingContract.address,
                owner.address,
                await rewardToken.balanceOf(stakingContract.address)
            );
            
            await stakingToken.connect(user1).approve(
                stakingContract.address, 
                ethers.utils.parseEther("1000")
            );
            
            const stakeAmount = ethers.utils.parseEther("100");
            await stakingContract.connect(user1).deposit(0, stakeAmount);
            
            await time.increase(3600);
            
            // Should not revert, but transfer available balance
            await expect(stakingContract.connect(user1).harvest(0)).to.not.be.reverted;
        });
    });
});
