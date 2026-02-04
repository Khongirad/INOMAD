#!/bin/bash

# Script to generate all Prisma clients for government services

echo "🔧 Generating Prisma clients for all government services..."

# Migration Service
echo "\n📋 Generating Migration Service client..."
cd src/migration-service/prisma
npx prisma generate
cd ../../..

# ZAGS Service
echo "\n💍 Generating ZAGS Service client..."
cd src/zags-service/prisma
npx prisma generate
cd ../../..

# Land Registry Service
echo "\n🏠 Generating Land Registry Service client..."
cd src/land-registry-service/prisma
npx prisma generate
cd ../../..

echo "\n✅ All Prisma clients generated successfully!"
