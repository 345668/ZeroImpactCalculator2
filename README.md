# Radical Zero Carbon Credit Calculator 🌱

A cutting-edge web application that helps building owners and tenants calculate their potential carbon credits from energy efficiency improvements. Built with TypeScript, React, and modern web technologies.

## Features ✨

- **Smart Document Processing**: Upload energy certificates and renovation plans for automatic data extraction
- **Multi-step Calculation Form**: User-friendly interface for inputting building and energy consumption data
- **Real-time Analysis**: Instant calculation of CO₂ savings and potential carbon credits
- **Interactive Dashboard**: Visualize your energy savings and carbon credit potential
- **Automated Reporting**: Receive detailed PDF reports via email
- **GDPR Compliant**: Built-in data protection and privacy features

## Tech Stack 🛠️

- **Frontend**: React, TypeScript, Tailwind CSS, Framer Motion
- **Backend**: Express.js, Node.js
- **Database**: PostgreSQL with Drizzle ORM
- **AI/ML**: Mistral AI for document processing
- **Storage**: Azure Blob Storage
- **Email**: SendGrid integration
- **Authentication**: Session-based auth with PostgreSQL

## Prerequisites 📋

- Node.js 20+
- PostgreSQL 14+
- Azure Storage Account
- SendGrid API Key
- Mistral AI API Key

# Dependency Management

Our project uses a modern JavaScript/TypeScript stack with dependencies managed through npm. For detailed information about project dependencies and their purposes, please refer to [DEPENDENCIES.md](DEPENDENCIES.md).

## Adding New Dependencies

To add new dependencies to the project:

1. Never modify package.json directly
2. Use Replit's package management system
3. Document new dependencies in DEPENDENCIES.md
4. Update security policies as needed
5. Test the application after adding dependencies

## Environment Setup

The following environment variables are required:

```env
DATABASE_URL=postgresql://user:password@host:port/dbname
AZURE_STORAGE_CONNECTION_STRING=your_azure_connection_string
SENDGRID_API_KEY=your_sendgrid_api_key
OPENAI_API_KEY=your_openai_api_key
```

For local development, create a `.env` file with these variables. In production, use Replit's Secrets system.

## Installation 🚀

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

## API Endpoints 📡

### Document Processing
- `POST /api/upload-document`: Upload and process energy certificates
- `POST /api/calculate`: Calculate carbon savings and credits
- `GET /api/submissions`: Retrieve all submissions
- `POST /api/send-report`: Send email reports

## Contributing 🤝

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## Security 🔒

- HTTPS enforced
- CSRF protection
- Rate limiting
- Input validation
- Secure session management
- File upload restrictions

## License 📝

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support 💬

For support, email support@radicalzero.com or join our Slack channel.

## Screenshots 📸

![Calculator Form](screenshots/calculator-form.png)
![Results Dashboard](screenshots/results-dashboard.png)
![Email Report](screenshots/email-report.png)

## Acknowledgments 🙏

- [Shadcn UI](https://ui.shadcn.com/) for the beautiful components
- [Tailwind CSS](https://tailwindcss.com/) for styling
- [Framer Motion](https://www.framer.com/motion/) for animations
- [Drizzle ORM](https://orm.drizzle.team/) for database operations