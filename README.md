# Radical Zero Carbon Credit Calculator 🌱

A cutting-edge web application that helps building owners and tenants calculate their potential carbon credits from energy efficiency improvements. Built with TypeScript, React, and modern web technologies.

## Features ✨

- **Smart Document Processing**: Upload energy certificates and renovation plans for automatic data extraction
- **Multi-step Calculation Form**: User-friendly interface for inputting building and energy consumption data
- **Real-time Analysis**: Instant calculation of CO₂ savings and potential carbon credits
- **Interactive Dashboard**: Visualize your energy savings and carbon credit potential
- **Automated Reporting**: Receive detailed HTML reports via email with customizable templates
- **Email Template Editor**: Create and manage email templates with dynamic content fields
- **Domain Security Monitoring**: DMARC analysis for enhanced email security
- **GDPR Compliant**: Built-in data protection and privacy features

## Tech Stack 🛠️

- **Frontend**: React, TypeScript, Tailwind CSS, Framer Motion
- **Backend**: Express.js, Node.js
- **Database**: PostgreSQL with Drizzle ORM
- **AI/ML**: Mistral AI for document processing
- **Storage**: Azure Blob Storage with local storage fallback
- **Email**: SendGrid V3 API integration with templating
- **Security**: DMARC monitoring and domain alignment checking
- **Authentication**: Session-based auth with PostgreSQL
- **Internationalization**: i18next with support for English and German

## Prerequisites 📋

- Node.js 20+
- PostgreSQL 14+
- Azure Storage Account
- SendGrid API Key
- Mistral AI API Key

## Environment Setup

The following environment variables are required:

```env
DATABASE_URL=postgresql://user:password@host:port/dbname
AZURE_STORAGE_CONNECTION_STRING=your_azure_connection_string
SENDGRID_API_KEY=your_sendgrid_api_key
MISTRAL_API_KEY=your_mistral_api_key
```

## Quick Start 🚀

1. Clone the repository:
```bash
git clone https://github.com/yourusername/radical-zero-calculator.git
cd radical-zero-calculator
```

2. Install dependencies:
```bash
npm install
```

3. Set up the database:
```bash
npm run db:push
```

4. Start the development server:
```bash
npm run dev
```

5. Visit `http://localhost:5000` in your browser

## Project Structure 📁

```
radical-zero/
├── client/           # Frontend React application
├── server/           # Backend Express services
│   ├── calculators/  # Carbon credit calculation logic
│   ├── routes/      # API route handlers
│   └── services/    # Business logic services
├── shared/          # Shared types and utilities
└── docs/           # Documentation
```

## API Endpoints 📡

### Document Processing
- `POST /api/upload-document`: Upload and process energy certificates
- `POST /api/calculate`: Calculate carbon savings and credits
- `GET /api/submissions`: Retrieve all submissions
- `POST /api/send-report`: Send email reports

### Email Management
- `GET /api/email-templates`: Retrieve all email templates
- `GET /api/email-templates/:id`: Get a specific template
- `POST /api/email-templates`: Create a new email template
- `PUT /api/email-templates/:id`: Update an existing template

### Domain Security
- `GET /api/dmarc/reports`: Get all DMARC reports
- `POST /api/dmarc/parse`: Parse a DMARC report
- `POST /api/dmarc/check-alignment`: Check domain alignment

### System Monitoring
- `GET /api/monitoring/service-health`: Check service health status
- `GET /api/monitoring/api-calls`: View recent API calls
- `GET /api/monitoring/system-metrics`: Retrieve system performance metrics

## Security 🔒

- HTTPS enforced in production
- CSRF protection
- Rate limiting
- Input validation
- Secure session management
- File upload restrictions

## Contributing 🤝

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

Please ensure your PR follows our coding standards and includes appropriate tests.

## Development Guidelines 📝

- Follow TypeScript best practices
- Use ESLint and Prettier for code formatting
- Write tests for new features
- Update documentation as needed
- Keep PRs focused and concise

## License 📄

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support 💬

For support, email support@radicalzero.com or join our Slack channel.

## Screenshots 📸

![Calculator Form](screenshots/calculator-form.png)
![Results Dashboard](screenshots/results-dashboard.png)
![Email Report](screenshots/email-report.png)

## Recent Enhancements 🚀

### Email System Improvements
- Fixed issue with submissions being prematurely marked as "email sent" 
- Enhanced email templates with proper HTML formatting for consistent spacing
- Implemented proper HTML template structure with paragraph tags and styling
- Created a comprehensive data field helper in the template editor
- Added fallback mechanisms for Azure Storage unavailability

### Monitoring & Diagnostics
- Added comprehensive API monitoring with performance metrics
- Implemented service health checks across all application components
- Created a dedicated tools section for system administration
- Enhanced error handling and logging throughout the application

## Acknowledgments 🙏

- [Shadcn UI](https://ui.shadcn.com/) for the beautiful components
- [Tailwind CSS](https://tailwindcss.com/) for styling
- [Framer Motion](https://www.framer.com/motion/) for animations
- [Drizzle ORM](https://orm.drizzle.team/) for database operations
- [SendGrid](https://sendgrid.com/) for email delivery services
- [Azure Blob Storage](https://azure.microsoft.com/en-us/services/storage/blobs/) for document storage