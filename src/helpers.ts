/**
 * Utility Helper Functions
 * 
 * This module contains reusable utility functions used throughout the Pica MCP server.
 * 
 * @fileoverview Utility functions for data processing and API interactions
 * @author Pica
 */

import { Connection, ConnectionDefinition, PaginatedResponse, AvailableAction } from './types.js';
import axios, { AxiosResponse } from 'axios';

/**
 * Paginates through API results by repeatedly calling a fetch function until all data is retrieved.
 * @param fetchFn - Function that fetches paginated data, takes skip and limit parameters
 * @param limit - Maximum number of items to fetch per request (default: 100)
 * @returns Promise that resolves to an array of all paginated results
 */
export async function paginateResults<T>(
  fetchFn: (skip: number, limit: number) => Promise<{
    rows: T[],
    total: number,
    skip: number,
    limit: number
  }>,
  limit = 100
): Promise<T[]> {
  let skip = 0;
  let allResults: T[] = [];
  let total = 0;

  try {
    do {
      const response = await fetchFn(skip, limit);
      const { rows, total: totalCount } = response;
      total = totalCount;
      allResults = [...allResults, ...rows];
      skip += limit;
    } while (allResults.length < total);

    return allResults;
  } catch (error) {
    console.error("Error in pagination:", error);
    throw error;
  }
}

/**
 * Generic function to fetch paginated data from any API endpoint
 * @param baseUrl - The base URL for the API endpoint (without query parameters)
 * @param headers - Headers to include in the request
 * @param additionalParams - Optional additional parameters to include in the request
 * @returns Promise that resolves to an array of all paginated results
 */
export async function fetchPaginatedData<T>(
  baseUrl: string,
  headers: Record<string, string>,
  additionalParams?: Record<string, string | number | boolean>
): Promise<T[]> {
  const fetchFn = async (skip: number, limit: number): Promise<PaginatedResponse<T>> => {
    const params = {
      skip,
      limit,
      ...additionalParams
    };

    try {
      const response: AxiosResponse<PaginatedResponse<T>> = await axios.get(baseUrl, {
        headers,
        params
      });
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch from ${baseUrl}:`, error);
      throw error;
    }
  };

  return paginateResults<T>(fetchFn);
}

/**
 * Formats connection data into a clean, AI-friendly string grouped by platform.
 * @param connections - Array of user's active connections
 * @returns Formatted string showing connections grouped by platform, or a message if no connections exist
 */
export function formatConnectionsInfo(connections: Connection[]): string {
  if (connections.length === 0) {
    return "No active connections found. User needs to connect to platforms first.";
  }

  const groupedByPlatform = connections.reduce((acc, conn) => {
    if (!acc[conn.platform]) {
      acc[conn.platform] = [];
    }
    acc[conn.platform].push(conn.key);
    return acc;
  }, {} as Record<string, string[]>);

  return Object.entries(groupedByPlatform)
    .map(([platform, keys]) => `- ${platform}: ${keys.join(', ')}`)
    .join('\n');
}

/**
 * Formats available platform definitions into a clean, AI-friendly string.
 * Only includes active, non-deprecated platforms with their descriptions.
 * @param connectionDefinitions - Array of available platform connection definitions
 * @returns Formatted string showing available platforms and descriptions, or a message if none available
 */
export function formatAvailablePlatformsInfo(connectionDefinitions: ConnectionDefinition[]): string {
  if (connectionDefinitions.length === 0) {
    return "No available platform information found.";
  }

  const platforms = connectionDefinitions
    .filter(def => def.active && !def.deprecated)
    .map(def => `- ${def.platform}: ${def.description}`)
    .join('\n');

  return platforms || "No active platforms available.";
}

/**
 * Builds a complete integration status message for AI consumption.
 * Combines connection info, available platforms, and summary statistics into a structured format.
 * @param connectionsInfo - Formatted string of connected integrations
 * @param availablePlatformsInfo - Formatted string of available platforms  
 * @param connectedCount - Number of active connections
 * @param availableCount - Number of available platforms
 * @returns Complete formatted status message with all integration information
 */
export function buildIntegrationsStatusMessage(
  connectionsInfo: string,
  availablePlatformsInfo: string,
  connectedCount: number,
  availableCount: number
): string {
  return `PICA INTEGRATIONS STATUS

CONNECTED INTEGRATIONS:
${connectionsInfo}

AVAILABLE PLATFORMS:
${availablePlatformsInfo}

SUMMARY:
- Connected: ${connectedCount} integration(s)
- Available: ${availableCount} platform(s)

To manage connections, visit: https://app.picaos.com

NEXT STEP: Use get_pica_platform_actions with a platform name to see available actions.`;
}

/**
 * Formats available actions for a platform into a clean, AI-friendly string.
 * @param actions - Array of available actions for a platform
 * @param platform - The platform name these actions belong to
 * @returns Formatted string showing available actions, or a message if none available
 */
export function formatAvailableActionsInfo(actions: AvailableAction[], platform: string): string {
  if (actions.length === 0) {
    return `No available actions found for platform: ${platform}`;
  }

  const actionsList = actions
    .map(action => `- ${action.title} (ID: ${action._id})`)
    .join('\n');

  return actionsList;
}

/**
 * Builds a complete available actions message for AI consumption.
 * @param actionsInfo - Formatted string of available actions
 * @param platform - The platform name
 * @param actionCount - Number of available actions
 * @returns Complete formatted message with platform actions information
 */
export function buildAvailableActionsMessage(
  actionsInfo: string,
  platform: string,
  actionCount: number
): string {
  return `AVAILABLE ACTIONS FOR ${platform.toUpperCase()}

ACTIONS:
${actionsInfo}

SUMMARY:
- Platform: ${platform}
- Available actions: ${actionCount}

These actions can be used to interact with your ${platform} integration through Pica.

NEXT STEP: Use get_pica_action_knowledge with an action ID to get detailed documentation before building requests.`;
}

/**
 * Builds API documentation for Pica connections and connectors with dynamic base URL.
 * @param baseUrl - The base URL for Pica API (e.g., "https://api.picaos.com")
 * @returns Complete API documentation string with endpoints and examples
 */
export function buildPicaApiConnectorsDocumentation(baseUrl: string): string {
  const cleanBaseUrl = baseUrl.replace(/\/$/, '');

  return `PICA API DOCUMENTATION

FETCHING USER CONNECTIONS:

URL: ${cleanBaseUrl}/v1/vault/connections
Method: GET
Headers:
- x-pica-secret: {{process.env.PICA_SECRET}}

Query Parameters:
- key: string (optional) - The connection key
- platformVersion: string (optional) - The platform version
- name: string (optional) - The connection name
- identityType: "user" | "team" | "organization" | "project" (optional) - The identity type
- identity: string (optional) - The connection identifier
- platform: string (optional) - The connector platform (e.g. stripe, exa)
- active: boolean (optional, default: true) - Filter connections by active status
- limit: number (optional, default: 20) - The number of connections to return
- skip: number (optional, default: 0) - The number of connections to skip

Response:
{
  "type": "Vault Connections",
  "rows": [
    {
      "_id": "conn::GC6icwVKcco::Tao3acOXT366-S40uINMxw", 
      "platformVersion": "1.0.0",
      "key": "test::resend::default::46f75762f34e4962bf5684760f0f9f0e",
      "environment": "test", 
      "platform": "resend",
      "identity": "46f75762f34e4962bf5684760f0f9f0e",
      "identityType": "user",
      "description": "Email API for developers",
      "createdAt": 1742508720866,
      "updatedAt": 1742508720866,
      "version": "1.0.0",
      "active": true,
    },
    ...
  ],
  "total": 39,
  "skip": 0, 
  "limit": 20
}

FETCHING AVAILABLE CONNECTORS IN PICA:

URL: ${cleanBaseUrl}/v1/available-connectors
Method: GET
Headers:
- x-pica-secret: {{process.env.PICA_SECRET}}

Query Parameters:
- platform: string (optional) - The connector platform
- authkit: boolean (optional, default: false) - If true, filter connectors that are enabled in Authkit
- key: string (optional) - The connector key
- name: string (optional) - The connector name
- category: string (optional) - The connector category
- limit: number (optional, default: 20) - The number of connectors to return
- skip: number (optional, default: 0) - The number of connectors to skip

Response:
{
  "type": "Available Connectors",
  "rows": [
    {
      "name": "ElevenLabs",
      "key": "api::elevenlabs::v1",
      "platform": "elevenlabs",
      "platformVersion": "v1",
      "description": "Create the most realistic speech with our AI audio platform",
      "category": "AI",
      "image": "https://assets.picaos.com/connectors/elevenlabs.svg",
      "tags": ["ai"],
      "oauth": false,
      "createdAt": 1740383090925,
      "updatedAt": 1740383090925,
      "version": "1.0.0",
      "active": true,
    },
    ...
  ],
  "total": 66,
  "skip": 0,
  "limit": 20
}

This documentation shows how to programmatically fetch user connections and available connectors from the Pica API. Use the x-pica-secret header for authentication and implement pagination using the skip/limit parameters to retrieve all results.`;
}

/**
 * Builds API documentation for Pica platform actions with dynamic base URL and platform.
 * @param baseUrl - The base URL for Pica API (e.g., "https://api.picaos.com")
 * @param platform - The platform name to get actions for (e.g., "exa", "stripe")
 * @returns Complete API documentation string for platform actions endpoint
 */
export function buildPicaApiActionsDocumentation(baseUrl: string, platform: string): string {
  const cleanBaseUrl = baseUrl.replace(/\/$/, '');

  return `FETCHING AVAILABLE ACTIONS IN PICA:

URL: ${cleanBaseUrl}/v1/available-actions/${platform}
Method: GET
Headers:
- x-pica-secret: {{process.env.PICA_SECRET}}

Query Parameters:
- title: string - The action title
- key: string - The action key
- method: string - The action method
- limit: number (default: 20) - The number of actions to return
- skip: number (default: 0) - The number of actions to skip

Response:
{
  "type": "Available Actions",
  "rows": [
    {
      "title": "Get Contents",
      "key": "getContents",
      "method": "POST",
      "platform": "exa"
    },
    {
      "title": "Search",
      "key": "search",
      "method": "POST",
      "platform": "exa"
    },
    {
      "title": "Find Similar Links",
      "key": "findSimilarLinks",
      "method": "POST",
      "platform": "exa"
    },
    {
      "title": "Get LLM Answer",
      "key": "getLlmAnswer",
      "method": "POST",
      "platform": "exa"
    }
  ],
  "total": 4,
  "skip": 0,
  "limit": 20
}

This documentation shows how to programmatically fetch available actions for the ${platform} platform from the Pica API. Use the x-pica-secret header for authentication and implement pagination using the skip/limit parameters to retrieve all results.`;
}

/**
 * Builds action knowledge with API request structure guidance.
 * @param knowledge - The raw knowledge content for the action
 * @param method - The HTTP method for the action
 * @param baseUrl - The base URL for Pica API
 * @param platform - The platform name (used for connection key)
 * @param actionId - The action ID
 * @returns Complete formatted knowledge with API guidance
 */
export function buildActionKnowledgeWithGuidance(
  knowledge: string,
  method: string,
  baseUrl: string,
  platform: string,
  actionId: string
): string {
  const cleanBaseUrl = baseUrl.replace(/\/$/, '');

  return `${knowledge}

API REQUEST STRUCTURE
======================
URL: ${cleanBaseUrl}/v1/passthrough/{{PATH}}

IMPORTANT: When constructing the URL, only include the API endpoint path after the base URL.
Do NOT include the full third-party API URL.

Examples:
✅ Correct: ${cleanBaseUrl}/v1/passthrough/crm/v3/objects/contacts/search
❌ Incorrect: ${cleanBaseUrl}/v1/passthrough/https://api.hubapi.com/crm/v3/objects/contacts/search

METHOD: ${method}

HEADERS:
- x-pica-secret: {{process.env.PICA_SECRET}}
- x-pica-connection-key: {{process.env.PICA_${platform.toUpperCase()}_CONNECTION_KEY}}
- x-pica-action-id: ${actionId}
- ... (other headers)

BODY: {{BODY}}

QUERY PARAMS: {{QUERY_PARAMS}}`;
}

/**
 * Replaces path variables in a template string with actual values.
 * Path variables can be in either format: {variableName} or {{variableName}} and will be replaced with corresponding values.
 * @param path - The template string containing path variables in {variableName} or {{variableName}} format
 * @param variables - Object containing variable names as keys and their replacement values
 * @returns The path string with all variables replaced by their encoded values
 * @throws Error if any required variable is missing, null, undefined, or empty string
 */
export function replacePathVariables(path: string, variables: Record<string, string | number | boolean>): string {
  if (!path) return path;

  let result = path;

  // First, replace double bracket variables {{variableName}}
  result = result.replace(/\{\{([^}]+)\}\}/g, (match, variable) => {
    const trimmedVariable = variable.trim();
    const value = variables[trimmedVariable];
    if (value === undefined || value === null || value === '') {
      throw new Error(`Missing value for path variable: ${trimmedVariable}`);
    }
    return encodeURIComponent(value.toString());
  });

  // Then, replace single bracket variables {variableName}
  result = result.replace(/\{([^}]+)\}/g, (match, variable) => {
    const trimmedVariable = variable.trim();
    const value = variables[trimmedVariable];
    if (value === undefined || value === null || value === '') {
      throw new Error(`Missing value for path variable: ${trimmedVariable}`);
    }
    return encodeURIComponent(value.toString());
  });

  return result;
}
