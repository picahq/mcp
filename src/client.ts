/**
 * Pica API Client
 * 
 * This module provides a TypeScript client for interacting with the Pica API.
 * 
 * @fileoverview Pica API client with authentication and data management
 * @author Pica
 */

import axios, { AxiosResponse } from 'axios';
import FormData from 'form-data';
import {
  Connection,
  ConnectionDefinition,
  AvailableAction,
  ActionDetails,
  GetPicaActionKnowledgeResponse,
  ExecutePicaActionArgs,
  RequestConfig,
  ExecutePassthroughResponse
} from './types.js';
import { fetchPaginatedData, replacePathVariables } from './helpers.js';

export type IdentityType = 'user' | 'team' | 'organization' | 'project';

export interface PicaClientOptions {
  secret: string;
  baseUrl?: string;
  identity?: string;
  identityType?: IdentityType;
  connectionKeys?: string[];
}

/**
 * Client for interacting with the Pica API
 */
export class PicaClient {
  private readonly secret: string;
  private readonly baseUrl: string;
  private readonly identity?: string;
  private readonly identityType?: IdentityType;
  private readonly connectionKeys?: string[];
  private connections: Connection[] = [];
  private connectors: ConnectionDefinition[] = [];
  private isInitialized = false;

  constructor(options: PicaClientOptions);
  constructor(secret: string, baseUrl?: string);
  constructor(optionsOrSecret: PicaClientOptions | string, baseUrl = "https://api.picaos.com") {
    if (typeof optionsOrSecret === 'string') {
      // Legacy constructor: (secret, baseUrl)
      if (!optionsOrSecret?.trim()) {
        throw new Error("Pica secret is required and cannot be empty");
      }
      this.secret = optionsOrSecret;
      this.baseUrl = baseUrl.replace(/\/$/, '');
    } else {
      // New constructor: (options)
      if (!optionsOrSecret.secret?.trim()) {
        throw new Error("Pica secret is required and cannot be empty");
      }
      this.secret = optionsOrSecret.secret;
      this.baseUrl = (optionsOrSecret.baseUrl || "https://api.picaos.com").replace(/\/$/, '');
      this.identity = optionsOrSecret.identity;
      this.identityType = optionsOrSecret.identityType;
      this.connectionKeys = optionsOrSecret.connectionKeys;
    }
  }

  /**
   * Initializes the client by fetching connections and available connectors
   * @throws {Error} If initialization fails completely
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    const results = await Promise.allSettled([
      this.fetchConnections(),
      this.fetchConnectionDefinitions(),
    ]);

    const [connectionsResult, connectorsResult] = results;

    if (connectionsResult.status === 'rejected') {
      console.error("Failed to fetch connections:", connectionsResult.reason);
      this.connections = [];
    }

    if (connectorsResult.status === 'rejected') {
      console.error("Failed to fetch connectors:", connectorsResult.reason);
      this.connectors = [];
    }

    this.isInitialized = true;
  }

  /**
   * Generates standard headers for API requests
   */
  public generateHeaders(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      "x-pica-secret": this.secret,
    };
  }

  /**
   * Fetches user connections from the API
   */
  private async fetchConnections(): Promise<void> {
    try {
      // If connectionKeys is set, not ["*"], and empty → no connections
      if (this.connectionKeys && !this.connectionKeys.includes("*") && this.connectionKeys.length === 0) {
        this.connections = [];
        return;
      }

      const headers = this.generateHeaders();
      const url = `${this.baseUrl}/v1/vault/connections`;

      const additionalParams: Record<string, string> = {};
      if (this.identity) {
        additionalParams.identity = this.identity;
      }
      if (this.identityType) {
        additionalParams.identityType = this.identityType;
      }
      if (this.connectionKeys && !this.connectionKeys.includes("*")) {
        additionalParams.key = this.connectionKeys.join(",");
      }

      this.connections = await fetchPaginatedData<Connection>(
        url,
        headers,
        Object.keys(additionalParams).length > 0 ? additionalParams : undefined
      );
    } catch (error) {
      console.error("Failed to fetch connections:", error);
      this.connections = [];
      throw error;
    }
  }

  /**
   * Fetches available connection definitions from the API
   */
  private async fetchConnectionDefinitions(): Promise<void> {
    try {
      const headers = this.generateHeaders();
      const url = `${this.baseUrl}/v1/available-connectors`;
      this.connectors = await fetchPaginatedData<ConnectionDefinition>(url, headers);
    } catch (error) {
      console.error("Failed to fetch connection definitions:", error);
      this.connectors = [];
      throw error;
    }
  }

  /**
   * Searches for actions on a specific platform using a query
   * @param platform - The platform name to search actions for
   * @param query - The search query to find relevant actions
   * @param agentType - The type of agent context (execute or knowledge)
   * @returns Array of top 5 most relevant actions for the platform
   * @throws {Error} If platform or query is not provided or API request fails
   */
  async searchAvailableActions(platform: string, query: string, agentType?: "execute" | "knowledge"): Promise<AvailableAction[]> {
    if (!platform?.trim()) {
      throw new Error("Platform name is required");
    }
    if (!query?.trim()) {
      throw new Error("Search query is required");
    }

    try {
      const headers = this.generateHeaders();
      const url = `${this.baseUrl}/v1/available-actions/search/${platform}`;

      // Default to knowledgeAgent if not specified
      const isKnowledgeAgent = !agentType || agentType === "knowledge";

      const params: Record<string, string> = {
        query,
        limit: '5'
      };

      if (isKnowledgeAgent) {
        params.knowledgeAgent = 'true';
      } else {
        params.executeAgent = 'true';
      }

      const response: AxiosResponse<AvailableAction[]> = await axios.get(url, {
        headers,
        params
      });

      return response.data || [];
    } catch (error) {
      console.error("Error searching available actions:", error);
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to search available actions: ${error.response?.status} ${error.response?.statusText}`);
      }
      throw new Error("Failed to search available actions");
    }
  }

  /**
   * Gets full action details by ID
   * @param actionId - The action ID to get details for
   * @returns The full action object
   * @throws {Error} If action ID is not provided or API request fails
   */
  async getActionDetails(actionId: string): Promise<ActionDetails> {
    if (!actionId?.trim()) {
      throw new Error("Action ID is required");
    }

    try {
      const headers = this.generateHeaders();
      const url = `${this.baseUrl}/v1/knowledge`;
      const params = {
        _id: actionId
      };

      const response: AxiosResponse<{ rows: ActionDetails[] }> = await axios.get(url, {
        headers,
        params
      });

      const actions = response.data?.rows || [];

      if (actions.length === 0) {
        throw new Error(`Action with ID ${actionId} not found`);
      }

      return actions[0];
    } catch (error) {
      console.error("Error fetching action details:", error);
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to fetch action details: ${error.response?.status} ${error.response?.statusText}`);
      }
      throw new Error("Failed to fetch action details");
    }
  }

  /**
   * Gets knowledge for a specific action by ID
   * @param actionId - The action ID to get knowledge for
   * @returns The knowledge string for the action
   * @throws {Error} If action ID is not provided or API request fails
   */
  async getActionKnowledge(actionId: string): Promise<GetPicaActionKnowledgeResponse> {
    try {
      const action = await this.getActionDetails(actionId);

      if (!action.knowledge || !action.method) {
        return {
          knowledge: "No knowledge was found",
          method: "No method was found"
        };
      }

      return {
        knowledge: action.knowledge,
        method: action.method
      };
    } catch (error) {
      console.error("Error fetching action knowledge:", error);
      throw error;
    }
  }

  /**
   * Executes a passthrough request to a third-party API through Pica
   * @param args - The execution arguments containing all request details
   * @returns Object containing sanitized request config and response data
   * @throws {Error} If the request fails
   */
  async executePassthroughRequest(args: ExecutePicaActionArgs, preloadedAction?: ActionDetails): Promise<ExecutePassthroughResponse> {
    const {
      actionId,
      connectionKey,
      data,
      pathVariables,
      queryParams,
      headers,
      isFormData,
      isFormUrlEncoded,
    } = args;

    // Use preloaded action or fetch action details
    const action = preloadedAction ?? await this.getActionDetails(actionId);

    const method = action.method;
    const contentType = isFormData ? 'multipart/form-data' : isFormUrlEncoded ? 'application/x-www-form-urlencoded' : 'application/json';

    const requestHeaders = {
      ...this.generateHeaders(),
      'x-pica-connection-key': connectionKey,
      'x-pica-action-id': action._id,
      'Content-Type': contentType,
      ...headers
    };

    const finalActionPath = pathVariables
      ? replacePathVariables(action.path, pathVariables)
      : action.path;

    const normalizedPath = finalActionPath.startsWith('/') ? finalActionPath : `/${finalActionPath}`;
    const url = `${this.baseUrl}/v1/passthrough${normalizedPath}`;

    // Check if action has "custom" tag and add connectionKey to body if needed
    const isCustomAction = action.tags?.includes('custom');
    let requestData = data;
    if (isCustomAction && method?.toLowerCase() !== 'get') {
      requestData = {
        ...data,
        connectionKey
      };
    }

    const requestConfig: RequestConfig = {
      url,
      method,
      headers: requestHeaders,
      params: queryParams
    };

    if (method?.toLowerCase() !== 'get') {
      if (isFormData) {
        const formData = new FormData();

        if (requestData && typeof requestData === 'object' && !Array.isArray(requestData)) {
          Object.entries(requestData).forEach(([key, value]) => {
            if (typeof value === 'object') {
              formData.append(key, JSON.stringify(value));
            } else {
              formData.append(key, String(value));
            }
          });
        }

        requestConfig.data = formData;
        Object.assign(requestConfig.headers, formData.getHeaders());
      } else if (isFormUrlEncoded) {
        const params = new URLSearchParams();

        if (requestData && typeof requestData === 'object' && !Array.isArray(requestData)) {
          Object.entries(requestData).forEach(([key, value]) => {
            if (typeof value === 'object') {
              params.append(key, JSON.stringify(value));
            } else {
              params.append(key, String(value));
            }
          });
        }

        requestConfig.data = params;
      } else {
        requestConfig.data = requestData;
      }
    }

    const sanitizedConfig = {
      ...requestConfig,
      headers: {
        ...requestConfig.headers,
        'x-pica-secret': '***REDACTED***'
      }
    };

    try {
      const response: AxiosResponse = await axios(requestConfig);

      return {
        requestConfig: sanitizedConfig,
        responseData: response.data
      };
    } catch (error) {
      console.error("Error executing passthrough request:", error);
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to execute passthrough request: ${error.response?.status} ${error.response?.statusText}`);
      }
      throw new Error("Failed to execute passthrough request");
    }
  }

  /**
   * Gets the base URL for the Pica API
   * @returns The base URL for the Pica API
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Gets the current user's connections
   * @returns Array of user connections
   */
  getUserConnections(): Connection[] {
    return [...this.connections];
  }

  /**
   * Gets available connectors/platforms
   * @returns Array of available connection definitions
   */
  getAvailableConnectors(): ConnectionDefinition[] {
    return [...this.connectors];
  }

  /**
   * Checks if the client has been initialized
   */
  isClientInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Refreshes connections and connectors data
   */
  async refresh(): Promise<void> {
    await Promise.allSettled([
      this.fetchConnections(),
      this.fetchConnectionDefinitions(),
    ]);
  }
}