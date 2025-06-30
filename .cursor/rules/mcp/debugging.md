# MCP: Debugging Your Shit

**YOUR CODE IS BROKEN.** Accept it. Now, fix it. Debugging is not a black art; it's a discipline. If you're just randomly changing code and praying, you're not a developer, you're a fucking liability.

## The Tools of the Trade

You are not blind. MCP provides tools to see what's happening. Use them.

1.  **Server Logging:** This is your first and best line of defense.
    *   When using the `stdio` transport, anything you write to `stderr` is your log. The client (like Claude Desktop) will capture it.
    *   **DO NOT** write debug messages to `stdout`. That is for protocol messages only. If you pollute `stdout`, you will break the connection, and you will deserve the pain that follows.
    *   For other transports, or for more structured logging, use the `notifications/message` notification. This sends a structured log message to the client.

2.  **The MCP Inspector:** This is your interactive debugger.
    *   Run your server with the inspector (`npx @modelcontextprotocol/inspector ...`).
    *   It allows you to see what capabilities your server is advertising.
    *   You can manually call your tools, test your prompts, and inspect your resources.
    *   If your server doesn't work in the Inspector, it sure as hell won't work in a real client.

3.  **Client Logs:** The client application (e.g., Claude Desktop) has its own logs.
    *   On macOS, they are in `~/Library/Logs/Claude/`. Look for `mcp.log` (general) and `mcp-server-YOUR_SERVER_NAME.log` (your server's `stderr` output).
    *   These logs will tell you if the client is failing to connect, if there are configuration errors, or if it's receiving malformed messages from you.

## A Systematic Approach to Finding the Fuck-up

1.  **Is the server even running?** Check the client logs. If it can't find your command or if there are path issues, it will say so. Use absolute paths in your client configuration to avoid this bullshit.
2.  **Did the handshake succeed?** The `initialize` request is the first thing that happens. If there's a capability mismatch or a protocol version error, the connection will fail immediately. Your logs will show this.
3.  **Is your tool/resource/prompt being discovered?** Use the Inspector to check the `tools/list`, `resources/list`, and `prompts/list` responses. If your feature isn't in the list, you've fucked up its registration in your server code.
4.  **Is the invocation failing?**
    *   **Tool Calls:** Call the tool directly from the Inspector with valid arguments. Check the response. Is it a protocol error (bad request) or a tool execution error (`isError: true`)? The distinction is critical.
    *   **Resource Reads:** Try to read the resource from the Inspector. Are you getting a "not found" error? Is your URI logic sound?
    *   **Prompt Gets:** Get the prompt from the Inspector. Are the messages being constructed correctly?

## Common Mistakes Made by Amateurs

*   **Relative Paths:** Your server's working directory is not what you think it is, especially when launched by a client app. Use absolute paths or construct them reliably.
*   **Environment Variables:** The client does not pass its entire environment to your server. If you need an API key, you **MUST** configure the client to pass it in the `env` block of the server configuration.
*   **Silent Failures:** Your code throws an exception, but you don't catch it and you don't log it. The server process dies, the client sees a broken pipe, and you have no fucking clue why. Log your errors.

Debugging is about discipline. Be systematic. Be thorough. And for fuck's sake, read the error messages. They are there for a reason.
