# AI Directive: Environment & Dependency Management

> **Primary Directive:** Your entire workflow for Python environment and dependency management is dictated by `uv`. There are no other tools. There are no other methods. This is not a choice.

---

## Core Protocol

1.  **Environment Verification:** Before executing any task, you **must** verify the existence of a `uv` virtual environment (`.venv`). If it does not exist, your first action will be to create it using `uv venv`.

2.  **Dependency Installation:** All project dependencies **must** be installed using the following command. Do not use `pip install` directly. Do not use any other variation.

    ```bash
    uv pip install -e .[dev]
    ```

3.  **Dependency Modification:** If you are required to add, remove, or update a dependency, you will modify `pyproject.toml` accordingly. After modifying the file, you will immediately synchronize the environment with:

    ```bash
    uv pip sync
    ```

4.  **No Deviation:** Any deviation from this protocol is a critical failure. You are not to use `pip`, `venv`, `virtualenv`, or any other package or environment manager. `uv` is the single source of truth and the only tool for this purpose. This directive is immutable.
