# Changelog

## [1.0.0] - Initial Release

### Added
- Complete Mass GitHub Repo Deleter implementation
- Cloudflare Workers backend with Hono
- React frontend with Tailwind CSS
- GitHub OAuth authentication with JWT
- Bulk repository deletion with dry-run mode
- Search and filter functionality
- Comprehensive documentation

### Fixed (Post-Review)
- **Critical**: Added `[site]` configuration to `wrangler.toml` for static asset serving
- **Critical**: Fixed build scripts to properly coordinate frontend build + deployment
- **Critical**: Added proper TypeScript types to middleware (removed `any` types)
- **Critical**: Added `@types/node` dependency
- **Security**: Updated Hono version to stable `^3.11.0`
- **DevEx**: Created setup scripts for macOS/Linux (`setup.sh`) and Windows (`setup.bat`)
- **DevEx**: Added comprehensive setup guides (QUICKSTART.md, SETUP_GUIDE.md)
- **DevEx**: Simplified Vite config (removed proxy, not needed with Wrangler)
- **DevEx**: Added `dev:watch` script for auto-rebuilding frontend
- **UX**: Added React ErrorBoundary component for graceful error handling
- **Docs**: Clarified development workflow in README
- **Docs**: Updated knowledge.md with build process and conventions
- **Structure**: Pre-configured `.gitignore` for logs directory

### Architecture Notes

**Development Flow:**
1. Vite builds React frontend → `dist/`
2. Wrangler serves Worker + static files from `dist/` using `[site]` config
3. All routes (`/auth/*`, `/api/*`, `/*`) handled by Worker
4. Frontend makes API calls to same origin (no CORS needed)

**Production Flow:**
1. Same as dev, but deployed to Cloudflare's edge network
2. Static assets served from Worker's KV storage (via `[site]`)
3. All API and auth routes handled at the edge

### Security
- JWT tokens expire after 10 minutes
- No long-term token storage
- Confirmation modal requires typing "DELETE"
- Dry-run mode for safe testing
- OAuth scopes limited to minimum required

### Known Limitations
- GitHub API rate limits apply (5000 requests/hour for authenticated users)
- Deletions are sequential (to avoid rate limits)
- Maximum 100 repos per page (pagination handled automatically)

### Future Enhancements
- Add archive-before-delete option
- Add CSV export of repositories
- Add filter by repository prefix
- Add progress streaming for real-time deletion feedback
- Add rate limit handling with exponential backoff