# SimpleLottery

Simple lottery using entropy oracle

## 🚀 Standard workflow
- Install (first run): `npm install --legacy-peer-deps`
- Compile: `npx hardhat compile`
- Test (local FHE + local oracle/chaos engine auto-deployed): `npx hardhat test`
- Deploy (frontend Deploy button): constructor arg is fixed to EntropyOracle `0x75b923d7940E1BD6689EbFdbBDCD74C1f6695361`
- Verify: `npx hardhat verify --network sepolia <contractAddress> 0x75b923d7940E1BD6689EbFdbBDCD74C1f6695361`

## 📋 Overview

This example demonstrates **advanced** concepts in FHEVM with **EntropyOracle integration**:
- Integrating with EntropyOracle
- Using encrypted randomness for fair selection
- Round-based lottery system
- Real-world application pattern

## 🎯 What This Example Teaches

This tutorial will teach you:

1. **How to build a fair lottery system** using EntropyOracle
2. **How to manage participants** in a lottery
3. **How to select random winners** using entropy
4. **Round-based lottery mechanics** for multiple lotteries
5. **Real-world application patterns** with FHE and entropy
6. **Fair randomness** for winner selection

## 💡 Why This Matters

Lotteries need fair randomness to be trustworthy:
- **Prevents manipulation** of winner selection
- **Transparent and verifiable** randomness
- **Cryptographic randomness** from EntropyOracle
- **Round-based system** allows multiple lotteries
- **Real-world application** of FHE and entropy

## 🔍 How It Works

### Contract Structure

The contract has four main components:

1. **Enter Lottery**: Users enter the lottery
2. **Select Winner**: Uses entropy to select random winner
3. **Get Status**: View lottery status
4. **Reset Lottery**: Start a new round

### Step-by-Step Code Explanation

#### 1. Constructor

```solidity
constructor(address _entropyOracle) {
    require(_entropyOracle != address(0), "Invalid oracle address");
    entropyOracle = IEntropyOracle(_entropyOracle);
    lotteryRound = 1;
    emit LotteryStarted(lotteryRound);
}
```

**What it does:**
- Takes EntropyOracle address as parameter
- Validates the address is not zero
- Stores the oracle interface
- Initializes lottery round to 1
- Emits `LotteryStarted` event

**Why it matters:**
- Must use the correct oracle address: `0x75b923d7940E1BD6689EbFdbBDCD74C1f6695361`
- Round tracking enables multiple lotteries

#### 2. Enter Lottery

```solidity
function enter() external {
    require(!lotteryComplete, "Lottery already complete");
    require(!hasParticipated[lotteryRound][msg.sender], "Already participated in this round");
    
    participants.push(msg.sender);
    hasParticipated[lotteryRound][msg.sender] = true;
    
    emit ParticipantAdded(msg.sender, lotteryRound);
}
```

**What it does:**
- Checks lottery is not complete
- Checks user hasn't participated in this round
- Adds user to participants array
- Marks user as participated for this round
- Emits `ParticipantAdded` event

**Key concepts:**
- **Round-based participation**: Each round is separate
- **One entry per round**: User can only enter once per round
- **Participant tracking**: Array stores all participants

**Why round-based:**
- Allows multiple lotteries
- Users can enter new rounds after reset
- Prevents duplicate entries in same round

#### 3. Select Winner

```solidity
function selectWinner() external payable {
    require(!lotteryComplete, "Lottery already complete");
    require(participants.length > 0, "No participants");
    
    // Request entropy
    bytes32 tag = keccak256("lottery-winner-selection");
    uint256 requestId = entropyOracle.requestEntropy{value: msg.value}(tag);
    winningRequestId = requestId;
    
    // Simplified: Use request ID modulo participants length
    // In real implementation, decrypt entropy first
    uint256 winnerIndex = requestId % participants.length;
    winner = participants[winnerIndex];
    lotteryComplete = true;
    
    emit WinnerSelected(winner, requestId, lotteryRound);
}
```

**What it does:**
- Checks lottery is not complete
- Checks there are participants
- Requests entropy from EntropyOracle
- Uses request ID to select random winner (simplified)
- Marks lottery as complete
- Emits `WinnerSelected` event

**Key concepts:**
- **Entropy request**: Gets encrypted randomness
- **Winner selection**: Uses entropy to select random winner
- **Simplified approach**: Uses request ID modulo (in production, decrypt entropy)

**Why simplified:**
- Full FHE implementation would decrypt entropy or use FHE operations
- This example shows the pattern
- Production: Decrypt entropy off-chain or use FHE.mod operations

#### 4. Reset Lottery

```solidity
function resetLottery() external {
    require(lotteryComplete, "Lottery must be complete before reset");
    
    delete participants;
    lotteryComplete = false;
    winner = address(0);
    winningRequestId = 0;
    lotteryRound++;
    
    emit LotteryReset(lotteryRound);
    emit LotteryStarted(lotteryRound);
}
```

**What it does:**
- Checks lottery is complete
- Clears participants array
- Resets lottery state
- Increments lottery round
- Emits reset and start events

**Why it's needed:**
- Allows new lottery rounds
- Clears previous round data
- Enables continuous lottery system

## 🧪 Step-by-Step Testing

### Prerequisites

1. **Install dependencies:**
   ```bash
   npm install --legacy-peer-deps
   ```

2. **Compile contracts:**
   ```bash
   npx hardhat compile
   ```

### Running Tests

```bash
npx hardhat test
```

### What Happens in Tests

1. **Fixture Setup** (`deployContractFixture`):
   - Deploys FHEChaosEngine, EntropyOracle, and SimpleLottery
   - Returns all contract instances

2. **Test: Enter Lottery**
   ```typescript
   it("Should allow users to enter lottery", async function () {
     await contract.connect(user1).enter();
     await contract.connect(user2).enter();
     
     const [count, complete, winner, round] = await contract.getStatus();
     expect(count).to.equal(2);
   });
   ```
   - Multiple users enter the lottery
   - Verifies participant count

3. **Test: Select Winner**
   ```typescript
   it("Should select random winner", async function () {
     // ... enter lottery code ...
     const fee = await oracle.getFee();
     await contract.selectWinner({ value: fee });
     
     const [count, complete, winner, round] = await contract.getStatus();
     expect(complete).to.be.true;
     expect(winner).to.be.oneOf([user1.address, user2.address]);
   });
   ```
   - Selects winner using entropy
   - Verifies lottery is complete
   - Verifies winner is one of the participants

### Expected Test Output

```
  SimpleLottery
    Deployment
      ✓ Should deploy successfully
      ✓ Should have EntropyOracle address set
    Lottery Operations
      ✓ Should allow users to enter lottery
      ✓ Should prevent duplicate entries
      ✓ Should select random winner
      ✓ Should reset lottery for new round

  6 passing
```

**Note:** Winner selection uses entropy for fairness. In production, decrypt entropy off-chain or use FHE operations.

## 🚀 Step-by-Step Deployment

### Option 1: Frontend (Recommended)

1. Navigate to [Examples page](https://entrofhe.vercel.app/examples)
2. Find "SimpleLottery" in Tutorial Examples
3. Click **"Deploy"** button
4. Approve transaction in wallet
5. Wait for deployment confirmation
6. Copy deployed contract address

### Option 2: CLI

1. **Create deploy script** (`scripts/deploy.ts`):
   ```typescript
   import hre from "hardhat";

   async function main() {
     const ENTROPY_ORACLE_ADDRESS = "0x75b923d7940E1BD6689EbFdbBDCD74C1f6695361";
     
     const ContractFactory = await hre.ethers.getContractFactory("SimpleLottery");
     const contract = await ContractFactory.deploy(ENTROPY_ORACLE_ADDRESS);
     await contract.waitForDeployment();
     
     const address = await contract.getAddress();
     console.log("SimpleLottery deployed to:", address);
   }

   main().catch((error) => {
     console.error(error);
     process.exitCode = 1;
   });
   ```

2. **Deploy:**
   ```bash
   npx hardhat run scripts/deploy.ts --network sepolia
   ```

## ✅ Step-by-Step Verification

### Option 1: Frontend

1. After deployment, click **"Verify"** button on Examples page
2. Wait for verification confirmation
3. View verified contract on Etherscan

### Option 2: CLI

```bash
npx hardhat verify --network sepolia <CONTRACT_ADDRESS> 0x75b923d7940E1BD6689EbFdbBDCD74C1f6695361
```

**Important:** Constructor argument must be the EntropyOracle address: `0x75b923d7940E1BD6689EbFdbBDCD74C1f6695361`

## 📊 Expected Outputs

### After Enter Lottery

- `participants.length` increases
- `hasParticipated[round][user]` returns `true`
- `ParticipantAdded` event emitted

### After Select Winner

- `lotteryComplete` returns `true`
- `winner` contains winner address
- `winningRequestId` contains entropy request ID
- `WinnerSelected` event emitted

### After Reset Lottery

- `participants.length` returns 0
- `lotteryComplete` returns `false`
- `lotteryRound` increments
- `LotteryReset` and `LotteryStarted` events emitted

## ⚠️ Common Errors & Solutions

### Error: `Already participated in this round`

**Cause:** User trying to enter lottery twice in the same round.

**Solution:**
```solidity
require(!hasParticipated[lotteryRound][msg.sender], "Already participated");
```

**Prevention:** Check participation status before allowing entry.

---

### Error: `Lottery already complete`

**Cause:** Trying to enter or select winner after lottery is complete.

**Solution:** Reset lottery to start a new round, or wait for new round.

---

### Error: `No participants`

**Cause:** Trying to select winner when no one has entered.

**Solution:** Ensure at least one participant has entered before selecting winner.

---

### Error: `Insufficient fee`

**Cause:** Not sending enough ETH when selecting winner.

**Solution:** Always send exactly 0.00001 ETH:
```typescript
const fee = await contract.entropyOracle.getFee();
await contract.selectWinner({ value: fee });
```

---

### Error: Verification failed - Constructor arguments mismatch

**Cause:** Wrong constructor argument used during verification.

**Solution:** Always use the EntropyOracle address:
```bash
npx hardhat verify --network sepolia <CONTRACT_ADDRESS> 0x75b923d7940E1BD6689EbFdbBDCD74C1f6695361
```

## 🔗 Related Examples

- [RandomNumberGenerator](../advanced-randomnumbergenerator/) - Random number generation
- [EntropyNFT](../advanced-entropynft/) - NFT with entropy-based traits
- [Category: advanced](../)

## 📚 Additional Resources

- [Full Tutorial Track Documentation](../../../frontend/src/pages/Docs.tsx) - Complete educational guide
- [Zama FHEVM Documentation](https://docs.zama.org/) - Official FHEVM docs
- [GitHub Repository](https://github.com/zacnider/fhevm-example-advanced-simplelottery) - Source code

## 📝 License

BSD-3-Clause-Clear
