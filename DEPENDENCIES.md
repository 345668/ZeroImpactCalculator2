# Project Dependencies

## Core Dependencies

### Frontend
- `react` - Core React library for building user interfaces
- `react-dom` - React rendering for web browsers
- `@tanstack/react-query` - Data fetching and state management
- `framer-motion` - Animation library for React
- `wouter` - Lightweight routing solution
- `tailwindcss` - Utility-first CSS framework
- `@radix-ui/*` - Accessible UI components
- `shadcn/ui` - UI component library built on Radix
- `lucide-react` - Icon library
- `react-hook-form` - Form handling
- `zod` - TypeScript-first schema validation

### Backend
- `express` - Web framework for Node.js
- `@sendgrid/mail` - Email service integration
- `@azure/storage-blob` - Azure Blob Storage integration
- `drizzle-orm` - TypeScript ORM
- `drizzle-zod` - Zod schema generation from Drizzle
- `multer` - File upload handling
- `bcryptjs` - Password hashing
- `express-session` - Session management

### Development
- `typescript` - TypeScript language support
- `vite` - Build tool and development server
- `@types/*` - TypeScript type definitions
- `tailwindcss` - CSS framework
- `postcss` - CSS processing
- `autoprefixer` - CSS vendor prefixing

## Environment Setup
The following environment variables are required:
- `DATABASE_URL` - PostgreSQL database connection string
- `SENDGRID_API_KEY` - SendGrid API key for email services
- `OPENAI_API_KEY` - OpenAI API key for AI features
- `AZURE_STORAGE_CONNECTION_STRING` - Azure Blob Storage connection

## Installation
All dependencies are managed through Replit's package management system. No manual installation is required.

## Version Management
Dependencies are locked to specific versions in package-lock.json to ensure consistent builds across environments.

## Security
- Regular security audits through `npm audit`
- Production dependencies separated from development dependencies
- Minimal use of third-party packages to reduce security surface
- All packages are from verified publishers on npm

## Best Practices
1. Always use the packager_install_tool for adding new dependencies
2. Keep dependencies updated regularly
3. Review security advisories
4. Minimize bundle size by importing only required components
5. Use exact versions for reproducible builds
