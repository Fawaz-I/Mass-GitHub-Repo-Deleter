# 🚀 Get Started in 3 Steps

## For First-Time Users

### Step 1: Run Setup

**macOS/Linux:**
```bash
chmod +x setup.sh
./setup.sh
```

**Windows:**
```cmd
setup.bat
```

### Step 2: Configure OAuth

1. Create a GitHub OAuth App: https://github.com/settings/developers
2. Set callback URL to: `http://localhost:8787/auth/callback`
3. Copy Client ID and Secret into `.dev.vars`
4. Generate JWT secret: `openssl rand -base64 32` (also into `.dev.vars`)

### Step 3: Start Developing

```bash
npm run dev
```

Open http://localhost:8787 🎉

---

## Quick Links

- **New here?** → [QUICKSTART.md](./QUICKSTART.md)
- **Detailed setup?** → [SETUP_GUIDE.md](./SETUP_GUIDE.md)
- **Full docs?** → [README.md](./README.md)
- **Changelog?** → [CHANGELOG.md](./CHANGELOG.md)

---

## What You're Building

A secure tool to bulk delete GitHub repositories:

✅ OAuth authentication  
✅ Beautiful React UI  
✅ Deployed on Cloudflare Workers (edge computing!)  
✅ Dry-run mode for safety  
✅ Search & filter repos  

---

## Need Help?

Common issues are covered in [SETUP_GUIDE.md](./SETUP_GUIDE.md#troubleshooting)