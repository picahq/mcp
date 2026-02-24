/**
 * Type definitions for the Pica MCP Server
 * 
 * This file contains all TypeScript interfaces and types used throughout the application.
 * 
 * @fileoverview Core type definitions for Pica API integration
 * @author Pica
 */

/**
 * API response structure for paginated endpoints
 */
export interface PaginatedResponse<T> {
  rows: T[];
  total: number;
  skip: number;
  limit: number;
}

/**
 * Definition of an available platform/connector that users can connect to
 */
export interface ConnectionDefinition {
  name: string;
  key: string;
  platform: string;
  platformVersion: string;
  description: string;
  category: string;
  image: string;
  tags: string[];
  oauth: boolean;
  createdAt: number;
  updatedAt: number;
  version: string;
  active: boolean;
  deprecated: boolean;
}

/**
 * Represents an active user connection to a platform
 */
export interface Connection {
  key: string;
  platform: string;
  tags: string[];
  active: boolean;
}

/**
 * Available action from search endpoint (uses systemId)
 */
export interface AvailableAction {
  systemId: string;
  title: string;
  tags?: string[];
  knowledge?: string;
  path: string;
  method: string;
}

/**
 * Action details from knowledge endpoint (uses _id)
 */
export interface ActionDetails {
  _id: string;
  title: string;
  tags?: string[];
  knowledge?: string;
  path: string;
  method: string;
}

/**
 * Arguments for list_pica_integrations tool
 */
export interface ListPicaIntegrationsArgs { }

/**
 * Arguments for search_pica_platform_actions tool
 */
export interface SearchPicaPlatformActionsArgs {
  platform: string;
  query: string;
  agentType?: "execute" | "knowledge";
}

/**
 * Arguments for get_pica_action_knowledge tool
 */
export interface GetPicaActionKnowledgeArgs {
  actionId: string;
  platform: string;
}

/**
 * Response for get_pica_action_knowledge tool
 */
export interface GetPicaActionKnowledgeResponse {
  knowledge: string;
  method: string;
}

/**
 * Action object structure for create_pica_request tool
 */
export interface ActionObject {
  _id: string;
  path: string;
  method: string;
  tags?: string[];
}

/**
 * Arguments for create_pica_request tool
 */
export interface ExecutePicaActionArgs {
  platform: string;
  actionId: string;
  connectionKey: string;
  data?: any,
  pathVariables?: Record<string, string | number | boolean>,
  queryParams?: Record<string, any>,
  headers?: Record<string, any>,
  isFormData?: boolean;
  isFormUrlEncoded?: boolean;
}

/**
 * HTTP request configuration for axios
 */
export interface RequestConfig {
  url: string;
  method: string;
  headers: Record<string, string>;
  params?: Record<string, string>;
  data?: unknown;
}

/**
 * Sanitized version of request config with sensitive data redacted
 */
export interface SanitizedRequestConfig {
  url: string;
  method: string;
  headers: Record<string, string>;
  params?: Record<string, string>;
  data?: unknown;
}

/**
 * Response from executePassthroughRequest
 */
export interface ExecutePassthroughResponse {
  requestConfig: SanitizedRequestConfig;
  responseData: unknown;
}

/**
 * Structured response for list_pica_integrations tool
 */
export interface ListIntegrationsResponse {
  [x: string]: unknown;
  connections: Array<{
    platform: string;
    key: string;
    tags: string[];
  }>;
  availablePlatforms: Array<{
    platform: string;
    name: string;
    category: string;
  }>;
  summary: {
    connectedCount: number;
    availableCount: number;
  };
}

/**
 * Structured response for search_pica_platform_actions tool
 */
export interface SearchActionsResponse {
  [x: string]: unknown;
  actions: Array<{
    actionId: string;
    title: string;
    method: string;
    path: string;
  }>;
  metadata: {
    platform: string;
    query: string;
    count: number;
  };
}

export type PermissionLevel = "read" | "write" | "admin";
