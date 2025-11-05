# ⚡ Quick Start Checklist

Follow these steps in order:

## ☑️ Setup Checklist

- [ ] 1. **Install dependencies**: `npm install`
- [ ] 2. **Create directories**: `mkdir -p logs`
- [ ] 3. **Copy env template**: `cp .dev.vars.example .dev.vars`
- [ ] 4. **Create GitHub OAuth App**: https://github.com/settings/developers
  - Homepage URL: `http://localhost:8787`
  - Callback URL: `http://localhost:8787/auth/callback`
  - Copy Client ID and Client Secret
- [ ] 5. **Edit `.dev.vars`**: Paste your credentials
- [ ] 6. **Generate JWT secret**: `openssl rand -base64 32` (paste in .dev.vars)
- [ ] 7. **Start dev server**: `npm run dev`
- [ ] 8. **Open browser**: http://localhost:8787
- [ ] 9. **Test OAuth**: Click "Sign in with GitHub"

## 🚀 Or Use the Setup Script

```bash
chmod +x setup.sh
./setup.sh
```

Then just edit `.dev.vars` and run `npm run dev`!

## 📝 Your .dev.vars Should Look Like:

```env
GITHUB_CLIENT_ID=Iv1.a1b2c3d4e5f6g7h8
GITHUB_CLIENT_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0
JWT_SECRET=xK8vN2pQ5wR9yT3mL7nH4jB6fG1sD8cA5eV2zX9w
REDIRECT_URI=http://localhost:8787/auth/callback
```

## ❓ Common Issues

**Port 8787 in use?**
```bash
lsof -ti:8787 | xargs kill -9
```

**OAuth error?**
- Check Client ID/Secret are correct
- Verify callback URL matches exactly

**Build failing?**
```bash
rm -rf node_modules package-lock.json
npm install
```

## 📚 More Details

See [SETUP_GUIDE.md](./SETUP_GUIDE.md) for detailed instructions.