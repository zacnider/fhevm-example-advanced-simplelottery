import { expect } from "chai";
import hre from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { SimpleLottery } from "../types";

/**
 * @title SimpleLottery Tests
 * @notice Comprehensive tests for SimpleLottery contract
 * @chapter advanced
 */
describe("SimpleLottery", function () {
  async function deployContractFixture() {
    const [owner, user1, user2] = await hre.ethers.getSigners();
    
    // Check if we're on Sepolia and have real oracle address
    const network = await hre.ethers.provider.getNetwork();
    const isSepolia = network.chainId === BigInt(11155111);
    const realOracleAddress = process.env.ENTROPY_ORACLE_ADDRESS || "0x75b923d7940E1BD6689EbFdbBDCD74C1f6695361";
    
    let oracleAddress: string;
    let oracle: any;
    let chaosEngine: any;
    
    if (isSepolia && realOracleAddress && realOracleAddress !== "0x0000000000000000000000000000000000000000") {
      // Use real deployed EntropyOracle on Sepolia
      console.log(`Using real EntropyOracle on Sepolia: ${realOracleAddress}`);
      oracleAddress = realOracleAddress;
      const OracleFactory = await hre.ethers.getContractFactory("EntropyOracle");
      oracle = OracleFactory.attach(oracleAddress);
    } else {
      // Deploy locally for testing
      console.log("Deploying EntropyOracle locally for testing...");
      
      // Deploy FHEChaosEngine
      const ChaosEngineFactory = await hre.ethers.getContractFactory("FHEChaosEngine");
      chaosEngine = await ChaosEngineFactory.deploy(owner.address);
      await chaosEngine.waitForDeployment();
      const chaosEngineAddress = await chaosEngine.getAddress();
      
      // Initialize master seed for FHEChaosEngine
      const masterSeedInput = hre.fhevm.createEncryptedInput(chaosEngineAddress, owner.address);
      masterSeedInput.add64(12345); // Use a test seed value
      const encryptedMasterSeed = await masterSeedInput.encrypt();
      await chaosEngine.initializeMasterSeed(encryptedMasterSeed.handles[0], encryptedMasterSeed.inputProof);
      
      // Deploy EntropyOracle
      const OracleFactory = await hre.ethers.getContractFactory("EntropyOracle");
      oracle = await OracleFactory.deploy(chaosEngineAddress, owner.address, owner.address);
      await oracle.waitForDeployment();
      oracleAddress = await oracle.getAddress();
    }
    
    // Deploy SimpleLottery
    const ContractFactory = await hre.ethers.getContractFactory("SimpleLottery");
    const contract = await ContractFactory.deploy(oracleAddress) as any;
    await contract.waitForDeployment();
    
    // SimpleLottery now uses FHE operations, so we need coprocessor initialization
    await hre.fhevm.assertCoprocessorInitialized(await contract.getAddress());
    
    return { contract, owner, user1, user2, oracleAddress, oracle, chaosEngine: chaosEngine || null };
  }

  describe("Deployment", function () {
    it("Should deploy successfully", async function () {
      const { contract } = await loadFixture(deployContractFixture);
      expect(await contract.getAddress()).to.be.properAddress;
    });
    
    it("Should have correct EntropyOracle address", async function () {
      const { contract, oracleAddress } = await loadFixture(deployContractFixture);
      expect(await contract.getEntropyOracle()).to.equal(oracleAddress);
    });
  });

  describe("Lottery Functionality", function () {
    it("Should have correct initial state", async function () {
      const { contract } = await loadFixture(deployContractFixture);
      const status = await contract.getStatus();
      expect(status[0]).to.equal(0); // participantCount
      expect(status[1]).to.be.false; // complete
      expect(status[3]).to.equal(1); // round
    });
    
    it("Should allow users to enter lottery", async function () {
      const { contract, user1 } = await loadFixture(deployContractFixture);
      await contract.connect(user1).enter();
      const status = await contract.getStatus();
      expect(status[0]).to.equal(1); // participantCount
    });
    
    it("Should request entropy and select winner with FHE", async function () {
      const { contract, user1, user2, oracle } = await loadFixture(deployContractFixture);
      
      // Enter lottery
      await contract.connect(user1).enter();
      await contract.connect(user2).enter();
      
      // Request entropy
      const tag = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("lottery-winner-selection"));
      const fee = await oracle.getFee();
      const tx = await contract.connect(user1).requestEntropy(tag, { value: fee });
      const receipt = await tx.wait();
      
      // Get request ID from event
      const event = receipt?.logs.find((log: any) => {
        try {
          const parsed = oracle.interface.parseLog(log);
          return parsed?.name === "EntropyRequested";
        } catch {
          return false;
        }
      });
      
      if (event) {
        const parsed = oracle.interface.parseLog(event);
        const requestId = parsed?.args[0];
        
        // Wait for entropy to be fulfilled (local testing)
        if (await oracle.isRequestFulfilled(requestId)) {
          // Select winner with entropy (using FHE operations)
          await contract.connect(user1).selectWinnerWithEntropy(requestId);
          
          const status = await contract.getStatus();
          expect(status[1]).to.be.true; // complete
          expect(status[2]).to.be.properAddress; // winner
          
          // Check if entropy is stored
          expect(await contract.isEntropyStored()).to.be.true;
        }
      }
    });
  });
});
