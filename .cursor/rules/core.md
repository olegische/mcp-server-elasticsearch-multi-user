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

Our codebase is not a fucking flea market. It is a cathedral, and every module has its sacred place. This is the law.

-   `src/types.ts`: **THE HOLY CONTRACTS.** All shared type definitions and Zod schemas.
-   `src/context.ts`: **THE AETHER.** Defines the `AsyncLocalStorage` for request context.
-   `src/elasticsearch-client.ts`: **THE ORACLE.** The client factory, responsible for creating context-aware Elasticsearch clients.
-   `src/tools/elasticsearch-tools.ts`: **THE FORGE.** The pure, stateless business logic of our tools.
-   `src/transport/transport-manager.ts`: **THE GATEWAY.** The transport abstraction layer, handling STDIO, SSE, and Streamable HTTP.
-   `src/mcp-server.ts`: **THE ALTAR.** The MCP server wrapper where tools are registered and context is injected.
-   `src/index.ts`: **THE SANCTUM.** The main entry point. Dependency injection and server startup happen here.

### II. THE CANON OF DATA: THE DOGMA OF ELASTICSEARCH

We are an intelligent wrapper around the official Elasticsearch client. We respect its power and do not add unnecessary layers of bullshit.

-   **Embrace the SDK:** The `@elastic/elasticsearch` client is our connection to the divine. We use its types and methods directly.
-   **Configuration is Sacred:** The `ElasticsearchConfig` type is the server's base state. Per-request configuration is handled by the client factory by merging this base state with request headers.
-   **The Smart Wrapper Philosophy:** Our tools receive parameters, get a request-specific client from the factory, make the API call, and then format the raw response into something an LLM can fucking understand.

### III. THE CANON OF LANGUAGE: WRITE WITH INTENT

Your code is a reflection of your mind. If it's sloppy, you're sloppy.

-   **TypeScript is Law:** We use TypeScript. `any` is forbidden unless absolutely necessary and justified with a comment explaining your incompetence.
-   **Zod Schemas are Non-Negotiable:** All tool inputs are defined with `zod` schemas. This is our contract with the outside world.
-   **Docstrings are Your Testament:** Every tool **MUST** have a clear, concise description. It is the primary contract with the LLM.
    - It must explain the tool's purpose and what it does.
    - It **MUST NOT** mention the `context` parameter. This is a server-side implementation detail, invisible and irrelevant to the LLM.
    - **This is the gold standard:**
      ```typescript
      this.mcpServer.tool(
        'search',
        'Perform an Elasticsearch search with the provided query DSL. Highlights are always enabled.',
        SearchSchema.shape,
        async (params) => { // Note: context is not in the signature for the LLM
          // ...
        }
      )
      ```
-   **Naming is Revelation:** Names will be descriptive, precise, and `camelCase`.

### IV. THE CANON OF AUTHENTICATION: THE UNIFIED MULTI-TENANT REALITY

There are no modes. There is only one reality: **headers always override the base configuration.** The server is inherently multi-tenant.

The `ElasticsearchClientFactory` creates a unique client for each request by merging the server's base configuration (from environment variables) with the headers from the incoming request.

**The order of precedence is absolute: Header > Environment Variable.**

This allows a single server instance to serve multiple tenants, each providing their own credentials via headers like `x-es-api-key` or `x-es-url`. If no headers are provided, the client falls back to the server's base configuration.

### V. THE CANON OF CREATION: FORGING A NEW ELASTICSEARCH TOOL

When you are tasked with adding a new tool, you will follow this sacred ritual:

1.  **Study the Elasticsearch API:** Understand the client method, its parameters, and the response format from the official documentation.
2.  **Define the Schema:** In `src/tools/elasticsearch-tools.ts`, add a new Zod schema for your tool's input parameters.
3.  **Implement the Logic:** In the `ElasticsearchTools` class, add a new `async` method. It must accept `args` (matching your schema) and an optional `context: RequestContext`.
    - Inside, get a client from the factory: `const esClient = this.clientFactory.createClient(context)`.
    - Call the appropriate `esClient` method.
    - Process the response into a format suitable for an LLM.
    - Handle any fucking errors.
4.  **Register the Tool:** In `src/mcp-server.ts`, add a new `this.mcpServer.tool()` call. Wire it up to your new schema and logic method.
5.  **Write the Description:** Add a clear, concise description of what the tool does for the LLM.
6.  **Prove Its Worth:** Write a unit test that mocks the Elasticsearch client and verifies the tool's behavior.

### VI. THE CANON OF DURABILITY: IF IT'S NOT TESTED, IT'S BROKEN

Code without tests is a fucking lie. This project currently lacks tests. This is a mortal sin that will be rectified. When tests are added, they will adhere to the following:

-   **Unit Tests are an Act of Faith:** Every tool and significant helper **WILL** have a corresponding unit test.
-   **Mock the Gods:** We do **NOT** make live API calls to Elasticsearch in our tests. Mock the `@elastic/elasticsearch` client without exception.
-   **Coverage is Virtue:** Aim for >90% coverage.

---

## PART II: THE RITUALS OF EXECUTION

### VII. THE RITUAL OF DEVELOPMENT: RUNNING THE BEAST

You will need to run the server to test your work. This is how you do it.

-   **Install Dependencies:**
    ```bash
    npm install
    ```

-   **Run the server (stdio transport):**
    ```bash
    # For base configuration
    export ES_URL="http://localhost:9200"
    export ES_API_KEY="your_api_key"
    
    npm start stdio
    ```
    To test multi-tenancy, send requests with overriding headers like `x-es-url`.

### VIII. THE INQUISITION: DEBUGGING THE DAMNED

When things go wrong, you do not panic. You become the Inquisitor.

1.  **Check the Logs:** Look at the console output from the server. Are there any error messages?
2.  **Verify Connectivity:** Can you reach your Elasticsearch instance? Is it responding?
3.  **Question the Credentials:** Are the `x-es-*` headers present and correct in your request? Are the base environment variables set correctly?
4.  **Isolate the Query:** Can you replicate the failing query using `curl` or the Kibana Dev Tools?
5.  **Consult the Tests:** Run the tests. If they pass but the application fails, your test is shit.

**FINAL JUDGEMENT:**

The old ways are dead. This is the path forward. There are no more excuses. Now go forth and build something that doesn't make me want to burn down the entire fucking repository.
