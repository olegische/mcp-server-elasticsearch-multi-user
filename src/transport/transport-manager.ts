/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { requestContextStorage } from '../context.js'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js'
import express, { type Request, type Response } from 'express'
import { createServer, type Server } from 'http'
import { randomUUID } from 'node:crypto'
import { TransportType, RequestContext } from '../types.js'

export interface TransportManager {
  start(): Promise<void>
  stop(): Promise<void>
  getRequestContext(req: Request): RequestContext
}

export class StdioTransportManager implements TransportManager {
  constructor(private readonly mcpServer: McpServer) {}

  async start(): Promise<void> {
    console.log('Starting STDIO transport...')
    const transport = new StdioServerTransport()
    await this.mcpServer.connect(transport)
    console.log('STDIO transport connected')
  }

  async stop(): Promise<void> {
    // STDIO transport doesn't need explicit cleanup
  }

  getRequestContext(req: Request): RequestContext {
    return { headers: req.headers }
  }
}

export class HttpTransportManager implements TransportManager {
  private httpServer: Server | null = null
  private readonly transports = {
    streamable: {} as Record<string, StreamableHTTPServerTransport>,
    sse: {} as Record<string, SSEServerTransport>,
  }

  constructor(
    private readonly mcpServer: McpServer,
    private readonly port: number,
    private readonly host: string,
    private readonly transportType: TransportType.SSE | TransportType.STREAMABLE_HTTP
  ) {}

  async start(): Promise<void> {
    const app = express()

    // Middleware to parse JSON for StreamableHTTP
    if (this.transportType === TransportType.STREAMABLE_HTTP) {
      app.use('/mcp', express.json())
    }

    if (this.transportType === TransportType.STREAMABLE_HTTP) {
      this.setupStreamableHttpEndpoints(app)
    } else {
      this.setupSSEEndpoints(app)
    }

    this.httpServer = app.listen(this.port, this.host, () => {
      console.log(`HTTP server listening on ${this.host}:${this.port}`)
      if (this.transportType === TransportType.SSE) {
        console.log(`SSE endpoint: http://${this.host}:${this.port}/sse`)
        console.log(`Message endpoint: http://${this.host}:${this.port}/messages`)
      } else {
        console.log(`StreamableHTTP endpoint: http://${this.host}:${this.port}/mcp`)
      }
    })

    this.setupGracefulShutdown()
  }

  async stop(): Promise<void> {
    if (!this.httpServer) {
      return
    }

    return new Promise((resolve, reject) => {
      this.httpServer!.close(async (err: Error | undefined) => {
        if (err) {
          reject(err)
          return
        }
        
        this.httpServer = null
        
        // Close all transports
        await this.closeAllTransports()
        resolve()
      })
    })
  }

  getRequestContext(req: Request): RequestContext {
    console.log('DEBUG: getRequestContext called')
    console.log('DEBUG: req.headers:', JSON.stringify(req.headers, null, 2))
    console.log('DEBUG: req.query:', JSON.stringify(req.query, null, 2))
    
    const context = {
      headers: req.headers,
      sessionId: req.headers['mcp-session-id'] as string || req.query.sessionId as string
    }
    
    console.log('DEBUG: returning context:', JSON.stringify(context, null, 2))
    return context
  }

  private setupStreamableHttpEndpoints(app: express.Application): void {
    // Modern Streamable HTTP endpoint
    app.post('/mcp', async (req: Request, res: Response) => {
      console.log('Received StreamableHTTP request')
      const sessionId = req.headers['mcp-session-id'] as string | undefined
      let transport: StreamableHTTPServerTransport

      if (sessionId && this.transports.streamable[sessionId]) {
        // Reuse existing transport
        console.log('Reusing existing StreamableHTTP transport for sessionId', sessionId)
        transport = this.transports.streamable[sessionId]
      } else if (!sessionId && isInitializeRequest(req.body)) {
        console.log('New initialization request for StreamableHTTP')
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (sessionId) => {
            this.transports.streamable[sessionId] = transport
          },
        })
        transport.onclose = () => {
          if (transport.sessionId) {
            delete this.transports.streamable[transport.sessionId]
          }
        }
        await this.mcpServer.connect(transport)
      } else {
        // Invalid request
        console.log('Invalid request:', req.body)
        res.status(400).json({
          jsonrpc: '2.0',
          error: {
            code: -32000,
            message: 'Bad Request: No valid session ID provided',
          },
          id: null,
        })
        return
      }

      console.log('Handling StreamableHTTP request')
      await transport.handleRequest(req, res, req.body)
      console.log('StreamableHTTP request handled')
    })

    // Handle GET requests for server-to-client notifications via SSE
    app.get('/mcp', this.handleSessionRequest.bind(this))

    // Handle DELETE requests for session termination
    app.delete('/mcp', this.handleSessionRequest.bind(this))
  }

  private setupSSEEndpoints(app: express.Application): void {
    // Store request contexts by session ID
    const sessionContexts: Record<string, RequestContext> = {}

    // Legacy SSE endpoint
    app.get('/sse', async (req: Request, res: Response) => {
      console.log('Establishing new SSE connection')
      console.log('DEBUG: SSE connection headers:', JSON.stringify(req.headers, null, 2))
      
      const transport = new SSEServerTransport('/messages', res)
      console.log(`New SSE connection established for sessionId ${transport.sessionId}`)

      // Store the request context for this session
      const context = this.getRequestContext(req)
      sessionContexts[transport.sessionId] = context

      this.transports.sse[transport.sessionId] = transport
      res.on('close', () => {
        delete this.transports.sse[transport.sessionId]
        delete sessionContexts[transport.sessionId]
      })

      await this.mcpServer.connect(transport)
    })

    app.post('/messages', async (req: Request, res: Response) => {
      const sessionId = req.query.sessionId as string
      const transport = this.transports.sse[sessionId]
      const context = sessionContexts[sessionId]
      
      if (transport) {
        console.log(`Received SSE message for sessionId ${sessionId}`)
        if (context) {
          await requestContextStorage.run(context, async () => {
            await transport.handlePostMessage(req, res)
          })
        } else {
          // If for some reason there's no context, run without it
          await transport.handlePostMessage(req, res)
        }
      } else {
        res.status(400).send(`No transport found for sessionId ${sessionId}`)
        return
      }
    })
  }

  private async handleSessionRequest(req: Request, res: Response): Promise<void> {
    const sessionId = req.headers['mcp-session-id'] as string | undefined
    if (!sessionId || !this.transports.streamable[sessionId]) {
      res.status(400).send('Invalid or missing session ID')
      return
    }

    console.log(`Received session request for session ${sessionId}`)

    try {
      const transport = this.transports.streamable[sessionId]
      await transport.handleRequest(req, res)
    } catch (error) {
      console.error('Error handling session request:', error)
      if (!res.headersSent) {
        res.status(500).send('Error processing session request')
      }
    }
  }

  private async closeAllTransports(): Promise<void> {
    const allTransports = [
      ...Object.values(this.transports.sse),
      ...Object.values(this.transports.streamable)
    ]

    await Promise.all(
      allTransports.map(async (transport) => {
        try {
          await transport.close()
        } catch (error) {
          console.error('Error closing transport:', error)
        }
      })
    )

    // Clear transport maps
    Object.keys(this.transports.sse).forEach(key => delete this.transports.sse[key])
    Object.keys(this.transports.streamable).forEach(key => delete this.transports.streamable[key])
  }

  private setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
      console.log(`Received ${signal}, shutting down server...`)
      try {
        await this.stop()
        console.log('Server shutdown complete')
        process.exit(0)
      } catch (error) {
        console.error('Error during shutdown:', error)
        process.exit(1)
      }
    }

    process.on('SIGINT', () => shutdown('SIGINT'))
    process.on('SIGTERM', () => shutdown('SIGTERM'))
  }
}

export function createTransportManager(
  mcpServer: McpServer,
  transportType: TransportType,
  port?: number,
  host?: string
): TransportManager {
  switch (transportType) {
    case TransportType.STDIO:
      return new StdioTransportManager(mcpServer)
    
    case TransportType.SSE:
    case TransportType.STREAMABLE_HTTP:
      if (!port || !host) {
        throw new Error(`Port and host are required for ${transportType} transport`)
      }
      return new HttpTransportManager(mcpServer, port, host, transportType)
    
    default:
      throw new Error(`Unsupported transport type: ${transportType}`)
  }
}
