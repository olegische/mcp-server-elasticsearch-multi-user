/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { z } from 'zod'
import { estypes } from '@elastic/elasticsearch'
import { ElasticsearchClientFactory } from '../elasticsearch-client.js'
import { RequestContext } from '../types.js'

export class ElasticsearchTools {
  constructor(private readonly clientFactory: ElasticsearchClientFactory) {}

  /**
   * List all available Elasticsearch indices
   */
  async listIndices(
    args: { indexPattern: string },
    context?: RequestContext
  ) {
    try {
      const esClient = this.clientFactory.createClient(context)
      const response = await esClient.cat.indices({
        index: args.indexPattern,
        format: 'json'
      })

      const indicesInfo = response.map((index: any) => ({
        index: index.index,
        health: index.health,
        status: index.status,
        docsCount: index.docsCount
      }))

      return {
        content: [
          {
            type: 'text' as const,
            text: `Found ${indicesInfo.length} indices`
          },
          {
            type: 'text' as const,
            text: JSON.stringify(indicesInfo, null, 2)
          }
        ]
      }
    } catch (error) {
      console.error(
        `Failed to list indices: ${
          error instanceof Error ? error.message : String(error)
        }`
      )
      return {
        content: [
          {
            type: 'text' as const,
            text: `Error: ${
              error instanceof Error ? error.message : String(error)
            }`
          }
        ]
      }
    }
  }

  /**
   * Get field mappings for a specific Elasticsearch index
   */
  async getMappings(
    args: { index: string },
    context?: RequestContext
  ) {
    try {
      const esClient = this.clientFactory.createClient(context)
      const mappingResponse = await esClient.indices.getMapping({
        index: args.index
      })

      return {
        content: [
          {
            type: 'text' as const,
            text: `Mappings for index: ${args.index}`
          },
          {
            type: 'text' as const,
            text: `Mappings for index ${args.index}: ${JSON.stringify(
              mappingResponse[args.index]?.mappings ?? {},
              null,
              2
            )}`
          }
        ]
      }
    } catch (error) {
      console.error(
        `Failed to get mappings: ${
          error instanceof Error ? error.message : String(error)
        }`
      )
      return {
        content: [
          {
            type: 'text' as const,
            text: `Error: ${
              error instanceof Error ? error.message : String(error)
            }`
          }
        ]
      }
    }
  }

  /**
   * Perform an Elasticsearch search with the provided query DSL
   */
  async search(
    args: {
      index: string
      queryBody: Record<string, any>
      profile?: boolean
      explain?: boolean
    },
    context?: RequestContext
  ) {
    try {
      const esClient = this.clientFactory.createClient(context)
      
      // Get mappings to identify text fields for highlighting
      const mappingResponse = await esClient.indices.getMapping({
        index: args.index
      })

      const indexMappings = mappingResponse[args.index]?.mappings ?? {}

      const searchRequest: estypes.SearchRequest = {
        index: args.index,
        ...args.queryBody,
        profile: args.profile,
        explain: args.explain,
      }

      // Always do highlighting
      if (indexMappings.properties != null) {
        const textFields: Record<string, estypes.SearchHighlightField> = {}

        for (const [fieldName, fieldData] of Object.entries(
          indexMappings.properties
        )) {
          if ((fieldData as any).type === 'text' || 'dense_vector' in (fieldData as any)) {
            textFields[fieldName] = {}
          }
        }

        searchRequest.highlight = {
          fields: textFields,
          pre_tags: ['<em>'],
          post_tags: ['</em>']
        }
      }

      const result = await esClient.search(searchRequest)

      // Extract the 'from' parameter from queryBody, defaulting to 0 if not provided
      const from: string | number = args.queryBody.from ?? 0

      const contentFragments = result.hits.hits.map((hit: any) => {
        const highlightedFields = hit.highlight ?? {}
        const sourceData = hit._source ?? {}

        let content = ''

        for (const [field, highlights] of Object.entries(highlightedFields)) {
          if (highlights != null && Array.isArray(highlights) && highlights.length > 0) {
            content += `${field} (highlighted): ${highlights.join(
              ' ... '
            )}\n`
          }
        }

        for (const [field, value] of Object.entries(sourceData)) {
          if (!(field in highlightedFields)) {
            content += `${field}: ${JSON.stringify(value)}\n`
          }
        }

        if (args.explain && hit._explanation) {
          content += `\nExplanation:\n${JSON.stringify(hit._explanation, null, 2)}`
        }

        return {
          type: 'text' as const,
          text: content.trim()
        }
      })

      const metadataFragment = {
        type: 'text' as const,
        text: `Total results: ${
          typeof result.hits.total === 'number'
            ? result.hits.total
            : result.hits.total?.value ?? 0
        }, showing ${result.hits.hits.length} from position ${from}`
      }

      // Check if there are any aggregations in the result and include them
      const aggregationsFragment = (result.aggregations != null)
        ? {
            type: 'text' as const,
            text: `Aggregations: ${JSON.stringify(result.aggregations, null, 2)}`
          }
        : null

      const fragments = [metadataFragment, ...contentFragments]

      if (args.profile && result.profile) {
        const profileFragment = {
          type: "text" as const,
          text: `\nQuery Profile:\n${JSON.stringify(result.profile, null, 2)}`,
        }
        fragments.push(profileFragment)
      }

      return {
        content: (aggregationsFragment != null)
          ? [metadataFragment, aggregationsFragment, ...contentFragments]
          : [metadataFragment, ...contentFragments]
      }
    } catch (error) {
      console.error(
        `Search failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      )
      return {
        content: [
          {
            type: 'text' as const,
            text: `Error: ${
              error instanceof Error ? error.message : String(error)
            }`
          }
        ]
      }
    }
  }

  /**
   * Get shard information for all or specific indices
   */
  async getShards(
    args: { index?: string },
    context?: RequestContext
  ) {
    try {
      const esClient = this.clientFactory.createClient(context)
      const response = await esClient.cat.shards({
        index: args.index,
        format: 'json'
      })

      const shardsInfo = response.map((shard: any) => ({
        index: shard.index,
        shard: shard.shard,
        prirep: shard.prirep,
        state: shard.state,
        docs: shard.docs,
        store: shard.store,
        ip: shard.ip,
        node: shard.node
      }))

      const metadataFragment = {
        type: 'text' as const,
        text: `Found ${shardsInfo.length} shards${
          args.index != null ? ` for index ${args.index}` : ''
        }`
      }

      return {
        content: [
          metadataFragment,
          {
            type: 'text' as const,
            text: JSON.stringify(shardsInfo, null, 2)
          }
        ]
      }
    } catch (error) {
      console.error(
        `Failed to get shard information: ${
          error instanceof Error ? error.message : String(error)
        }`
      )
      return {
        content: [
          {
            type: 'text' as const,
            text: `Error: ${
              error instanceof Error ? error.message : String(error)
            }`
          }
        ]
      }
    }
  }
}

// Tool schemas for validation
export const ListIndicesSchema = z.object({
  indexPattern: z
    .string()
    .trim()
    .min(1, 'Index pattern is required')
    .describe('Index pattern of Elasticsearch indices to list')
})

export const GetMappingsSchema = z.object({
  index: z
    .string()
    .trim()
    .min(1, 'Index name is required')
    .describe('Name of the Elasticsearch index to get mappings for')
})

export const SearchSchema = z.object({
  index: z
    .string()
    .trim()
    .min(1, 'Index name is required')
    .describe('Name of the Elasticsearch index to search'),

  queryBody: z
    .record(z.any())
    .refine(
      (val) => {
        try {
          JSON.parse(JSON.stringify(val))
          return true
        } catch (e) {
          return false
        }
      },
      {
        message: 'queryBody must be a valid Elasticsearch query DSL object'
      }
    )
    .describe(
      "Complete Elasticsearch query DSL object that can include query, size, from, sort, etc."
    ),

  profile: z
    .boolean()
    .optional()
    .default(false)
    .describe("Whether to include query profiling information"),

  explain: z
    .boolean()
    .optional()
    .default(false)
    .describe("Whether to include explanation of how the query was executed"),
})

export const GetShardsSchema = z.object({
  index: z
    .string()
    .optional()
    .describe('Optional index name to get shard information for')
})
