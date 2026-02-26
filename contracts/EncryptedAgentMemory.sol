// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "fhevm/lib/TFHE.sol";
import "fhevm/gateway/GatewayCaller.sol";
import "fhevm/gateway/lib/Gateway.sol";

contract EncryptedAgentMemory is GatewayCaller {
    // Map Agent address to their encrypted private secret
    mapping(address => euint64) private agentSecrets;
    // Track whether an agent has a stored secret
    mapping(address => bool) public hasSecret;

    // Decryption request tracking
    mapping(uint256 => address) private decryptionRequests;
    mapping(address => uint64) private decryptedResults;
    mapping(address => bool) public decryptionReady;

    // Events
    event MemoryStored(address indexed agent, uint256 timestamp);
    event MemoryCleared(address indexed agent, uint256 timestamp);
    event DecryptionRequested(address indexed agent, uint256 requestId);
    event SecretDecrypted(address indexed agent, uint256 timestamp);

    /// @notice Store an encrypted secret on-chain using FHE
    /// @param encryptedSecret The encrypted input handle
    /// @param inputProof The proof for the encrypted input
    function storeSecret(einput encryptedSecret, bytes memory inputProof) public {
        euint64 newSecret = TFHE.asEuint64(encryptedSecret, inputProof);

        // Allow this contract to operate on the ciphertext
        TFHE.allowThis(newSecret);
        // Allow the sender to access their own secret
        TFHE.allow(newSecret, msg.sender);

        agentSecrets[msg.sender] = newSecret;
        hasSecret[msg.sender] = true;

        emit MemoryStored(msg.sender, block.timestamp);
    }

    /// @notice Remove the stored secret from on-chain state
    function clearSecret() public {
        // Note: FHE types don't support delete, but clearing hasSecret
        // makes the value inaccessible through contract functions
        hasSecret[msg.sender] = false;
        decryptionReady[msg.sender] = false;

        emit MemoryCleared(msg.sender, block.timestamp);
    }

    /// @notice Verify if a guessed value matches the stored secret without revealing it
    /// @param guessSecret The encrypted guess input handle
    /// @param inputProof The proof for the encrypted guess
    /// @return An encrypted boolean indicating if the guess matches
    function verifySecret(einput guessSecret, bytes memory inputProof) public returns (ebool) {
        require(hasSecret[msg.sender], "No secret stored for this agent");

        euint64 guess = TFHE.asEuint64(guessSecret, inputProof);
        euint64 actualSecret = agentSecrets[msg.sender];

        ebool result = TFHE.eq(guess, actualSecret);

        // Allow the caller to access the result
        TFHE.allow(result, msg.sender);
        TFHE.allowThis(result);

        return result;
    }

    /// @notice Request decryption of the stored secret via the Zama Gateway
    /// @dev Only the agent who stored the secret can request decryption
    function requestSecretDecryption() public {
        require(hasSecret[msg.sender], "No secret stored for this agent");

        uint256[] memory ctsHandles = new uint256[](1);
        ctsHandles[0] = Gateway.toUint256(agentSecrets[msg.sender]);

        uint256 requestId = Gateway.requestDecryption(
            ctsHandles,
            this.onSecretDecrypted.selector,
            0,
            block.timestamp + 100, // 100 second deadline
            false
        );

        decryptionRequests[requestId] = msg.sender;
        emit DecryptionRequested(msg.sender, requestId);
    }

    /// @notice Callback from the Gateway with the decrypted value
    /// @param requestId The ID of the decryption request
    /// @param decryptedValue The decrypted uint64 value
    function onSecretDecrypted(uint256 requestId, uint64 decryptedValue) public onlyGateway {
        address agent = decryptionRequests[requestId];
        require(agent != address(0), "Unknown request");

        decryptedResults[agent] = decryptedValue;
        decryptionReady[agent] = true;

        delete decryptionRequests[requestId];
        emit SecretDecrypted(agent, block.timestamp);
    }

    /// @notice Retrieve the decrypted secret after gateway has processed it
    /// @dev Only the agent who owns the secret can read it
    function getDecryptedSecret() public view returns (uint64) {
        require(decryptionReady[msg.sender], "Decryption not ready or not requested");
        return decryptedResults[msg.sender];
    }
}
