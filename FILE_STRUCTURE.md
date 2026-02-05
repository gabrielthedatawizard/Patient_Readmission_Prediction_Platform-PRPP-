# TRIP Platform - File Structure Guide

## Complete Directory Structure

```
trip-platform/
│
├── README.md                              # Main project documentation
├── package.json                           # NPM dependencies and scripts
├── .env.example                           # Environment variables template
├── .gitignore                             # Git ignore rules
│
├── public/                                # Static public assets
│   ├── index.html                         # HTML entry point
│   ├── manifest.json                      # PWA manifest
│   ├── robots.txt                         # SEO robots file
│   └── assets/                            # Static images and icons
│       ├── logo.png
│       └── favicon.ico
│
├── src/                                   # Source code directory
│   │
│   ├── index.js                           # Application entry point
│   ├── index.css                          # Global styles (Tailwind)
│   ├── App.jsx                            # Root application component
│   │
│   ├── components/                        # React components
│   │   │
│   │   ├── common/                        # Shared reusable components
│   │   │   ├── Button.jsx                 # Button component
│   │   │   ├── Card.jsx                   # Card wrapper component
│   │   │   ├── Badge.jsx                  # Badge/tag component
│   │   │   ├── KPICard.jsx                # KPI metric display card
│   │   │   ├── RiskScoreDisplay.jsx       # Risk score visualization
│   │   │   ├── Navbar.jsx                 # Top navigation bar
│   │   │   ├── Sidebar.jsx                # Side navigation menu
│   │   │   ├── NotificationPanel.jsx      # Notifications dropdown
│   │   │   ├── Modal.jsx                  # Modal dialog
│   │   │   ├── Table.jsx                  # Data table component
│   │   │   ├── Input.jsx                  # Form input component
│   │   │   ├── Select.jsx                 # Dropdown select
│   │   │   ├── Checkbox.jsx               # Checkbox input
│   │   │   ├── Spinner.jsx                # Loading spinner
│   │   │   ├── EmptyState.jsx             # Empty state placeholder
│   │   │   └── ErrorBoundary.jsx          # Error boundary wrapper
│   │   │
│   │   ├── auth/                          # Authentication components
│   │   │   ├── LoginScreen.jsx            # Login page
│   │   │   ├── RoleSelector.jsx           # Role selection component
│   │   │   ├── PrivacyNotice.jsx          # Data use agreement
│   │   │   ├── ForgotPassword.jsx         # Password reset
│   │   │   └── MFAPrompt.jsx              # Multi-factor auth
│   │   │
│   │   ├── dashboard/                     # Dashboard views
│   │   │   ├── Dashboard.jsx              # Main dashboard
│   │   │   ├── DashboardHeader.jsx        # Dashboard header section
│   │   │   ├── KPISection.jsx             # KPI cards section
│   │   │   ├── TodayDischarges.jsx        # Today's discharges list
│   │   │   ├── ActionQueue.jsx            # Priority action queue
│   │   │   ├── RiskDistribution.jsx       # Risk distribution chart
│   │   │   ├── FacilitySelector.jsx       # Facility dropdown
│   │   │   └── DateRangeSelector.jsx      # Date range picker
│   │   │
│   │   ├── patient/                       # Patient management
│   │   │   ├── PatientSearch.jsx          # Patient search/filter
│   │   │   ├── PatientList.jsx            # Patient list view
│   │   │   ├── PatientCard.jsx            # Patient card item
│   │   │   ├── PatientDetail.jsx          # Patient profile page
│   │   │   ├── PatientHeader.jsx          # Patient header section
│   │   │   ├── RiskExplanation.jsx        # AI explanation panel
│   │   │   ├── RiskFactorsList.jsx        # Risk factors display
│   │   │   ├── InterventionPanel.jsx      # Recommended interventions
│   │   │   ├── ClinicalHistory.jsx        # Medical history timeline
│   │   │   ├── VitalsDisplay.jsx          # Vital signs
│   │   │   ├── LabResults.jsx             # Laboratory results
│   │   │   ├── MedicationList.jsx         # Current medications
│   │   │   └── SocialHistory.jsx          # Social determinants
│   │   │
│   │   ├── discharge/                     # Discharge workflow
│   │   │   ├── DischargeWorkflow.jsx      # Main workflow container
│   │   │   ├── ProgressStepper.jsx        # Step indicator
│   │   │   ├── StepNavigation.jsx         # Next/prev buttons
│   │   │   ├── ClinicalReadiness.jsx      # Step 1: Clinical checks
│   │   │   ├── MedicationRecon.jsx        # Step 2: Medication reconciliation
│   │   │   ├── PatientEducation.jsx       # Step 3: Patient education
│   │   │   ├── FollowUpPlan.jsx           # Step 4: Follow-up scheduling
│   │   │   ├── ReferralCommunity.jsx      # Step 5: Referral & community
│   │   │   ├── DischargeSummary.jsx       # Step 6: Summary review
│   │   │   └── DischargeComplete.jsx      # Completion confirmation
│   │   │
│   │   ├── analytics/                     # Analytics & reports
│   │   │   ├── Analytics.jsx              # Main analytics view
│   │   │   ├── FacilityComparison.jsx     # Facility benchmarking table
│   │   │   ├── ModelPerformance.jsx       # ML model metrics
│   │   │   ├── TrendChart.jsx             # Time series charts
│   │   │   ├── RegionalMap.jsx            # Geographic visualization
│   │   │   ├── ExportButton.jsx           # Report export
│   │   │   └── FilterPanel.jsx            # Analytics filters
│   │   │
│   │   ├── tasks/                         # Task management
│   │   │   ├── TaskBoard.jsx              # Kanban task board
│   │   │   ├── TaskList.jsx               # List view of tasks
│   │   │   ├── TaskCard.jsx               # Individual task card
│   │   │   ├── TaskDetail.jsx             # Task detail modal
│   │   │   ├── TaskAssignment.jsx         # Assign task to user
│   │   │   └── FollowUpScheduler.jsx      # Follow-up scheduling
│   │   │
│   │   ├── data-quality/                  # Data quality management
│   │   │   ├── DataQualityDashboard.jsx   # Main DQ dashboard
│   │   │   ├── CompletenessChart.jsx      # Data completeness metrics
│   │   │   ├── MissingDataTable.jsx       # Missing values table
│   │   │   └── DataSourceStatus.jsx       # Integration status
│   │   │
│   │   └── model-ops/                     # ML operations (restricted)
│   │       ├── ModelOpsDashboard.jsx      # Model ops overview
│   │       ├── PerformanceMonitor.jsx     # Performance metrics
│   │       ├── DriftDetection.jsx         # Data drift alerts
│   │       ├── FairnessMetrics.jsx        # Bias/fairness monitoring
│   │       ├── ModelVersions.jsx          # Model version control
│   │       └── AuditLog.jsx               # Audit trail viewer
│   │
│   ├── data/                              # Static data and mocks
│   │   ├── facilities.js                  # Tanzania facilities data
│   │   ├── patients.js                    # Sample patient data
│   │   ├── regions.js                     # Tanzania regions
│   │   ├── roles.js                       # User roles configuration
│   │   ├── interventions.js               # Intervention protocols
│   │   └── mockData.js                    # Mock API responses
│   │
│   ├── hooks/                             # Custom React hooks
│   │   ├── useAuth.js                     # Authentication hook
│   │   ├── usePatient.js                  # Patient data hook
│   │   ├── useTranslation.js              # i18n translation hook
│   │   ├── useFacility.js                 # Facility data hook
│   │   ├── useRiskPrediction.js           # Risk prediction hook
│   │   ├── useAnalytics.js                # Analytics data hook
│   │   ├── useWebSocket.js                # WebSocket connection
│   │   └── useLocalStorage.js             # Local storage helper
│   │
│   ├── utils/                             # Utility functions
│   │   ├── api.js                         # API client
│   │   ├── auth.js                        # Auth utilities
│   │   ├── riskCalculation.js             # Risk score utilities
│   │   ├── dateHelpers.js                 # Date formatting
│   │   ├── exportHelpers.js               # PDF/CSV export
│   │   ├── validation.js                  # Form validation
│   │   ├── formatters.js                  # Data formatters
│   │   ├── constants.js                   # App constants
│   │   └── errorHandler.js                # Error handling
│   │
│   ├── config/                            # Configuration files
│   │   ├── colors.js                      # Design system colors
│   │   ├── translations.js                # i18n translations (EN/SW)
│   │   ├── navigation.js                  # Navigation structure
│   │   ├── permissions.js                 # Role permissions
│   │   └── apiEndpoints.js                # API endpoint configs
│   │
│   ├── styles/                            # Additional styles
│   │   └── tailwind.config.js             # Tailwind CSS config
│   │
│   └── contexts/                          # React contexts
│       ├── AuthContext.jsx                # Authentication context
│       ├── ThemeContext.jsx               # Theme/language context
│       └── PatientContext.jsx             # Patient data context
│
├── docs/                                  # Documentation
│   ├── SETUP.md                           # Setup instructions
│   ├── ARCHITECTURE.md                    # System architecture
│   ├── API_INTEGRATION.md                 # Backend integration guide
│   ├── DEPLOYMENT.md                      # Deployment guide
│   ├── USER_GUIDE.md                      # End-user manual
│   ├── DEVELOPER_GUIDE.md                 # Developer documentation
│   ├── COMPONENT_LIBRARY.md               # Component usage guide
│   ├── DESIGN_SYSTEM.md                   # Design system specs
│   ├── SCREENSHOTS.md                     # UI screenshots
│   └── CHANGELOG.md                       # Version history
│
└── tests/                                 # Test files (future)
    ├── unit/                              # Unit tests
    ├── integration/                       # Integration tests
    └── e2e/                               # End-to-end tests
```

## File Naming Conventions

### Components
- **React Components**: PascalCase (e.g., `PatientDetail.jsx`)
- **CSS Modules**: camelCase with `.module.css` (e.g., `patientDetail.module.css`)

### Utilities & Configs
- **JavaScript files**: camelCase (e.g., `dateHelpers.js`)
- **Config files**: camelCase (e.g., `apiEndpoints.js`)

### Data & Constants
- **Data files**: camelCase (e.g., `facilities.js`)
- **Constants**: UPPER_SNAKE_CASE inside files

### Documentation
- **Markdown files**: UPPERCASE (e.g., `README.md`, `SETUP.md`)

## Import Order Convention

Within each file, organize imports in this order:

```javascript
// 1. External dependencies
import React, { useState } from 'react';
import { AlertCircle } from 'lucide-react';

// 2. Internal components
import Button from '../common/Button';
import Card from '../common/Card';

// 3. Utilities and helpers
import { formatDate } from '../../utils/dateHelpers';
import { apiClient } from '../../utils/api';

// 4. Data and constants
import { SAMPLE_PATIENTS } from '../../data/patients';
import { TRIP_COLORS } from '../../config/colors';

// 5. Styles
import './PatientDetail.css';
```

## Component Structure Template

```javascript
/**
 * ComponentName
 * Brief description of what this component does
 */

import React from 'react';

const ComponentName = ({ 
  prop1, 
  prop2,
  className = '' 
}) => {
  // Hooks
  const [state, setState] = useState(null);
  
  // Event handlers
  const handleClick = () => {
    // Logic here
  };
  
  // Render helpers
  const renderSection = () => {
    return <div>...</div>;
  };
  
  // Main render
  return (
    <div className={className}>
      {/* Component content */}
    </div>
  );
};

export default ComponentName;
```

## Key Files to Start With

When beginning development, focus on these core files:

1. **src/App.jsx** - Main application container
2. **src/components/common/** - Reusable components
3. **src/config/colors.js** - Design system
4. **src/data/facilities.js** - Sample data
5. **src/utils/api.js** - API integration

---

For more information:
- [README.md](../README.md) - Project overview
- [SETUP.md](./SETUP.md) - Installation guide
- [COMPONENT_LIBRARY.md](./COMPONENT_LIBRARY.md) - Component docs
