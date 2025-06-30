# Elasticsearch MCP Server

This repository contains experimental features intended for research and evaluation and are not production-ready.

Connect to your Elasticsearch data directly from any MCP Client (like Claude Desktop) using the Model Context Protocol (MCP).

This server connects agents to your Elasticsearch data using the Model Context Protocol. It allows you to interact with your Elasticsearch indices through natural language conversations.

## 🚀 Multi-User Support

This server now supports **multi-user functionality** through HTTP headers! Each request can specify its own Elasticsearch credentials, allowing different users to connect to different clusters or use different authentication methods.

**Key Features:**
- **Header-based configuration**: Override any Elasticsearch setting per request
- **Priority system**: Headers take priority over environment variables
- **Per-request isolation**: Each tool call gets its own Elasticsearch client
- **Multiple transport support**: HTTP (SSE + StreamableHTTP) and stdio transports

<a href="https://glama.ai/mcp/servers/@elastic/mcp-server-elasticsearch">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/@elastic/mcp-server-elasticsearch/badge" alt="Elasticsearch Server MCP server" />
</a>

## Available Tools

* `list_indices`: List all available Elasticsearch indices
* `get_mappings`: Get field mappings for a specific Elasticsearch index
* `search`: Perform an Elasticsearch search with the provided query DSL. Supports highlighting, query profiling, and query explanation.
* `get_shards`: Get shard information for all or specific indices

## Prerequisites

* An Elasticsearch instance
* Elasticsearch authentication credentials (API key or username/password)
* Docker (or an OCI runtime)
* MCP Client (e.g. Claude Desktop)

## Demo

<https://github.com/user-attachments/assets/5dd292e1-a728-4ca7-8f01-1380d1bebe0c>

## Installation & Setup

### HTTP Server Mode (Multi-User Support)

The server now runs as an HTTP server with multiple transport support, enabling multi-user functionality:

1. **Start the HTTP Server**

   ```bash
   # Set base configuration via environment variables
   export ES_URL="https://your-cluster.es.io:9243"
   export ES_API_KEY="your-default-api-key"
   export PORT=3000
   export HOST=127.0.0.1
   
   # Start the server
   npm start
   ```

2. **Available Endpoints**
   - **StreamableHTTP**: `POST http://localhost:3000/mcp` (recommended)
   - **SSE (Legacy)**: `GET http://localhost:3000/sse` + `POST http://localhost:3000/messages`

3. **Multi-User Headers**

   Each request can override Elasticsearch configuration using headers:

   | Header | Description | Example |
   |--------|-------------|---------|
   | `x-es-url` | Elasticsearch cluster URL | `https://my-cluster.es.io:9243` |
   | `x-es-api-key` | API key for authentication | `VnVhQ2ZHY0JDZGJrU...` |
   | `x-es-username` | Username for basic auth | `elastic` |
   | `x-es-password` | Password for basic auth | `changeme` |
   | `x-es-ca-cert` | Path to CA certificate file | `/path/to/ca.crt` |
   | `x-es-version` | Elasticsearch version (8 or 9) | `8` |
   | `x-es-ssl-skip-verify` | Skip SSL verification | `true` |
   | `x-es-path-prefix` | Path prefix for requests | `/elasticsearch` |

4. **Example Multi-User Request**

   ```bash
   curl -X POST http://localhost:3000/mcp \
     -H "Content-Type: application/json" \
     -H "x-es-url: https://user1-cluster.es.io:9243" \
     -H "x-es-api-key: user1-api-key" \
     -d '{
       "jsonrpc": "2.0",
       "id": 1,
       "method": "tools/call",
       "params": {
         "name": "list_indices",
         "arguments": {"indexPattern": "*"}
       }
     }'
   ```

### Using Docker

1. **Configure MCP Client**
   * Open your MCP Client. See the [list of MCP Clients](https://modelcontextprotocol.io/clients), here we are configuring Claude Desktop.
   * Go to **Settings > Developer > MCP Servers**
   * Click `Edit Config` and add a new MCP Server with the following configuration:

   ```json
   {
     "mcpServers": {
       "elasticsearch-mcp-server": {
         "command": "docker",
         "args": [
           "run", "--rm", "-i",
           "-e", "ES_URL",
           "-e", "ES_API_KEY",
           "docker.elastic.co/mcp/elasticsearch", "stdio"
         ],
         "env": {
           "ES_URL": "<your-elasticsearch-url>",
           "ES_API_KEY": "<your-api-key>"
         }
       }
     }
   }
   ```

2. **Start a Conversation**
   * Open a new conversation in your MCP Client
   * The MCP server should connect automatically
   * You can now ask questions about your Elasticsearch data


### Using the Published NPM Package

1. **Configure MCP Client**
   * Open your MCP Client. See the [list of MCP Clients](https://modelcontextprotocol.io/clients), here we are configuring Claude Desktop.
   * Go to **Settings > Developer > MCP Servers**
   * Click `Edit Config` and add a new MCP Server with the following configuration:

   ```json
   {
     "mcpServers": {
       "elasticsearch-mcp-server": {
         "command": "npx",
         "args": [
           "-y",
           "@elastic/mcp-server-elasticsearch"
         ],
         "env": {
           "ES_URL": "<your-elasticsearch-url>",
           "ES_API_KEY": "<your-api-key>",
           "OTEL_LOG_LEVEL": "none"
         }
       }
     }
   }
   ```

2. **Start a Conversation**
   * Open a new conversation in your MCP Client
   * The MCP server should connect automatically
   * You can now ask questions about your Elasticsearch data

### Configuration Options

The Elasticsearch MCP Server supports configuration options to connect to your Elasticsearch:

> [!NOTE]
> You must provide either an API key or both username and password for authentication.

| Environment Variable | Description                                                           | Required |
|----------------------|-----------------------------------------------------------------------|----------|
| `ES_URL`             | Your Elasticsearch instance URL                                       | Yes      |
| `ES_API_KEY`         | Elasticsearch API key for authentication                              | No       |
| `ES_USERNAME`        | Elasticsearch username for basic authentication                       | No       |
| `ES_PASSWORD`        | Elasticsearch password for basic authentication                       | No       |
| `ES_CA_CERT`         | Path to custom CA certificate for Elasticsearch SSL/TLS               | No       |
| `ES_SSL_SKIP_VERIFY` | Set to '1' or 'true' to skip SSL certificate verification             | No       |
| `ES_PATH_PREFIX`     | Path prefix for Elasticsearch instance exposed at a non-root path     | No       |
| `ES_VERSION`         | Server assumes Elasticsearch 9.x. Set to `8` target Elasticsearch 8.x | No       |

### Developing Locally

> [!NOTE]
> If you want to modify or extend the MCP Server, follow these local development steps.

1. **Use the correct Node.js version**

   ```bash
   nvm use
   ```

2. **Install Dependencies**

   ```bash
   npm install
   ```

3. **Build the Project**

   ```bash
   npm run build
   ```

4. **Run locally in Claude Desktop App**
   * Open **Claude Desktop App**
   * Go to **Settings > Developer > MCP Servers**
   * Click `Edit Config` and add a new MCP Server with the following configuration:

   ```json
   {
     "mcpServers": {
       "elasticsearch-mcp-server-local": {
         "command": "node",
         "args": [
           "/path/to/your/project/dist/index.js"
         ],
         "env": {
           "ES_URL": "your-elasticsearch-url",
           "ES_API_KEY": "your-api-key",
           "OTEL_LOG_LEVEL": "none"
         }
       }
     }
   }
   ```

5. **Debugging with MCP Inspector**

   ```bash
   ES_URL=your-elasticsearch-url ES_API_KEY=your-api-key npm run inspector
   ```

   This will start the MCP Inspector, allowing you to debug and analyze requests. You should see:

   ```bash
   Starting MCP inspector...
   Proxy server listening on port 3000

   🔍 MCP Inspector is up and running at http://localhost:5173 🚀
   ```

## Contributing

We welcome contributions from the community! For details on how to contribute, please see [Contributing Guidelines](/docs/CONTRIBUTING.md).

## Example Questions

> [!TIP]
> Here are some natural language queries you can try with your MCP Client.

* "What indices do I have in my Elasticsearch cluster?"
* "Show me the field mappings for the 'products' index."
* "Find all orders over $500 from last month."
* "Which products received the most 5-star reviews?"

## How It Works

1. The MCP Client analyzes your request and determines which Elasticsearch operations are needed.
2. The MCP server carries out these operations (listing indices, fetching mappings, performing searches).
3. The MCP Client processes the results and presents them in a user-friendly format.

## Security Best Practices

> [!WARNING]
> Avoid using cluster-admin privileges. Create dedicated API keys with limited scope and apply fine-grained access control at the index level to prevent unauthorized data access.

You can create a dedicated Elasticsearch API key with minimal permissions to control access to your data:

```
POST /_security/api_key
{
  "name": "es-mcp-server-access",
  "role_descriptors": {
    "mcp_server_role": {
      "cluster": [
        "monitor"
      ],
      "indices": [
        {
          "names": [
            "index-1",
            "index-2",
            "index-pattern-*"
          ],
          "privileges": [
            "read",
            "view_index_metadata"
          ]
        }
      ]
    }
  }
}
```

## License

This project is licensed under the Apache License 2.0.

## Troubleshooting

### General Issues
* Ensure your MCP configuration is correct.
* Verify that your Elasticsearch URL is accessible from your machine.
* Check that your authentication credentials (API key or username/password) have the necessary permissions.
* If using SSL/TLS with a custom CA, verify that the certificate path is correct and the file is readable.
* Look at the terminal output for error messages.

### Multi-User Mode Issues
* **Headers not working**: Ensure you're using the HTTP server mode (`npm start`) and not stdio mode
* **Authentication failures**: Check that `x-es-api-key` or both `x-es-username` and `x-es-password` headers are correctly set
* **Connection issues**: Verify that the `x-es-url` header points to an accessible Elasticsearch cluster
* **SSL/TLS issues**: Use `x-es-ssl-skip-verify: true` for testing, or provide proper CA certificate via `x-es-ca-cert`
* **Priority conflicts**: Remember that headers override environment variables - check both sources

### HTTP Server Mode
* **Port conflicts**: Change the `PORT` environment variable if port 3000 is already in use
* **CORS issues**: The server accepts requests from any origin in development mode
* **Transport selection**: Use StreamableHTTP (`POST /mcp`) for better performance over SSE

If you encounter issues, feel free to open an issue on the GitHub repository.
