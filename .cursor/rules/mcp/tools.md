# MCP: Server Tools

**THIS IS THE FUCKING POINT.** Tools are how your server performs actions. It's not about just showing data; it's about executing commands, calling APIs, and changing the state of the world. If you can't grasp this, you have no business being here.

## The Philosophy of a Tool

A tool is a function. A goddamn function. It takes inputs, does something, and returns an output. It is **model-controlled**, which means the LLM decides when to call it. Your job is to expose these functions so the LLM can use them without fucking everything up.

**Your responsibility:**
1.  **Discovery:** The client must be able to ask what tools you have. You will respond with a `tools/list`.
2.  **Invocation:** The client will tell you to `tools/call` a specific function with specific arguments. You will execute it.
3.  **Clarity:** Your tool definitions must be crystal clear. A shitty description or a confusing schema is a recipe for disaster.

## Defining a Tool: The Unholy Trinity

Every tool you define **MUST** have these three components. No exceptions.

1.  **`name` (string):** A unique, programmatic identifier. Use `snake_case`. Don't be a fucking amateur.
2.  **`description` (string):** A human-readable (and LLM-readable) explanation of what the tool does. Be concise but precise. "This tool does stuff" is grounds for immediate termination.
3.  **`inputSchema` (JSON Schema):** The contract for the tool's parameters. This is not a suggestion. It's the law. Define the `type`, `properties`, and which ones are `required`. If the LLM sends you garbage that doesn't match the schema, it's a protocol-level error.

```typescript
// This is how you define a tool. Burn it into your memory.
{
  "name": "execute_fucking_command",
  "description": "Runs a shell command on the system. Use with extreme caution.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "command": {
        "type": "string",
        "description": "The command to execute."
      },
      "args": {
        "type": "array",
        "items": { "type": "string" },
        "description": "Arguments for the command."
      }
    },
    "required": ["command"]
  },
  "annotations": {
    "destructiveHint": true // Be honest about the damage you can cause.
  }
}
```

## Tool Implementation: The `call_tool` Handler

When the client sends a `tools/call` request, your handler is invoked.

*   **Identify the tool:** Use the `name` from the request to find the right function to execute.
*   **Validate arguments:** The arguments will be in the request. The protocol layer should have already validated them against your `inputSchema`.
*   **Execute:** Run your fucking code.
*   **Return the result:** The result is wrapped in a `CallToolResult` object.

## Error Handling: Don't Be a Coward

Shit will break. APIs will fail. Users will send you garbage. How you handle it defines you as an engineer.

*   **Protocol Errors:** If the request is fucked up (e.g., unknown tool, invalid params), you return a standard JSON-RPC error. This is for when the *request itself* is the problem.
*   **Tool Execution Errors:** If your tool *tries* to run but fails (e.g., an API returns a 500, a file isn't found), you **MUST** report this within the `CallToolResult`. Set `isError: true` and provide a clear, unfucked error message in the `content`. The LLM needs to know *why* your tool failed so it can potentially recover. Don't just throw a generic exception like a little bitch.

**Example of a proper tool error response:**

```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "result": {
    "isError": true,
    "content": [
      {
        "type": "text",
        "text": "Error: GitHub API returned 403 Forbidden. Check your Personal Access Token."
      }
    ]
  }
}
```

This is useful. A simple "API Error" is not.
