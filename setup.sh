#!/bin/bash

echo "🚀 Setting up Mass GitHub Repo Deleter..."
echo ""

# Create logs directory
if [ ! -d "logs" ]; then
  echo "📁 Creating logs directory..."
  mkdir -p logs
  echo "✅ Created logs/"
else
  echo "✅ logs/ directory already exists"
fi

# Create .dev.vars if it doesn't exist
if [ ! -f ".dev.vars" ]; then
  echo "📝 Creating .dev.vars from template..."
  cp .dev.vars.example .dev.vars
  echo "✅ Created .dev.vars"
  echo ""
  echo "⚠️  IMPORTANT: Edit .dev.vars and fill in your GitHub OAuth credentials!"
else
  echo "✅ .dev.vars already exists"
fi

echo ""
echo "📦 Installing dependencies..."
npm install

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .dev.vars with your GitHub OAuth credentials"
echo "2. Create a GitHub OAuth App at https://github.com/settings/developers"
echo "3. Set the callback URL to: http://localhost:8787/auth/callback"
echo "4. Run 'npm run dev' to start the development server"
echo ""
echo "📚 See README.md for detailed instructions!"