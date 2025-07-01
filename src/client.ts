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
import { Connection, ConnectionDefinition, AvailableAction, GetPicaActionKnowledgeResponse, ExecutePicaActionArgs, RequestConfig, ExecutePassthroughResponse } from './types.js';
import { fetchPaginatedData, replacePathVariables } from './helpers.js';

/**
 * Client for interacting with the Pica API
 */
export class PicaClient {
  private readonly secret: string;
  private readonly baseUrl: string;
  private connections: Connection[] = [];
  private connectors: ConnectionDefinition[] = [];
  private isInitialized = false;

  constructor(secret: string, baseUrl = "https://api.picaos.com") {
    if (!secret?.trim()) {
      throw new Error("Pica secret is required and cannot be empty");
    }
    this.secret = secret;
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  /**
   * Initializes the client by fetching connections and available connectors
   * @throws {Error} If initialization fails completely
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log("Pica client already initialized");
      return;
    }

    console.log("Initializing Pica client...");

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
    console.log(`Pica client initialized with ${this.connections.length} connections and ${this.connectors.length} available connectors`);
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
      const headers = this.generateHeaders();
      const url = `${this.baseUrl}/v1/vault/connections`;
      this.connections = await fetchPaginatedData<Connection>(url, headers);
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
   * Gets available actions for a specific platform
   * @param platform - The platform name to get actions for
   * @returns Array of available actions for the platform
   * @throws {Error} If platform is not provided or API request fails
   */
  async getAvailableActions(platform: string): Promise<AvailableAction[]> {
    if (!platform?.trim()) {
      throw new Error("Platform name is required");
    }

    try {
      const headers = this.generateHeaders();
      const url = `${this.baseUrl}/v1/knowledge`;
      const additionalParams = {
        supported: true,
        connectionPlatform: platform
      };

      return await fetchPaginatedData<AvailableAction>(url, headers, additionalParams);
    } catch (error) {
      console.error("Error fetching available actions:", error);
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to fetch available actions: ${error.response?.status} ${error.response?.statusText}`);
      }
      throw new Error("Failed to fetch available actions");
    }
  }

  /**
   * Gets knowledge for a specific action by ID
   * @param actionId - The action ID to get knowledge for
   * @returns The knowledge string for the action
   * @throws {Error} If action ID is not provided or API request fails
   */
  async getActionKnowledge(actionId: string): Promise<GetPicaActionKnowledgeResponse> {
    if (!actionId?.trim()) {
      throw new Error("Action ID is required");
    }

    try {
      const headers = this.generateHeaders();
      const url = `${this.baseUrl}/v1/knowledge`;
      const params = {
        _id: actionId
      };

      const response: AxiosResponse<{ rows: AvailableAction[] }> = await axios.get(url, {
        headers,
        params
      });

      const actions = response.data?.rows || [];

      if (actions.length === 0 || !actions[0].knowledge || !actions[0].method) {
        return {
          knowledge: "No knowledge was found",
          method: "No method was found"
        };
      }

      return {
        knowledge: actions[0].knowledge,
        method: actions[0].method
      };
    } catch (error) {
      console.error("Error fetching action knowledge:", error);
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to fetch action knowledge: ${error.response?.status} ${error.response?.statusText}`);
      }
      throw new Error("Failed to fetch action knowledge");
    }
  }

  /**
   * Executes a passthrough request to a third-party API through Pica
   * @param args - The execution arguments containing all request details
   * @returns Object containing sanitized request config and response data
   * @throws {Error} If the request fails
   */
  async executePassthroughRequest(args: ExecutePicaActionArgs): Promise<ExecutePassthroughResponse> {
    const {
      action,
      connectionKey,
      data,
      pathVariables,
      queryParams,
      headers,
      isFormData,
      isFormUrlEncoded,
    } = args;

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

    const requestConfig: RequestConfig = {
      url,
      method,
      headers: requestHeaders,
      params: queryParams
    };

    if (method?.toLowerCase() !== 'get') {
      if (isFormData) {
        const formData = new FormData();

        if (data && typeof data === 'object' && !Array.isArray(data)) {
          Object.entries(data).forEach(([key, value]) => {
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

        if (data && typeof data === 'object' && !Array.isArray(data)) {
          Object.entries(data).forEach(([key, value]) => {
            if (typeof value === 'object') {
              params.append(key, JSON.stringify(value));
            } else {
              params.append(key, String(value));
            }
          });
        }

        requestConfig.data = params;
      } else {
        requestConfig.data = data;
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
    console.log("Refreshing Pica client data...");
    await Promise.allSettled([
      this.fetchConnections(),
      this.fetchConnectionDefinitions(),
    ]);
    console.log("Pica client data refreshed");
  }
}