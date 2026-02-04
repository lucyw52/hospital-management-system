#!/bin/bash

# Hospital Management System - Quick Setup Script
# This script automates the initial setup process

set -e

echo "🏥 Hospital Management System - Quick Setup"
echo "==========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo -e "${RED}❌ PostgreSQL is not installed. Please install PostgreSQL first.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ PostgreSQL found${NC}"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js 18+ first.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Node.js found ($(node -v))${NC}"
echo ""

# Install root dependencies
echo "📦 Installing root dependencies..."
npm install

# Install API dependencies
echo "📦 Installing API dependencies..."
cd apps/api
npm install

# Install web dependencies
echo "📦 Installing web dependencies..."
cd ../web
npm install
cd ../..

echo ""
echo "🔧 Setting up environment files..."

# Setup API .env
if [ ! -f "apps/api/.env" ]; then
    cp apps/api/.env.example apps/api/.env
    echo -e "${YELLOW}⚠️  Created apps/api/.env - Please update with your database credentials${NC}"
else
    echo -e "${GREEN}✅ apps/api/.env already exists${NC}"
fi

# Setup web .env
if [ ! -f "apps/web/.env" ]; then
    cp apps/web/.env.example apps/web/.env
    echo -e "${GREEN}✅ Created apps/web/.env${NC}"
else
    echo -e "${GREEN}✅ apps/web/.env already exists${NC}"
fi

echo ""
echo "🗄️  Database setup..."
echo -e "${YELLOW}Note: Make sure PostgreSQL is running and you've created the database${NC}"
echo -e "${YELLOW}Run these commands in PostgreSQL if not done:${NC}"
echo -e "${YELLOW}  CREATE DATABASE hms_db;${NC}"
echo -e "${YELLOW}  CREATE USER hms_user WITH PASSWORD 'your_password';${NC}"
echo -e "${YELLOW}  GRANT ALL PRIVILEGES ON DATABASE hms_db TO hms_user;${NC}"
echo ""

read -p "Have you created the database? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}Please create the database first, then run this script again.${NC}"
    exit 1
fi

# Generate Prisma client
echo "🔨 Generating Prisma client..."
cd apps/api
npx prisma generate

# Run migrations
echo "🚀 Running database migrations..."
npx prisma migrate dev --name init

# Seed database
echo "🌱 Seeding database with demo data..."
npm run seed

cd ../..

echo ""
echo -e "${GREEN}✅ Setup complete!${NC}"
echo ""
echo "📚 Demo Login Credentials (password: password123):"
echo "  - Admin: admin@hms.com"
echo "  - Receptionist: receptionist@hms.com"
echo "  - Doctor: doctor@hms.com"
echo "  - Lab Tech: labtech@hms.com"
echo "  - Pharmacist: pharmacist@hms.com"
echo "  - Ward Clerk: wardclerk@hms.com"
echo ""
echo "🚀 To start the application:"
echo "  npm run dev"
echo ""
echo "📖 For detailed documentation, see:"
echo "  - README.md"
echo "  - SETUP.md"
echo ""
echo "🌐 Once started, access:"
echo "  - Frontend: http://localhost:3000"
echo "  - API Docs: http://localhost:3001/api/docs"
echo ""
