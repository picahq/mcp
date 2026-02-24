# Pica MCP Server

[![npm version](https://img.shields.io/npm/v/%40picahq%2Fmcp)](https://npmjs.com/package/@picahq/mcp)

<img src="https://assets.picaos.com/github/mcp.svg" alt="Pica MCP Banner" style="border-radius: 5px;">

A [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server that integrates with [Pica](https://picaos.com), enabling seamless interaction with various third-party services through a standardized interface. This server provides direct access to platform integrations, actions, execution capabilities, and robust code generation capabilities.

## Features

### Tools
- **list_pica_integrations** - List all available platforms and your active connections
- **search_pica_platform_actions** - Search for available actions for a specific platform
- **get_pica_action_knowledge** - Get detailed documentation for a specific action including parameters and usage
- **execute_pica_action** - Execute API actions with full parameter support

## Key Capabilities

### Platform Integration
- Connect to 200+ platforms through Pica
- Manage multiple connections per platform
- Real-time connection status and discovery

### Smart Intent Detection
- Execute actions directly from natural language (e.g. "read my last gmail email", "send a message to the slack channel #general")
- Generate integration code from prompts (e.g. "build a form to send emails using gmail", "create a UI for messaging")
- Automatically distinguishes between execution and code generation intent

### Direct Execution
- Support for all HTTP methods (GET, POST, PUT, DELETE, etc.)
- Handle form data, URL encoding, and JSON payloads
- Path variable substitution, query parameters, and custom headers

### Security
- All requests authenticated and proxied through Pica; no platform API keys to manage
- Secrets never exposed in responses or generated code
- Request configurations sanitized before returning to clients
- Fine-grained access control via permission levels, connection key scoping, and action allowlisting

## Getting Started

The fastest way to get up and running is with the [Pica CLI](https://www.npmjs.com/package/@picahq/cli). It handles API key configuration and MCP installation for your agent or editor of choice.

```bash
npm install -g @picahq/cli
pica init
```

`pica init` will prompt you for your API key (get one from the [Pica dashboard](https://app.picaos.com/settings/api-keys)) and walk you through configuring the MCP server for your environment (Claude Desktop, Cursor, Claude Code, etc.).

### Manual Installation

If you prefer to configure the server manually, install the package directly:

```bash
npm install @picahq/mcp
```

Then set the required environment variable:

```bash
PICA_SECRET=your-pica-secret-key
```

### Optional: Identity Scoping

You can scope connections to a specific identity (e.g., a user, team, or organization) by setting these optional environment variables:

```bash
PICA_IDENTITY=user_123
PICA_IDENTITY_TYPE=user
```

| Variable | Description | Values |
|----------|-------------|--------|
| `PICA_IDENTITY` | The identifier for the entity (e.g., user ID, team ID) | Any string |
| `PICA_IDENTITY_TYPE` | The type of identity | `user`, `team`, `organization`, `project` |

When set, the MCP server will only return connections associated with the specified identity. This is useful for multi-tenant applications where you want to scope integrations to specific users or entities.

### Optional: Access Control

Fine-tune what the MCP server can see and do by setting these optional environment variables:

```bash
PICA_PERMISSIONS=read
PICA_CONNECTION_KEYS=conn_key_1,conn_key_2
PICA_ACTION_IDS=action_id_1,action_id_2
PICA_KNOWLEDGE_AGENT=true
```

| Variable | Type | Default | Description |
|---|---|---|---|
| `PICA_PERMISSIONS` | `read` \| `write` \| `admin` | `admin` | Filter actions by HTTP method. `read` = GET only, `write` = GET/POST/PUT/PATCH, `admin` = all methods |
| `PICA_CONNECTION_KEYS` | `*` or comma-separated keys | `*` | Restrict visible connections and platforms to specific connection keys |
| `PICA_ACTION_IDS` | `*` or comma-separated IDs | `*` | Restrict visible and executable actions to specific action IDs |
| `PICA_KNOWLEDGE_AGENT` | `true` \| `false` | `false` | Remove the `execute_pica_action` tool entirely, forcing knowledge-only mode |

All defaults preserve current behavior. If no access control env vars are set, the server starts with full access and all tools available.

## Manual Configuration

If you used `pica init`, the configuration below is already done for you. These examples are for reference or manual setups.

### Standalone

```bash
npx @picahq/mcp
```

### Claude Desktop

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

### Cursor

In the Cursor menu, select "MCP Settings" and add the following:

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

### Remote MCP Server

The remote MCP server is available at [https://mcp.picaos.com](https://mcp.picaos.com).

### Docker

```bash
docker build -t pica-mcp-server .
docker run -e PICA_SECRET=your_pica_secret_key pica-mcp-server
```

All environment variables listed in the [Setup](#getting-started) section can be passed as `-e` flags.

## Examples for Inspiration

### Integration Code Generation

**Build Email Form:**
> "Create me a React form component that can send emails using Gmail using Pica"

**Linear Dashboard:**
> "Create a dashboard that displays Linear users and their assigned projects with filtering options using Pica"

**QuickBooks Table:**
> "Build a paginatable table component that fetches and displays QuickBooks invoices with search and sort using Pica"

**Slack Integration:**
> "Create a page with a form that can post messages to multiple Slack channels with message scheduling using Pica"

### Direct Action Execution

**Gmail Example:**
> "Get my last 5 emails from Gmail using Pica"

**Slack Example:**
> "Send a slack message to #general channel: 'Meeting in 10 minutes' using Pica"

**Shopify Example:**
> "Get all products from my Shopify store using Pica"

## Error Handling

All tool inputs are validated against Zod schemas before execution. Path variables are checked for completeness; missing or empty values throw descriptive errors rather than producing malformed requests. API failures from upstream platforms are caught and returned as structured MCP error responses with actionable messages. The server never surfaces raw stack traces to clients.

## Security

All requests to third-party platforms are authenticated and proxied through Pica's API. The MCP server never handles OAuth tokens or platform API keys directly. The `PICA_SECRET` key is the sole credential required, and it is automatically redacted from all response payloads returned to clients. Sensitive headers are stripped from logged and returned request configurations.

For fine-grained control, the server supports permission levels (`PICA_PERMISSIONS`), connection key scoping (`PICA_CONNECTION_KEYS`), action allowlisting (`PICA_ACTION_IDS`), and a knowledge-only mode (`PICA_KNOWLEDGE_AGENT`) that removes execution capabilities entirely. See the [Access Control](#optional-access-control) section above for details.

## License

MIT

## Support

For support, please contact support@picaos.com or visit https://picaos.com