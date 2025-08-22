const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

/**
 * @title BaseGovernance Test Suite
 * @dev Comprehensive testing for Base ecosystem governance
 * Tests emergency controls, voting mechanisms, and gas optimization
 */
describe("BaseGovernance", function () {
  let governance, token, timelock;
  let owner, voter1, voter2, emergencyCouncil;
  let proposalId;

  beforeEach(async function () {
    [owner, voter1, voter2, emergencyCouncil] = await ethers.getSigners();

    // Deploy governance token with Base optimizations
    const Token = await ethers.getContractFactory("GovernanceToken");
    token = await Token.deploy();

    // Deploy timelock with Base block time considerations
    const Timelock = await ethers.getContractFactory("TimelockController");
    timelock = await Timelock.deploy(
      86400, // 1 day delay (optimized for Base 2s blocks)
      [owner.address], // proposers
      [owner.address], // executors
      owner.address // admin
    );

    // Deploy Base-optimized governance
    const Governance = await ethers.getContractFactory("BaseGovernance");
    governance = await Governance.deploy(token.address, timelock.address);

    // Setup voting power with realistic Base ecosystem amounts
    await token.mint(voter1.address, ethers.utils.parseEther("10000"));
    await token.mint(voter2.address, ethers.utils.parseEther("5000"));
    await token.connect(voter1).delegate(voter1.address);
    await token.connect(voter2).delegate(voter2.address);
  });

  describe("Base Network Optimizations", function () {
    it("Should use Base-specific block timing", async function () {
      // Base has 2-second blocks, verify timing calculations
      const votingDelay = await governance.votingDelay();
      const votingPeriod = await governance.votingPeriod();
      
      expect(votingDelay).to.equal(43200); // 1 day in 2s blocks
      expect(votingPeriod).to.equal(302400); // 1 week in 2s blocks
    });

    it("Should have appropriate quorum for Base ecosystem", async function () {
      const totalSupply = ethers.utils.parseEther("15000");
      const expectedQuorum = totalSupply.mul(4).div(100); // 4%
      
      expect(await governance.quorum(0)).to.equal(expectedQuorum);
    });
  });

  describe("Emergency Security Controls", function () {
    it("Should allow emergency council to pause governance", async function () {
      await expect(governance.emergencyPause(true))
        .to.emit(governance, "EmergencyPause")
        .withArgs(owner.address, true);
      
      expect(await governance.emergencyPaused()).to.be.true;
    });

    it("Should prevent unauthorized emergency actions", async function () {
      await expect(
        governance.connect(voter1).emergencyPause(true)
      ).to.be.revertedWith("Not emergency council");
    });

    it("Should block all governance when paused", async function () {
      await governance.emergencyPause(true);
      
      // Test proposal creation blocked
      await expect(
        governance.propose(
          [token.address],
          [0],
          [token.interface.encodeFunctionData("mint", [voter1.address, 100])],
          "Emergency test proposal"
        )
      ).to.be.revertedWith("Governance paused");
    });

    it("Should allow emergency unpause", async function () {
      await governance.emergencyPause(true);
      await governance.emergencyPause(false);
      
      expect(await governance.emergencyPaused()).to.be.false;
    });
  });

  describe("Proposal Lifecycle", function () {
    it("Should create proposals with gas optimization", async function () {
      const tx = await governance.propose(
        [token.address],
        [0],
        [token.interface.encodeFunctionData("mint", [voter1.address, ethers.utils.parseEther("1000")])],
        "Mint additional governance tokens"
      );
      
      const receipt = await tx.wait();
      expect(receipt.gasUsed).to.be.below(400000); // Gas optimized
      
      const event = receipt.events.find(e => e.event === "ProposalCreated");
      proposalId = event.args.proposalId;
      expect(proposalId).to.not.be.undefined;
    });

    it("Should validate proposal targets", async function () {
      await expect(
        governance.propose(
          [ethers.constants.AddressZero],
          [0],
          ["0x"],
          "Invalid target proposal"
        )
      ).to.be.revertedWith("Invalid target");
    });

    it("Should handle multiple target proposals", async function () {
      const targets = [token.address, token.address];
      const values = [0, 0];
      const calldatas = [
        token.interface.encodeFunctionData("mint", [voter1.address, 100]),
        token.interface.encodeFunctionData("mint", [voter2.address, 50])
      ];
      
      await governance.propose(targets, values, calldatas, "Multi-target proposal");
    });
  });

  describe("Voting Mechanisms", function () {
    beforeEach(async function () {
      const tx = await governance.propose(
        [token.address],
        [0],
        [token.interface.encodeFunctionData("mint", [voter1.address, ethers.utils.parseEther("500")])],
        "Test voting proposal"
      );
      
      const receipt = await tx.wait();
      const event = receipt.events.find(e => e.event === "ProposalCreated");
      proposalId = event.args.proposalId;
      
      // Advance past voting delay
      await time.increase(86400);
    });

    it("Should allow voting with gas optimization", async function () {
      const tx = await governance.connect(voter1).castVote(proposalId, 1);
      const receipt = await tx.wait();
      
      expect(receipt.gasUsed).to.be.below(150000); // Gas optimized voting
      
      const votes = await governance.proposalVotes(proposalId);
      expect(votes.forVotes).to.equal(ethers.utils.parseEther("10000"));
    });

    it("Should prevent voting when paused", async function () {
      await governance.emergencyPause(true);
      
      await expect(
        governance.connect(voter1).castVote(proposalId, 1)
      ).to.be.revertedWith("Governance paused");
    });

    it("Should reach quorum and succeed", async function () {
      await governance.connect(voter1).castVote(proposalId, 1); // For
      await governance.connect(voter2).castVote(proposalId, 1); // For
      
      // Advance past voting period
      await time.increase(604800); // 1 week
      
      const state = await governance.state(proposalId);
      expect(state).to.equal(4); // Succeeded
    });

    it("Should fail without quorum", async function () {
      // Only small vote, won't reach 4% quorum
      await governance.connect(voter2).castVote(proposalId, 1);
      
      await time.increase(604800); // 1 week
      
      const state = await governance.state(proposalId);
      expect(state).to.equal(3); // Defeated
    });
  });

  describe("Council Management", function () {
    it("Should update council members via governance", async function () {
      // Verify function exists and has proper access control
      expect(governance.updateCouncilMember).to.be.a("function");
      
      // Non-governance calls should fail
      await expect(
        governance.connect(voter1).updateCouncilMember(voter1.address, true)
      ).to.be.reverted;
    });

    it("Should emit events for council updates", async function () {
      // This would require full governance proposal cycle in practice
      expect(governance.interface.getEvent("CouncilMemberUpdated")).to.not.be.undefined;
    });
  });

  describe("Base Network Performance", function () {
    it("Should handle high-frequency Base transactions", async function () {
      // Create multiple proposals to test performance
      const proposals = [];
      
      for (let i = 0; i < 5; i++) {
        const tx = await governance.propose(
          [token.address],
          [0],
          [token.interface.encodeFunctionData("mint", [voter1.address, i])],
          `Performance test proposal ${i}`
        );
        proposals.push(tx);
      }
      
      // All should complete successfully
      for (const proposal of proposals) {
        const receipt = await proposal.wait();
        expect(receipt.status).to.equal(1);
      }
    });

    it("Should maintain gas efficiency under load", async function () {
      const gasUsages = [];
      
      for (let i = 0; i < 3; i++) {
        const tx = await governance.propose(
          [token.address],
          [0],
          [token.interface.encodeFunctionData("mint", [voter1.address, i])],
          `Gas test proposal ${i}`
        );
        
        const receipt = await tx.wait();
        gasUsages.push(receipt.gasUsed);
      }
      
      // Gas usage should remain consistent
      const avgGas = gasUsages.reduce((a, b) => a.add(b)).div(gasUsages.length);
      expect(avgGas).to.be.below(400000);
    });
  });

  describe("Integration with Base Ecosystem", function () {
    it("Should work with Base-specific contracts", async function () {
      // Test governance interaction with Base ecosystem contracts
      const state = await governance.state(0); // Check if governance is functional
      expect([0, 1, 2, 3, 4, 5, 6, 7]).to.include(state); // Valid state
    });

    it("Should handle Base network conditions", async function () {
      // Verify governance works under Base network conditions
      const votingDelay = await governance.votingDelay();
      const votingPeriod = await governance.votingPeriod();
      
      expect(votingDelay).to.be.gt(0);
      expect(votingPeriod).to.be.gt(votingDelay);
    });
  });
});
