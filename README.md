# AgentIQ - UI

## Running Locally

### 1. Clone Repo

```bash
git clone ssh://git@gitlab-master.nvidia.com:12051/jarvis-chatbot/agentiq-opensource-ui.git

```

### 2. Install Dependencies

```bash
npm ci
```

### 4. Run App

```bash
npm run dev
```

### 5. Run App via Docker
```bash
# Build the Docker image
docker build -t agentiq-ui .

# Run the container with environment variables from .env
# Ensure the .env file is present before running this command.
# Skip --env-file .env if no overrides are needed.
docker run --env-file .env -p 3000:3000 agentiq-ui
```