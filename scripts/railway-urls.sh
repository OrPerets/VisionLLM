#!/bin/bash

echo "🔗 Railway URL Configuration Helper"
echo "==================================="
echo ""

echo "📋 To find your Railway URLs:"
echo "1. Go to your Railway project dashboard"
echo "2. Look at each service to find the URLs"
echo ""

echo "🔧 Environment Variables to Set:"
echo ""

echo "For Backend Service (discerning-wonder):"
echo "CORS_ORIGIN=https://vision-llm-frontend-production-xxxx.up.railway.app"
echo "GOOGLE_REDIRECT_URI=https://discerning-wonder-production-xxxx.up.railway.app/api/auth/callback"
echo ""

echo "For Frontend Service (vision-llm-frontend):"
echo "NEXT_PUBLIC_API_BASE=https://discerning-wonder-production-xxxx.up.railway.app/api"
echo ""

echo "📝 Steps:"
echo "1. Replace 'xxxx' with your actual Railway service identifiers"
echo "2. Go to each service in Railway → Variables tab"
echo "3. Add/update the environment variables"
echo "4. Railway will automatically redeploy"
echo ""

echo "🔍 To find your exact URLs:"
echo "- Backend: Look for 'discerning-wonder-production-xxxx.up.railway.app'"
echo "- Frontend: Look for 'vision-llm-frontend-production-xxxx.up.railway.app'"
echo ""

echo "✅ After updating, your login should work correctly!"
