# Railway Deployment Guide

## Prerequisites
- Railway account
- Docker Hub account (for pushing images)

## Option 1: Deploy Entire Project (Recommended)

If you've added the entire Docker project to Railway, you'll have both backend and frontend services:

### Step 1: Add PostgreSQL Database

1. In your Railway project dashboard, click "New" → "Database" → "PostgreSQL"
2. Railway will automatically create a PostgreSQL database and provide connection details
3. The `DATABASE_URL` environment variable will be automatically set

### Step 2: Configure Backend Service (api)

Set these environment variables in your backend service:

```bash
# Database (automatically set by Railway when you add PostgreSQL)
DATABASE_URL=postgresql://username:password@host:port/database

# CORS Configuration (REQUIRED - use your frontend service URL)
CORS_ORIGIN=https://your-frontend-service-name.railway.app

# Model Configuration
MODEL_BACKEND=ollama
OLLAMA_URL=https://your-ollama-instance.com
OLLAMA_MODEL=llama3.2:3b-instruct

# Alternative: Use OpenAI
# MODEL_BACKEND=openai
# OPENAI_API_KEY=your-openai-api-key

# RAG Configuration
RAG_ENABLED=true
EMBEDDING_MODEL_ID=intfloat/e5-large-v2
RERANKER_MODEL_ID=BAAI/bge-reranker-v2-m3

# Application Settings
TEMPERATURE=0.2
MAX_TOKENS=800
MAX_INPUT_TOKENS=8192
MAX_TOTAL_TOKENS=8192
```

### Step 3: Configure Frontend Service (web)

Set this environment variable in your frontend service:

```bash
# Point to your backend API service
NEXT_PUBLIC_API_BASE=https://your-backend-service-name.railway.app/api
```

### Step 4: Run Database Migrations

After deployment, run database migrations in your backend service:

1. Go to your backend service in Railway
2. Open the "Deployments" tab
3. Click on the latest deployment
4. Open the shell and run:

```bash
cd /app
alembic upgrade head
```

## Option 2: Deploy Services Separately

If you prefer to deploy services separately:

### Backend Service

1. Create a new service in Railway
2. Choose "Deploy from Docker Hub"
3. Use the image: `orperetz/vision-llm:latest`
4. Set the port to `8000`
5. Configure environment variables as shown in Step 2 above

### Frontend Service

1. Create another service in Railway
2. Choose "Deploy from Docker Hub"
3. Use the image: `orperetz/vision-llm-frontend:latest`
4. Set the port to `3000`
5. Configure environment variables as shown in Step 3 above

## Service URLs

After deployment, you'll have:
- **Backend API**: `https://your-backend-service-name.railway.app`
- **Frontend**: `https://your-frontend-service-name.railway.app`

## Environment Variable Reference

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `DATABASE_URL` | PostgreSQL connection string | `sqlite:///./visionbi.db` | Yes (for production) |
| `CORS_ORIGIN` | Allowed CORS origins | `None` | Yes |
| `MODEL_BACKEND` | Model backend to use | `tgi` | No |
| `OLLAMA_URL` | Ollama server URL | `http://host.docker.internal:11434` | No |
| `OLLAMA_MODEL` | Ollama model name | `llama3.2:3b-instruct` | No |
| `RAG_ENABLED` | Enable RAG features | `true` | No |
| `TEMPERATURE` | Model temperature | `0.2` | No |
| `MAX_TOKENS` | Maximum tokens per response | `800` | No |
| `NEXT_PUBLIC_API_BASE` | Backend API URL for frontend | `http://localhost:8000/api` | Yes (for frontend) |

## Troubleshooting

### Database Connection Issues
- Ensure `DATABASE_URL` is correctly set
- Check that the PostgreSQL database is running
- Verify the connection string format

### CORS Issues
- Set `CORS_ORIGIN` to your frontend domain
- Include the protocol (https://) in the URL
- For multiple origins, separate with commas

### Frontend-Backend Communication Issues
- Ensure `NEXT_PUBLIC_API_BASE` points to the correct backend URL
- Check that both services are running
- Verify the API endpoints are accessible

### Model Backend Issues
- For Ollama: Ensure your Ollama instance is accessible from Railway
- For OpenAI: Set your API key correctly
- For TGI: You'll need to deploy TGI separately or use a managed service

## Quick Setup Script

Run the setup script for a quick reference:

```bash
./scripts/railway-setup.sh
```
