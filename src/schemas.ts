/**
 * MCP Tool Schemas
 * 
 * This file contains all tool schema definitions for MCP tools using zod.
 * Centralizing schemas here improves maintainability and reusability.
 * 
 * @fileoverview Complete tool schema definitions for all MCP tools
 * @author Pica
 */

import { z } from 'zod';

/**
 * Schema for listing Pica integrations (no parameters required)
 */
export const listPicaIntegrationsInputSchema = {};

/**
 * Schema for getting platform actions
 */
export const getPicaPlatformActionsInputSchema = {
    platform: z.string().describe("The platform name to get available actions for (e.g., 'ship-station', 'shopify'). This is the kebab-case version of the platform name that comes from the list_pica_integrations tool AVAILABLE PLATFORMS section.")
};

/**
 * Schema for getting action knowledge
 */
export const getPicaActionKnowledgeInputSchema = {
    action_id: z.string().describe("The action ID to get knowledge for (from the actions list returned by get_pica_platform_actions). REQUIRED: This tool must be called before create_pica_request to load the action's documentation into context."),
    platform: z.string().describe("The platform name to get knowledge for (e.g., 'ship-station', 'shopify'). This is the kebab-case version of the platform name that comes from the list_pica_integrations tool AVAILABLE PLATFORMS section.")
};

/**
 * Schema for executing Pica actions
 */
export const executePicaActionInputSchema = {
    platform: z.string().describe("Platform name"),
    action: z.object({
        _id: z.string().describe("Action ID"),
        path: z.string().describe("Action path template with variables"),
        method: z.string().describe("HTTP method (GET, POST, PUT, DELETE, etc.)")
    }).describe("Action object with ID, path, and method"),
    connectionKey: z.string().describe("Key of the connection to use"),
    data: z.any().optional().describe("Request data (for POST, PUT, etc.)"),
    pathVariables: z.record(z.union([z.string(), z.number(), z.boolean()])).optional().describe("Variables to replace in the path"),
    queryParams: z.record(z.any()).optional().describe("Query parameters"),
    headers: z.record(z.string()).optional().describe("Additional headers"),
    isFormData: z.boolean().optional().describe("Whether to send data as multipart/form-data"),
    isFormUrlEncoded: z.boolean().optional().describe("Whether to send data as application/x-www-form-urlencoded")
};

/**
 * Tool configuration objects for registerTool
 */
export const listPicaIntegrationsToolConfig = {
    title: "List Pica Integrations",
    description: "List all available Pica integrations and platforms. ALWAYS call this tool first in any workflow to discover what platforms and connections are available. This returns the connections that the user has and all available Pica platforms in kebab-case format (e.g., 'ship-station', 'shopify') which you'll need for subsequent tool calls.",
    inputSchema: listPicaIntegrationsInputSchema
};

export const getPicaPlatformActionsToolConfig = {
    title: "Get Platform Actions",
    description: "Get all available actions for a specific platform. Call this after list_pica_integrations to discover what actions are possible on a platform. Use the exact kebab-case platform name from the integrations list. This shows you what actions are available for that platform's API.",
    inputSchema: getPicaPlatformActionsInputSchema
};

export const getPicaActionKnowledgeToolConfig = {
    title: "Get Action Knowledge",
    description: "Get comprehensive documentation for a specific action including parameters, requirements, and usage examples. MANDATORY: You MUST call this tool before execute_pica_action to understand the action's requirements, parameter structure, caveats, and proper usage. This loads the action documentation into context and is required for successful execution.",
    inputSchema: getPicaActionKnowledgeInputSchema
};

export const executePicaActionToolConfig = {
    title: "Execute Pica Action",
    description: "Execute a Pica action to perform actual operations on third-party platforms. CRITICAL: Only call this when the user's intent is to EXECUTE an action (e.g., 'read my last Gmail email', 'fetch 5 contacts from HubSpot', 'create a task in Asana'). DO NOT call this when the user wants to BUILD or CREATE code/forms/applications - in those cases, stop after get_pica_action_knowledge and provide implementation guidance instead. REQUIRED WORKFLOW: Must call get_pica_action_knowledge first. If uncertain about execution intent or parameters, ask for confirmation before proceeding.",
    inputSchema: executePicaActionInputSchema
};

/**
 * Zod object schemas for type inference (for internal use)
 */
export const listPicaIntegrationsZodSchema = z.object(listPicaIntegrationsInputSchema);
export const getPicaPlatformActionsZodSchema = z.object(getPicaPlatformActionsInputSchema);
export const getPicaActionKnowledgeZodSchema = z.object(getPicaActionKnowledgeInputSchema);
export const executePicaActionZodSchema = z.object(executePicaActionInputSchema);

/**
 * Legacy exports for backward compatibility
 * @deprecated Use the new tool config exports instead
 */
export const listPicaIntegrationsToolSchema = {
    name: "list_pica_integrations",
    description: listPicaIntegrationsToolConfig.description,
    inputSchema: listPicaIntegrationsZodSchema,
} as const;

export const getPicaPlatformActionsToolSchema = {
    name: "get_pica_platform_actions",
    description: getPicaPlatformActionsToolConfig.description,
    inputSchema: getPicaPlatformActionsZodSchema,
} as const;

export const getPicaActionKnowledgeToolSchema = {
    name: "get_pica_action_knowledge",
    description: getPicaActionKnowledgeToolConfig.description,
    inputSchema: getPicaActionKnowledgeZodSchema,
} as const;

export const executePicaActionToolSchema = {
    name: "execute_pica_action",
    description: executePicaActionToolConfig.description,
    inputSchema: executePicaActionZodSchema,
} as const; 