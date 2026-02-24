/**
 * Utility Helper Functions
 * 
 * This module contains reusable utility functions used throughout the Pica MCP server.
 * 
 * @fileoverview Utility functions for data processing and API interactions
 * @author Pica
 */

import { PaginatedResponse, PermissionLevel } from './types.js';
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

const PERMISSION_METHODS: Record<PermissionLevel, string[] | null> = {
  read: ["GET"],
  write: ["GET", "POST", "PUT", "PATCH"],
  admin: null,
};

export function filterByPermissions<T extends { method: string }>(
  actions: T[],
  permissions: PermissionLevel
): T[] {
  const allowed = PERMISSION_METHODS[permissions];
  if (allowed === null) return actions;
  return actions.filter((a) => allowed.includes(a.method.toUpperCase()));
}

export function isMethodAllowed(
  method: string,
  permissions: PermissionLevel
): boolean {
  const allowed = PERMISSION_METHODS[permissions];
  if (allowed === null) return true;
  return allowed.includes(method.toUpperCase());
}

export function isActionAllowed(
  actionId: string,
  allowedActionIds: string[]
): boolean {
  return allowedActionIds.includes("*") || allowedActionIds.includes(actionId);
}
