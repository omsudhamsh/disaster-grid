# Security Policy

## Supported Versions

Disaster Grid is currently under active development. Security fixes are primarily applied to the latest version on the `main` branch.

| Version | Supported |
| --- | --- |
| `main` | Yes |
| Older commits/releases | No |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through a public GitHub issue.**

If GitHub Private Vulnerability Reporting is enabled for this repository, use:

https://github.com/omsudhamsh/disaster-grid/security/advisories/new

If private vulnerability reporting is unavailable, contact the repository owner privately through their GitHub profile and do not publicly disclose the vulnerability until it has been reviewed.

## What to Include

Please provide:

- A clear description of the vulnerability.
- Affected component, endpoint, or file.
- Steps to reproduce the issue.
- Proof-of-concept details, where safe and appropriate.
- Potential impact.
- Suggested mitigation, if known.

Please avoid including real credentials, API keys, personal data, or sensitive disaster-response information in the report.

## Response Process

The maintainer will review valid reports and, when appropriate:

1. Acknowledge the report.
2. Reproduce and assess the issue.
3. Determine severity and affected components.
4. Develop and test a fix.
5. Release or deploy the fix when practical.
6. Credit the reporter if they want attribution.

Response and remediation times may vary because this is an academic/independent project.

## Security Best Practices for Contributors

- Store secrets only in environment variables or secret managers.
- Never commit `.env` files containing real credentials.
- Do not expose service-role keys in frontend code.
- Validate and sanitize user-controlled input.
- Avoid logging credentials, tokens, or sensitive user data.
- Review third-party dependencies regularly.
- Use least-privilege access for external services.
- Treat disaster-related data as potentially sensitive.

## Scope

This policy covers the Disaster Grid source code and project infrastructure controlled by the repository maintainer.

Third-party services such as Google Gemini, Supabase, Clerk, USGS, and Open-Meteo have their own security policies and are outside the direct control of this project.
