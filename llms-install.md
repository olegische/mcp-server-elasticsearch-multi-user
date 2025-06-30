# Elasticsearch MCP Server Installation Guide for LLMs

This guide will help you install and configure the Elasticsearch MCP Server for interacting with Elasticsearch clusters through Claude Desktop and other AI assistants. This server provides **multi-user support** through HTTP headers, allowing different users to connect to different clusters with their own credentials.

## Requirements

- Docker installed on your system
- Access to an Elasticsearch cluster
- Elasticsearch authentication credentials (API key or username/password)
- Basic understanding of Elasticsearch concepts (indices, mappings, queries)

## Installation Methods

### Method 1: Docker with Environment Variables (Single User)

**Best for**: Single user, simple deployments, testing with one Elasticsearch cluster

**Step 1**: Start Docker container with environment variables
```bash
docker run --rm -p 8664:8664 \
  -e PORT=8664 \
  -e HOST=0.0.0.0 \
  -e ES_URL="https://your-elasticsearch-cluster.es.io:9243" \
  -e ES_API_KEY="your_elasticsearch_api_key" \
  ghcr.io/olegische/mcp-server-elasticsearch-multi-user:latest
```

**Step 2**: Configure Claude Desktop with SSE transport
```json
{
  "mcpServers": {
    "elasticsearch": {
      "type": "sse",
      "url": "http://localhost:8664/sse"
    }
  }
}
```
**Note**: This server only supports HTTP transports (SSE and StreamableHTTP). Environment variables are used for single-user configuration.

---

### Method 2: Docker with Custom Headers (Multi-User) - **RECOMMENDED**

**Best for**: Multi-user environments, enterprise deployments, dynamic credentials passed via headers, different users accessing different Elasticsearch clusters.

**Step 1**: Start Docker container with HTTP server mode
This command runs the MCP server in HTTP mode with SSE transport, which is required for header-based authentication and multi-user support.
```bash
docker run --rm -p 8664:8664 \
  -e PORT=8664 \
  -e HOST=0.0.0.0 \
  ghcr.io/olegische/mcp-server-elasticsearch-multi-user:latest
```
*Note: The default transport for this image is HTTP with SSE support. We configure it to run on port 8664.*

**Step 2**: Configure Claude Desktop with SSE transport
```json
{
  "mcpServers": {
    "elasticsearch": {
      "type": "sse",
      "url": "http://localhost:8664/sse",
      "headers": {
        "X-ES-URL": "https://your-elasticsearch-cluster.es.io:9243",
        "X-ES-API-Key": "your_elasticsearch_api_key"
      }
    }
  }
}
```

---

### Method 3: MCPO Proxy for OpenWebUI Integration

**Best for**: OpenWebUI integration, REST API access, web-based AI interfaces

**Step 1**: Start MCP server in background
```bash
docker run -d --name elasticsearch-mcp -p 8664:8664 \
  -e PORT=8664 \
  -e HOST=0.0.0.0 \
  ghcr.io/olegische/mcp-server-elasticsearch-multi-user:latest
```

**Step 2**: Set up environment variables for MCPO
```bash
export HTTP_HEADER_ES_URL="https://your-elasticsearch-cluster.es.io:9243"
export HTTP_HEADER_ES_API_KEY="your_elasticsearch_api_key"
```

**Step 3**: Run MCPO proxy to convert MCP to REST API
```bash
uvx mcpo --port 8601 --server-type "sse" \
    --header "{
        \"X-ES-URL\": \"${HTTP_HEADER_ES_URL}\",
        \"X-ES-API-Key\": \"${HTTP_HEADER_ES_API_KEY}\"
    }" \
    -- http://localhost:8664/sse
```

---

## Multi-User Configuration Options

### Environment Variables (for Single-User Mode)

- `ES_URL`: Your Elasticsearch cluster URL (required).
- `ES_API_KEY`: API key for Elasticsearch authentication (required if not using username/password).
- `ES_USERNAME`: Username for basic authentication (alternative to API key).
- `ES_PASSWORD`: Password for basic authentication (required with username).
- `ES_CA_CERT`: Path to custom CA certificate for Elasticsearch SSL/TLS.
- `ES_SSL_SKIP_VERIFY`: Set to `true` or `1` to skip SSL certificate verification.
- `ES_PATH_PREFIX`: Path prefix for Elasticsearch instance exposed at a non-root path.
- `ES_VERSION`: Elasticsearch version (`8` or `9`, defaults to `9`).
- `DEBUG`: Set to `true` for verbose logging.

### Header-based Configuration (Multi-User Mode)

The server automatically prioritizes credentials passed via headers. If headers are not present, it falls back to environment variables. **This is the key feature for multi-user support.**

- `X-ES-URL`: Your Elasticsearch cluster URL (required).
- `X-ES-API-Key`: API key for Elasticsearch authentication (required if not using username/password).
- `X-ES-Username`: Username for basic authentication (alternative to API key).
- `X-ES-Password`: Password for basic authentication (required with username).
- `X-ES-CA-Cert`: Path to custom CA certificate file.
- `X-ES-SSL-Skip-Verify`: Skip SSL verification (`true` or `1`).
- `X-ES-Path-Prefix`: Path prefix for Elasticsearch requests.
- `X-ES-Version`: Elasticsearch version (`8` or `9`).

### Multi-User Example Scenarios

**Scenario 1**: Different users accessing different Elasticsearch clusters
```json
// User A configuration
{
  "mcpServers": {
    "elasticsearch": {
      "type": "sse",
      "url": "http://localhost:8664/sse",
      "headers": {
        "X-ES-URL": "https://production-cluster.company.com:9243",
        "X-ES-API-Key": "prod_api_key_user_a"
      }
    }
  }
}

// User B configuration
{
  "mcpServers": {
    "elasticsearch": {
      "type": "sse",
      "url": "http://localhost:8664/sse",
      "headers": {
        "X-ES-URL": "https://staging-cluster.company.com:9243",
        "X-ES-API-Key": "staging_api_key_user_b"
      }
    }
  }
}
```

**Scenario 2**: Same cluster, different authentication methods
```json
// API Key authentication
{
  "headers": {
    "X-ES-URL": "https://shared-cluster.company.com:9243",
    "X-ES-API-Key": "api_key_for_user_1"
  }
}

// Basic authentication
{
  "headers": {
    "X-ES-URL": "https://shared-cluster.company.com:9243",
    "X-ES-Username": "user2",
    "X-ES-Password": "secure_password"
  }
}
```

---

## Available Tools

The Elasticsearch MCP Server provides comprehensive tools for interacting with Elasticsearch clusters:

- **`list_indices`**: List all available Elasticsearch indices with health status and document counts
- **`get_mappings`**: Get field mappings for a specific Elasticsearch index to understand data structure
- **`search`**: Perform Elasticsearch search with full query DSL support, including highlighting, profiling, and explanations
- **`get_shards`**: Get shard information for indices to understand cluster distribution and health

### Tool Usage Examples

**List indices with pattern matching:**
```
"Show me all indices that start with 'logs-'"
```

**Get field mappings:**
```
"What fields are available in the 'products' index?"
```

**Complex search with aggregations:**
```
"Find all orders from last month with total value over $500, group by customer region"
```

**Shard analysis:**
```
"Show me the shard distribution for the 'logs-2024' index"
```

---

## Security Best Practices

### API Key Creation

Create dedicated API keys with minimal permissions for each user or use case:

```bash
POST /_security/api_key
{
  "name": "mcp-server-user-readonly",
  "role_descriptors": {
    "mcp_readonly_role": {
      "cluster": [
        "monitor"
      ],
      "indices": [
        {
          "names": [
            "logs-*",
            "metrics-*",
            "user-data-*"
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

### Multi-User Security Considerations

- **Isolation**: Each request gets its own Elasticsearch client with user-specific credentials
- **No credential sharing**: Headers are processed per-request and not stored
- **Principle of least privilege**: Create API keys with minimal required permissions
- **Network security**: Ensure the MCP server is on a trusted network
- **SSL/TLS**: Always use HTTPS for production Elasticsearch clusters
- **Audit logging**: Enable Elasticsearch audit logging to track API key usage

### Production Deployment Security

- Use container secrets management for sensitive environment variables
- Implement network policies to restrict container communication
- Regular API key rotation and monitoring
- Use dedicated service accounts with limited cluster access
- Monitor for unusual query patterns or data access

---

## Troubleshooting

### Multi-User Specific Issues

**Headers not being recognized:**
- Ensure you're using HTTP mode (`docker run` without `stdio` argument)
- Verify headers are correctly formatted (case-sensitive: `X-ES-URL`, not `x-es-url`)
- Check that the SSE endpoint is being used (`/sse` path)

**Authentication failures with headers:**
- Verify API key has correct permissions for the requested indices
- Check that `X-ES-URL` points to an accessible Elasticsearch cluster
- Ensure either API key OR username/password is provided, not both
- Test credentials directly against Elasticsearch API

**Connection issues:**
- Verify network connectivity between MCP server and Elasticsearch cluster
- Check firewall rules and security groups
- Test SSL/TLS configuration with `X-ES-SSL-Skip-Verify: true` for debugging

**Performance issues with multiple users:**
- Monitor Elasticsearch cluster resources and connection limits
- Consider connection pooling and rate limiting
- Review API key permissions to ensure efficient queries
- Monitor query complexity and execution times

### General Issues

**Docker container issues:**
- Check container logs: `docker logs elasticsearch-mcp`
- Verify port mapping and network configuration
- Ensure sufficient container resources (memory, CPU)

**Claude Desktop integration:**
- Restart Claude Desktop after configuration changes
- Check MCP server logs in Claude Desktop developer tools
- Verify JSON configuration syntax

**Elasticsearch connectivity:**
- Test direct connection to Elasticsearch cluster
- Verify SSL certificates and CA configuration
- Check Elasticsearch cluster health and availability

### Debug Mode

Enable debug logging for detailed troubleshooting:

```bash
docker run --rm -p 8664:8664 \
  -e PORT=8664 \
  -e HOST=0.0.0.0 \
  -e DEBUG=true \
  ghcr.io/olegische/mcp-server-elasticsearch-multi-user:latest
```

This will provide detailed logs of:
- Header processing and credential resolution
- Elasticsearch client creation and configuration
- Query execution and response handling
- Error details and stack traces

---

## Advanced Configuration

### Custom CA Certificates

For Elasticsearch clusters with custom SSL certificates:

```json
{
  "headers": {
    "X-ES-URL": "https://internal-cluster.company.com:9243",
    "X-ES-API-Key": "your_api_key",
    "X-ES-CA-Cert": "/path/to/custom-ca.crt"
  }
}
```

### Path Prefix Support

For Elasticsearch behind a reverse proxy:

```json
{
  "headers": {
    "X-ES-URL": "https://api.company.com",
    "X-ES-Path-Prefix": "/elasticsearch",
    "X-ES-API-Key": "your_api_key"
  }
}
```

### Version-Specific Configuration

For Elasticsearch 8.x clusters:

```json
{
  "headers": {
    "X-ES-URL": "https://es8-cluster.company.com:9243",
    "X-ES-Version": "8",
    "X-ES-API-Key": "your_api_key"
  }
}
```

This ensures compatibility with Elasticsearch 8.x API differences and optimizations.
