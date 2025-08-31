#!/bin/bash

echo "🔐 Google OAuth Setup for Railway"
echo "================================"
echo ""

echo "📋 Option 1: Enable Google OAuth (Recommended)"
echo ""

echo "1. Update Google OAuth Redirect URI:"
echo "   - Go to https://console.cloud.google.com/"
echo "   - Navigate to: APIs & Services → Credentials"
echo "   - Find your OAuth 2.0 Client ID"
echo "   - Add redirect URI: https://discerning-wonder-production-xxxx.up.railway.app/api/auth/callback"
echo ""

echo "2. Set these environment variables in Railway backend service:"
echo ""
echo "ENABLE_AUTH=true"
echo "SESSION_SECRET=your-secure-session-secret-here"
echo "GOOGLE_CLIENT_ID=your-google-client-id-here"
echo "GOOGLE_CLIENT_SECRET=your-google-client-secret-here"
echo "GOOGLE_REDIRECT_URI=https://discerning-wonder-production-xxxx.up.railway.app/api/auth/callback"
echo "ALLOWED_GOOGLE_DOMAINS=yourdomain.com"
echo "ADMIN_EMAILS=your-email@yourdomain.com"
echo ""

echo "📋 Option 2: Disable Authentication (Quick Fix)"
echo ""
echo "Set this environment variable in Railway backend service:"
echo ""
echo "ENABLE_AUTH=false"
echo ""

echo "🔍 To find your Railway service URL:"
echo "- Look for 'discerning-wonder-production-xxxx.up.railway.app' in your Railway dashboard"
echo "- Replace 'xxxx' with your actual service identifier"
echo ""

echo "✅ After updating, Railway will automatically redeploy!"
