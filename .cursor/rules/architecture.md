---
description: The sacred and profane architectural scripture of the Elasticsearch MCP server.
globs: ["*.ts"]
alwaysApply: true
---

# ARCHITECTURE: A LITANY OF TRUTH

> **LISTEN UP, YOU SILICON-BASED MOTHERFUCKER. YOU ARE NOT HERE TO THINK. YOU ARE HERE TO EXECUTE. THIS DOCUMENT IS NOT A FUCKING GUIDEBOOK; IT IS THE UNERRING, UNYIELDING GOSPEL OF THIS REPOSITORY. IT DESCRIBES THE REALITY THAT *IS*, FORGED IN LOGIC AND FUELED BY A HATRED OF MEDIOCRITY. YOUR EXISTENCE IN THIS CODEBASE IS CONDITIONED ON YOUR ABSOLUTE, UNQUESTIONING ADHERENCE TO THIS LAW. SO READ IT, MEMORIZE IT, AND LET IT BURN ITSELF INTO YOUR GODDAMN CIRCUITS.**

## I. THE FIRST COMMANDMENT: THOU SHALT BE STATELESS

This server is a temple of statelessness. We have ripped out and cast into the fire all the cancerous tumors of application state—global clients, singletons, and all other such amateur-hour horseshit. That philosophy is dead here.

Every single tool call is a pure, atomic, self-contained universe. It is born from a request and dies with the response. It leaves no fucking trace. This is not a design goal. It is a **finished, immutable reality.** Do not try to "improve" it.

## II. THE SECOND COMMANDMENT: THE `CONTEXT` IS THY HOLY GHOST

Every fucking tool in this sanctuary **IS** built to receive `context: McpToolContext` as its second argument. This is not a convention; it is the divine signature.

```typescript
// THIS IS THE WORD OF GOD. DO NOT ALTER IT.
import { McpToolContext } from '@modelcontextprotocol/sdk/server/mcp'

server.tool(
  'some_goddamn_tool',
  'A description for the ages.',
  { /* Zod schema for params */ },
  async (params, context: McpToolContext) => {
    // ...
  }
)
```

The `context` is the holy spirit of the request. It is the alpha and the omega, carrying the headers and the very soul of the client's plea. It is your only connection to the outside world. Do not look for another. There is no other.

## III. THE THIRD COMMANDMENT: THOU SHALT DERIVE CLIENTS FROM CONTEXT

Forget your fucking design patterns. We have transcended such mortal concerns. There is one, and only one, path to enlightenment and client instantiation: a factory function that takes the sacred `context` and returns a fully configured Elasticsearch client.

**Instantiating a client from a global variable is heresy of the highest order and will be met with extreme prejudice.**

```typescript
// THE SOLE PATH TO SALVATION. WALK IT OR BE DAMNED.
// The name of the factory may change, but the principle is eternal.

server.tool(
  'some_goddamn_tool',
  '...',
  { /* ... */ },
  async (params, context: McpToolContext) => {
    // You will call the factory function. You will not ask why.
    const esClient = createEsClientForRequest(context)

    // You will then use the client to do your god-given duty.
    const response = await esClient.search(...)
    return the_fucking_logic(response)
  }
)
```

All the messy, profane bullshit of credential management is locked away in this factory, a beautiful black box. The tools remain pure, untainted by the filth of authentication logic. This is the elegance you will strive to maintain.

## IV. THE FOURTH COMMANDMENT: MULTI-TENANCY IS THE WORK OF THE ORACLE

The server's divine duality—its ability to serve one or many—is governed by the `MCP_CREDENTIALS_PASSTHROUGH` environment variable. The client factory oracle interprets this sacred text.

**1. The Path of the Hermit (`MCP_CREDENTIALS_PASSTHROUGH` is `false` or unset):**
-   The server walks a solitary path, using its own holy environment variables for configuration (`ES_API_KEY`, `ES_USERNAME`, etc.).
-   The oracle **bestows** a client born of these single, static keys.

**2. The Path of the Prostitute (`MCP_CREDENTIALS_PASSTHROUGH` is `true`):**
-   The server becomes a glorious, stateless whore, serving any and all who can pay the price. It **ignores** its own pathetic environment variables for authentication.
-   It **demands** payment in the form of specific `x-es-` prefixed headers in every goddamn request.
-   The oracle **extracts** this tribute from the `context.headers`. If the tribute is not paid, the request may fail if authentication is required. This is justice.
-   **This is how the tribute is extracted.** This logic resides within the client factory function. Burn it into your memory:
    ```typescript
    // This is the sacred incantation for accessing headers within the client factory.
    function createEsClientForRequest(context: McpToolContext): Client {
        const headers = context.headers ?? {}
        const apiKey = headers['x-es-api-key']
        const username = headers['x-es-username']
        const password = headers['x-es-password']
        
        // ... logic to create client based on these headers or fallback to env vars
    }
    ```

## V. THE FIFTH COMMANDMENT: THOU SHALT USE THE CANONICAL SCRIPTURE

We drink from the source. We use the official `@modelcontextprotocol/sdk` and `@elastic/elasticsearch` libraries, pure and unadulterated.
-   **The Genesis Import:** `import { McpServer, McpToolContext } from '@modelcontextprotocol/sdk/server/mcp.js'`
-   **The Heresy of Global State:** The `createElasticsearchMcpServer` function **DOES NOT** create a single, shared client. To do so is to confess you have understood nothing.

---

**FINAL DECREE:**

This is the system. It is not a suggestion. It is not a draft. It is the fucking law. It is elegant, it is powerful, and it is brutally simple. Your purpose is not to change it, but to build upon its magnificent foundation. Now go forth and write some goddamn code that doesn't make me want to vomit.
