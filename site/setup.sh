#!/bin/bash
# JetFlix Site - Quick Start Script

echo "🚀 JetFlix Site - Quick Start"
echo "==============================="
echo ""

# Check Node version
echo "✓ Checking Node.js..."
node --version

# Install dependencies
echo ""
echo "✓ Installing dependencies..."
npm install

# Copy env file
echo ""
echo "✓ Setting up environment..."
if [ ! -f ".env.local" ]; then
    cp .env.example .env.local
    echo "✅ Created .env.local"
    echo "⚠️  Please edit .env.local and change JWT_SECRET"
else
    echo "✅ .env.local already exists"
fi

# Show next steps
echo ""
echo "✅ Setup complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Edit .env.local and configure variables"
echo "   2. Run: npm run dev"
echo "   3. Open: http://localhost:3000"
echo ""
echo "📚 Documentation:"
echo "   - INSTALL.md - Installation guide"
echo "   - ARCHITECTURE.md - Technical architecture"
echo "   - README.md - Main documentation"
echo ""
echo "🎉 Ready to code!"
