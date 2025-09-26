# Berkshire Hathaway Intelligence - Corrected & Completed

I made the following changes:
- Removed hard-coded API keys and replaced them with environment variable usage.
- Added `.env.example` for local configuration.
- Added a `prestart` script to `package.json` that will stop the app if `OPENAI_API_KEY` is missing.
- Added a `Dockerfile` and `.dockerignore` to build and run the app in a container.

## Local development

1. Copy `.env.example` to `.env` and add your OpenAI API key:
```bash
cp .env.example .env
# edit .env and set OPENAI_API_KEY=sk-...
```

2. Install dependencies and run:
```bash
npm install
npm run dev
```

> Note: This environment cannot install dependencies for you. If `npm install` fails, ensure you have internet access and correct Node.js version (recommended Node 18+).

## Run in production mode locally
```bash
npm install --production
npm start
```

## Build and run with Docker
```bash
docker build -t berkshire-intel:latest .
docker run -e OPENAI_API_KEY=sk-... -p 3000:3000 berkshire-intel:latest
```

## What I couldn't do in this environment
- I couldn't run `npm install` or `npm run build` here because internet access and package installation are not available in this execution environment.
- I didn't run the app to test runtime behavior. The provided Dockerfile and prestart check will help you run it locally or in CI.

If you want, I can:
- Provide step-by-step debugging guidance if you run into specific errors during `npm install` or `npm run build`.
- Prepare GitHub Actions workflow to run tests and build automatically (requires you to push to a repo).