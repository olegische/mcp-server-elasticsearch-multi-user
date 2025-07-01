/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { z } from 'zod'

export const ConfigSchema = z
  .object({
    url: z
      .string()
      .optional()
      .describe('Elasticsearch server URL'),

    apiKey: z
      .string()
      .optional()
      .describe('API key for Elasticsearch authentication'),

    username: z
      .string()
      .optional()
      .describe('Username for Elasticsearch authentication'),

    password: z
      .string()
      .optional()
      .describe('Password for Elasticsearch authentication'),

    caCert: z
      .string()
      .optional()
      .describe('Path to custom CA certificate for Elasticsearch'),

    pathPrefix: z.string().optional().describe('Path prefix for Elasticsearch'),

    version: z
      .string()
      .optional()
      .transform((val) => (['8', '9'].includes(val || '') ? val : '9'))
      .describe('Elasticsearch version (8, or 9)'),

    sslSkipVerify: z
      .boolean()
      .optional()
      .describe('Skip SSL certificate verification'),
  })

export type ElasticsearchConfig = z.infer<typeof ConfigSchema>

export interface RequestContext {
  headers: Record<string, string | string[] | undefined>
  sessionId?: string
}

export enum TransportType {
  STDIO = 'stdio',
  SSE = 'sse',
  STREAMABLE_HTTP = 'streamable-http'
}

export interface ServerConfig {
  transport: TransportType
  port?: number
  host?: string
  elasticsearch: ElasticsearchConfig
}
