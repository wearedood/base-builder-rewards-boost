const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("BaseRewards Contract", function () {
  let baseRewards;
  let owner;
  let builder1;
  let builder2;
  let addrs;

  beforeEach(async function () {
    [owner, builder1, builder2, ...addrs] = await ethers.getSigners();
    
    const BaseRewards = await ethers.getContractFactory("BaseRewards");
    const initialSupply = ethers.utils.parseEther("1000000");
    const rewardRate = ethers.utils.parseEther("100");
    
    baseRewards = await BaseRewards.deploy(initialSupply, rewardRate);
    await baseRewards.deployed();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await baseRewards.owner()).to.equal(owner.address);
    });

    it("Should assign the total supply to the owner", async function () {
      const ownerBalance = await baseRewards.balanceOf(owner.address);
      expect(await baseRewards.totalSupply()).to.equal(ownerBalance);
    });

    it("Should set correct reward rate", async function () {
      expect(await baseRewards.rewardRate()).to.equal(ethers.utils.parseEther("100"));
    });
  });

  describe("Builder Registration", function () {
    it("Should register a builder", async function () {
      await baseRewards.registerBuilder(builder1.address);
      expect(await baseRewards.isRegisteredBuilder(builder1.address)).to.be.true;
    });

    it("Should emit BuilderRegistered event", async function () {
      await expect(baseRewards.registerBuilder(builder1.address))
        .to.emit(baseRewards, "BuilderRegistered")
        .withArgs(builder1.address);
    });

    it("Should not allow non-owner to register builders", async function () {
      await expect(
        baseRewards.connect(builder1).registerBuilder(builder2.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Score Updates", function () {
    beforeEach(async function () {
      await baseRewards.registerBuilder(builder1.address);
    });

    it("Should update builder score", async function () {
      await baseRewards.updateBuilderScore(builder1.address, 50);
      expect(await baseRewards.builderScores(builder1.address)).to.equal(50);
    });

    it("Should emit ScoreUpdated event", async function () {
      await expect(baseRewards.updateBuilderScore(builder1.address, 75))
        .to.emit(baseRewards, "ScoreUpdated")
        .withArgs(builder1.address, 75);
    });
  });

  describe("Reward Claims", function () {
    beforeEach(async function () {
      await baseRewards.registerBuilder(builder1.address);
      await baseRewards.updateBuilderScore(builder1.address, 10);
    });

    it("Should allow builder to claim rewards", async function () {
      const initialBalance = await baseRewards.balanceOf(builder1.address);
      await baseRewards.connect(builder1).claimRewards();
      const finalBalance = await baseRewards.balanceOf(builder1.address);
      
      expect(finalBalance.sub(initialBalance)).to.equal(ethers.utils.parseEther("1000"));
    });

    it("Should reset claimed score after claim", async function () {
      await baseRewards.connect(builder1).claimRewards();
      expect(await baseRewards.claimedScores(builder1.address)).to.equal(10);
    });
  });
});
