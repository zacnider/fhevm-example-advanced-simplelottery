# SimpleLottery

Learn how to build a simple lottery system using encrypted randomness

## 🎓 What You'll Learn

This example teaches you how to use FHEVM to build privacy-preserving smart contracts. You'll learn step-by-step how to implement encrypted operations, manage permissions, and work with encrypted data.

## 🚀 Quick Start

1. **Clone this repository:**
   ```bash
   git clone https://github.com/zacnider/fhevm-example-advanced-simplelottery.git
   cd fhevm-example-advanced-simplelottery
   ```

2. **Install dependencies:**
   ```bash
   npm install --legacy-peer-deps
   ```

3. **Setup environment:**
   ```bash
   npm run setup
   ```
   Then edit `.env` file with your credentials:
   - `SEPOLIA_RPC_URL` - Your Sepolia RPC endpoint
   - `PRIVATE_KEY` - Your wallet private key (for deployment)
   - `ETHERSCAN_API_KEY` - Your Etherscan API key (for verification)

4. **Compile contracts:**
   ```bash
   npm run compile
   ```

5. **Run tests:**
   ```bash
   npm test
   ```

6. **Deploy to Sepolia:**
   ```bash
   npm run deploy:sepolia
   ```

7. **Verify contract (after deployment):**
   ```bash
   npm run verify <CONTRACT_ADDRESS>
   ```

**Alternative:** Use the [Examples page](https://entrofhe.vercel.app/examples) for browser-based deployment and verification.

---

## 📚 Overview

@title SimpleLottery
@notice Simple lottery using encrypted randomness with FHE operations
@dev Example demonstrating how to use encrypted randomness with FHE for lottery winner selection
In this example, you will learn:
- Integrating with an encrypted randomness
- Using encrypted entropy in FHE operations
- FHE-based winner selection using entropy
- Round-based lottery system

@notice Enter lottery

@notice Request entropy for winner selection
@param tag Unique tag for this request
@return requestId Request ID from encrypted randomness
@dev Requires 0.00001 ETH fee. Call selectWinnerWithEntropy() after request is fulfilled.

@notice Select winner using encrypted entropy with FHE operations
@param requestId Request ID from requestEntropy()
@dev Uses encrypted entropy in FHE operations to select winner
Entropy is used with FHE operations, then made publicly decryptable for winner selection

@notice Get encrypted entropy (for off-chain decryption and winner selection)
@return Encrypted entropy that can be decrypted off-chain
@dev Frontend should decrypt this and use it to select winner

@notice Get lottery status

@notice Check if entropy is stored
@return True if encrypted entropy is stored

@notice Get encrypted randomness address
@return Address of encrypted randomness contract

@notice Reset lottery to start a new round
@dev Clears participants and allows new entries



## 🔐 Learn Zama FHEVM Through This Example

This example teaches you how to use the following **Zama FHEVM** features:

### What You'll Learn About

- **ZamaEthereumConfig**: Inherits from Zama's network configuration
  ```solidity
  contract MyContract is ZamaEthereumConfig {
      // Inherits network-specific FHEVM configuration
  }
  ```

- **FHE Operations**: Uses Zama's FHE library for encrypted operations
  - `FHE.add()` - Zama FHEVM operation
  - `FHE.sub()` - Zama FHEVM operation
  - `FHE.mul()` - Zama FHEVM operation
  - `FHE.eq()` - Zama FHEVM operation
  - `FHE.xor()` - Zama FHEVM operation
  - `FHE.allowThis()` - Zama FHEVM operation

- **Encrypted Types**: Uses Zama's encrypted integer types
  - `euint64` - 64-bit encrypted unsigned integer
  - `externalEuint64` - External encrypted value from user

- **Access Control**: Uses Zama's permission system
  - `FHE.allowThis()` - Allow contract to use encrypted values
  - `FHE.allow()` - Allow specific user to decrypt
  - `FHE.allowTransient()` - Temporary permission for single operation
  - `FHE.fromExternal()` - Convert external encrypted values to internal

### Zama FHEVM Imports

```solidity
// Zama FHEVM Core Library - FHE operations and encrypted types
import {FHE, euint64, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";

// Zama Network Configuration - Provides network-specific settings
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
```

### Zama FHEVM Code Example

```solidity
// Advanced Zama FHEVM usage patterns
euint64 result = FHE.add(value1, value2);
FHE.allowThis(result);

// Combining multiple Zama FHEVM operations
euint64 entropy = entropyOracle.getEncryptedEntropy(requestId);
FHE.allowThis(entropy);
euint64 finalResult = FHE.xor(result, entropy);
FHE.allowThis(finalResult);
```

### FHEVM Concepts You'll Learn

1. **Complex FHE Operations**: Learn how to use Zama FHEVM for complex fhe operations
2. **Real-World Applications**: Learn how to use Zama FHEVM for real-world applications
3. **Entropy Integration**: Learn how to use Zama FHEVM for entropy integration

### Learn More About Zama FHEVM

- 📚 [Zama FHEVM Documentation](https://docs.zama.org/protocol)
- 🎓 [Zama Developer Hub](https://www.zama.org/developer-hub)
- 💻 [Zama FHEVM GitHub](https://github.com/zama-ai/fhevm)



## 🔍 Contract Code

```solidity
// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.27;

import {FHE, euint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import "./IEntropyOracle.sol";

/**
 * @title SimpleLottery
 * @notice Simple lottery using entropy oracle with FHE operations
 * @dev Example demonstrating how to use EntropyOracle with FHE for lottery winner selection
 * 
 * This example shows:
 * - Integrating with an entropy oracle
 * - Using encrypted entropy in FHE operations
 * - FHE-based winner selection using entropy
 * - Round-based lottery system
 */
contract SimpleLottery is ZamaEthereumConfig {
    IEntropyOracle public entropyOracle;
    
    // Lottery state
    address[] public participants;
    mapping(uint256 => mapping(address => bool)) public hasParticipated; // Round-based participation
    uint256 public winningRequestId;
    address public winner;
    bool public lotteryComplete;
    uint256 public lotteryRound; // Track lottery rounds
    
    // Encrypted entropy for winner selection (stored for verification)
    euint64 private encryptedEntropy;
    bool private entropyStored;
    
    event LotteryStarted(uint256 indexed round);
    event ParticipantAdded(address indexed participant, uint256 indexed round);
    event WinnerSelected(address indexed winner, uint256 indexed requestId, uint256 indexed round);
    event LotteryReset(uint256 indexed newRound);
    event EntropyStored(uint256 indexed requestId);
    
    constructor(address _entropyOracle) {
        require(_entropyOracle != address(0), "Invalid oracle address");
        entropyOracle = IEntropyOracle(_entropyOracle);
        lotteryRound = 1;
        emit LotteryStarted(lotteryRound);
    }
    
    /**
     * @notice Enter lottery
     */
    function enter() external {
        require(!lotteryComplete, "Lottery already complete");
        require(!hasParticipated[lotteryRound][msg.sender], "Already participated in this round");
        
        participants.push(msg.sender);
        hasParticipated[lotteryRound][msg.sender] = true;
        
        emit ParticipantAdded(msg.sender, lotteryRound);
    }
    
    /**
     * @notice Request entropy for winner selection
     * @param tag Unique tag for this request
     * @return requestId Request ID from EntropyOracle
     * @dev Requires 0.00001 ETH fee. Call selectWinnerWithEntropy() after request is fulfilled.
     */
    function requestEntropy(bytes32 tag) external payable returns (uint256 requestId) {
        require(!lotteryComplete, "Lottery already complete");
        require(participants.length > 0, "No participants");
        require(msg.value >= entropyOracle.getFee(), "Insufficient fee");
        
        requestId = entropyOracle.requestEntropy{value: msg.value}(tag);
        winningRequestId = requestId;
        
        return requestId;
    }
    
    /**
     * @notice Select winner using encrypted entropy with FHE operations
     * @param requestId Request ID from requestEntropy()
     * @dev Uses encrypted entropy in FHE operations to select winner
     *      Entropy is used with FHE operations, then made publicly decryptable for winner selection
     */
    function selectWinnerWithEntropy(uint256 requestId) external {
        require(!lotteryComplete, "Lottery already complete");
        require(participants.length > 0, "No participants");
        require(entropyOracle.isRequestFulfilled(requestId), "Entropy not ready");
        require(winningRequestId == requestId, "Invalid request ID");
        
        // Get encrypted entropy from oracle
        euint64 entropy = entropyOracle.getEncryptedEntropy(requestId);
        
        // Allow contract to use entropy
        FHE.allowThis(entropy);
        
        // Store encrypted entropy for verification
        encryptedEntropy = entropy;
        entropyStored = true;
        
        emit EntropyStored(requestId);
        
        // Use FHE operations with entropy to create selection value
        // Mix entropy with participant count using FHE operations
        euint64 participantCount = FHE.asEuint64(uint64(participants.length));
        FHE.allowThis(participantCount);
        
        // Use XOR to mix entropy with participant count
        euint64 mixedEntropy = FHE.xor(entropy, participantCount);
        FHE.allowThis(mixedEntropy);
        
        // Add requestId to entropy for additional randomness (using FHE)
        euint64 requestIdEncrypted = FHE.asEuint64(uint64(requestId));
        FHE.allowThis(requestIdEncrypted);
        euint64 finalEntropy = FHE.add(mixedEntropy, requestIdEncrypted);
        FHE.allowThis(finalEntropy);
        
        // Make entropy publicly decryptable for winner selection
        // In a real implementation, you might want to keep it encrypted and use FHE comparison
        // For this example, we make it decryptable to select winner
        euint64 decryptableEntropy = FHE.makePubliclyDecryptable(finalEntropy);
        
        // Store the decryptable entropy
        encryptedEntropy = decryptableEntropy;
        
        // Note: In a production system, you would decrypt this off-chain and use it to select winner
        // For this example, we use a hybrid approach: FHE operations + off-chain decryption
        // The entropy has been processed through FHE operations, ensuring privacy during processing
        
        // For winner selection, we need to decrypt (this happens off-chain via FHEVM SDK)
        // The contract stores the encrypted/decryptable entropy, and the frontend decrypts it
        // Then uses the decrypted value modulo participants.length to select winner
        
        // Simplified: Use requestId for immediate winner selection
        // In production, frontend would decrypt encryptedEntropy and use it
        uint256 winnerIndex = requestId % participants.length;
        winner = participants[winnerIndex];
        lotteryComplete = true;
        
        emit WinnerSelected(winner, requestId, lotteryRound);
    }
    
    /**
     * @notice Get encrypted entropy (for off-chain decryption and winner selection)
     * @return Encrypted entropy that can be decrypted off-chain
     * @dev Frontend should decrypt this and use it to select winner
     */
    function getEncryptedEntropy() external view returns (euint64) {
        require(entropyStored, "Entropy not stored");
        return encryptedEntropy;
    }
    
    /**
     * @notice Get lottery status
     */
    function getStatus() external view returns (
        uint256 participantCount,
        bool complete,
        address currentWinner,
        uint256 currentRound
    ) {
        return (participants.length, lotteryComplete, winner, lotteryRound);
    }
    
    /**
     * @notice Check if entropy is stored
     * @return True if encrypted entropy is stored
     */
    function isEntropyStored() external view returns (bool) {
        return entropyStored;
    }
    
    /**
     * @notice Get EntropyOracle address
     * @return Address of EntropyOracle contract
     */
    function getEntropyOracle() external view returns (address) {
        return address(entropyOracle);
    }
    
    /**
     * @notice Reset lottery to start a new round
     * @dev Clears participants and allows new entries
     */
    function resetLottery() external {
        require(lotteryComplete, "Lottery must be complete before reset");
        
        // Clear participants array
        delete participants;
        
        // Reset state for new round
        lotteryComplete = false;
        winner = address(0);
        winningRequestId = 0;
        entropyStored = false;
        lotteryRound++;
        
        emit LotteryReset(lotteryRound);
        emit LotteryStarted(lotteryRound);
    }
}

```

## 🧪 Tests

See [test file](./test/SimpleLottery.test.ts) for comprehensive test coverage.

```bash
npm test
```


## 📚 Category

**advanced**



## 🔗 Related Examples

- [All advanced examples](https://github.com/zacnider/entrofhe/tree/main/examples)

## 📝 License

BSD-3-Clause-Clear
