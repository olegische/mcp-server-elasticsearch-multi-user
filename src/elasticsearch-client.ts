/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { Client, ClientOptions, Transport, TransportRequestOptions, TransportRequestParams } from '@elastic/elasticsearch'
import fs from 'fs'
import { ElasticsearchConfig, RequestContext, ConfigSchema } from './types.js'

// Product metadata for User-Agent
const product = {
  name: 'elasticsearch-mcp',
  version: process.env.npm_package_version || '1.0.0'
}

// Custom transport with path prefix support
class CustomTransport extends Transport {
  private readonly pathPrefix: string

  constructor(
    opts: ConstructorParameters<typeof Transport>[0],
    pathPrefix: string
  ) {
    super(opts)
    this.pathPrefix = pathPrefix
  }

  async request(
    params: TransportRequestParams,
    options?: TransportRequestOptions
  ): Promise<any> {
    const newParams = { ...params, path: this.pathPrefix + params.path }
    return await super.request(newParams, options)
  }
}

export class ElasticsearchClientFactory {
  constructor(private readonly baseConfig: ElasticsearchConfig) {}

  /**
   * Creates an Elasticsearch client for the current request context.
   * Headers take priority over base configuration.
   */
  createClient(context?: RequestContext): Client {
    const mergedConfig = this.mergeConfigWithHeaders(this.baseConfig, context?.headers)
    const validatedConfig = ConfigSchema.parse(mergedConfig)
    
    return this.buildClient(validatedConfig)
  }

  private mergeConfigWithHeaders(
    baseConfig: ElasticsearchConfig,
    headers?: Record<string, string | string[] | undefined>
  ): ElasticsearchConfig {
    const mergedConfig = { ...baseConfig }
    
    console.log('DEBUG: mergeConfigWithHeaders called')
    console.log('DEBUG: baseConfig:', JSON.stringify(baseConfig, null, 2))
    console.log('DEBUG: headers:', JSON.stringify(headers, null, 2))
    
    if (!headers) {
      console.log('DEBUG: No headers provided, returning base config')
      return mergedConfig
    }

    // Helper function to get header value case-insensitively
    const getHeader = (name: string): string | undefined => {
      const lowerName = name.toLowerCase()
      for (const [key, value] of Object.entries(headers)) {
        if (key.toLowerCase() === lowerName) {
          console.log(`DEBUG: Found header ${name}: ${value}`)
          return value as string
        }
      }
      console.log(`DEBUG: Header ${name} not found`)
      return undefined
    }

    // Override config with header values if present
    const esUrl = getHeader('x-es-url')
    if (esUrl) {
      console.log(`DEBUG: Setting URL from header: ${esUrl}`)
      mergedConfig.url = esUrl
    }
    
    const apiKey = getHeader('x-es-api-key')
    if (apiKey) {
      mergedConfig.apiKey = apiKey
      // Clear username/password if API key is provided
      mergedConfig.username = undefined
      mergedConfig.password = undefined
    } else {
      // Only use username/password from headers if no API key
      const username = getHeader('x-es-username')
      if (username) {
        mergedConfig.username = username
      }
      const password = getHeader('x-es-password')
      if (password) {
        mergedConfig.password = password
      }
    }
    
    const caCert = getHeader('x-es-ca-cert')
    if (caCert) {
      mergedConfig.caCert = caCert
    }
    
    const version = getHeader('x-es-version')
    if (version) {
      mergedConfig.version = version
    }
    
    const sslSkipVerify = getHeader('x-es-ssl-skip-verify')
    if (sslSkipVerify) {
      mergedConfig.sslSkipVerify = sslSkipVerify === 'true' || sslSkipVerify === '1'
    }
    
    const pathPrefix = getHeader('x-es-path-prefix')
    if (pathPrefix) {
      mergedConfig.pathPrefix = pathPrefix
    }

    return mergedConfig
  }

  private buildClient(config: ElasticsearchConfig): Client {
    const { url, apiKey, username, password, caCert, version, pathPrefix, sslSkipVerify } = config

    // URL is required for client creation
    if (!url || url.trim() === '') {
      throw new Error('Elasticsearch URL is required. Provide it via ES_URL environment variable or x-es-url header.')
    }

    const clientOptions: ClientOptions = {
      node: url,
      headers: {
        'user-agent': `${product.name}/${product.version}`
      }
    }

    // Set up custom transport with path prefix if needed
    if (pathPrefix) {
      const verifiedPathPrefix = pathPrefix
      clientOptions.Transport = class extends CustomTransport {
        constructor(opts: ConstructorParameters<typeof Transport>[0]) {
          super(opts, verifiedPathPrefix)
        }
      }
    }

    // Set up authentication
    if (apiKey) {
      clientOptions.auth = { apiKey }
    } else if (username && password) {
      clientOptions.auth = { username, password }
    }

    // Set up SSL/TLS configuration
    clientOptions.tls = {}
    
    if (caCert && caCert.length > 0) {
      try {
        const ca = fs.readFileSync(caCert)
        clientOptions.tls.ca = ca
      } catch (error) {
        console.error(
          `Failed to read certificate file: ${
            error instanceof Error ? error.message : String(error)
          }`
        )
      }
    }

    // Skip SSL verification if requested
    if (sslSkipVerify === true) {
      clientOptions.tls.rejectUnauthorized = false
    }

    // Add version-specific configuration
    if (version === '8') {
      clientOptions.maxRetries = 5
      clientOptions.requestTimeout = 30000
      clientOptions.headers = {
        ...clientOptions.headers,
        accept: 'application/vnd.elasticsearch+json;compatible-with=8',
        'content-type': 'application/vnd.elasticsearch+json;compatible-with=8'
      }
    }

    return new Client(clientOptions)
  }
}
