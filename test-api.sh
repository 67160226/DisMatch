#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

API_URL="http://localhost:8000"

echo -e "${BLUE}=== FastAPI Login & Register Test ===${NC}\n"

# Test 1: Register
echo -e "${GREEN}1. Testing Register Endpoint${NC}"
curl -X POST "$API_URL/register" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john_doe",
    "email": "john@example.com",
    "password": "securepass123"
  }' | jq '.'

echo -e "\n${GREEN}2. Testing Register with Duplicate Username${NC}"
curl -X POST "$API_URL/register" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john_doe",
    "email": "john2@example.com",
    "password": "securepass123"
  }' | jq '.'

# Test 2: Login with correct password
echo -e "\n${GREEN}3. Testing Login with Correct Password${NC}"
curl -X POST "$API_URL/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john_doe",
    "password": "securepass123"
  }' | jq '.'

# Test 3: Login with wrong password
echo -e "\n${GREEN}4. Testing Login with Wrong Password${NC}"
curl -X POST "$API_URL/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john_doe",
    "password": "wrongpassword"
  }' | jq '.'

# Test 4: Get user by ID
echo -e "\n${GREEN}5. Testing Get User by ID${NC}"
curl -X GET "$API_URL/users/1" | jq '.'

# Test 5: Get non-existent user
echo -e "\n${GREEN}6. Testing Get Non-existent User${NC}"
curl -X GET "$API_URL/users/999" | jq '.'

echo -e "\n${BLUE}=== Test Completed ===${NC}"
