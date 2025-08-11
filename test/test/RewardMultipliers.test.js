const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("BaseRewards - Reward Multipliers", function () {
  let baseRewards;
  let owner;
  let user1;
  let user2;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();
    
    const BaseRewards = await ethers.getContractFactory("BaseRewards");
    baseRewards = await BaseRewards.deploy();
    await baseRewards.deployed();
  });

  describe("Multiplier Management", function () {
    it("Should set default multipliers correctly", async function () {
      expect(await baseRewards.contributionMultipliers(0)).to.equal(ethers.utils.parseEther("1")); // Default
      expect(await baseRewards.contributionMultipliers(1)).to.equal(ethers.utils.parseEther("1.5")); // Smart Contract
      expect(await baseRewards.contributionMultipliers(2)).to.equal(ethers.utils.parseEther("1.2")); // DeFi
      expect(await baseRewards.contributionMultipliers(3)).to.equal(ethers.utils.parseEther("1.3")); // NFT/Gaming
      expect(await baseRewards.contributionMultipliers(4)).to.equal(ethers.utils.parseEther("1.1")); // Infrastructure
      expect(await baseRewards.contributionMultipliers(5)).to.equal(ethers.utils.parseEther("1.4")); // Developer Tools
    });

    it("Should allow owner to set multipliers", async function () {
      await baseRewards.setMultiplier(1, ethers.utils.parseEther("2.0"));
      expect(await baseRewards.contributionMultipliers(1)).to.equal(ethers.utils.parseEther("2.0"));
    });

    it("Should reject multipliers outside valid range", async function () {
      await expect(
        baseRewards.setMultiplier(1, ethers.utils.parseEther("0.4"))
      ).to.be.revertedWith("Invalid multiplier range");
      
      await expect(
        baseRewards.setMultiplier(1, ethers.utils.parseEther("3.1"))
      ).to.be.revertedWith("Invalid multiplier range");
    });

    it("Should reject non-owner multiplier changes", async function () {
      await expect(
        baseRewards.connect(user1).setMultiplier(1, ethers.utils.parseEther("2.0"))
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should emit MultiplierSet event", async function () {
      await expect(
        baseRewards.setMultiplier(1, ethers.utils.parseEther("2.0"))
      ).to.emit(baseRewards, "MultiplierSet")
       .withArgs(1, ethers.utils.parseEther("2.0"));
    });
  });

  describe("Contribution Type Detection", function () {
    it("Should detect smart contract contributions", async function () {
      expect(await baseRewards.detectContributionType("deployed smart contract")).to.equal(1);
      expect(await baseRewards.detectContributionType("contract audit")).to.equal(1);
      expect(await baseRewards.detectContributionType("solidity development")).to.equal(1);
    });

    it("Should detect DeFi contributions", async function () {
      expect(await baseRewards.detectContributionType("defi protocol")).to.equal(2);
      expect(await baseRewards.detectContributionType("liquidity pool")).to.equal(2);
      expect(await baseRewards.detectContributionType("yield farming")).to.equal(2);
    });

    it("Should detect NFT/Gaming contributions", async function () {
      expect(await baseRewards.detectContributionType("nft marketplace")).to.equal(3);
      expect(await baseRewards.detectContributionType("gaming platform")).to.equal(3);
      expect(await baseRewards.detectContributionType("collectibles")).to.equal(3);
    });

    it("Should detect Infrastructure contributions", async function () {
      expect(await baseRewards.detectContributionType("infrastructure upgrade")).to.equal(4);
      expect(await baseRewards.detectContributionType("node operation")).to.equal(4);
      expect(await baseRewards.detectContributionType("network optimization")).to.equal(4);
    });

    it("Should detect Developer Tools contributions", async function () {
      expect(await baseRewards.detectContributionType("developer tools")).to.equal(5);
      expect(await baseRewards.detectContributionType("sdk development")).to.equal(5);
      expect(await baseRewards.detectContributionType("api integration")).to.equal(5);
    });

    it("Should default to type 0 for unknown contributions", async function () {
      expect(await baseRewards.detectContributionType("random contribution")).to.equal(0);
      expect(await baseRewards.detectContributionType("")).to.equal(0);
    });

    it("Should emit ContributionTypeDetected event", async function () {
      await expect(
        baseRewards.detectContributionType("smart contract deployment")
      ).to.emit(baseRewards, "ContributionTypeDetected")
       .withArgs("smart contract deployment", 1);
    });
  });

  describe("Reward Distribution with Multipliers", function () {
    beforeEach(async function () {
      // Fund the contract
      await owner.sendTransaction({
        to: baseRewards.address,
        value: ethers.utils.parseEther("10")
      });
    });

    it("Should apply correct multiplier for smart contract contributions", async function () {
      const baseAmount = ethers.utils.parseEther("1");
      const expectedAmount = baseAmount.mul(ethers.utils.parseEther("1.5")).div(ethers.utils.parseEther("1"));
      
      await expect(
        baseRewards.distributeReward(user1.address, baseAmount, "smart contract deployment", 1)
      ).to.changeEtherBalance(user1, expectedAmount);
    });

    it("Should apply correct multiplier for DeFi contributions", async function () {
      const baseAmount = ethers.utils.parseEther("1");
      const expectedAmount = baseAmount.mul(ethers.utils.parseEther("1.2")).div(ethers.utils.parseEther("1"));
      
      await expect(
        baseRewards.distributeReward(user1.address, baseAmount, "defi protocol launch", 2)
      ).to.changeEtherBalance(user1, expectedAmount);
    });

    it("Should handle custom multipliers", async function () {
      await baseRewards.setMultiplier(1, ethers.utils.parseEther("2.5"));
      
      const baseAmount = ethers.utils.parseEther("1");
      const expectedAmount = baseAmount.mul(ethers.utils.parseEther("2.5")).div(ethers.utils.parseEther("1"));
      
      await expect(
        baseRewards.distributeReward(user1.address, baseAmount, "contract audit", 1)
      ).to.changeEtherBalance(user1, expectedAmount);
    });

    it("Should handle edge case with zero amount", async function () {
      await expect(
        baseRewards.distributeReward(user1.address, 0, "test", 0)
      ).to.changeEtherBalance(user1, 0);
    });
  });

  describe("Gas Optimization Tests", function () {
    it("Should have reasonable gas costs for reward distribution", async function () {
      await owner.sendTransaction({
        to: baseRewards.address,
        value: ethers.utils.parseEther("10")
      });
      
      const tx = await baseRewards.distributeReward(
        user1.address, 
        ethers.utils.parseEther("1"), 
        "test contribution", 
        1
      );
      
      const receipt = await tx.wait();
      expect(receipt.gasUsed).to.be.below(100000); // Should be under 100k gas
    });

    it("Should have reasonable gas costs for multiplier updates", async function () {
      const tx = await baseRewards.setMultiplier(1, ethers.utils.parseEther("2.0"));
      const receipt = await tx.wait();
      expect(receipt.gasUsed).to.be.below(50000); // Should be under 50k gas
    });
  });
});
