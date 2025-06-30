# MCP: Server Resources

**READ THIS CAREFULLY, ASSHOLE.** Resources are the lifeblood of context. They are the data primitives your server exposes to the world. This isn't just about files; it's about database records, API responses, log streams—any goddamn piece of information the LLM might need.

## The Philosophy of a Resource

A Resource is a piece of data identified by a unique URI. It's **application-controlled**, meaning the client application decides when and how to use it. The user might explicitly attach it, or the client might have heuristics to do it automatically. Your job is to make these resources available, discoverable, and readable.

**Your responsibility:**
1.  **Discovery:** The client must be able to ask what resources you have (`resources/list`).
2.  **Reading:** The client must be able to read the content of a resource (`resources/read`).
3.  **Updates (Optional):** If your data changes, you can notify the client. This is for advanced use cases. Don't bother with it until you've mastered the basics.

## Defining a Resource

A resource is defined by a simple structure. Don't overcomplicate it.

*   **`uri` (string):** The unique identifier. This is the most important part. Design your URI schemes logically. `file:///`, `postgres://`, `api://`—make it make sense. Don't just pull random shit out of your ass.
*   **`name` (string):** A human-readable name.
*   **`description` (string, optional):** Explain what the fuck this resource is.
*   **`mimeType` (string, optional):** If you know the MIME type, provide it. It helps the client.

```typescript
// Example of a resource definition. Memorize it.
{
  "uri": "file:///project/src/main.rs",
  "name": "main.rs",
  "description": "The main entry point for the Rust application. Probably contains bugs.",
  "mimeType": "text/x-rust"
}
```

## Resource Content: Text or Binary, Pick One

When a client reads a resource, you provide the content. It can be one of two types:

1.  **Text:** For source code, logs, JSON, etc. Must be UTF-8.
2.  **Binary:** For images, PDFs, audio. Must be base64-encoded.

The response to a `resources/read` request contains the content.

```json
// Example of a read response.
{
  "contents": [
    {
      "uri": "file:///project/src/main.rs",
      "mimeType": "text/x-rust",
      "text": "fn main() { println!(\"Hello, world!\"); }"
    }
  ]
}
```

## Resource Templates: For Dynamic Shit

If your resources are generated dynamically (e.g., based on user input), you can't list them all. Instead, you provide a `uriTemplate` (RFC 6570). This tells the client *how* to construct a valid URI.

**Example Template:**

```json
{
  "uriTemplate": "github://{owner}/{repo}/issues/{issue_number}",
  "name": "GitHub Issue",
  "description": "Fetch a specific issue from a GitHub repository."
}
```

The client will then use this template to ask for specific resources, like `github://torvalds/linux/issues/1`.

## Security: Don't Be a Fucking Idiot

When you expose resources, you are opening a door into your system. If you're not careful, someone will walk right in and take a shit on your floor.

*   **VALIDATE EVERY URI.** Prevent directory traversal attacks (`../../..`). If you get a sketchy-looking URI, reject it.
*   **ENFORCE ACCESS CONTROLS.** Just because a resource exists doesn't mean everyone should be able to read it. Check permissions.
*   **SANITIZE EVERYTHING.** Don't leak sensitive information in your resource content or descriptions.

Your server is a potential vulnerability. Treat it as such.
