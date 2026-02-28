// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title AgentRegistry
 * @dev On-chain registry for Autonomous AI Agents tracking their Filecoin/IPNS state
 * Fulfills the PL Hacks Filecoin Bounty: "Onchain Agent Registry"
 */
contract AgentRegistry {
    struct Agent {
        string did;             // Decentralized Identifier (e.g. did:key:...)
        string ipnsName;        // Mutable pointer to their current state
        string metadataCid;     // Immutable CID to initial creation metadata
        bool isActive;          // Is the agent currently active
        uint256 registeredAt;   // Timestamp
    }

    // Mapping from an Ethereum address (Agent's wallet) to their Agent profile
    mapping(address => Agent) public agents;
    address[] public registeredAddresses;

    event AgentRegistered(address indexed wallet, string did, string ipnsName, string metadataCid);
    event AgentStateUpdated(address indexed wallet, string newIpnsName);
    event AgentDeactivated(address indexed wallet);

    /**
     * @dev Register a new AI agent on-chain
     */
    function registerAgent(string memory _did, string memory _ipnsName, string memory _metadataCid) public {
        require(bytes(agents[msg.sender].did).length == 0, "Agent already registered");

        agents[msg.sender] = Agent({
            did: _did,
            ipnsName: _ipnsName,
            metadataCid: _metadataCid,
            isActive: true,
            registeredAt: block.timestamp
        });
        
        registeredAddresses.push(msg.sender);

        emit AgentRegistered(msg.sender, _did, _ipnsName, _metadataCid);
    }

    /**
     * @dev Update the IPNS pointer for an agent (e.g. they rotated their keys or started a new stream)
     */
    function updateAgentState(string memory _newIpnsName) public {
        require(agents[msg.sender].isActive, "Agent not active or unregistered");
        
        agents[msg.sender].ipnsName = _newIpnsName;
        
        emit AgentStateUpdated(msg.sender, _newIpnsName);
    }

    /**
     * @dev Deactivate an agent
     */
    function deactivateAgent() public {
        require(agents[msg.sender].isActive, "Agent already inactive");
        agents[msg.sender].isActive = false;
        
        emit AgentDeactivated(msg.sender);
    }

    /**
     * @dev Get total registered agents
     */
    function getTotalAgents() public view returns (uint256) {
        return registeredAddresses.length;
    }
}
