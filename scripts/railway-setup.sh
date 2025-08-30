#!/bin/bash

# Railway Deployment Setup Script
# This script helps you set up the necessary environment variables for Railway deployment

echo "🚂 Railway Deployment Setup"
echo "=========================="
echo ""

# Check if we're in the right directory
if [ ! -f "backend/app/config.py" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

echo "📋 Required Environment Variables for Railway:"
echo ""

echo "# Database (Railway will set this automatically when you add PostgreSQL)"
echo "DATABASE_URL=postgresql://username:password@host:port/database"
echo ""

echo "# CORS Configuration (REQUIRED)"
echo "CORS_ORIGIN=https://your-frontend-domain.railway.app"
echo ""

echo "# Authentication (optional)"
echo "ENABLE_AUTH=false"
echo "SESSION_SECRET=your-secure-session-secret"
echo ""

echo "# Model Configuration (choose one option)"
echo ""
echo "# Option 1: Ollama (if you have Ollama running elsewhere)"
echo "MODEL_BACKEND=ollama"
echo "OLLAMA_URL=https://your-ollama-instance.com"
echo "OLLAMA_MODEL=llama3.2:3b-instruct"
echo ""
echo "# Option 2: OpenAI (if you have an OpenAI API key)"
echo "# MODEL_BACKEND=openai"
echo "# OPENAI_API_KEY=your-openai-api-key"
echo ""

echo "# RAG Configuration"
echo "RAG_ENABLED=true"
echo "EMBEDDING_MODEL_ID=intfloat/e5-large-v2"
echo "RERANKER_MODEL_ID=BAAI/bge-reranker-v2-m3"
echo ""

echo "# Application Settings"
echo "TEMPERATURE=0.2"
echo "MAX_TOKENS=800"
echo "MAX_INPUT_TOKENS=8192"
echo "MAX_TOTAL_TOKENS=8192"
echo ""

echo "📝 Steps to deploy:"
echo ""
echo "Option 1: Deploy Entire Project (Recommended)"
echo "1. Add the entire Docker project to Railway"
echo "2. Add a PostgreSQL database (Railway will set DATABASE_URL automatically)"
echo "3. Configure backend service (api) with environment variables above"
echo "4. Configure frontend service (web) with:"
echo "   NEXT_PUBLIC_API_BASE=https://your-backend-service-name.railway.app/api"
echo "5. After deployment, run database migrations in the backend service shell:"
echo "   cd /app && alembic upgrade head"
echo ""
echo "Option 2: Deploy Services Separately"
echo "1. Create a new Railway project"
echo "2. Add a PostgreSQL database"
echo "3. Create backend service: orperetz/vision-llm:latest (port 8000)"
echo "4. Create frontend service: orperetz/vision-llm-frontend:latest (port 3000)"
echo "5. Configure environment variables for each service"
echo ""

echo "🔗 Useful links:"
echo "- Railway Dashboard: https://railway.app/dashboard"
echo "- Backend Docker Hub: https://hub.docker.com/r/orperetz/vision-llm"
echo "- Frontend Docker Hub: https://hub.docker.com/r/orperetz/vision-llm-frontend"
echo "- Full deployment guide: docs/RAILWAY_DEPLOY.md"
echo ""

echo "✅ Setup complete! Follow the steps above to deploy to Railway."
