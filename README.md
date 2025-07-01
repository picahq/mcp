# Pica MCP Server

[![npm version](https://img.shields.io/npm/v/%40picahq%2Fmcp)](https://npmjs.com/package/@picahq/mcp) [![smithery badge](https://smithery.ai/badge/@picahq/mcp)](https://smithery.ai/server/@picahq/mcp)

<img src="https://assets.picaos.com/github/pica-mcp.svg" alt="Pica MCP Banner" style="border-radius: 5px;">

A [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server that integrates with [Pica](https://picaos.com), enabling seamless interaction with various third-party services through a standardized interface. This server provides direct access to platform integrations, actions, execution capabilities, and robust code generation capabilities.

<a href="https://glama.ai/mcp/servers/@picahq/mcp">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/@picahq/mcp/badge" alt="pica MCP server" />
</a>

## Features

### 🔧 Tools
- **list_pica_integrations** - List all available platforms and your active connections
- **get_pica_platform_actions** - Get available actions for a specific platform
- **get_pica_action_knowledge** - Get detailed documentation for a specific action including parameters and usage
- **execute_pica_action** - Execute API actions with full parameter support

## Key Capabilities

### 🔌 **Platform Integration**
- Connect to 100+ platforms through Pica
- Manage multiple connections per platform
- Access real-time connection status

### 🎯 **Smart Intent Detection**
- Execute actions immediately (e.g. "read my last gmail email", "send a message to the slack channel #general")
- Generate integration code (e.g. "build a form to send emails using gmail", "create a UI for messaging")
- Intelligent context handling

### 🔒 **Enhanced Security**
- Never exposes secrets in generated code
- Uses environment variables: `PICA_SECRET`, `PICA_[PLATFORM]_CONNECTION_KEY`
- Sanitized request configurations for production use

### ⚡ **Direct Execution**
- Execute actions directly through the MCP interface
- Support for all HTTP methods (GET, POST, PUT, DELETE, etc.)
- Handle form data, URL encoding, and JSON payloads
- Pass path variables, query parameters, and custom headers

### 🔒 **Secure Authentication**
- All requests authenticated through Pica's secure proxy
- No need to manage individual platform API keys
- Environment variable configuration for security

## Installation

```bash
npm install @picahq/mcp
```

## Setup
```bash
PICA_SECRET=your-pica-secret-key
```

Get your Pica secret key from the [Pica dashboard](https://app.picaos.com/settings/api-keys).

## Usage

### As a Standalone Server

```bash
npx @picahq/mcp
```

### In Claude Desktop

To use with [Claude Desktop](https://claude.ai/download), add the server config:

On MacOS: `~/Library/Application\ Support/Claude/claude_desktop_config.json`

On Windows: `%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "pica": {
      "command": "npx",
      "args": ["@picahq/mcp"],
      "env": {
        "PICA_SECRET": "your-pica-secret-key"
      }
    }
  }
}
```

### In Cursor

In the Cursor menu, select "MCP Settings" and update the MCP JSON file to include the following:

```json
{
  "mcpServers": {
    "pica": {
      "command": "npx",
      "args": ["@picahq/mcp"],
      "env": {
        "PICA_SECRET": "your-pica-secret-key"
      }
    }
  }
}
```

### Using Docker

Build the Docker Image:

```bash
docker build -t pica-mcp-server .
```

Run the Docker Container:

```bash
docker run -e PICA_SECRET=your_pica_secret_key pica-mcp-server
```

### Installing via Smithery

To install pica for Claude Desktop automatically via [Smithery](https://smithery.ai/server/@picahq/mcp):

```bash
npx -y @smithery/cli install @picahq/mcp --client claude
```

## Deploy to Vercel

You can deploy this MCP server to Vercel for remote access:

1. Install dependencies including Vercel adapter:
   ```bash
   npm install @vercel/mcp-adapter zod
   ```

2. Deploy to Vercel:
   ```bash
   vercel
   ```

3. Configure your MCP client to use the remote server:
   - **For Cursor**: `https://your-project.vercel.app/api/mcp`
   - **For Claude/Cline**: Use `npx mcp-remote https://your-project.vercel.app/api/mcp`

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed Vercel deployment instructions.

## Examples for Inspiration

### 📋 **Integration Code Generation**

**Build Email Form:**
> "Create me a React form component that can send emails using Gmail using Pica"

**Linear Dashboard:**
> "Create a dashboard that displays Linear users and their assigned projects with filtering options using Pica"

**QuickBooks Table:**
> "Build a paginatable table component that fetches and displays QuickBooks invoices with search and sort using Pica"

**Slack Integration:**
> "Create a page with a form that can post messages to multiple Slack channels with message scheduling using Pica"

### 🚀 **Direct Action Execution**

**Gmail Example:**
> "Get my last 5 emails from Gmail using Pica"

**Slack Example:**
> "Send a slack message to #general channel: 'Meeting in 10 minutes' using Pica"

**Shopify Example:**
> "Get all products from my Shopify store using Pica"

## API Reference

### Tools

#### `list_pica_integrations`
List all available Pica integrations and platforms. Always call this tool first to discover available platforms and connections.

**Parameters:** None

**Returns:**
- Connected integrations grouped by platform
- Available platforms with descriptions
- Summary statistics
- Management links

#### `get_pica_platform_actions`
Get all available actions for a specific platform.

**Parameters:**
- `platform` (string, required): Platform name in kebab-case format (e.g., 'ship-station', 'shopify')

**Returns:**
- List of available actions with IDs and titles
- Platform-specific action count
- Next steps guidance

#### `get_pica_action_knowledge`
Get comprehensive documentation for a specific action. **Must be called before execute_pica_action** to understand requirements.

**Parameters:**
- `action_id` (string, required): Action ID from get_pica_platform_actions
- `platform` (string, required): Platform name in kebab-case format

**Returns:**
- Detailed action documentation
- Parameter requirements and structure
- API-specific guidance and caveats
- Usage examples and implementation notes

#### `execute_pica_action`
Execute a Pica action to perform operations on third-party platforms. **Critical:** Only call this when the user wants to execute an action, not when building applications.

**Parameters:**
- `platform` (string, required): Platform name
- `action` (object, required): Action object with `_id`, `path`, and `method`
- `connectionKey` (string, required): Connection key for the platform
- `data` (object, optional): Request body data
- `pathVariables` (object, optional): Variables to replace in the path
- `queryParams` (object, optional): Query parameters
- `headers` (object, optional): Additional headers
- `isFormData` (boolean, optional): Send as multipart/form-data
- `isFormUrlEncoded` (boolean, optional): Send as URL-encoded form data

**Returns:**
- `requestConfig`: Sanitized request configuration
- `responseData`: Actual API response from the platform

## Error Handling

The server implements comprehensive error handling:

- ✅ Parameter validation for all tools
- ✅ Connection verification before execution
- ✅ Path variable validation and substitution
- ✅ Graceful handling of API failures
- ✅ Detailed error messages for debugging
- ✅ MCP-compliant error responses

## Security

- 🔐 Single environment variable required: `PICA_SECRET`
- 🛡️ All requests authenticated through Pica's secure proxy
- 🔒 No direct platform API key management needed
- 🚫 Secrets never exposed in responses
- ✅ Request configurations sanitized
- 🔍 Sensitive data filtered from logs
- 🛡️ Input validation and sanitization

## License

GPL-3.0

## Support

For support, please contact support@picaos.com or visit https://picaos.com