# Project rules
- Keep the legacy vehicle year compatible with other workspaces by deriving it from a known registration date; never invent a full date from a year.
- Store named vehicle documents in a dedicated private bucket and metadata table, gated by Stock workspace permissions.
- Render all stored PDFs (vehicles, claims) in the app with React-PDF rather than browser PDF embeds, which may be blocked in preview frames.