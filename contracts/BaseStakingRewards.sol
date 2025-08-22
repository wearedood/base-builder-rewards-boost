// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

/**
 * @title BaseStakingRewards
 * @dev A staking contract for Base ecosystem rewards
 * @notice Users can stake tokens and earn rewards based on their stake duration and amount
 */
contract BaseStakingRewards is ReentrancyGuard, Ownable {
    using SafeMath for uint256;

    struct StakeInfo {
        uint256 amount;
        uint256 timestamp;
        uint256 rewardDebt;
        bool active;
    }

    struct PoolInfo {
        IERC20 stakingToken;
        IERC20 rewardToken;
        uint256 rewardPerSecond;
        uint256 lastRewardTime;
        uint256 accRewardPerShare;
        uint256 totalStaked;
        uint256 minStakeAmount;
        uint256 lockPeriod;
    }

    // Pool information
    PoolInfo[] public poolInfo;
    
    // User staking information: poolId => user => StakeInfo
    mapping(uint256 => mapping(address => StakeInfo)) public userInfo;
    
    // Events
    event Deposit(address indexed user, uint256 indexed pid, uint256 amount);
    event Withdraw(address indexed user, uint256 indexed pid, uint256 amount);
    event Harvest(address indexed user, uint256 indexed pid, uint256 amount);
    event PoolAdded(uint256 indexed pid, address stakingToken, address rewardToken);
    event RewardRateUpdated(uint256 indexed pid, uint256 newRate);

    constructor() {}

    /**
     * @dev Add a new staking pool
     */
    function addPool(
        IERC20 _stakingToken,
        IERC20 _rewardToken,
        uint256 _rewardPerSecond,
        uint256 _minStakeAmount,
        uint256 _lockPeriod
    ) external onlyOwner {
        poolInfo.push(PoolInfo({
            stakingToken: _stakingToken,
            rewardToken: _rewardToken,
            rewardPerSecond: _rewardPerSecond,
            lastRewardTime: block.timestamp,
            accRewardPerShare: 0,
            totalStaked: 0,
            minStakeAmount: _minStakeAmount,
            lockPeriod: _lockPeriod
        }));

        emit PoolAdded(poolInfo.length - 1, address(_stakingToken), address(_rewardToken));
    }

    /**
     * @dev Update reward rate for a pool
     */
    function updateRewardRate(uint256 _pid, uint256 _rewardPerSecond) external onlyOwner {
        updatePool(_pid);
        poolInfo[_pid].rewardPerSecond = _rewardPerSecond;
        emit RewardRateUpdated(_pid, _rewardPerSecond);
    }

    /**
     * @dev Update pool reward variables
     */
    function updatePool(uint256 _pid) public {
        PoolInfo storage pool = poolInfo[_pid];
        
        if (block.timestamp <= pool.lastRewardTime) {
            return;
        }

        if (pool.totalStaked == 0) {
            pool.lastRewardTime = block.timestamp;
            return;
        }

        uint256 timeElapsed = block.timestamp.sub(pool.lastRewardTime);
        uint256 reward = timeElapsed.mul(pool.rewardPerSecond);
        pool.accRewardPerShare = pool.accRewardPerShare.add(
            reward.mul(1e12).div(pool.totalStaked)
        );
        pool.lastRewardTime = block.timestamp;
    }

    /**
     * @dev Stake tokens in a pool
     */
    function deposit(uint256 _pid, uint256 _amount) external nonReentrant {
        PoolInfo storage pool = poolInfo[_pid];
        StakeInfo storage user = userInfo[_pid][msg.sender];

        require(_amount >= pool.minStakeAmount, "Amount below minimum stake");
        
        updatePool(_pid);

        if (user.active) {
            uint256 pending = user.amount.mul(pool.accRewardPerShare).div(1e12).sub(user.rewardDebt);
            if (pending > 0) {
                safeRewardTransfer(_pid, msg.sender, pending);
                emit Harvest(msg.sender, _pid, pending);
            }
        }

        pool.stakingToken.transferFrom(msg.sender, address(this), _amount);
        
        user.amount = user.amount.add(_amount);
        user.timestamp = block.timestamp;
        user.rewardDebt = user.amount.mul(pool.accRewardPerShare).div(1e12);
        user.active = true;
        
        pool.totalStaked = pool.totalStaked.add(_amount);

        emit Deposit(msg.sender, _pid, _amount);
    }

    /**
     * @dev Withdraw staked tokens from a pool
     */
    function withdraw(uint256 _pid, uint256 _amount) external nonReentrant {
        PoolInfo storage pool = poolInfo[_pid];
        StakeInfo storage user = userInfo[_pid][msg.sender];

        require(user.active, "No active stake");
        require(user.amount >= _amount, "Insufficient staked amount");
        require(
            block.timestamp >= user.timestamp.add(pool.lockPeriod),
            "Tokens still locked"
        );

        updatePool(_pid);

        uint256 pending = user.amount.mul(pool.accRewardPerShare).div(1e12).sub(user.rewardDebt);
        if (pending > 0) {
            safeRewardTransfer(_pid, msg.sender, pending);
            emit Harvest(msg.sender, _pid, pending);
        }

        user.amount = user.amount.sub(_amount);
        user.rewardDebt = user.amount.mul(pool.accRewardPerShare).div(1e12);
        
        if (user.amount == 0) {
            user.active = false;
        }

        pool.totalStaked = pool.totalStaked.sub(_amount);
        pool.stakingToken.transfer(msg.sender, _amount);

        emit Withdraw(msg.sender, _pid, _amount);
    }

    /**
     * @dev Harvest rewards without withdrawing stake
     */
    function harvest(uint256 _pid) external nonReentrant {
        PoolInfo storage pool = poolInfo[_pid];
        StakeInfo storage user = userInfo[_pid][msg.sender];

        require(user.active, "No active stake");

        updatePool(_pid);

        uint256 pending = user.amount.mul(pool.accRewardPerShare).div(1e12).sub(user.rewardDebt);
        require(pending > 0, "No pending rewards");

        user.rewardDebt = user.amount.mul(pool.accRewardPerShare).div(1e12);
        safeRewardTransfer(_pid, msg.sender, pending);

        emit Harvest(msg.sender, _pid, pending);
    }

    /**
     * @dev Get pending rewards for a user
     */
    function pendingReward(uint256 _pid, address _user) external view returns (uint256) {
        PoolInfo storage pool = poolInfo[_pid];
        StakeInfo storage user = userInfo[_pid][_user];
        
        if (!user.active) {
            return 0;
        }

        uint256 accRewardPerShare = pool.accRewardPerShare;
        
        if (block.timestamp > pool.lastRewardTime && pool.totalStaked != 0) {
            uint256 timeElapsed = block.timestamp.sub(pool.lastRewardTime);
            uint256 reward = timeElapsed.mul(pool.rewardPerSecond);
            accRewardPerShare = accRewardPerShare.add(
                reward.mul(1e12).div(pool.totalStaked)
            );
        }
        
        return user.amount.mul(accRewardPerShare).div(1e12).sub(user.rewardDebt);
    }

    /**
     * @dev Safe reward token transfer function
     */
    function safeRewardTransfer(uint256 _pid, address _to, uint256 _amount) internal {
        PoolInfo storage pool = poolInfo[_pid];
        uint256 rewardBal = pool.rewardToken.balanceOf(address(this));
        
        if (_amount > rewardBal) {
            pool.rewardToken.transfer(_to, rewardBal);
        } else {
            pool.rewardToken.transfer(_to, _amount);
        }
    }

    /**
     * @dev Emergency withdraw function (forfeit rewards)
     */
    function emergencyWithdraw(uint256 _pid) external nonReentrant {
        PoolInfo storage pool = poolInfo[_pid];
        StakeInfo storage user = userInfo[_pid][msg.sender];

        require(user.active, "No active stake");

        uint256 amount = user.amount;
        user.amount = 0;
        user.rewardDebt = 0;
        user.active = false;

        pool.totalStaked = pool.totalStaked.sub(amount);
        pool.stakingToken.transfer(msg.sender, amount);

        emit Withdraw(msg.sender, _pid, amount);
    }

    /**
     * @dev Get pool count
     */
    function poolLength() external view returns (uint256) {
        return poolInfo.length;
    }

    /**
     * @dev Get user stake info
     */
    function getUserStakeInfo(uint256 _pid, address _user) 
        external 
        view 
        returns (uint256 amount, uint256 timestamp, bool active, uint256 unlockTime) 
    {
        StakeInfo storage user = userInfo[_pid][_user];
        PoolInfo storage pool = poolInfo[_pid];
        
        return (
            user.amount,
            user.timestamp,
            user.active,
            user.timestamp.add(pool.lockPeriod)
        );
    }
}
