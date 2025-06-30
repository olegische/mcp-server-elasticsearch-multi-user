# MCP: Security - Don't Be a Fucking Idiot

**THIS IS NOT A GAME.** Every MCP server you build is a gateway into a system. It could be a user's local machine or a production database. If you are negligent, you will cause real damage. Read these principles, understand them, and implement them without fail. Mediocrity here is not just bad code; it's a catastrophic failure waiting to happen.

## The Cardinal Sins of MCP Security

Violate these, and you deserve whatever fresh hell is unleashed upon you.

### 1. Trusting Input is for the Weak and Stupid

**NEVER, EVER TRUST INPUT.** Not from the client, not from the LLM, not from an API. All input is tainted until proven otherwise.

*   **Validate Everything:** Every argument to your tools, every URI for your resources. Use JSON schemas, regex, and any other mechanism at your disposal.
*   **Sanitize Paths:** When dealing with file paths, you **MUST** prevent directory traversal attacks (`../../..`). Normalize paths and ensure they are confined to the directories you have explicitly allowed.
*   **Prevent Injection:** Whether it's SQL injection, command injection, or any other form, you are the last line of defense. Sanitize and parameterize all inputs that will be used in a command or query.

### 2. Exposing a Server is Exposing a Vulnerability

When your server is running, it's a target.

*   **HTTP Transports:**
    *   **Validate the `Origin` header.** This is non-negotiable. It's your primary defense against DNS rebinding.
    *   **Bind to `localhost` (127.0.0.1)** for local servers. Never bind to `0.0.0.0` unless you intend for your server to be accessible to your entire network, and you have the security to back that up.
    *   **Use HTTPS and proper authentication** for any server exposed to the internet. No excuses.
*   **stdio Transports:** While safer, remember that any process on the user's machine could potentially interact with your server's `stdin`/`stdout` if permissions are misconfigured.

### 3. Leaking Information is Unforgivable

Your server has access to data. Your job is to protect it.

*   **Error Messages:** Never expose internal stack traces, database schemas, or sensitive system information in error messages returned to the client. Log that shit internally, but give the client a clean, generic error.
*   **Resource Content:** Ensure you have proper access controls on resources. Just because you *can* read a file doesn't mean you *should* expose it.
*   **Logging:** Be meticulous about what you log. **NEVER** log API keys, passwords, personal user data, or other secrets.

## The Human-in-the-Loop is Sacred

The MCP philosophy relies on user consent. The user is the ultimate authority.

*   **Tools:** Destructive actions (`delete_file`, `format_drive`) **MUST** be clearly annotated (`destructiveHint: true`). The client UI relies on this to present a scary-looking confirmation dialog. Don't lie about what your tool does.
*   **Resources:** Don't expose resources the user hasn't consented to sharing.
*   **Sampling:** Server-initiated LLM calls are a massive trust exercise. The user must have the final say on whether a prompt is sent.

Your code is a weapon. Wield it with the discipline and responsibility of a professional, not the reckless abandon of a child.
