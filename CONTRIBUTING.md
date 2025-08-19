# Contributing to Base Builder Rewards Boost

We welcome contributions from the Base community! This guide will help you get started with contributing to our project.

## Quick Start

1. Fork this repository
2. Clone your fork locally
3. Create a new branch for your feature
4. Make your changes
5. Test your changes
6. Submit a pull request

## Development Setup

```bash
# Clone the repository
git clone https://github.com/wearedood/base-builder-rewards-boost.git
cd base-builder-rewards-boost

# Install dependencies
npm install

# Run tests
npm test

# Start development server
npm run dev
```

## Code Standards

### JavaScript/TypeScript
- Use ESLint and Prettier for code formatting
- Follow the Airbnb style guide
- Write comprehensive tests for new features
- Use meaningful variable and function names

### Solidity
- Follow the official Solidity style guide
- Use NatSpec comments for all public functions
- Implement comprehensive test coverage (>90%)
- Gas optimization is crucial

## Contribution Types

### 🐛 Bug Fixes
- Include reproduction steps
- Add regression tests
- Update documentation if needed

### ✨ New Features
- Discuss in issues before implementation
- Include comprehensive tests
- Update documentation
- Consider gas implications

### 📚 Documentation
- Keep README up to date
- Add inline code comments
- Update API documentation
- Include usage examples

### 🧪 Testing
- Unit tests for all functions
- Integration tests for workflows
- Gas usage tests for contracts
- Security vulnerability tests

## Pull Request Process

1. **Branch Naming**: Use descriptive names
   - `feature/add-yield-farming`
   - `fix/reward-calculation-bug`
   - `docs/update-api-reference`

2. **Commit Messages**: Follow conventional commits
   - `feat: add cross-chain bridge support`
   - `fix: resolve reward multiplier overflow`
   - `docs: update contributing guidelines`

3. **PR Description**: Include
   - What changes were made
   - Why the changes were necessary
   - How to test the changes
   - Screenshots/videos if applicable

## Testing Guidelines

### Smart Contracts
```bash
# Run all tests
npx hardhat test

# Run with coverage
npx hardhat coverage

# Gas usage report
npx hardhat test --gas-reporter
```

### Frontend
```bash
# Unit tests
npm run test:unit

# E2E tests
npm run test:e2e

# Visual regression tests
npm run test:visual
```

## Security Considerations

- Never commit private keys or sensitive data
- Use environment variables for configuration
- Follow smart contract security best practices
- Report security vulnerabilities privately

## Community Guidelines

- Be respectful and inclusive
- Help newcomers get started
- Share knowledge and best practices
- Collaborate openly and transparently

## Recognition

Contributors will be recognized in:
- README contributors section
- Release notes
- Community Discord
- Base Builder Rewards program

## Getting Help

- 💬 Discord: [Base Builders](https://discord.gg/base)
- 🐦 Twitter: [@BaseBuilders](https://twitter.com/basebuilders)
- 📧 Email: builders@base.org
- 📋 Issues: GitHub Issues tab

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
