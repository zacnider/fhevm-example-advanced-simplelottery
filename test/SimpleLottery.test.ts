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
    
    // Note: SimpleLottery doesn't use FHE directly, only EntropyOracle
    // So we don't need to assert coprocessor initialization
    
    return { contract, owner, user1, user2, oracleAddress, oracle, chaosEngine: chaosEngine || null };
  }

  describe("Deployment", function () {
    it("Should deploy successfully", async function () {
      const { contract } = await loadFixture(deployContractFixture);
      expect(await contract.getAddress()).to.be.properAddress;
    });
  });

  // TODO: Add comprehensive test cases for lottery functionality
  // Note: These tests require a deployed EntropyOracle contract
  describe("Functionality", function () {
    it("Should have correct initial state", async function () {
      const { contract } = await loadFixture(deployContractFixture);
      const status = await contract.getStatus();
      expect(status[0]).to.equal(0); // participantCount
      expect(status[1]).to.be.false; // complete
    });
  });
});
