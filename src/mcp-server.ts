import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { AgentRuntime } from "./lib/runtime.js";
import { z } from "zod";

/**
 * Agent DB MCP Server
 * Provides decentralized memory, encryption, and delegation tools to AI models.
 */

const server = new Server(
  {
    name: "agent-db",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

let activeAgent: AgentRuntime | null = null;

// Tool Definitions
const TOOLS = [
  {
    name: "init_agent",
    description: "Initialize or log in as an AI agent using a secret seed phrase.",
    inputSchema: {
      type: "object",
      properties: {
        seed: { type: "string", description: "The secret seed phrase for the agent identity." },
      },
      required: ["seed"],
    },
  },
  {
    name: "store_memory",
    description: "Save public context or data to decentralized storage (IPFS).",
    inputSchema: {
      type: "object",
      properties: {
        data: { type: "object", description: "The JSON data to store." },
      },
      required: ["data"],
    },
  },
  {
    name: "retrieve_memory",
    description: "Recall public data from decentralized storage using a CID.",
    inputSchema: {
      type: "object",
      properties: {
        cid: { type: "string", description: "The CID of the memory to labels." },
      },
      required: ["cid"],
    },
  },
  {
    name: "store_private_memory",
    description: "Encrypt (ECIES) and store sensitive data that only this agent can read.",
    inputSchema: {
      type: "object",
      properties: {
        data: { type: "object", description: "The sensitive JSON data to encrypt and store." },
      },
      required: ["data"],
    },
  },
  {
    name: "retrieve_private_memory",
    description: "Retrieve and decrypt private data from the agent's secure vault.",
    inputSchema: {
      type: "object",
      properties: {
        cid: { type: "string", description: "The CID of the encrypted memory." },
      },
      required: ["cid"],
    },
  },
  {
    name: "delegate_access",
    description: "Grant another agent permission to access your memory using a UCAN ticket.",
    inputSchema: {
      type: "object",
      properties: {
        target_did: { type: "string", description: "The DID of the agent receiving access." },
        capability: { type: "string", description: "The permission type (e.g., 'agent/read').", default: "agent/read" },
        expiry_hours: { type: "number", description: "How long the access lasts in hours.", default: 24 },
      },
      required: ["target_did"],
    },
  },
];

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "init_agent": {
        const { seed } = args as { seed: string };
        activeAgent = await AgentRuntime.loadFromSeed(seed);
        return {
          content: [{ type: "text", text: `Agent initialized successfully. DID: ${activeAgent.did}` }],
        };
      }

      case "store_memory": {
        if (!activeAgent) throw new Error("Agent not initialized. Call init_agent first.");
        const { data } = args as { data: object };
        const cid = await activeAgent.storePublicMemory(data);
        return {
          content: [{ type: "text", text: `Memory stored successfully. CID: ${cid}` }],
        };
      }

      case "retrieve_memory": {
        if (!activeAgent) throw new Error("Agent not initialized. Call init_agent first.");
        const { cid } = args as { cid: string };
        const data = await activeAgent.retrievePublicMemory(cid);
        return {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        };
      }

      case "store_private_memory": {
        if (!activeAgent) throw new Error("Agent not initialized. Call init_agent first.");
        const { data } = args as { data: object };
        const cid = await activeAgent.storePrivateMemory(data);
        return {
          content: [{ type: "text", text: `Private memory encrypted and stored. CID: ${cid}` }],
        };
      }

      case "retrieve_private_memory": {
        if (!activeAgent) throw new Error("Agent not initialized. Call init_agent first.");
        const { cid } = args as { cid: string };
        const data = await activeAgent.retrievePrivateMemory(cid);
        return {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        };
      }

      case "delegate_access": {
        if (!activeAgent) throw new Error("Agent not initialized. Call init_agent first.");
        const { target_did, capability, expiry_hours } = args as { 
          target_did: string; 
          capability: string; 
          expiry_hours: number 
        };
        const token = await activeAgent.delegateTo(target_did, capability || "agent/read", expiry_hours || 24);
        return {
          content: [{ type: "text", text: `Access delegated. UCAN Token: ${token}` }],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [{ type: "text", text: `Error: ${(error as Error).message}` }],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Agent DB MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
