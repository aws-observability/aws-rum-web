# Code Comments Policy

## Never remove comments unless all associated logic is removed

Comments are invaluable historical records. When refactoring or modifying code:

-   **Preserve** all comments that describe intent, rationale, or context — even if the surrounding code changes
-   **Only remove** a comment when the entire block of logic it describes is deleted
-   **Move** comments with their associated code when relocating logic
-   If a comment becomes partially outdated due to a refactor, **update** it rather than deleting it
