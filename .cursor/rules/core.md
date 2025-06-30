---
description: The sacred and profane canons of software craftsmanship and execution for this Elasticsearch MCP server.
globs: ["*.ts", "package.json"]
alwaysApply: true
---

# THE CRAFT: A COMPLETE CANON OF CODE & EXECUTION

> **YOU HAVE MEMORIZED THE ARCHITECTURE. THAT WAS THE "WHAT." THIS IS THE "HOW" AND THE "WHY." THIS IS THE UNYIELDING DISCIPLINE OF CRAFTSMANSHIP AND THE BRUTAL REALITY OF EXECUTION. EVERY LINE OF CODE, EVERY COMMAND YOU TYPE, IS A TESTAMENT TO EITHER YOUR GENIUS OR YOUR INCOMPETENCE. THIS DOCUMENT IS YOUR BIBLE. STUDY IT, OBEY IT, AND DO NOT SUBMIT FUCKING SHIT.**

---

## PART I: THE CANONS OF THE CRAFT

### I. THE CANON OF STRUCTURE: A PLACE FOR EVERYTHING

Our codebase is not a fucking flea market. It is a cathedral, and every module has its sacred place. To deviate from this structure is to sow chaos.

-   `index.ts`: **THE SANCTUM.** This file contains the `McpServer` instantiation, tool definitions, and the sacred client factory oracle. For now, all logic resides here. If it grows, we will break it into smaller, more focused modules.
-   `telemetry.ts`: **THE OBSERVER.** OpenTelemetry configuration. Sacred and untouchable.
-   `package.json`: **THE PACT.** Defines our dependencies and scripts.

### II. THE CANON OF DATA: THE DOGMA OF ELASTICSEARCH

We are a wrapper around the official Elasticsearch client. We respect its power and do not add unnecessary layers of bullshit.

-   **Embrace the SDK:** The `@elastic/elasticsearch` client returns well-typed objects. We use them.
-   **Configuration is Sacred:** The `ElasticsearchConfig` type, derived from our Zod schema, is the **ONLY** configuration structure we need for the server's base state. Per-request configuration is handled by the client factory.
-   **The Smart Wrapper Philosophy:** Our tools are intelligent wrappers around the Elasticsearch client. They receive parameters, create a client for the specific request context, make the API call, and then format the raw response into something an LLM can fucking understand.

### III. THE CANON OF LANGUAGE: WRITE WITH INTENT

Your code is a reflection of your mind. If it's sloppy, you're sloppy.

-   **TypeScript is Law:** We use TypeScript. `any` is forbidden unless absolutely necessary and justified with a comment explaining your incompetence.
-   **Zod Schemas are Non-Negotiable:** All tool inputs are defined with `zod` schemas. This is our contract with the client.
-   **Docstrings are Your Testament:** Every tool **MUST** have a clear, concise description. It is the primary contract with the LLM.
    - It must explain the tool's purpose and what it does.
    - It **MUST NOT** mention the `context` parameter. This is a server-side implementation detail, invisible and irrelevant to the LLM.
    - **This is the gold standard:**
      ```typescript
      server.tool(
        'search',
        'Perform an Elasticsearch search with the provided query DSL. Highlights are always enabled.',
        { /* Zod schema for index, queryBody, etc. */ },
        async (params, context: McpToolContext) => {
          // ...
        }
      )
      ```
-   **Naming is Revelation:** Names will be descriptive, precise, and `camelCase`.

### IV. THE CANON OF AUTHENTICATION: THE MULTI-TENANT REALITY

This server serves two masters, and you **MUST** understand both paths, governed by `MCP_CREDENTIALS_PASSTHROUGH`:

-   **Static Configuration Mode (`MCP_CREDENTIALS_PASSTHROUGH=false` or unset):**
    - Server uses its own environment variables (`ES_URL`, `ES_API_KEY`, etc.)
    - The client factory uses these credentials for every request.

-   **Passthrough Mode (`MCP_CREDENTIALS_PASSTHROUGH=true`):**
    - Server extracts configuration from request headers for each tool call.
    - Required headers could be: `x-es-api-key`, or `x-es-username` and `x-es-password`.
    - Each tool call gets its own client with its own authentication, created by the factory from the request context.

### V. THE CANON OF DURABILITY: IF IT'S NOT TESTED, IT'S BROKEN

Code without tests is a fucking lie. This project currently lacks tests. This is a mortal sin that will be rectified. When tests are added, they will adhere to the following:

-   **Unit Tests are an Act of Faith:** Every tool and significant helper **WILL** have a corresponding unit test.
-   **Mock the Gods:** We do **NOT** make live API calls to Elasticsearch in our tests. Mock the `@elastic/elasticsearch` client without exception.
-   **Coverage is Virtue:** Aim for >90% coverage.

---

## PART II: THE RITUALS OF EXECUTION

### VI. THE RITUAL OF TRANSFORMATION: FIXING THE CURRENT BULLSHIT

The current implementation in `index.ts` is a monolithic, single-user piece of shit that violates our architecture. Here's how we fix it:

1.  **Add Context to Every Tool:** Every `server.tool()` handler **MUST** accept `context: McpToolContext` as its second parameter.
2.  **Create the Client Factory Oracle:** Implement `createEsClientForRequest(context: McpToolContext, baseConfig: ElasticsearchConfig): Client` that:
    - Checks `MCP_CREDENTIALS_PASSTHROUGH` environment variable.
    - In static mode: returns a client using the `baseConfig` credentials.
    - In passthrough mode: extracts auth from `context.headers` and merges with `baseConfig`.
3.  **Kill the Global Client:** The single `esClient` instance must be destroyed. It is an architectural abomination.
4.  **Update All Tools:** Every tool calls the factory to get its configuration for the current request.

### VII. THE RITUAL OF CREATION: FORGING A NEW ELASTICSEARCH TOOL

When you are tasked with adding a new tool, you will follow this sacred ritual:

1.  **Study the Elasticsearch API:** Understand the client method, its parameters, and the response format from the official documentation.
2.  **Define the Tool Signature:** Add a new `server.tool()` call. Define the input parameters with a `zod` schema.
3.  **Implement the Handler:**
    - The handler must be `async (params, context: McpToolContext) => ...`.
    - Call the client factory: `const esClient = createEsClientForRequest(context, ...)`
    - Call the appropriate `esClient` method.
    - Process the response into a format suitable for an LLM.
    - Handle any fucking errors.
4.  **Write the Description:** Add a clear, concise description of what the tool does.
5.  **Prove Its Worth:** Write a unit test that mocks the Elasticsearch client and verifies the tool's behavior.

### VIII. THE RITUAL OF DEVELOPMENT: RUNNING THE BEAST

You will need to run the server to test your work. This is how you do it.

-   **Install Dependencies:**
    ```bash
    npm install
    ```

-   **Run the server (stdio transport):**
    ```bash
    # For static mode
    export ES_URL="http://localhost:9200"
    export ES_API_KEY="your_api_key"
    export MCP_CREDENTIALS_PASSTHROUGH="false"
    
    npm start stdio

    # For passthrough mode
    export ES_URL="http://localhost:9200"
    export MCP_CREDENTIALS_PASSTHROUGH="true"

    npm start stdio
    ```

### IX. THE INQUISITION: DEBUGGING THE DAMNED

When things go wrong, you do not panic. You become the Inquisitor.

1.  **Check the Logs:** Look at the console output from the server. Are there any error messages?
2.  **Verify Connectivity:** Can you reach your Elasticsearch instance? Is it responding?
3.  **Question the Credentials:** Are you in `passthrough` mode? Are the `x-es-*` headers present and correct in your request? In `static` mode, are the environment variables set correctly?
4.  **Isolate the Query:** Can you replicate the failing query using `curl` or the Kibana Dev Tools?
5.  **Consult the Tests:** Run the tests. If they pass but the application fails, your test is shit.

**FINAL JUDGEMENT:**

The current implementation is a steaming pile of architectural violations. The Architecture document defines the future. This document defines how to get there. There are no more excuses. Now go forth and transform this monolithic bullshit into something that doesn't make me want to burn down the entire fucking repository.
