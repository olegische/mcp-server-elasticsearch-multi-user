# MCP: Server Prompts

**LISTEN UP.** Prompts are not like Tools or Resources. They are **user-controlled**. You are not exposing a function for the LLM to call; you are exposing a pre-packaged workflow for the *user* to explicitly select. Think of them as slash commands, quick actions, or menu items. They are your server's user interface.

## The Philosophy of a Prompt

A Prompt is a template. It's a way to guide the user through a specific interaction with the LLM, using the context your server can provide. It can be as simple as a single message or as complex as a multi-step conversational workflow.

**Your responsibility:**
1.  **Discovery:** The client must be able to ask what prompts you offer (`prompts/list`).
2.  **Execution:** When the user selects a prompt and provides arguments, the client will send a `prompts/get` request. You will return a series of messages that constitute the prompt.
3.  **Guidance:** Your prompts should be well-defined and genuinely useful. A shitty, confusing prompt is worse than no prompt at all.

## Defining a Prompt

A prompt definition is straightforward. It needs:

*   **`name` (string):** A unique identifier.
*   **`description` (string, optional):** A clear, concise explanation of what this prompt does for the user.
*   **`arguments` (array, optional):** A list of parameters the user can provide to customize the prompt. Each argument needs a `name`, `description`, and a `required` flag.

```typescript
// Example of a prompt definition. Don't fuck it up.
{
  "name": "generate-git-commit-message",
  "description": "Generate a conventional commit message based on code changes.",
  "arguments": [
    {
      "name": "diff",
      "description": "The git diff of the changes.",
      "required": true
    }
  ]
}
```

## Prompt Execution: The `get_prompt` Handler

When the client sends a `prompts/get` request, your job is to take the `name` and `arguments` and construct a `GetPromptResult`. This result contains the `messages` that will be sent to the LLM.

You can dynamically construct these messages. You can embed the arguments, fetch data from an API, or even include the content of a resource.

**Example `get_prompt` response:**

```json
{
  "description": "A prompt to generate a git commit message.",
  "messages": [
    {
      "role": "user",
      "content": {
        "type": "text",
        "text": "Analyze the following git diff and generate a conventional commit message. The message should have a type, a scope, and a short description, followed by a longer body explaining the changes.\n\n---\n\n[...git diff provided in the 'changes' argument...]"
      }
    }
  ]
}
```

## Dynamic Prompts are Powerful. Use Them Wisely.

Your prompts can be more than just static text.

*   **Embed Resource Context:** Your `get_prompt` handler can read a resource (e.g., a file from the filesystem) and embed its content directly into the prompt messages.
*   **Multi-step Workflows:** You can return a series of messages from both the `user` and `assistant` to guide a more complex conversation.

This is how you build powerful, interactive workflows. Don't just create glorified string templates. Think bigger.
