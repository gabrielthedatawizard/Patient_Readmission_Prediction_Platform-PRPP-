# TRIP Platform - Deployment Guide

## Overview
This guide covers deploying the TRIP Platform to Vercel (frontend) and a backend hosting service.

## Architecture
- **Frontend**: React app deployed to Vercel
- **Backend**: Node.js/Express API (deploy separately to Render, Railway, or Vercel Serverless)

---

## Step 1: Deploy Frontend to Vercel

### Prerequisites
1. Create a [Vercel account](https://vercel.com/signup) (free)
2. Install Vercel CLI: `npm i -g vercel`
3. Have your GitHub repository ready

### Option A: Deploy via Vercel Dashboard (Recommended)

1. Go to [vercel.com](https://vercel.com)
2. Click **"Add New Project"**
3. Import your GitHub repository:
   - `https://github.com/gabrielthedatawizard/Patient_Readmission_Prediction_Platform-PRPP-`
4. Configure project:
   - **Framework Preset**: Create React App
   - **Root Directory**: `./` (or leave default)
   - **Build Command**: `npm run build`
   - **Output Directory**: `build`
5. Add Environment Variables:
   ```
   REACT_APP_API_URL=https://your-backend-url.com
   ```
6. Click **Deploy**

### Option B: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel --prod
```

---

## Step 2: Deploy Backend

### Option 1: Render (Recommended - Free)

1. Go to [render.com](https://render.com)
2. Sign up with GitHub
3. Click **"New Web Service"**
4. Connect your GitHub repository
5. Configure:
   - **Name**: `trip-platform-api`
   - **Root Directory**: `backend`
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
6. Add Environment Variables:
   ```
   PORT=10000
   NODE_ENV=production
   JWT_SECRET=your_jwt_secret_here
   DATABASE_URL=your_database_url
   ```
7. Click **Create Web Service**
8. Copy the deployed URL (e.g., `https://trip-platform-api.onrender.com`)
9. Update `REACT_APP_API_URL` in Vercel with this URL

### Option 2: Railway

1. Go to [railway.app](https://railway.app)
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Select your repository
5. Add a service and configure the root directory as `backend`
6. Add environment variables
7. Deploy and copy the URL

### Option 3: Vercel Serverless (Advanced)

If you want to deploy both frontend and backend to Vercel:

1. Move backend API to `/api` folder at project root
2. Create `api/index.js` with serverless handler
3. Update `vercel.json` with serverless configuration

---

## Step 3: Configure Custom Domain

### On Vercel:

1. Go to your project dashboard on Vercel
2. Click **"Settings"** → **"Domains"**
3. Enter your domain name:
   - Free Vercel subdomain: `trip-platform.vercel.app`
   - Or custom domain: `trip.yourdomain.com`
4. If using custom domain:
   - Add DNS records as instructed by Vercel
   - Usually a CNAME record pointing to `cname.vercel-dns.com`

### Domain Registration Options:

1. **Free**: Use `your-project.vercel.app`
2. **Vercel Domains**: Buy directly from Vercel ($20/year)
3. **Third-party**: Buy from Namecheap, GoDaddy, Cloudflare:
   - `triphealth.co.tz` (Tanzania domain)
   - `prpp-platform.com`
   - `trip-healthcare.com`

---

## Step 4: Environment Variables Setup

### Frontend (Vercel):
```
REACT_APP_API_URL=https://your-backend-url.com
REACT_APP_ENVIRONMENT=production
```

### Backend (Render/Railway):
```
NODE_ENV=production
PORT=10000
JWT_SECRET=your_super_secret_key_here
CORS_ORIGIN=https://your-vercel-frontend-url.vercel.app
DATABASE_URL=your_mongodb_or_postgres_url
```

---

## Step 5: Post-Deployment Checklist

- [ ] Frontend deployed and accessible
- [ ] Backend deployed and API responding
- [ ] CORS configured on backend to allow frontend domain
- [ ] Environment variables set correctly
- [ ] Login/Logout working
- [ ] Database connected (if applicable)
- [ ] Custom domain configured (optional)
- [ ] SSL/HTTPS working

---

## Troubleshooting

### Build Errors
```bash
# Test build locally
npm run build
```

### CORS Issues
Add to backend `server.js`:
```javascript
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
```

### API Not Connecting
1. Check `REACT_APP_API_URL` is set correctly
2. Ensure backend is running
3. Check browser console for errors

---

## Production URLs

After deployment, update this section:

- **Frontend**: https://your-frontend-url.vercel.app
- **Backend API**: https://your-backend-url.com
- **Custom Domain**: https://trip.yourdomain.com (optional)

---

## Support

For deployment issues:
- Vercel Docs: https://vercel.com/docs
- Render Docs: https://render.com/docs
- Contact: support@trip-platform.com
