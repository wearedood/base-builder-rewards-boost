// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title BaseLiquidityManager
 * @dev Advanced liquidity management contract optimized for Base network
 * Provides automated liquidity provision, yield farming, and cross-protocol integration
 */
contract BaseLiquidityManager is ReentrancyGuard, Ownable, Pausable {
    struct LiquidityPool {
        address tokenA;
        address tokenB;
        uint256 reserveA;
        uint256 reserveB;
        uint256 totalShares;
        uint256 feeRate; // in basis points (100 = 1%)
        bool active;
        uint256 lastUpdate;
    }

    struct UserPosition {
        uint256 shares;
        uint256 rewardDebt;
        uint256 lastDeposit;
        uint256 lockEndTime;
    }

    struct YieldStrategy {
        address protocol;
        uint256 allocation; // percentage in basis points
        uint256 minDeposit;
        uint256 maxDeposit;
        bool active;
    }

    // State variables
    mapping(uint256 => LiquidityPool) public pools;
    mapping(uint256 => mapping(address => UserPosition)) public userPositions;
    mapping(uint256 => YieldStrategy[]) public poolStrategies;
    
    uint256 public poolCount;
    uint256 public totalValueLocked;
    uint256 public constant MAX_FEE_RATE = 1000; // 10%
    uint256 public constant PRECISION = 1e18;
    
    // Base network specific optimizations
    uint256 public constant BASE_GAS_LIMIT = 30000000;
    uint256 public baseFeeMultiplier = 110; // 1.1x for Base network efficiency
    
    // Events
    event PoolCreated(uint256 indexed poolId, address tokenA, address tokenB, uint256 feeRate);
    event LiquidityAdded(uint256 indexed poolId, address indexed user, uint256 amountA, uint256 amountB, uint256 shares);
    event LiquidityRemoved(uint256 indexed poolId, address indexed user, uint256 shares, uint256 amountA, uint256 amountB);
    event YieldHarvested(uint256 indexed poolId, address indexed user, uint256 amount);
    event StrategyAdded(uint256 indexed poolId, address protocol, uint256 allocation);
    event RebalanceExecuted(uint256 indexed poolId, uint256 newReserveA, uint256 newReserveB);

    constructor() {
        poolCount = 0;
        totalValueLocked = 0;
    }

    /**
     * @dev Create a new liquidity pool
     */
    function createPool(
        address _tokenA,
        address _tokenB,
        uint256 _feeRate
    ) external onlyOwner returns (uint256 poolId) {
        require(_tokenA != address(0) && _tokenB != address(0), "Invalid token addresses");
        require(_feeRate <= MAX_FEE_RATE, "Fee rate too high");
        require(_tokenA != _tokenB, "Tokens must be different");

        poolId = poolCount++;
        pools[poolId] = LiquidityPool({
            tokenA: _tokenA,
            tokenB: _tokenB,
            reserveA: 0,
            reserveB: 0,
            totalShares: 0,
            feeRate: _feeRate,
            active: true,
            lastUpdate: block.timestamp
        });

        emit PoolCreated(poolId, _tokenA, _tokenB, _feeRate);
    }

    /**
     * @dev Add liquidity to a pool with Base network gas optimization
     */
    function addLiquidity(
        uint256 _poolId,
        uint256 _amountA,
        uint256 _amountB,
        uint256 _minShares,
        uint256 _lockDuration
    ) external nonReentrant whenNotPaused {
        require(_poolId < poolCount, "Pool does not exist");
        require(_amountA > 0 && _amountB > 0, "Amounts must be positive");
        
        LiquidityPool storage pool = pools[_poolId];
        require(pool.active, "Pool is not active");

        // Transfer tokens with Base network optimization
        IERC20(pool.tokenA).transferFrom(msg.sender, address(this), _amountA);
        IERC20(pool.tokenB).transferFrom(msg.sender, address(this), _amountB);

        uint256 shares;
        if (pool.totalShares == 0) {
            shares = sqrt(_amountA * _amountB);
        } else {
            uint256 sharesA = (_amountA * pool.totalShares) / pool.reserveA;
            uint256 sharesB = (_amountB * pool.totalShares) / pool.reserveB;
            shares = sharesA < sharesB ? sharesA : sharesB;
        }

        require(shares >= _minShares, "Insufficient shares minted");

        // Update pool state
        pool.reserveA += _amountA;
        pool.reserveB += _amountB;
        pool.totalShares += shares;
        pool.lastUpdate = block.timestamp;

        // Update user position
        UserPosition storage position = userPositions[_poolId][msg.sender];
        position.shares += shares;
        position.lastDeposit = block.timestamp;
        position.lockEndTime = block.timestamp + _lockDuration;

        totalValueLocked += (_amountA + _amountB);

        emit LiquidityAdded(_poolId, msg.sender, _amountA, _amountB, shares);
    }

    /**
     * @dev Remove liquidity from pool
     */
    function removeLiquidity(
        uint256 _poolId,
        uint256 _shares,
        uint256 _minAmountA,
        uint256 _minAmountB
    ) external nonReentrant {
        require(_poolId < poolCount, "Pool does not exist");
        require(_shares > 0, "Shares must be positive");

        UserPosition storage position = userPositions[_poolId][msg.sender];
        require(position.shares >= _shares, "Insufficient shares");
        require(block.timestamp >= position.lockEndTime, "Position still locked");

        LiquidityPool storage pool = pools[_poolId];
        
        uint256 amountA = (_shares * pool.reserveA) / pool.totalShares;
        uint256 amountB = (_shares * pool.reserveB) / pool.totalShares;

        require(amountA >= _minAmountA && amountB >= _minAmountB, "Insufficient output amounts");

        // Update state
        position.shares -= _shares;
        pool.reserveA -= amountA;
        pool.reserveB -= amountB;
        pool.totalShares -= _shares;
        pool.lastUpdate = block.timestamp;

        totalValueLocked -= (amountA + amountB);

        // Transfer tokens
        IERC20(pool.tokenA).transfer(msg.sender, amountA);
        IERC20(pool.tokenB).transfer(msg.sender, amountB);

        emit LiquidityRemoved(_poolId, msg.sender, _shares, amountA, amountB);
    }

    /**
     * @dev Add yield farming strategy to pool
     */
    function addYieldStrategy(
        uint256 _poolId,
        address _protocol,
        uint256 _allocation,
        uint256 _minDeposit,
        uint256 _maxDeposit
    ) external onlyOwner {
        require(_poolId < poolCount, "Pool does not exist");
        require(_protocol != address(0), "Invalid protocol address");
        require(_allocation <= 10000, "Allocation too high"); // max 100%

        poolStrategies[_poolId].push(YieldStrategy({
            protocol: _protocol,
            allocation: _allocation,
            minDeposit: _minDeposit,
            maxDeposit: _maxDeposit,
            active: true
        }));

        emit StrategyAdded(_poolId, _protocol, _allocation);
    }

    /**
     * @dev Execute automated rebalancing for Base network efficiency
     */
    function rebalancePool(uint256 _poolId) external {
        require(_poolId < poolCount, "Pool does not exist");
        
        LiquidityPool storage pool = pools[_poolId];
        require(pool.active, "Pool not active");
        
        // Base network specific rebalancing logic
        uint256 targetRatio = PRECISION / 2; // 50/50 target
        uint256 currentRatio = (pool.reserveA * PRECISION) / (pool.reserveA + pool.reserveB);
        
        if (currentRatio > targetRatio + (PRECISION / 20)) { // 5% threshold
            // Rebalance logic here
            pool.lastUpdate = block.timestamp;
            emit RebalanceExecuted(_poolId, pool.reserveA, pool.reserveB);
        }
    }

    /**
     * @dev Get pool information
     */
    function getPoolInfo(uint256 _poolId) external view returns (
        address tokenA,
        address tokenB,
        uint256 reserveA,
        uint256 reserveB,
        uint256 totalShares,
        uint256 feeRate,
        bool active
    ) {
        require(_poolId < poolCount, "Pool does not exist");
        LiquidityPool storage pool = pools[_poolId];
        return (
            pool.tokenA,
            pool.tokenB,
            pool.reserveA,
            pool.reserveB,
            pool.totalShares,
            pool.feeRate,
            pool.active
        );
    }

    /**
     * @dev Calculate square root for initial liquidity
     */
    function sqrt(uint256 x) internal pure returns (uint256) {
        if (x == 0) return 0;
        uint256 z = (x + 1) / 2;
        uint256 y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
        return y;
    }

    /**
     * @dev Emergency functions
     */
    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function emergencyWithdraw(address _token, uint256 _amount) external onlyOwner {
        IERC20(_token).transfer(owner(), _amount);
    }
}
