/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import '@elastic/opentelemetry-node'
import '../telemetry.js'

import { ElasticsearchMcpServer } from './mcp-server.js'
import { createTransportManager } from './transport/transport-manager.js'
import { TransportType, ServerConfig, ConfigSchema } from './types.js'

/**
 * Parse transport type from environment variable
 */
function parseTransportType(): TransportType {
  const transport = process.env.TRANSPORT?.toLowerCase()
  
  switch (transport) {
    case 'stdio':
      return TransportType.STDIO
    case 'sse':
      return TransportType.SSE
    case 'streamable-http':
    case 'streamable_http':
      return TransportType.STREAMABLE_HTTP
    default:
      // Default to STDIO if not specified or invalid
      return TransportType.STDIO
  }
}

/**
 * Create server configuration from environment variables
 */
function createServerConfig(): ServerConfig {
  const transportType = parseTransportType()
  
  const config: ServerConfig = {
    transport: transportType,
    elasticsearch: {
      url: process.env.ES_URL ?? '',
      apiKey: process.env.ES_API_KEY,
      username: process.env.ES_USERNAME,
      password: process.env.ES_PASSWORD,
      caCert: process.env.ES_CA_CERT,
      version: process.env.ES_VERSION,
      sslSkipVerify: process.env.ES_SSL_SKIP_VERIFY === '1' || process.env.ES_SSL_SKIP_VERIFY === 'true',
      pathPrefix: process.env.ES_PATH_PREFIX
    }
  }

  // Add port and host for HTTP transports
  if (transportType === TransportType.SSE || transportType === TransportType.STREAMABLE_HTTP) {
    config.port = parseInt(process.env.PORT || '3000', 10)
    config.host = process.env.HOST || '127.0.0.1'
  }

  return config
}

async function main(): Promise<void> {
  try {
    console.log('Starting Elasticsearch MCP Server...')
    
    // Create configuration
    const config = createServerConfig()
    console.log(`Transport: ${config.transport}`)
    
    if (config.port && config.host) {
      console.log(`Host: ${config.host}:${config.port}`)
    }

    // Validate Elasticsearch configuration
    const validatedElasticsearchConfig = ConfigSchema.parse(config.elasticsearch)
    
    // Create MCP server
    const mcpServer = new ElasticsearchMcpServer(validatedElasticsearchConfig)
    
    // Create transport manager
    const transportManager = createTransportManager(
      mcpServer.getServer(),
      config.transport,
      config.port,
      config.host
    )

    // Start the server
    await transportManager.start()
    
    console.log('Elasticsearch MCP Server started successfully')

    // Handle graceful shutdown for STDIO transport
    if (config.transport === TransportType.STDIO) {
      process.on('SIGINT', async () => {
        console.log('Shutting down...')
        await transportManager.stop()
        process.exit(0)
      })

      process.on('SIGTERM', async () => {
        console.log('Shutting down...')
        await transportManager.stop()
        process.exit(0)
      })
    }

  } catch (error) {
    console.error(
      'Failed to start server:',
      error instanceof Error ? error.message : String(error)
    )
    process.exit(1)
  }
}

// Start the server
main().catch((error) => {
  console.error(
    'Fatal error:',
    error instanceof Error ? error.message : String(error)
  )
  process.exit(1)
})
