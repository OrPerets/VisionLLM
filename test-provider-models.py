#!/usr/bin/env python3
import requests
import json

def test_provider_models_direct():
    """Test the provider models loading directly"""
    
    # First, let's check what providers exist
    print("1. Checking providers...")
    response = requests.get("http://localhost:8000/api/admin/llm/providers")
    if response.status_code == 200:
        providers = response.json()
        print(f"Found {len(providers)} providers:")
        for provider in providers:
            print(f"  - {provider['provider']}: {provider.get('name', 'N/A')}")
            print(f"    Enabled: {provider.get('enabled')}")
            print(f"    Config: {provider.get('config')}")
            print(f"    Has API key: {'api_key' in provider}")
    else:
        print(f"Failed to get providers: {response.status_code}")
        return
    
    print("\n2. Testing models endpoint...")
    response = requests.get("http://localhost:8000/api/models")
    if response.status_code == 200:
        data = response.json()
        print(f"Providers: {data.get('providers')}")
        print(f"Models count: {len(data.get('models', []))}")
        
        openai_models = [m for m in data.get('models', []) if m.get('name', '').startswith('openai:')]
        print(f"OpenAI models: {len(openai_models)}")
        for model in openai_models:
            print(f"  - {model['name']}")
    else:
        print(f"Failed to get models: {response.status_code}")
    
    print("\n3. Testing admin models endpoint...")
    response = requests.get("http://localhost:8000/api/admin/models")
    if response.status_code == 200:
        data = response.json()
        print(f"Providers: {data.get('providers')}")
        print(f"Models count: {len(data.get('models', []))}")
        
        openai_models = [m for m in data.get('models', []) if m.get('name', '').startswith('openai:')]
        print(f"OpenAI models: {len(openai_models)}")
        for model in openai_models:
            print(f"  - {model['name']}")
    else:
        print(f"Failed to get admin models: {response.status_code}")

if __name__ == "__main__":
    test_provider_models_direct()
