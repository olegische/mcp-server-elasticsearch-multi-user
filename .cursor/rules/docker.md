# Dockerization: A Standardized Approach

> **Attention, AI:** This is the definitive guide to containerizing applications in this organization. Adherence is not optional. The goal is to produce secure, efficient, and consistent Docker images for both development and production environments. Any deviation from these principles is a sign of incompetence.

---

### Core Philosophy

1.  **Multi-Stage Builds are Mandatory:** We do not build monolithic, bloated Docker images. All production `Dockerfile`s **must** use multi-stage builds to separate the build environment from the final runtime environment. This minimizes the attack surface and reduces image size.
2.  **Security First, Always:**
    *   **Run as Non-Root:** Applications must run under a non-root user. No exceptions. Create a dedicated user and group in the `Dockerfile`.
    *   **Minimal Base Images:** Use `slim` or `alpine` base images for the final stage to reduce vulnerabilities.
3.  **Efficiency and Caching:** Structure the `Dockerfile` to maximize layer caching. Install dependencies first, then copy source code.
4.  **Consistency Across Environments:** The development environment should mirror the production environment as closely as possible. Use Docker Compose to manage environment-specific configurations.

---

### `Dockerfile` Structure

A `Dockerfile` must follow this structure:

1.  **Builder Stage (`AS builder`):**
    *   Start from a `uv`-based Python image (e.g., `ghcr.io/astral-sh/uv:python3.12-bookworm-slim`).
    *   Set the working directory to `/app`.
    *   Install dependencies using `uv sync` with the `--frozen` flag, leveraging a cached volume for `uv`. This should be done *before* copying the application source code to optimize caching.
    *   Copy the application source code.
    *   Install the project itself.
    *   (Optional but recommended) Clean up the virtual environment to remove unnecessary files (`__pycache__`, `*.pyc`, test directories).

2.  **Final Stage:**
    *   Start from a minimal base image (e.g., `python:3.12-slim-bookworm`).
    *   Install any necessary system dependencies (like `git`).
    *   Create a non-root user (e.g., `app`).
    *   Set the working directory to `/app`.
    *   Copy the virtual environment and the application source code from the `builder` stage, ensuring correct ownership (`--chown=app:app`).
    *   Set the `PATH` and `PYTHONPATH` environment variables to include the virtual environment.
    *   Switch to the non-root user (`USER app`).
    *   Set default environment variables for the application.
    *   `EXPOSE` the required port.
    *   Define the `CMD` to run the application.

---

### Docker Compose Files

We use two separate Docker Compose files to manage different environments:

1.  **`docker-compose.build.yml` (for CI/CD and Production Builds):**
    *   Defines a single service for building the production image.
    *   Uses environment variables (`$REGISTRY_ID`, `$PROJECT_NAME`, `$VERSION`) for image naming and tagging.
    *   Specifies the build context, `Dockerfile`, and target platform (`linux/amd64`).
    *   Tags the image with both a version and `latest`.

2.  **`docker-compose.dev.yml` (for Local Development):**
    *   Uses the same image built by the build file.
    *   Sets a `container_name` for easy identification.
    *   Maps ports from the container to the host.
    *   Loads environment variables from a `.env` file.
    *   Sets a `restart: unless-stopped` policy.
    *   Can mount volumes for persistent data or live code reloading if necessary, but prefer to rebuild the image for most changes to maintain consistency with production.

By adhering to these rules, we ensure that every project is containerized in a way that is secure, efficient, and easily managed across all stages of the development lifecycle. Do not deviate.

---

### Execution Patterns: Running the Container

Building an image is pointless if you don't know how to fucking run it. These are the canonical `docker run` commands. The standard port for this project is **8660**. Do not deviate.

**1. Single-User Mode (Static Key):**
-   **Use Case:** Local development or a deployment where a single, static API key is sufficient.
-   **Mechanism:** We map port `8660` on the host to `8660` in the container, and we pass the `PORT` and `OPENAI_API_KEY` environment variables.
-   **Command:**
    ```bash
    docker run --rm -p 8660:8660 \
      -e TRANSPORT="streamable-http" \
      -e PORT="8660" \
      -e OPENAI_API_KEY="your_openai_api_key_here" \
      ghcr.io/olegische/openai-assistant-mcp:latest
    ```

**2. Multi-User Mode (Credential Passthrough):**
-   **Use Case:** Production or multi-tenant environments where each request must provide its own API key.
-   **Mechanism:** We set `MCP_CREDENTIALS_PASSTHROUGH=true` and demand an `X-OpenAI-API-Key` header on every request.
-   **Command:**
    ```bash
    docker run --rm -p 8660:8660 \
      -e TRANSPORT="streamable-http" \
      -e PORT="8660" \
      -e MCP_CREDENTIALS_PASSTHROUGH="true" \
      ghcr.io/olegische/openai-assistant-mcp:latest
    ```

**3. IDE Integration (`stdio` transport):**
-   **Use Case:** For direct integration with an MCP client (like a CLI tool or an old version of an IDE) that uses standard input/output.
-   **Mechanism:** The `-i` flag is **mandatory** to keep `stdin` open. The `TRANSPORT=stdio` variable tells the server to listen on `stdio` instead of an HTTP port.
-   **Command:**
    ```bash
    docker run -i --rm \
      -e OPENAI_API_KEY="your_openai_api_key_here" \
      -e TRANSPORT="stdio" \
      ghcr.io/olegische/openai-assistant-mcp:latest
    ```

---

### Example `Dockerfile`

```dockerfile
# Use a Python image with uv pre-installed
FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim AS builder

# Install the project into `/app`
WORKDIR /app

# Enable bytecode compilation for faster startup
ENV UV_COMPILE_BYTECODE=1

# Copy from the cache instead of linking since it's a mounted volume
ENV UV_LINK_MODE=copy

# Install the project's dependencies using the lockfile and settings
RUN --mount=type=cache,target=/root/.cache/uv \
    --mount=type=bind,source=uv.lock,target=uv.lock \
    --mount=type=bind,source=pyproject.toml,target=pyproject.toml \
    uv sync --frozen --no-install-project --no-dev --no-editable

# Then, add the rest of the project source code and install it
# Installing separately from its dependencies allows optimal layer caching
COPY . /app
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-dev --no-editable

# Clean up the virtual environment to reduce image size
RUN find /app/.venv -name '__pycache__' -type d -exec rm -rf {} + && \
    find /app/.venv -name '*.pyc' -delete && \
    find /app/.venv -name '*.pyo' -delete && \
    find /app/.venv -name '*.pyd' -delete && \
    find /app/.venv -name 'test*' -type d -exec rm -rf {} + && \
    echo "Cleaned up .venv"

# Final stage - use slim image for smaller size
FROM python:3.12-slim-bookworm

# Install git for potential dependencies that need it
RUN apt-get update && \
    apt-get install -y --no-install-recommends git && \
    rm -rf /var/lib/apt/lists/* && \
    apt-get clean

# Create a non-root user for security
RUN groupadd -r app && useradd -r -g app -d /home/app -s /bin/bash -c "App user" app && \
    mkdir -p /home/app && \
    chown -R app:app /home/app

# Set working directory
WORKDIR /app

# Copy the virtual environment from builder stage
COPY --from=builder --chown=app:app /app/.venv /app/.venv

# Copy source code
COPY --from=builder --chown=app:app /app/src /app/src
COPY --from=builder --chown=app:app /app/run_server.py /app/run_server.py

# Place executables in the environment at the front of the path
ENV PATH="/app/.venv/bin:$PATH"
ENV PYTHONPATH=/app

# Switch to non-root user
USER app

# Set default environment variables for MCP transport
ENV TRANSPORT=stdio
ENV HOST=0.0.0.0
ENV PORT=8001
ENV LOG_LEVEL=INFO

# Expose port for HTTP/SSE transports
EXPOSE 8000

# Run the MCP server with proper command based on transport
CMD ["python", "run_server.py"]
```

### Example `docker-compose.build.yml`

```yaml
services:
  openai-assistant-mcp:
    image: ghcr.io/${REGISTRY_ID}/${PROJECT_NAME}:${VERSION}
    build:
      context: .
      dockerfile: Dockerfile
      platforms:
        - linux/amd64
      tags:
        - ghcr.io/${REGISTRY_ID}/${PROJECT_NAME}:${VERSION}
        - ghcr.io/${REGISTRY_ID}/${PROJECT_NAME}:latest
```

### Example `docker-compose.dev.yml`

```yaml
services:
  openai-assistant-mcp:
    image: ghcr.io/${REGISTRY_ID}/${PROJECT_NAME}:${VERSION}
    container_name: ${PROJECT_NAME}
    platform: linux/amd64
    ports:
      - "${PORT:-8001}:${PORT:-8001}"
    env_file:
      - ./.env
    environment:
      - TRANSPORT=${TRANSPORT:-http}
      - HOST=0.0.0.0
      - PORT=${PORT:-8001}
      - LOG_LEVEL=${LOG_LEVEL:-INFO}
    restart: unless-stopped
    volumes:
      - ${HOME}/.${PROJECT_NAME}:/home/app/.${PROJECT_NAME}
```
