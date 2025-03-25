# Domain Alignment & DMARC Email Security Documentation

## Overview

This document provides comprehensive documentation for the DMARC (Domain-based Message Authentication, Reporting, and Conformance) and Domain Alignment features implemented in the ZeroImpactCalculator application. These features enhance email security and deliverability by ensuring proper email authentication configurations.

## Table of Contents

1. [Introduction to DMARC and Domain Alignment](#introduction)
2. [API Endpoints](#api-endpoints)
3. [SendGridAgent Service](#sendgridagent-service)
4. [UI Components](#ui-components)
5. [Best Practices](#best-practices)
6. [Troubleshooting](#troubleshooting)

## Introduction

### What is DMARC?

DMARC (Domain-based Message Authentication, Reporting, and Conformance) is an email authentication protocol designed to give domain owners the ability to protect their domain from unauthorized use, commonly known as email spoofing. By implementing DMARC, domain owners can:

- Prevent their domain from being used for email spoofing, phishing scams, and other malicious activities
- Receive feedback about messages claiming to be from their domain
- Determine the authentication status of email messages
- Define a policy for handling messages that fail authentication

### What is Domain Alignment?

Domain Alignment refers to the proper configuration of email authentication standards (SPF, DKIM, and DMARC) to ensure that the domains used in different parts of an email match correctly. When properly aligned:

- The domain in the "From" header matches the domain validated by SPF
- The domain in the "From" header matches the domain validated by DKIM
- DMARC policies can be correctly applied based on the above alignment

## API Endpoints

The application provides several RESTful API endpoints for domain authentication and alignment features:

### Domain Authentication Endpoints

```
POST /api/email-agent/domains
GET /api/email-agent/domains
POST /api/email-agent/domains/check-alignment
POST /api/email-agent/domains/:domainId/validate
POST /api/email-agent/domains/generate-dmarc
```

### Domain Authentication Endpoint Details

| Endpoint | Method | Description | Parameters | Response |
|----------|--------|-------------|------------|----------|
| `/api/email-agent/domains` | POST | Create a new authenticated domain | `domain` (required), `subdomain`, `customSPF`, `automaticSecurity` | JSON with domain authentication details and DNS records |
| `/api/email-agent/domains` | GET | Get all authenticated domains | None | JSON array of authenticated domains |
| `/api/email-agent/domains/check-alignment` | POST | Check domain alignment | `domain` (required) | JSON with alignment details, recommendations, and DNS records |
| `/api/email-agent/domains/:domainId/validate` | POST | Validate domain authentication | `domainId` (path parameter) | JSON with validation results |
| `/api/email-agent/domains/generate-dmarc` | POST | Generate a DMARC record | `domain` (required), `policy`, `subdomainPolicy`, `reportEmail`, `reportForensicEmail`, `percentage` | JSON with the generated DMARC record |

### DMARC Report Endpoints

```
POST /api/email-agent/process-dmarc
POST /api/email-agent/send-dmarc-alert
```

### DMARC Report Endpoint Details

| Endpoint | Method | Description | Parameters | Response |
|----------|--------|-------------|------------|----------|
| `/api/email-agent/process-dmarc` | POST | Process DMARC emails from inbox | `maxEmails`, `processAttachments`, `notificationEmail` | JSON with processing results |
| `/api/email-agent/send-dmarc-alert` | POST | Send a DMARC alert | `reportId` (required), `to` (required) | JSON with sending results |

## SendGridAgent Service

The `SendGridAgent` class provides comprehensive functionality for domain authentication, alignment checking, and DMARC processing. Here are the key methods:

### Domain Alignment & Authentication Methods

| Method | Description | Parameters | Returns |
|--------|-------------|------------|---------|
| `getAuthenticatedDomains()` | Get all domains authenticated in SendGrid | None | Promise with domains array |
| `checkDomainAlignment(domain)` | Check domain alignment for SPF, DKIM, DMARC | `domain` (string) | Promise with alignment check results |
| `validateDomainAuthentication(domainId)` | Validate domain authentication | `domainId` (number) | Promise with validation results |
| `createAuthenticatedDomain(options)` | Create a new authenticated domain | `domain`, `subdomain`, `customSPF`, `automaticSecurity` | Promise with creation results and DNS records |
| `generateDmarcRecord(domain, policy, options)` | Generate a DMARC record | `domain`, `policy`, `options` | DMARC record string |

### DMARC Processing Methods

| Method | Description | Parameters | Returns |
|--------|-------------|------------|---------|
| `processDmarcEmails(options)` | Process DMARC emails from inbox | `maxEmails`, `processAttachments`, `notificationEmail` | Promise with processing results |
| `sendDmarcAlert(report, to)` | Send a DMARC alert based on a report | `report` (DmarcReport), `to` (string or array) | Promise with sending results |
| `getDetailedSecurityAssessment(report)` | Get security assessment from report | `report` (DmarcReport) | Assessment string |
| `getSecurityThreatLevel(report)` | Get threat level from report | `report` (DmarcReport) | Threat level string |
| `getDmarcRecommendations(report)` | Get recommendations from report | `report` (DmarcReport) | Recommendations string |

## UI Components

### Domain Alignment Checker

A React component (`DomainAlignmentChecker`) provides a user-friendly interface for checking domain alignment and generating DMARC records. It's available in the admin panel under the "Email Security" tab.

Key features:
- Check domain alignment for any domain
- View SPF, DKIM, and DMARC status
- Get recommendations for improving email authentication
- Generate DMARC records with best practices
- Copy DNS records to clipboard

## Best Practices

### DMARC Implementation Strategy

1. **Start with monitoring mode**:
   - Begin with `p=none` policy to monitor without affecting email delivery
   - Collect reports for at least two weeks to understand your email ecosystem

2. **Analyze and fix authentication issues**:
   - Review DMARC reports for authentication failures
   - Address SPF and DKIM misalignments or failures

3. **Gradually increase policy strictness**:
   - Move to `p=quarantine` after resolving issues (send suspicious emails to spam)
   - Finally, transition to `p=reject` (block unauthorized emails) when confident

### DNS Record Configuration

Ensure proper DNS record configuration:

- **SPF**: Add as a TXT record at the domain root
- **DKIM**: Add as a TXT record at the selector domain specified by your email provider
- **DMARC**: Add as a TXT record at `_dmarc.yourdomain.com`

## Troubleshooting

### Common DMARC Issues

| Issue | Possible Causes | Solutions |
|-------|----------------|-----------|
| SPF fails but DKIM passes | Emails sent from unauthorized servers | Update SPF record to include all legitimate sending sources |
| DKIM fails but SPF passes | DKIM keys are missing or misconfigured | Verify DKIM key setup and ensure proper rotation |
| Both DKIM and SPF fail | Severe misconfiguration or potential spoofing | Investigate source IPs and update both authentication methods |
| Alignment failures | Subdomain sending without proper configuration | Ensure consistent domain usage or update alignment settings |

### API Response Error Codes

| Status Code | Description | Possible Solution |
|-------------|-------------|-------------------|
| 400 | Bad Request - Missing required parameters | Check the request body for required fields |
| 401 | Unauthorized - Authentication required | Ensure user is logged in with proper session |
| 403 | Forbidden - Admin access required | Verify user has admin role |
| 500 | Internal Server Error | Check server logs for details |

---

## Resources

- [Official DMARC Documentation](https://dmarc.org/resources/)
- [SendGrid Domain Authentication Guide](https://docs.sendgrid.com/ui/account-and-settings/how-to-set-up-domain-authentication)
- [DMARC Inspector Tools](https://dmarcian.com/dmarc-inspector/)

---

*This documentation is part of the ZeroImpactCalculator application's technical documents.*