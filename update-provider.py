#!/usr/bin/env python3
import requests
import json

# Configuration
API_BASE = "http://localhost:8000"
PROVIDER_ID = 3  # The OpenAI provider ID we saw earlier

def update_provider(api_key):
    """Update the OpenAI provider with an API key"""
    
    update_data = {
        "api_key": api_key
    }
    
    response = requests.patch(
        f"{API_BASE}/api/admin/llm/providers/{PROVIDER_ID}",
        headers={"Content-Type": "application/json"},
        json=update_data
    )
    
    if response.status_code == 200:
        print("✅ Provider updated successfully!")
        return True
    else:
        print(f"❌ Failed to update provider: {response.status_code} - {response.text}")
        return False

if __name__ == "__main__":
    print("🔧 Updating OpenAI provider with API key...")
    print()
    
    api_key = input("Enter your OpenAI API key: ").strip()
    if not api_key:
        print("❌ API key is required")
        exit(1)
    
    success = update_provider(api_key)
    
    if success:
        print()
        print("🎉 Provider updated! Now try refreshing the chat interface.")
        print("The OpenAI models should now appear in the dropdown.")
