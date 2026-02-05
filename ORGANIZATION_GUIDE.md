# Project Organization Guide

## ✅ Done! Your Project is Now Properly Organized

### Frontend Structure
```
frontend/
├── src/                           # React source code
│   ├── components/                # React components
│   │   └── common/               # Reusable components
│   │       ├── Badge.jsx
│   │       ├── Button.jsx
│   │       ├── Card.jsx
│   │       ├── KPICard.jsx
│   │       └── RiskScoreDisplay.jsx
│   ├── config/                   # Configuration files
│   │   ├── colors.js
│   │   └── translations.js
│   ├── data/                     # Static data and mocks
│   │   ├── facilities.js
│   │   └── patients.js
│   ├── styles/                   # Stylesheets
│   │   └── index.css
│   ├── utils/                    # Utility functions (create as needed)
│   ├── hooks/                    # Custom React hooks (create as needed)
│   ├── contexts/                 # React context providers (create as needed)
│   ├── App.jsx                   # Root component
│   └── index.js                  # Entry point
├── public/                        # Static public assets
│   ├── index.html
│   ├── manifest.json
│   └── robots.txt
├── package.json                   # Frontend dependencies
└── .env.example                   # Environment variables template
```

### Backend Structure
```
backend/
├── src/
│   └── routes/                   # API route handlers
│       ├── auth.js              # Authentication endpoints
│       ├── patients.js          # Patient data endpoints
│       └── predictions.js       # ML prediction endpoints
├── server.js                      # Express server entry point
├── package.json                   # Backend dependencies
└── .env.example                   # Environment variables template
```

## 🚀 How to Run

### Option 1: Run Both Frontend & Backend Together (Recommended)

**On Windows:**
```powershell
.\start-dev.bat
```

**On Mac/Linux:**
```bash
chmod +x start-dev.sh
./start-dev.sh
```

### Option 2: Run Separately

**Terminal 1 - Frontend:**
```bash
npm install
npm start
# Frontend will run on http://localhost:3000
```

**Terminal 2 - Backend:**
```bash
cd backend
npm install
npm start
# Backend will run on http://localhost:5000
```

## 📋 Environment Setup

### Frontend (.env)
Copy `.env.example` and customize:
```
REACT_APP_API_BASE_URL=http://localhost:5000
REACT_APP_ENV=development
```

### Backend (.env)
Copy `backend/.env.example` and customize:
```
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/trip-platform
JWT_SECRET=your_secret_key_here
```

## 📝 Next Steps

### Frontend Development
1. **Create Dashboard Components**
   ```
   src/components/dashboard/
   ├── Dashboard.jsx
   ├── KPISection.jsx
   ├── ActionQueue.jsx
   └── RiskDistribution.jsx
   ```

2. **Create Patient Management**
   ```
   src/components/patient/
   ├── PatientList.jsx
   ├── PatientDetail.jsx
   └── PatientSearch.jsx
   ```

3. **Create Authentication**
   ```
   src/components/auth/
   ├── LoginScreen.jsx
   └── PrivacyNotice.jsx
   ```

### Backend Development
1. **Database Models** (MongoDB with Mongoose)
   - User schema
   - Patient schema
   - Prediction schema

2. **API Endpoints**
   - User authentication (login, register)
   - CRUD operations for patients
   - Risk prediction endpoints
   - Analytics and reporting

3. **Integration**
   - Connect to ML model service
   - DHIS2 integration
   - Email notifications

## 🔗 API Documentation

### Frontend Configuration
Update `src/utils/api.js`:
```javascript
export const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';
```

### Backend Endpoints
- **Health**: `GET /api/health`
- **Patients**: `GET/POST /api/patients`
- **Auth**: `POST /api/auth/login`
- **Predictions**: `POST /api/predictions/predict`

## 📦 Dependencies

### Frontend
- React 18.2.0
- React Router DOM 6.20.0
- Tailwind CSS 3.4.0
- Lucide React 0.263.1
- Recharts 2.10.0

### Backend
- Express 4.18.2
- MongoDB/Mongoose
- JWT for authentication
- Helmet for security
- CORS for cross-origin requests

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>
```

### Module Not Found
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Database Connection Issues
- Ensure MongoDB is running on localhost:27017
- Or update `MONGODB_URI` in `backend/.env`

## ✨ Features Ready to Build

- [ ] User authentication & role management
- [ ] Patient risk scoring
- [ ] Dashboard with KPIs
- [ ] Patient search and filtering
- [ ] Discharge workflow
- [ ] Analytics and reporting
- [ ] Follow-up scheduling
- [ ] Data export (PDF/CSV)
- [ ] Offline support
- [ ] Internationalization (Swahili/English)

---

**Happy coding! 🚀**

For more information, see README.md and FILE_STRUCTURE.md
