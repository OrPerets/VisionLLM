#!/usr/bin/env python3
"""
Script to set up OpenAI provider with specific models.
Run this script to configure the OpenAI provider with GPT-5 and GPT-4.1 models.
"""

import requests
import json
import os
from typing import Optional

# Configuration
API_BASE = os.getenv("API_BASE", "http://localhost:8000")
ADMIN_TOKEN = os.getenv("ADMIN_TOKEN")  # Set this if you have admin token auth

# API endpoints
PROVIDERS_ENDPOINT = f"{API_BASE}/api/admin/llm/providers"

# The models you want to use
OPENAI_MODELS = [
    "gpt-5",
    "gpt-5-mini", 
    "gpt-5-nano",
    "gpt-4.1",
    "gpt-4o-mini",
    "gpt-4o",
    "gpt-4-turbo",
    "gpt-3.5-turbo"
]

def get_auth_headers():
    """Get authentication headers"""
    headers = {"Content-Type": "application/json"}
    if ADMIN_TOKEN:
        headers["Authorization"] = f"Bearer {ADMIN_TOKEN}"
    return headers

def get_session_cookies():
    """Get session cookies for authentication"""
    # For now, we'll try without cookies since auth is disabled by default
    return {}

def setup_openai_provider(api_key: str, base_url: Optional[str] = None, organization: Optional[str] = None):
    """Set up OpenAI provider with specific models"""
    
    # Check if provider already exists
    response = requests.get(PROVIDERS_ENDPOINT, headers=get_auth_headers(), cookies=get_session_cookies())
    if response.status_code == 200:
        providers = response.json()
        existing_provider = next((p for p in providers if p["provider"] == "openai"), None)
        
        if existing_provider:
            print(f"OpenAI provider already exists (ID: {existing_provider['id']})")
            print("Updating with new configuration...")
            
            # Update existing provider
            update_data = {
                "api_key": api_key,
                "config": {"models": OPENAI_MODELS}
            }
            if base_url:
                update_data["base_url"] = base_url
            if organization:
                update_data["organization"] = organization
                
            response = requests.patch(
                f"{PROVIDERS_ENDPOINT}/{existing_provider['id']}", 
                headers=get_auth_headers(),
                cookies=get_session_cookies(),
                json=update_data
            )
            
            if response.status_code == 200:
                print("✅ OpenAI provider updated successfully!")
                return True
            else:
                print(f"❌ Failed to update provider: {response.text}")
                return False
    
    # Create new provider
    provider_data = {
        "provider": "openai",
        "name": "OpenAI",
        "api_key": api_key,
        "config": {"models": OPENAI_MODELS}
    }
    
    if base_url:
        provider_data["base_url"] = base_url
    if organization:
        provider_data["organization"] = organization
    
    response = requests.post(
        PROVIDERS_ENDPOINT,
        headers=get_auth_headers(),
        cookies=get_session_cookies(),
        json=provider_data
    )
    
    if response.status_code == 200:
        print("✅ OpenAI provider created successfully!")
        return True
    else:
        print(f"❌ Failed to create provider: {response.text}")
        return False

def main():
    print("🚀 Setting up OpenAI provider with GPT-5 and GPT-4.1 models...")
    print()
    
    # Get API key from user
    api_key = input("Enter your OpenAI API key: ").strip()
    if not api_key:
        print("❌ API key is required")
        return
    
    # Optional configuration
    base_url = input("Enter base URL (optional, press Enter to use default): ").strip() or None
    organization = input("Enter organization ID (optional, press Enter to skip): ").strip() or None
    
    print()
    print(f"📋 Configuration:")
    print(f"   API Base: {API_BASE}")
    print(f"   Models: {', '.join(OPENAI_MODELS)}")
    if base_url:
        print(f"   Base URL: {base_url}")
    if organization:
        print(f"   Organization: {organization}")
    print()
    
    # Confirm
    confirm = input("Proceed with setup? (y/N): ").strip().lower()
    if confirm != 'y':
        print("Setup cancelled")
        return
    
    # Set up provider
    success = setup_openai_provider(api_key, base_url, organization)
    
    if success:
        print()
        print("🎉 Setup complete! You can now:")
        print("1. Go to the chat interface")
        print("2. Select 'OpenAI' as the provider")
        print("3. Choose from the available models in the dropdown")
        print()
        print("The following models will be available:")
        for model in OPENAI_MODELS:
            print(f"   • {model}")

if __name__ == "__main__":
    main()
