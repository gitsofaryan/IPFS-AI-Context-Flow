// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "fhevm/lib/TFHE.sol";
import "fhevm/gateway/GatewayCaller.sol";

contract EncryptedAgentMemory is GatewayCaller {
    // Map Agent DID (as an address or string hash) to their encrypted private secret
    mapping(address => euint64) private agentSecrets;

    // Event emitted when a secret is stored
    event SecretStored(address indexed agent);

    // Storing an encrypted secret. 
    // The agent sends the encrypted data (einput) and the proof.
    function storeSecret(einput _encryptedSecret, bytes calldata _proof) public {
        euint64 newSecret = TFHE.asEuint64(_encryptedSecret, _proof);
        
        // Only the agent can overwrite their own secret, or we just overwrite it
        agentSecrets[msg.sender] = newSecret;
        
        emit SecretStored(msg.sender);
    }

    // Agents can verify if their stored secret matches a specific value
    // without revealing the secret itself on-chain!
    function verifySecret(einput _guessSecret, bytes calldata _proof) public returns (ebool) {
        euint64 guess = TFHE.asEuint64(_guessSecret, _proof);
        euint64 actualSecret = agentSecrets[msg.sender];
        
        // TFHE.eq returns an encrypted boolean (ebool) representing if they match
        return TFHE.eq(guess, actualSecret);
    }

    // In a full Zama implementation, reading the actual secret requires
    // requesting decryption via the Gateway, which we omit here for simplicity
    // of the hackathon prototype.
}
