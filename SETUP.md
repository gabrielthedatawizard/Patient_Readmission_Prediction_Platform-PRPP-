# TRIP Platform - Setup Guide

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: Version 18.0.0 or higher
- **npm**: Version 9.0.0 or higher (comes with Node.js)
- **Git**: For version control
- **Modern Web Browser**: Chrome, Firefox, Safari, or Edge (latest version)

### Verify Installation

```bash
node --version  # Should show v18.0.0 or higher
npm --version   # Should show 9.0.0 or higher
git --version   # Should show any recent version
```

## Installation Steps

### 1. Clone the Repository

```bash
git clone https://github.com/moh-tanzania/trip-platform.git
cd trip-platform
```

### 2. Install Dependencies

```bash
npm install
```

This will install all required packages including:
- React and React DOM
- Lucide React (icons)
- Recharts (charting)
- Date-fns (date utilities)
- Tailwind CSS (styling)
- And more...

### 3. Environment Configuration

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and configure the following variables:

```env
# API Configuration
REACT_APP_API_URL=http://localhost:8000/api
REACT_APP_ML_API_URL=http://localhost:8001/api

# Authentication
REACT_APP_SSO_ENABLED=false
REACT_APP_SSO_PROVIDER=keycloak
REACT_APP_SSO_URL=

# Feature Flags
REACT_APP_ENABLE_OFFLINE=true
REACT_APP_ENABLE_CHW_MODULE=true
REACT_APP_ENABLE_MODEL_OPS=true

# Analytics
REACT_APP_ANALYTICS_ID=

# Map Configuration (for facility maps)
REACT_APP_MAP_API_KEY=
```

### 4. Start Development Server

```bash
npm start
```

The application will automatically open in your default browser at:
```
http://localhost:3000
```

## Build for Production

### Create Production Build

```bash
npm run build
```

This creates an optimized production build in the `build/` directory.

### Preview Production Build

```bash
npm install -g serve
serve -s build
```

## Development Workflow

### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm test -- --watch
```

### Code Quality

```bash
# Lint code
npm run lint

# Format code
npm run format
```

## Project Structure Overview

```
trip-platform/
├── public/              # Static files
├── src/
│   ├── components/      # React components
│   │   ├── common/      # Reusable components
│   │   ├── auth/        # Authentication
│   │   ├── dashboard/   # Dashboard views
│   │   ├── patient/     # Patient management
│   │   ├── discharge/   # Discharge workflow
│   │   └── analytics/   # Analytics & reports
│   ├── data/           # Sample data
│   ├── hooks/          # Custom hooks
│   ├── utils/          # Utility functions
│   ├── config/         # Configuration
│   └── styles/         # Global styles
└── docs/               # Documentation
```

## Common Issues & Solutions

### Issue: Port 3000 is already in use

**Solution:**
```bash
# Kill the process using port 3000
lsof -ti:3000 | xargs kill -9

# Or use a different port
PORT=3001 npm start
```

### Issue: Module not found errors

**Solution:**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Issue: Styling not appearing correctly

**Solution:**
```bash
# Rebuild Tailwind CSS
npm run build:css
```

## Browser Compatibility

TRIP is tested and supported on:

- **Chrome**: Version 90+
- **Firefox**: Version 88+
- **Safari**: Version 14+
- **Edge**: Version 90+

## Mobile Development

For testing mobile-responsive features:

1. Open Chrome DevTools (F12)
2. Click the device toolbar icon (Ctrl+Shift+M)
3. Select a mobile device or set custom dimensions

## Troubleshooting

### Clear Browser Cache

Sometimes cached files can cause issues:

1. Open DevTools (F12)
2. Right-click the refresh button
3. Select "Empty Cache and Hard Reload"

### Check Console for Errors

1. Open DevTools (F12)
2. Go to Console tab
3. Look for error messages (red text)

### Verify Node Version

```bash
node --version
# If version is < 18, upgrade Node.js
```

## Next Steps

After successful setup:

1. **Explore the Demo**: Use the role selector to see different views
2. **Read the Documentation**: Check `docs/USER_GUIDE.md`
3. **Review Components**: Explore `src/components/`
4. **Customize**: Modify colors in `src/config/colors.js`
5. **Integrate Backend**: See `docs/API_INTEGRATION.md`

## Getting Help

If you encounter issues:

1. Check this documentation
2. Review `docs/` folder for more guides
3. Search GitHub Issues
4. Contact: trip-support@moh.go.tz

## Development Tips

### Hot Reload

The development server supports hot reload. Changes to files will automatically refresh the browser.

### Component Development

Use React DevTools extension for debugging:
- [Chrome](https://chrome.google.com/webstore/detail/react-developer-tools/fmkadmapgofadopljbjfkapdkoienihi)
- [Firefox](https://addons.mozilla.org/en-US/firefox/addon/react-devtools/)

### Code Organization

Follow these patterns:
- One component per file
- Named exports for utilities
- Default export for components
- Keep components small and focused

## Production Deployment

See `docs/DEPLOYMENT.md` for detailed deployment instructions for:
- Government servers (on-premise)
- Cloud platforms (AWS, Azure, GCP)
- Docker containerization
- Kubernetes orchestration

---

**Ready to start developing!** 🚀

For more information, see the main [README.md](../README.md)
