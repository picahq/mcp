#!/usr/bin/env node

/**
 * Pica MCP Server - Main Entry Point
 * 
 * This is the main MCP (Model Context Protocol) server implementation for Pica.
 * 
 * @fileoverview Main MCP server implementation with Pica API integration
 * @author Pica
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { PicaClient } from './client.js';
import {
  buildActionKnowledgeWithGuidance,
  filterByPermissions,
  isMethodAllowed,
  isActionAllowed,
} from './helpers.js';
import {
  listPicaIntegrationsToolConfig,
  searchPicaPlatformActionsToolConfig,
  getPicaActionKnowledgeToolConfig,
  executePicaActionToolConfig,
  listPicaIntegrationsZodSchema,
  searchPicaPlatformActionsZodSchema,
  getPicaActionKnowledgeZodSchema,
  executePicaActionZodSchema
} from './schemas.js';
import {
  ListPicaIntegrationsArgs,
  SearchPicaPlatformActionsArgs,
  GetPicaActionKnowledgeArgs,
  ExecutePicaActionArgs,
  ListIntegrationsResponse,
  SearchActionsResponse,
  PermissionLevel
} from './types.js';
import { z } from 'zod';

const SERVER_NAME = "pica-mcp-server";
const SERVER_VERSION = "1.0.0";

const PICA_SECRET = process.env.PICA_SECRET;
if (!PICA_SECRET) {
  console.error("PICA_SECRET environment variable is required");
  process.exit(1);
}

const PICA_BASE_URL = process.env.PICA_BASE_URL || "https://api.picaos.com";
const PICA_IDENTITY = process.env.PICA_IDENTITY;
const PICA_IDENTITY_TYPE = process.env.PICA_IDENTITY_TYPE as 'user' | 'team' | 'organization' | 'project' | undefined;

const PICA_PERMISSIONS: PermissionLevel = (process.env.PICA_PERMISSIONS as PermissionLevel) || "admin";
if (!["read", "write", "admin"].includes(PICA_PERMISSIONS)) {
  console.error(`Invalid PICA_PERMISSIONS value: "${PICA_PERMISSIONS}". Must be one of: read, write, admin`);
  process.exit(1);
}

const PICA_CONNECTION_KEYS: string[] = process.env.PICA_CONNECTION_KEYS
  ? process.env.PICA_CONNECTION_KEYS.split(",").map(s => s.trim()).filter(Boolean)
  : ["*"];

const PICA_ACTION_IDS: string[] = process.env.PICA_ACTION_IDS
  ? process.env.PICA_ACTION_IDS.split(",").map(s => s.trim()).filter(Boolean)
  : ["*"];

const PICA_KNOWLEDGE_AGENT: boolean = process.env.PICA_KNOWLEDGE_AGENT === "true";

const picaClient = new PicaClient({
  secret: PICA_SECRET,
  baseUrl: PICA_BASE_URL,
  identity: PICA_IDENTITY,
  identityType: PICA_IDENTITY_TYPE,
  connectionKeys: PICA_CONNECTION_KEYS,
});

let picaInitialized = false;
let initializationPromise: Promise<void> | null = null;

const initializePica = async () => {
  if (picaInitialized) {
    return;
  }

  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = (async () => {
    try {
      await picaClient.initialize();
      picaInitialized = true;
    } catch (error) {
      console.error("Failed to initialize Pica client:", error);
      initializationPromise = null;
      throw error;
    }
  })();

  return initializationPromise;
};

const server = new McpServer(
  {
    name: SERVER_NAME,
    version: SERVER_VERSION,
  }
);

server.registerTool(
  "list_pica_integrations",
  listPicaIntegrationsToolConfig,
  async (args: z.infer<typeof listPicaIntegrationsZodSchema>) => {
    await initializePica();
    return await handleGetIntegrations(args as ListPicaIntegrationsArgs);
  }
);

server.registerTool(
  "search_pica_platform_actions",
  searchPicaPlatformActionsToolConfig,
  async (args: z.infer<typeof searchPicaPlatformActionsZodSchema>) => {
    await initializePica();
    return await handleSearchPlatformActions(args as SearchPicaPlatformActionsArgs);
  }
);

server.registerTool(
  "get_pica_action_knowledge",
  getPicaActionKnowledgeToolConfig,
  async (args: z.infer<typeof getPicaActionKnowledgeZodSchema>) => {
    await initializePica();
    return await handleGetActionKnowledge(args as GetPicaActionKnowledgeArgs);
  }
);

if (!PICA_KNOWLEDGE_AGENT) {
  server.registerTool(
    "execute_pica_action",
    executePicaActionToolConfig,
    async (args: z.infer<typeof executePicaActionZodSchema>) => {
      await initializePica();
      return await handleExecutePicaAction(args as ExecutePicaActionArgs);
    }
  );
}

async function handleGetIntegrations(args: ListPicaIntegrationsArgs) {
  try {
    const connectedIntegrations = picaClient.getUserConnections();
    const availableIntegrations = picaClient.getAvailableConnectors();

    const activeConnections = connectedIntegrations.filter(conn => conn.active);
    let activePlatforms = availableIntegrations.filter(def => def.active && !def.deprecated);

    // When connection keys are scoped, only show platforms that match active connections
    if (!PICA_CONNECTION_KEYS.includes("*")) {
      const connectedPlatforms = new Set(activeConnections.map(conn => conn.platform));
      activePlatforms = activePlatforms.filter(def => connectedPlatforms.has(def.platform));
    }

    const structuredResponse: ListIntegrationsResponse = {
      connections: activeConnections.map(conn => ({
        platform: conn.platform,
        key: conn.key,
        tags: conn.tags ?? []
      })),
      availablePlatforms: activePlatforms.map(def => ({
        platform: def.platform,
        name: def.name,
        category: def.category
      })),
      summary: {
        connectedCount: activeConnections.length,
        availableCount: activePlatforms.length
      }
    };

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(structuredResponse, null, 2),
        },
      ],
      structuredContent: structuredResponse,
    };
  } catch (error) {
    throw new McpError(
      ErrorCode.InternalError,
      `Failed to retrieve integrations: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

async function handleSearchPlatformActions(args: SearchPicaPlatformActionsArgs) {
  try {
    // Force knowledge mode when PICA_KNOWLEDGE_AGENT is enabled
    const agentType = PICA_KNOWLEDGE_AGENT ? "knowledge" : args.agentType;
    let actions = await picaClient.searchAvailableActions(args.platform, args.query, agentType);

    // Apply permission-level filtering
    actions = filterByPermissions(actions, PICA_PERMISSIONS);

    // Apply action allowlist filtering
    actions = actions.filter(a => isActionAllowed(a.systemId, PICA_ACTION_IDS));

    const cleanedActions = actions.map(action => ({
      actionId: action.systemId,
      title: action.title,
      method: action.method,
      path: action.path
    }));

    // Handle empty results with helpful suggestions
    if (cleanedActions.length === 0) {
      const suggestionsText = `No actions found for platform '${args.platform}' matching query '${args.query}'.

SUGGESTIONS:
- Try a more general query (e.g., 'list', 'get', 'search', 'create')
- Verify the platform name is correct
- Check that actions exist for this platform using list_pica_integrations

EXAMPLES OF GOOD QUERIES:
- "search contacts"
- "send email"
- "create customer"
- "list orders"`;

      return {
        content: [
          {
            type: "text" as const,
            text: suggestionsText,
          },
        ],
      };
    }

    // Build structured response
    const structuredResponse: SearchActionsResponse = {
      actions: cleanedActions,
      metadata: {
        platform: args.platform,
        query: args.query,
        count: cleanedActions.length
      }
    };

    const responseText = `Found ${cleanedActions.length} action(s) for platform '${args.platform}' matching query '${args.query}':

${JSON.stringify(structuredResponse, null, 2)}

NEXT STEP: Use get_pica_action_knowledge with an actionId to get detailed documentation before building requests or executing actions.`;

    return {
      content: [
        {
          type: "text" as const,
          text: responseText,
        },
      ],
      structuredContent: structuredResponse,
    };
  } catch (error) {
    throw new McpError(
      ErrorCode.InternalError,
      `Failed to search platform actions: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

async function handleGetActionKnowledge(args: GetPicaActionKnowledgeArgs) {
  try {
    const actionId = args.actionId;

    if (!isActionAllowed(actionId, PICA_ACTION_IDS)) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        `Action "${actionId}" is not in the allowed action list`
      );
    }
    const { knowledge, method } = await picaClient.getActionKnowledge(actionId);

    const knowledgeWithGuidance = buildActionKnowledgeWithGuidance(
      knowledge,
      method,
      picaClient.getBaseUrl(),
      args.platform,
      actionId
    );

    return {
      content: [
        {
          type: "text" as const,
          text: knowledgeWithGuidance,
        },
      ],
    };
  } catch (error) {
    throw new McpError(
      ErrorCode.InternalError,
      `Failed to retrieve action knowledge: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

async function handleExecutePicaAction(args: ExecutePicaActionArgs) {
  try {
    if (!isActionAllowed(args.actionId, PICA_ACTION_IDS)) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        `Action "${args.actionId}" is not in the allowed action list`
      );
    }

    const actionDetails = await picaClient.getActionDetails(args.actionId);

    if (!isMethodAllowed(actionDetails.method, PICA_PERMISSIONS)) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        `Method "${actionDetails.method}" is not allowed under "${PICA_PERMISSIONS}" permission level`
      );
    }

    const result = await picaClient.executePassthroughRequest(args, actionDetails);

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    throw new McpError(
      ErrorCode.InternalError,
      `Failed to execute Pica action: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

async function main() {
  try {
    const transport = new StdioServerTransport();
    await server.connect(transport);
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

process.on('SIGINT', async () => {
  console.error('Shutting down server...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.error('Shutting down server...');
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
