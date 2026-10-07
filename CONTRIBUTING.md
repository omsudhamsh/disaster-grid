# Contributing to Disaster Grid

Thank you for your interest in contributing to Disaster Grid.

Disaster Grid is a real-time multimodal disaster-response platform that combines satellite/drone imagery, crisis-text analysis, live sensor information, and weighted fusion to support disaster-response coordination.

## Before You Start

Please:

1. Read the [README](README.md).
2. Check existing issues and pull requests before starting new work.
3. Open an issue for significant feature proposals or architectural changes.
4. Never commit API keys, credentials, tokens, private datasets, or other secrets.

## Development Setup

### Backend

Requirements:

- Python 3.12+
- A Gemini API key for imagery analysis
- A Supabase project for imagery persistence

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# macOS/Linux
# source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --reload
```

### Frontend

Requirements:

- Node.js 18+

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

See the README for the complete environment-variable configuration.

## Contribution Areas

Useful contributions include:

- Bug fixes
- Frontend and accessibility improvements
- Backend/API improvements
- Disaster-data processing
- NLP and code-mixed language support
- Computer-vision and imagery-analysis improvements
- Sensor/API integrations
- Multimodal fusion and explainability
- Testing and documentation
- Performance and reliability improvements

## Branches

Use a descriptive branch name:

```text
feature/<short-description>
fix/<short-description>
docs/<short-description>
refactor/<short-description>
test/<short-description>
```

Example:

```text
feature/incident-filter
fix/sensor-risk-calculation
docs/api-reference
```

## Commits

Keep commits focused and descriptive.

Recommended format:

```text
type: short description
```

Examples:

```text
feat: add district incident filtering
fix: handle missing sensor coordinates
docs: improve local setup instructions
refactor: simplify fusion scoring
test: add crisis parser coverage
```

## Pull Requests

Before opening a PR:

- Make sure the project builds successfully.
- Run the relevant tests and checks.
- Keep the PR focused on one logical change.
- Update documentation when behavior or setup changes.
- Do not include secrets or generated credentials.
- Explain what changed and why.
- Include screenshots or recordings for meaningful UI changes.

PRs may be reviewed for correctness, maintainability, security, accessibility, and consistency with the project's architecture.

## Reporting Bugs

Use the **Bug Report** issue template.

Include:

- What happened
- Expected behavior
- Steps to reproduce
- Environment
- Relevant logs or screenshots
- Whether the issue is reproducible

Please remove API keys, tokens, personal information, and other sensitive data before posting logs.

## Feature Requests

Use the **Feature Request** issue template.

For major architectural changes, explain:

- The problem being solved
- Proposed approach
- Alternatives considered
- Expected impact
- Any compatibility or migration concerns

## Security

Never report security vulnerabilities through a public GitHub issue.

Follow [SECURITY.md](SECURITY.md).

## License

By contributing to this repository, you agree that your contributions may be distributed under the project's existing license.
