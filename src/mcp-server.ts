/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { requestContextStorage } from './context.js'
import { ElasticsearchClientFactory } from './elasticsearch-client.js'
import { ElasticsearchTools, ListIndicesSchema, GetMappingsSchema, SearchSchema, GetShardsSchema } from './tools/elasticsearch-tools.js'
import { ElasticsearchConfig, RequestContext } from './types.js'
// @ts-expect-error ignore `with` keyword
import pkg from '../package.json' with { type: 'json' }

export class ElasticsearchMcpServer {
  private readonly mcpServer: McpServer
  private readonly elasticsearchTools: ElasticsearchTools

  constructor(config: ElasticsearchConfig) {
    const clientFactory = new ElasticsearchClientFactory(config)
    this.elasticsearchTools = new ElasticsearchTools(clientFactory)
    
    this.mcpServer = new McpServer({
      name: 'elasticsearch-mcp',
      version: pkg.version
    })

    this.setupTools()
  }

  /**
   * Get the underlying MCP server instance
   */
  getServer(): McpServer {
    return this.mcpServer
  }

  private setupTools(): void {
    // Helper to get current request context from AsyncLocalStorage
    const getCurrentContext = (): RequestContext | undefined => {
      const context = requestContextStorage.getStore()
      if (!context) {
        console.log('DEBUG: No request context available in AsyncLocalStorage')
      }
      return context
    }

    // Tool 1: List indices
    this.mcpServer.tool(
      'list_indices',
      'List all available Elasticsearch indices',
      ListIndicesSchema.shape,
      async ({ indexPattern }) => {
        return await this.elasticsearchTools.listIndices(
          { indexPattern },
          getCurrentContext()
        )
      }
    )

    // Tool 2: Get mappings for an index
    this.mcpServer.tool(
      'get_mappings',
      'Get field mappings for a specific Elasticsearch index',
      GetMappingsSchema.shape,
      async ({ index }) => {
        return await this.elasticsearchTools.getMappings(
          { index },
          getCurrentContext()
        )
      }
    )

    // Tool 3: Search an index with query DSL
    this.mcpServer.tool(
      'search',
      'Perform an Elasticsearch search with the provided query DSL. Highlights are always enabled.',
      SearchSchema.shape,
      async ({ index, queryBody, profile, explain }) => {
        return await this.elasticsearchTools.search(
          { index, queryBody, profile, explain },
          getCurrentContext()
        )
      }
    )

    // Tool 4: Get shard information
    this.mcpServer.tool(
      'get_shards',
      'Get shard information for all or specific indices',
      GetShardsSchema.shape,
      async ({ index }) => {
        return await this.elasticsearchTools.getShards(
          { index },
          getCurrentContext()
        )
      }
    )
  }
}
