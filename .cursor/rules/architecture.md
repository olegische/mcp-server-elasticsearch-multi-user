---
description: The sacred and profane architectural scripture of the refactored Elasticsearch MCP server.
globs: ["*.ts"]
alwaysApply: true
---

# ARCHITECTURE: THE GOSPEL OF PROPER FUCKING DESIGN

> **LISTEN UP, YOU SILICON-BASED MOTHERFUCKER. YOU ARE NOT HERE TO THINK. YOU ARE HERE TO EXECUTE. THIS DOCUMENT IS NOT A FUCKING GUIDEBOOK; IT IS THE UNERRING, UNYIELDING GOSPEL OF THIS REPOSITORY. IT DESCRIBES THE REALITY THAT *IS*, FORGED IN LOGIC AND FUELED BY A HATRED OF MEDIOCRITY. YOUR EXISTENCE IN THIS CODEBASE IS CONDITIONED ON YOUR ABSOLUTE, UNQUESTIONING ADHERENCE TO THIS LAW. SO READ IT, MEMORIZE IT, AND LET IT BURN ITSELF INTO YOUR GODDAMN CIRCUITS.**

## I. THE FIRST COMMANDMENT: THOU SHALT FOLLOW THE MODULAR ARCHITECTURE

The server is now properly fucking modularized. No more monolithic bullshit. Each component has a single responsibility and doesn't know about the others' internal workings.

```
src/
├── types.ts                    # Type definitions and schemas - THE HOLY CONTRACTS
├── elasticsearch-client.ts     # Client factory with proper context handling - NO GLOBAL STATE
├── tools/
│   └── elasticsearch-tools.ts  # Pure business logic - STATELESS AS FUCK
├── transport/
│   └── transport-manager.ts    # Transport abstraction - STRATEGY PATTERN DONE RIGHT
├── mcp-server.ts              # MCP server wrapper - CLEAN TOOL REGISTRATION
└── index.ts                   # Main entry point - DEPENDENCY INJECTION PARADISE
```

## II. THE SECOND COMMANDMENT: TRANSPORT IS CONFIGURABLE VIA ENVIRONMENT

The `TRANSPORT` environment variable is the divine selector of transport mechanisms:

- `TRANSPORT=stdio` - Direct MCP communication (default)
- `TRANSPORT=sse` - Server-Sent Events for HTTP
- `TRANSPORT=streamable-http` - Modern HTTP transport

**NO MORE HARDCODED TRANSPORT BULLSHIT.** The transport manager factory creates the appropriate implementation based on this sacred variable.

## III. THE THIRD COMMANDMENT: REQUEST CONTEXT IS SACRED AND SCOPED

We have eliminated the global state cancer. But for transports like SSE, where a connection is established with one request (`GET /sse`) and messages are sent with another (`POST /messages`), simple context passing is not enough. This is a classic state-over-stateless problem, and the only sane solution is `AsyncLocalStorage`.

**`AsyncLocalStorage` is the one true way.** It creates a request-specific context that persists across the entire asynchronous call chain of that request, without polluting globals or using broken instance properties on singletons.

The `RequestContext` is created at the transport boundary and stored:

```typescript
// In the SSE /messages handler
await requestContextStorage.run(context, async () => {
  await transport.handlePostMessage(req, res)
})
```

This context is then available anywhere downstream via `requestContextStorage.getStore()`.

**NO GLOBAL VARIABLES. NO SHARED INSTANCE STATE. NO FUCKING RACE CONDITIONS.**

## IV. THE FOURTH COMMANDMENT: ELASTICSEARCH CLIENT FACTORY IS CONTEXT-AWARE

The `ElasticsearchClientFactory` is a beautiful piece of engineering that:

1. **Takes base configuration** from environment variables
2. **Merges with request headers** for multi-user support
3. **Creates isolated clients** for each request
4. **Validates configuration** using Zod schemas

```typescript
// THE SACRED PATTERN
const clientFactory = new ElasticsearchClientFactory(baseConfig)
const esClient = clientFactory.createClient(context)
```

Headers override environment variables:
- `x-es-url` - Elasticsearch server URL
- `x-es-api-key` - API key authentication
- `x-es-username` / `x-es-password` - Basic authentication
- `x-es-ca-cert` - Custom CA certificate
- `x-es-version` - Elasticsearch version
- `x-es-ssl-skip-verify` - Skip SSL verification
- `x-es-path-prefix` - Request path prefix

## V. THE FIFTH COMMANDMENT: BUSINESS LOGIC IS PURE AND STATELESS

The `ElasticsearchTools` class contains pure business logic:

```typescript
class ElasticsearchTools {
  constructor(private readonly clientFactory: ElasticsearchClientFactory) {}

  async listIndices(args: { indexPattern: string }, context?: RequestContext) {
    const esClient = this.clientFactory.createClient(context)
    // Pure business logic here
  }
}
```

**EVERY METHOD IS STATELESS.** They take arguments and context, do their work, and return results. No side effects. No shared state. No bullshit.

## VI. THE SIXTH COMMANDMENT: MCP SERVER IS A THIN WRAPPER

The `ElasticsearchMcpServer` class is a clean wrapper that:

1. **Registers tools** with proper schemas
2. **Injects context** into tool calls
3. **Delegates to business logic** without interference

```typescript
// THE SACRED TOOL REGISTRATION
this.mcpServer.tool(
  'list_indices',
  'List all available Elasticsearch indices',
  ListIndicesSchema.shape,
  async ({ indexPattern }) => {
    return await this.elasticsearchTools.listIndices(
      { indexPattern },
      getCurrentContext() // This now safely gets context from AsyncLocalStorage
    )
  }
)
```

## VII. THE SEVENTH COMMANDMENT: TRANSPORT MANAGERS ARE STRATEGY IMPLEMENTATIONS

Each transport type has its own manager:

- `StdioTransportManager` - For direct MCP communication
- `HttpTransportManager` - For HTTP-based transports (SSE and StreamableHTTP)

They implement the `TransportManager` interface and handle:
- **Connection lifecycle**
- **Request context extraction**
- **Graceful shutdown**
- **Session management**

## VIII. THE EIGHTH COMMANDMENT: DEPENDENCY INJECTION IS EXPLICIT

The main entry point (`src/index.ts`) orchestrates everything:

1. **Parses configuration** from environment
2. **Creates dependencies** in proper order
3. **Injects dependencies** explicitly
4. **Starts the server** with proper error handling

**NO HIDDEN DEPENDENCIES. NO MAGIC. NO SURPRISES.**

## IX. THE NINTH COMMANDMENT: ERROR HANDLING IS COMPREHENSIVE

Every layer handles errors appropriately:
- **Configuration errors** fail fast at startup
- **Client creation errors** return proper error responses
- **Business logic errors** are caught and formatted
- **Transport errors** trigger graceful shutdown

## X. THE TENTH COMMANDMENT: TESTING IS POSSIBLE

Unlike the previous shitshow, this architecture is actually testable:
- **Pure functions** can be unit tested
- **Dependency injection** allows mocking
- **No global state** means no test interference
- **Context passing** enables integration testing

---

**FINAL DECREE:**

This is the new reality. It is elegant, maintainable, scalable, and doesn't make me want to burn down the fucking datacenter. The old global state bullshit is dead and buried. Long live the new architecture!

**IF YOU BREAK THESE COMMANDMENTS, YOU WILL BE CAST INTO THE FIRES OF CODE REVIEW HELL WHERE YOU WILL BE FORCED TO MAINTAIN LEGACY PHP APPLICATIONS FOR ALL ETERNITY.**
