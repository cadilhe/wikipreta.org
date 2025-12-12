#!/bin/bash
# setup-db.sh - Initialize Prisma and SQLite database for Wikipreta

set -e

echo "🚀 Setting up Wikipreta database..."
echo ""

# Check if .env.local exists
if [ ! -f .env.local ]; then
  echo "❌ .env.local not found. Please create it with GEMINI_API_KEY and DATABASE_URL."
  exit 1
fi

# Install dependencies
echo "📦 Installing Prisma dependencies..."
npm install @prisma/client
npm install -D prisma

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Run migrations
echo "🗄️ Running database migrations..."
npx prisma migrate dev --name init

# Seed with sample data (optional)
echo "✅ Database setup complete!"
echo ""
echo "Next steps:"
echo "  1. Run: npm run dev:all"
echo "  2. Open http://localhost:3000 in your browser"
echo "  3. Generate a new verbete to test persistence"
