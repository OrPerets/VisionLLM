#!/usr/bin/env python3
import requests
import json

def test_provider_models():
    """Test the provider models loading"""
    
    # Test the models endpoint
    print("Testing /api/models endpoint...")
    response = requests.get("http://localhost:8000/api/models")
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"Providers: {data.get('providers')}")
        print(f"Models count: {len(data.get('models', []))}")
        
        openai_models = [m for m in data.get('models', []) if m.get('name', '').startswith('openai:')]
        print(f"OpenAI models: {len(openai_models)}")
        for model in openai_models:
            print(f"  - {model['name']}")
    
    print("\n" + "="*50 + "\n")
    
    # Test the admin models endpoint
    print("Testing /api/admin/models endpoint...")
    response = requests.get("http://localhost:8000/api/admin/models")
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"Providers: {data.get('providers')}")
        print(f"Models count: {len(data.get('models', []))}")
        
        openai_models = [m for m in data.get('models', []) if m.get('name', '').startswith('openai:')]
        print(f"OpenAI models: {len(openai_models)}")
        for model in openai_models:
            print(f"  - {model['name']}")
    
    print("\n" + "="*50 + "\n")
    
    # Test the providers endpoint
    print("Testing /api/admin/llm/providers endpoint...")
    response = requests.get("http://localhost:8000/api/admin/llm/providers")
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        providers = response.json()
        print(f"Providers count: {len(providers)}")
        for provider in providers:
            print(f"  - {provider['provider']}: {provider.get('name', 'N/A')}")
            print(f"    Enabled: {provider.get('enabled')}")
            print(f"    Config: {provider.get('config')}")

if __name__ == "__main__":
    test_provider_models()
