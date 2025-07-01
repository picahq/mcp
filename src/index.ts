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
  formatConnectionsInfo,
  formatAvailablePlatformsInfo,
  buildIntegrationsStatusMessage,
  formatAvailableActionsInfo,
  buildAvailableActionsMessage,
  buildPicaApiConnectorsDocumentation,
  buildPicaApiActionsDocumentation,
  buildActionKnowledgeWithGuidance,
} from './helpers.js';
import {
  listPicaIntegrationsToolConfig,
  getPicaPlatformActionsToolConfig,
  getPicaActionKnowledgeToolConfig,
  executePicaActionToolConfig,
  listPicaIntegrationsZodSchema,
  getPicaPlatformActionsZodSchema,
  getPicaActionKnowledgeZodSchema,
  executePicaActionZodSchema
} from './schemas.js';
import {
  ListPicaIntegrationsArgs,
  GetPicaPlatformActionsArgs,
  GetPicaActionKnowledgeArgs,
  ExecutePicaActionArgs
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
const picaClient = new PicaClient(PICA_SECRET, PICA_BASE_URL);

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
      console.log("Pica client initialized successfully");
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
  "get_pica_platform_actions",
  getPicaPlatformActionsToolConfig,
  async (args: z.infer<typeof getPicaPlatformActionsZodSchema>) => {
    await initializePica();
    return await handleGetPlatformActions(args as GetPicaPlatformActionsArgs);
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

server.registerTool(
  "execute_pica_action",
  executePicaActionToolConfig,
  async (args: z.infer<typeof executePicaActionZodSchema>) => {
    await initializePica();
    return await handleExecutePicaAction(args as ExecutePicaActionArgs);
  }
);

async function handleGetIntegrations(args: ListPicaIntegrationsArgs) {
  try {
    const connectedIntegrations = picaClient.getUserConnections();
    const availableIntegrations = picaClient.getAvailableConnectors();

    const connectionsInfo = formatConnectionsInfo(connectedIntegrations);
    const availablePlatformsInfo = formatAvailablePlatformsInfo(availableIntegrations);
    const activeAvailableCount = availableIntegrations.filter(def => def.active && !def.deprecated).length;

    const statusMessage = buildIntegrationsStatusMessage(
      connectionsInfo,
      availablePlatformsInfo,
      connectedIntegrations.length,
      activeAvailableCount
    );

    const apiDocumentation = buildPicaApiConnectorsDocumentation(picaClient.getBaseUrl());

    const fullResponse = `${statusMessage}\n\n---\n\n${apiDocumentation}`;

    return {
      content: [
        {
          type: "text" as const,
          text: fullResponse,
        },
      ],
    };
  } catch (error) {
    throw new McpError(
      ErrorCode.InternalError,
      `Failed to retrieve integrations: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

async function handleGetPlatformActions(args: GetPicaPlatformActionsArgs) {
  try {
    const actions = await picaClient.getAvailableActions(args.platform);
    const actionsInfo = formatAvailableActionsInfo(actions, args.platform);
    const statusMessage = buildAvailableActionsMessage(actionsInfo, args.platform, actions.length);

    const apiDocumentation = buildPicaApiActionsDocumentation(picaClient.getBaseUrl(), args.platform);

    const fullResponse = `${statusMessage}\n\n---\n\n${apiDocumentation}`;

    return {
      content: [
        {
          type: "text" as const,
          text: fullResponse,
        },
      ],
    };
  } catch (error) {
    throw new McpError(
      ErrorCode.InternalError,
      `Failed to retrieve platform actions: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

async function handleGetActionKnowledge(args: GetPicaActionKnowledgeArgs) {
  try {
    const actionId = args.action_id;
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
    const result = await picaClient.executePassthroughRequest(args);

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
    console.log("Pica MCP server running on stdio");

    if (process.env.DEBUG === 'true') {
      console.error("Debug mode enabled");
      console.error(`PICA_BASE_URL: ${PICA_BASE_URL}`);
    }
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
