// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.27;

import {FHE, euint64} from "@fhevm/solidity/lib/FHE.sol";
import "./IEntropyOracle.sol";

/**
 * @title SimpleLottery
 * @notice Simple lottery using entropy oracle
 * @dev Example demonstrating how to use EntropyOracle for lottery winner selection
 * 
 * This example shows:
 * - Integrating with an entropy oracle
 * - Using entropy for random selection
 * - Round-based lottery system
 */
contract SimpleLottery {
    IEntropyOracle public entropyOracle;
    
    // Lottery state
    address[] public participants;
    mapping(uint256 => mapping(address => bool)) public hasParticipated; // Round-based participation
    uint256 public winningRequestId;
    address public winner;
    bool public lotteryComplete;
    uint256 public lotteryRound; // Track lottery rounds
    
    event LotteryStarted(uint256 indexed round);
    event ParticipantAdded(address indexed participant, uint256 indexed round);
    event WinnerSelected(address indexed winner, uint256 indexed requestId, uint256 indexed round);
    event LotteryReset(uint256 indexed newRound);
    
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
     * @notice Select winner using entropy oracle
     * @dev Requires 0.00001 ETH fee for entropy request
     */
    function selectWinner() external payable {
        require(!lotteryComplete, "Lottery already complete");
        require(participants.length > 0, "No participants");
        
        // Request entropy
        bytes32 tag = keccak256("lottery-winner-selection");
        uint256 requestId = entropyOracle.requestEntropy{value: msg.value}(tag);
        winningRequestId = requestId;
        
        // Get encrypted entropy
        // euint64 entropy = entropyOracle.getEncryptedEntropy(requestId);
        
        // Use entropy to select winner
        // Note: In a real implementation, you'd need to decrypt or use FHE operations
        // For this example, we'll use a simplified approach
        // In practice, you'd decrypt the entropy and use it to select winner
        
        // Simplified: Use request ID modulo participants length
        // In real implementation, decrypt entropy first
        uint256 winnerIndex = requestId % participants.length;
        winner = participants[winnerIndex];
        lotteryComplete = true;
        
        emit WinnerSelected(winner, requestId, lotteryRound);
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
        lotteryRound++;
        
        emit LotteryReset(lotteryRound);
        emit LotteryStarted(lotteryRound);
    }
}
