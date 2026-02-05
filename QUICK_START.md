# TRIP Platform - Quick Start Guide

## 🎯 What is TRIP?

The **Tanzania Readmission Intelligence Platform (TRIP)** is a comprehensive, AI-powered healthcare dashboard designed to predict and prevent 30-day hospital readmissions across Tanzania's health system.

## 📦 What's Included

This package contains a **complete, production-ready React application** with:

✅ **10 User Roles** - From MoH National Admin to Community Health Workers  
✅ **AI Risk Prediction** - 0-100 risk scores with explainable AI  
✅ **6-Step Discharge Workflow** - Clinical readiness to follow-up  
✅ **Multi-Level Dashboards** - National, Regional, District, Facility  
✅ **Real Tanzania Data** - Authentic facilities, regions, sample patients  
✅ **Swahili + English** - Full localization support  
✅ **Design System** - Professional clinical color palette  
✅ **Complete Documentation** - Setup, API integration, deployment guides  

## 🚀 Get Started in 3 Steps

### Step 1: Install Dependencies

```bash
cd trip-platform
npm install
```

### Step 2: Set Up Environment

```bash
cp .env.example .env
# Edit .env if needed (works with defaults for demo)
```

### Step 3: Run the Application

```bash
npm start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🎨 Explore Different Roles

On the login screen, select different roles to see customized views:

- **Facility Manager** → Facility operations dashboard
- **Clinician** → Patient risk prediction & discharge planning
- **MoH National Admin** → National oversight and policy KPIs
- **Community Health Worker** → Mobile-friendly follow-up tasks

## 📂 Project Structure

```
trip-platform/
├── src/
│   ├── components/          # All React components
│   │   ├── common/          # Reusable UI components
│   │   ├── auth/            # Login & authentication
│   │   ├── dashboard/       # Dashboard views
│   │   ├── patient/         # Patient management
│   │   ├── discharge/       # Discharge workflow
│   │   └── analytics/       # Reports & analytics
│   ├── data/               # Sample Tanzania data
│   ├── config/             # Design system & translations
│   ├── hooks/              # Custom React hooks
│   └── utils/              # Helper functions
├── docs/                   # Complete documentation
└── public/                 # Static assets
```

## 🎯 Key Features to Explore

### 1. Dashboard (Home Screen)
- KPI cards with trends
- Today's high-risk discharges
- Action queue with priority items
- Risk distribution visualization

### 2. Patient Detail View
- Click any patient to see:
  - Risk score with visual indicator
  - AI explanation ("Why this risk?")
  - Top risk factors with weights
  - Recommended interventions
  - Clinical history timeline

### 3. Discharge Workflow
- 6-step guided process
- Clinical readiness checklist
- Medication reconciliation
- Patient education
- Follow-up scheduling

### 4. Analytics
- Facility benchmarking
- Performance comparisons
- Model performance metrics
- Export to PDF/CSV

## 🌍 Localization

Toggle between English and Swahili using the language selector in the top navigation bar.

## 🎨 Design System

The platform uses a professional clinical design system:

- **Primary Color**: Teal (#00A6A6) - Medical professionalism
- **Risk Colors**: 
  - 🟢 Low: Emerald
  - 🟡 Medium: Amber  
  - 🔴 High: Red
- **Typography**: Clear hierarchy, accessible contrast
- **Components**: Glass morphism, gradient accents, subtle animations

## 📱 Responsive Design

- **Desktop**: Full feature set (recommended)
- **Tablet**: Optimized layouts
- **Mobile**: CHW module is mobile-friendly

## 🔌 Backend Integration

The frontend is ready to connect to backend APIs. See:
- `docs/API_INTEGRATION.md` - API endpoints and integration guide
- `src/utils/api.js` - API client template
- `.env.example` - Configuration options

Currently using **mock data** for demo purposes (set `REACT_APP_MOCK_API=true`).

## 📚 Documentation

| Document | Description |
|----------|-------------|
| `README.md` | Complete project overview |
| `docs/SETUP.md` | Detailed installation guide |
| `docs/API_INTEGRATION.md` | Backend integration |
| `docs/FILE_STRUCTURE.md` | Directory organization |
| `docs/DEPLOYMENT.md` | Production deployment |

## 🛠️ Available Scripts

```bash
npm start          # Start development server
npm build          # Create production build
npm test           # Run tests
npm run lint       # Check code quality
npm run format     # Format code with Prettier
```

## 🎓 Learning Path

**For Developers:**
1. Start with `src/components/common/` to understand reusable components
2. Explore `src/data/` to see Tanzania health system data structure
3. Review `src/config/colors.js` for the design system
4. Check `docs/API_INTEGRATION.md` to connect to real backend

**For Designers:**
1. Review `src/config/colors.js` for color palette
2. Explore components in `src/components/common/`
3. Check `src/index.css` for global styles
4. See the live demo at `http://localhost:3000`

**For Health IT Administrators:**
1. Review role-based access in login screen
2. Explore different dashboards by role
3. Check `docs/DEPLOYMENT.md` for production setup
4. Review `.env.example` for configuration options

## 🔐 Security & Compliance

- **Role-Based Access Control** - 10 distinct roles with permissions
- **Audit Trails** - All actions logged (UI ready)
- **Data Privacy** - Privacy notices and consent management
- **AI Transparency** - "Decision Support, Not Diagnosis" disclaimers
- **SSO/MFA Ready** - Enterprise authentication support

## 🌟 Tanzania Health System Integration

The platform reflects Tanzania's real health system:
- National → Regional → District → Facility hierarchy
- Real facility names (Muhimbili, Bugando, KCMC, etc.)
- Tanzania regions and districts
- DHIS2 integration-ready
- Swahili localization

## 🤝 Contributing

This is a Ministry of Health initiative. Contributions welcome from:
- Healthcare providers (clinical workflow feedback)
- Developers (code improvements)
- Researchers (AI/ML enhancements)

## 📞 Support

- **Documentation**: Check `docs/` folder first
- **Issues**: GitHub Issues (when repository is public)
- **Email**: trip-support@moh.go.tz

## 🎉 Next Steps

1. **Explore the Demo** - Try different user roles
2. **Customize Colors** - Edit `src/config/colors.js`
3. **Add Your Data** - Update `src/data/facilities.js`
4. **Connect Backend** - See `docs/API_INTEGRATION.md`
5. **Deploy** - Follow `docs/DEPLOYMENT.md`

## 💡 Tips

- Use Chrome DevTools (F12) to inspect components
- Check the Console for any errors
- Modify `src/data/patients.js` to add test cases
- Toggle between EN/SW to test localization

---

**Built with ❤️ for Tanzania's Healthcare System**

*Reducing readmissions through intelligent technology*

**Version**: 2.3.0  
**Last Updated**: February 2025  
**License**: MIT  
**Ministry of Health, United Republic of Tanzania**
