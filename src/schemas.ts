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
 * Schema for searching platform actions
 */
export const searchPicaPlatformActionsInputSchema = {
    platform: z.string().describe("The platform name to search actions for (e.g., 'ship-station', 'shopify'). This is the kebab-case version of the platform name that comes from the list_pica_integrations tool AVAILABLE PLATFORMS section."),
    query: z.string().describe("The search query to find relevant actions (e.g., 'search contacts', 'create customer', 'send email'). Be specific about what you want to do."),
    agentType: z.enum(["execute", "knowledge"]).optional().describe("The type of agent context: 'execute' if the user wants to execute an action, 'knowledge' if they want to get information or write code. Defaults to 'knowledge' if not specified.")
};

/**
 * Schema for getting action knowledge
 */
export const getPicaActionKnowledgeInputSchema = {
    actionId: z.string().describe("The action ID to get knowledge for (from the actions list returned by search_pica_platform_actions). REQUIRED: This tool must be called before execute_pica_action to load the action's documentation into context."),
    platform: z.string().describe("The platform name to get knowledge for (e.g., 'ship-station', 'shopify'). This is the kebab-case version of the platform name that comes from the list_pica_integrations tool AVAILABLE PLATFORMS section.")
};

/**
 * Schema for executing Pica actions
 */
export const executePicaActionInputSchema = {
    platform: z.string().describe("Platform name"),
    actionId: z.string().describe("Action ID from search_pica_platform_actions"),
    connectionKey: z.string().describe("Key of the connection to use"),
    data: z.any().optional().describe("Request data (for POST, PUT, etc.)"),
    pathVariables: z.record(z.union([z.string(), z.number(), z.boolean()])).optional().describe("Variables to replace in the path"),
    queryParams: z.record(z.any()).optional().describe("Query parameters"),
    headers: z.record(z.string()).optional().describe("Additional headers"),
    isFormData: z.boolean().optional().describe("Whether to send data as multipart/form-data"),
    isFormUrlEncoded: z.boolean().optional().describe("Whether to send data as application/x-www-form-urlencoded")
};

/**
 * Output schemas for list_pica_integrations tool
 */
export const listPicaIntegrationsOutputSchema = {
    connections: z.array(z.object({
        platform: z.string(),
        key: z.string()
    })).describe("Array of user's active connections"),
    availablePlatforms: z.array(z.object({
        platform: z.string(),
        name: z.string(),
        category: z.string()
    })).describe("Array of available platforms that can be connected"),
    summary: z.object({
        connectedCount: z.number(),
        availableCount: z.number()
    }).describe("Summary statistics of connections and available platforms")
};

/**
 * Output schemas for search_pica_platform_actions tool
 */
export const searchPicaPlatformActionsOutputSchema = {
    actions: z.array(z.object({
        actionId: z.string().describe("Unique identifier for the action"),
        title: z.string().describe("Human-readable action name"),
        method: z.string().describe("HTTP method (GET, POST, etc.)"),
        path: z.string().describe("API endpoint path")
    })).describe("Array of matching actions (max 5)"),
    metadata: z.object({
        platform: z.string().describe("Platform that was searched"),
        query: z.string().describe("Search query used"),
        count: z.number().describe("Number of results returned")
    }).describe("Metadata about the search results")
};

/**
 * Tool configuration objects for registerTool
 */
export const listPicaIntegrationsToolConfig = {
    title: "List Pica Integrations",
    description: "List all available Pica integrations and platforms. ALWAYS call this tool first in any workflow to discover what platforms and connections are available. This returns the connections that the user has and all available Pica platforms in kebab-case format (e.g., 'ship-station', 'shopify') which you'll need for subsequent tool calls.",
    inputSchema: listPicaIntegrationsInputSchema,
    outputSchema: listPicaIntegrationsOutputSchema
};

export const searchPicaPlatformActionsToolConfig = {
    title: "Search Platform Actions",
    description: "Search for relevant actions on a specific platform using a query. Call this after list_pica_integrations to find actions that match your intent. Returns the top 5 most relevant actions based on your search query. Use the exact kebab-case platform name from the integrations list.",
    inputSchema: searchPicaPlatformActionsInputSchema,
    outputSchema: searchPicaPlatformActionsOutputSchema
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
export const searchPicaPlatformActionsZodSchema = z.object(searchPicaPlatformActionsInputSchema);
export const getPicaActionKnowledgeZodSchema = z.object(getPicaActionKnowledgeInputSchema);
export const executePicaActionZodSchema = z.object(executePicaActionInputSchema);
