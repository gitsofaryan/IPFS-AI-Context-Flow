// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "fhevm/lib/TFHE.sol";
import "fhevm/gateway/GatewayCaller.sol";
import "fhevm/gateway/lib/Gateway.sol";

/**
 * @title ConfidentialFinance
 * @dev Enables agents to manage private financial strategies and thresholds using Zama fhEVM.
 * Fulfills the Zama Bounty: "Confidential and verifiable onchain finance".
 */
contract ConfidentialFinance is GatewayCaller {
    // Private risk thresholds (e.g. max slippage, max trade size)
    mapping(address => euint64) private riskThresholds;
    // Private strategy flags (encrypted bits)
    mapping(address => euint8) private strategyFlags;
    
    mapping(address => bool) public hasStrategy;

    event StrategyStored(address indexed agent);
    event TradeVerified(address indexed agent, bool allowed);

    /**
     * @dev Store an encrypted risk threshold (e.g. Max permissible loss in basis points)
     */
    function setRiskThreshold(einput encryptedThreshold, bytes memory inputProof) public {
        euint64 threshold = TFHE.asEuint64(encryptedThreshold, inputProof);
        TFHE.allowThis(threshold);
        TFHE.allow(threshold, msg.sender);
        
        riskThresholds[msg.sender] = threshold;
        hasStrategy[msg.sender] = true;
        
        emit StrategyStored(msg.sender);
    }

    /**
     * @dev Verify if a proposed trade amount is within the encrypted risk threshold.
     * This allows an agent to prove it is following its private strategy without revealing the threshold.
     */
    function verifyTradeLimit(einput tradeAmountHandle, bytes memory inputProof) public view returns (ebool) {
        require(hasStrategy[msg.sender], "No strategy stored");
        
        euint64 tradeAmount = TFHE.asEuint64(tradeAmountHandle, inputProof);
        euint64 threshold = riskThresholds[msg.sender];
        
        // Return true if tradeAmount <= threshold
        ebool result = TFHE.le(tradeAmount, threshold);
        TFHE.allow(result, msg.sender);
        
        return result;
    }

    /**
     * @dev Confidential logic: Compute if multiple encrypted strategies align
     */
    function checkStrategyAlignment(euint8 otherStrategy) public view returns (ebool) {
        euint8 myStrategy = strategyFlags[msg.sender];
        // Bitwise AND on encrypted data - only returns true handle if both are active
        ebool aligned = TFHE.ne(TFHE.and(myStrategy, otherStrategy), TFHE.asEuint8(0));
        TFHE.allow(aligned, msg.sender);
        return aligned;
    }
}
