#!/bin/bash

# Script to run migrations for all government service databases

echo "🚀 Running migrations for all government services..."

# Check if database URLs are set
if [ -z "$MIGRATION_SERVICE_DATABASE_URL" ]; then
  echo "❌ Error: MIGRATION_SERVICE_DATABASE_URL not set"
  exit 1
fi

if [ -z "$ZAGS_SERVICE_DATABASE_URL" ]; then
  echo "❌ Error: ZAGS_SERVICE_DATABASE_URL not set"
  exit 1
fi

if [ -z "$LAND_REGISTRY_DATABASE_URL" ]; then
  echo "❌ Error: LAND_REGISTRY_DATABASE_URL not set"
  exit 1
fi

# Migration Service
echo "\n📋 Running Migration Service migrations..."
cd src/migration-service/prisma
npx prisma migrate dev --name init
cd ../../..

# ZAGS Service  
echo "\n💍 Running ZAGS Service migrations..."
cd src/zags-service/prisma
npx prisma migrate dev --name init
cd ../../..

# Land Registry Service
echo "\n🏠 Running Land Registry Service migrations..."
cd src/land-registry-service/prisma
npx prisma migrate dev --name init
cd ../../..

echo "\n✅ All migrations completed successfully!"
