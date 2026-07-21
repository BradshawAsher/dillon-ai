# Render rollback reference

Vercel is the primary deployment. This document preserves the existing Render
path in case a rollback is needed.

The Render Blueprint remains defined in render.yaml. Its root directory is
frontend, its build command installs frontend dependencies and runs the Vite
build, and its start command runs frontend/server.ts.

To restore Render, keep N8N_WEBHOOK_SECRET configured in the Render service,
deploy the current main branch, and direct users to:

https://due-diligence-dashboard.onrender.com/

The free Render tier can sleep after idle time, so it is intended as an
emergency fallback rather than the primary user experience.
