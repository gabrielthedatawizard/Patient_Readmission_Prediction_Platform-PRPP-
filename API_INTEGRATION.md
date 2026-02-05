# TRIP Platform - API Integration Guide

## Overview

This guide explains how to integrate TRIP's frontend with backend services including:
- Risk prediction ML API
- Electronic Medical Records (EMR)
- DHIS2 health information system
- Authentication services
- Database systems

## Architecture Overview

```
┌─────────────────┐
│   TRIP React    │
│    Frontend     │
└────────┬────────┘
         │
         ├─────────────────┐
         │                 │
    ┌────▼─────┐     ┌────▼────────┐
    │   API    │     │   Auth      │
    │ Gateway  │     │  Service    │
    └────┬─────┘     └─────────────┘
         │
    ┌────┴────────────────────┐
    │                         │
┌───▼──────┐          ┌──────▼─────┐
│  ML API  │          │   EMR/     │
│  (Risk)  │          │   DHIS2    │
└──────────┘          └────────────┘
```

## API Endpoints

### 1. Authentication API

#### Login
```javascript
POST /api/auth/login
Content-Type: application/json

{
  "username": "staff123",
  "password": "********",
  "facilityId": "FAC-001"
}

// Response
{
  "token": "eyJhbGc...",
  "refreshToken": "refresh_token",
  "user": {
    "id": "USER-001",
    "name": "Dr. Samwel Mhagama",
    "role": "clinician",
    "facility": "FAC-001",
    "permissions": ["view_patients", "discharge_patients"]
  }
}
```

#### SSO Integration (Keycloak)
```javascript
GET /api/auth/sso/login?provider=keycloak&redirect=/dashboard

// User is redirected to SSO provider
// On success, redirected back with token
```

### 2. Patient API

#### Get Patient List
```javascript
GET /api/patients?facility=FAC-001&status=active&limit=50&offset=0
Authorization: Bearer {token}

// Response
{
  "total": 234,
  "patients": [
    {
      "id": "PT-2025-0847",
      "mrn": "MNH-847392",
      "name": "Amina Mwambungu",
      "age": 67,
      "gender": "Female",
      "ward": "Medical Ward B",
      "admissionDate": "2025-01-20",
      "riskScore": 78,
      "riskTier": "High"
    }
  ]
}
```

#### Get Patient Details
```javascript
GET /api/patients/{patientId}
Authorization: Bearer {token}

// Response includes full patient data
{
  "id": "PT-2025-0847",
  "demographics": {...},
  "vitals": {...},
  "labs": {...},
  "medications": [...],
  "admissions": [...],
  "riskScore": 78,
  "riskFactors": [...],
  "interventions": [...]
}
```

### 3. Risk Prediction API

#### Get Risk Prediction
```javascript
POST /api/ml/predict
Authorization: Bearer {token}
Content-Type: application/json

{
  "patientId": "PT-2025-0847",
  "features": {
    "age": 67,
    "priorAdmissions": 3,
    "lengthOfStay": 12,
    "comorbidities": ["diabetes", "heart_failure"],
    "labs": {
      "creatinine": 1.8,
      "hba1c": null
    }
  }
}

// Response
{
  "patientId": "PT-2025-0847",
  "riskScore": 78,
  "riskTier": "High",
  "confidence": 0.87,
  "modelVersion": "TRIP-v2.3",
  "explanation": {
    "topFactors": [
      {
        "feature": "priorAdmissions",
        "contribution": 0.35,
        "description": "Multiple prior admissions"
      }
    ]
  },
  "dataQuality": {
    "completeness": 0.85,
    "missingFields": ["hba1c", "egfr"]
  }
}
```

#### Batch Predictions
```javascript
POST /api/ml/predict/batch
Authorization: Bearer {token}

{
  "patientIds": ["PT-2025-0847", "PT-2025-0921", "PT-2025-0856"]
}

// Returns array of predictions
```

### 4. Discharge Workflow API

#### Create Discharge Plan
```javascript
POST /api/discharge/plans
Authorization: Bearer {token}

{
  "patientId": "PT-2025-0847",
  "expectedDischargeDate": "2025-02-02",
  "dischargeDestination": "home",
  "clinicalReadiness": {
    "vitalsStable": true,
    "painControlled": true,
    "labsAcceptable": true
  },
  "medications": [...],
  "followUp": {
    "sevenDay": {
      "type": "phone",
      "scheduled": "2025-02-09"
    }
  }
}
```

#### Update Discharge Step
```javascript
PUT /api/discharge/plans/{planId}/steps/{stepId}
Authorization: Bearer {token}

{
  "status": "completed",
  "completedBy": "USER-001",
  "completedAt": "2025-02-01T14:30:00Z",
  "notes": "Patient education completed in Swahili"
}
```

### 5. Analytics API

#### Get Facility Statistics
```javascript
GET /api/analytics/facility/{facilityId}?dateFrom=2025-01-01&dateTo=2025-01-31
Authorization: Bearer {token}

// Response
{
  "facilityId": "FAC-001",
  "period": "2025-01-01 to 2025-01-31",
  "metrics": {
    "totalDischarges": 217,
    "readmissionRate": 0.084,
    "avgLengthOfStay": 4.8,
    "highRiskDischarges": 23,
    "interventionCompletionRate": 0.92
  },
  "trends": {
    "readmissionRate": -0.021  // Improvement
  }
}
```

#### Get Regional Comparison
```javascript
GET /api/analytics/regional-comparison?region=Dar%20es%20Salaam
Authorization: Bearer {token}

// Returns comparison across facilities in region
```

### 6. Model Operations API

#### Get Model Performance
```javascript
GET /api/ml/models/current/performance
Authorization: Bearer {token}

// Response
{
  "modelId": "TRIP-v2.3",
  "deployed": "2025-01-15",
  "performance": {
    "auc": 0.84,
    "sensitivity": 0.78,
    "specificity": 0.82,
    "calibration": "good"
  },
  "drift": {
    "status": "stable",
    "lastCheck": "2025-02-01"
  },
  "fairness": {
    "genderParity": 0.96,
    "ageParity": 0.94
  }
}
```

### 7. DHIS2 Integration

#### Sync Facility Data
```javascript
POST /api/integrations/dhis2/sync
Authorization: Bearer {token}

{
  "facilityId": "FAC-001",
  "dataElements": ["admissions", "discharges", "readmissions"],
  "period": "2025-01"
}
```

## Frontend Integration Examples

### Using Fetch API

```javascript
// src/utils/api.js
const API_BASE_URL = process.env.REACT_APP_API_URL;

export const apiClient = {
  async get(endpoint, options = {}) {
    const token = localStorage.getItem('authToken');
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
    
    return response.json();
  },

  async post(endpoint, data, options = {}) {
    const token = localStorage.getItem('authToken');
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
    
    return response.json();
  }
};
```

### React Hook Example

```javascript
// src/hooks/usePatient.js
import { useState, useEffect } from 'react';
import { apiClient } from '../utils/api';

export const usePatient = (patientId) => {
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPatient = async () => {
      try {
        setLoading(true);
        const data = await apiClient.get(`/patients/${patientId}`);
        setPatient(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (patientId) {
      fetchPatient();
    }
  }, [patientId]);

  return { patient, loading, error };
};
```

### Component Usage

```javascript
// src/components/patient/PatientDetail.jsx
import React from 'react';
import { usePatient } from '../../hooks/usePatient';

const PatientDetail = ({ patientId }) => {
  const { patient, loading, error } = usePatient(patientId);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!patient) return <div>Patient not found</div>;

  return (
    <div>
      <h1>{patient.name}</h1>
      <p>Risk Score: {patient.riskScore}</p>
      {/* ... rest of component */}
    </div>
  );
};
```

## Error Handling

```javascript
// src/utils/errorHandler.js
export class APIError extends Error {
  constructor(message, status, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export const handleAPIError = (error) => {
  if (error.status === 401) {
    // Unauthorized - redirect to login
    localStorage.removeItem('authToken');
    window.location.href = '/login';
  } else if (error.status === 403) {
    // Forbidden - show permission error
    return 'You do not have permission to access this resource';
  } else if (error.status >= 500) {
    // Server error
    return 'Server error. Please try again later.';
  }
  return error.message;
};
```

## Authentication Flow

```javascript
// src/utils/auth.js
export const authService = {
  async login(username, password, facilityId) {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, facilityId })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.user));
      return data.user;
    } else {
      throw new Error(data.message || 'Login failed');
    }
  },

  async refreshToken() {
    const refreshToken = localStorage.getItem('refreshToken');
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });
    
    const data = await response.json();
    localStorage.setItem('authToken', data.token);
    return data.token;
  },

  logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    window.location.href = '/login';
  },

  getCurrentUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }
};
```

## WebSocket for Real-Time Updates

```javascript
// src/utils/websocket.js
export class WebSocketClient {
  constructor(url) {
    this.url = url;
    this.ws = null;
    this.handlers = {};
  }

  connect(token) {
    this.ws = new WebSocket(`${this.url}?token=${token}`);
    
    this.ws.onopen = () => {
      console.log('WebSocket connected');
    };

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (this.handlers[data.type]) {
        this.handlers[data.type](data.payload);
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  on(eventType, handler) {
    this.handlers[eventType] = handler;
  }

  send(type, payload) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, payload }));
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

// Usage
const ws = new WebSocketClient('ws://localhost:8000/ws');
ws.connect(authToken);
ws.on('risk_update', (data) => {
  console.log('Risk score updated:', data);
});
```

## Rate Limiting & Caching

```javascript
// src/utils/cache.js
class APICache {
  constructor(ttl = 300000) { // 5 minutes default
    this.cache = new Map();
    this.ttl = ttl;
  }

  set(key, value) {
    this.cache.set(key, {
      value,
      timestamp: Date.now()
    });
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }

  clear() {
    this.cache.clear();
  }
}

export const apiCache = new APICache();
```

## Testing API Integration

```javascript
// src/__tests__/api.test.js
import { apiClient } from '../utils/api';

// Mock fetch
global.fetch = jest.fn();

describe('API Client', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  test('GET request with auth token', async () => {
    const mockResponse = { id: '1', name: 'Test' };
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    const result = await apiClient.get('/patients/1');
    
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/patients/1'),
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          'Authorization': expect.stringContaining('Bearer')
        })
      })
    );
    
    expect(result).toEqual(mockResponse);
  });
});
```

## Production Considerations

### API Gateway Configuration
- Use API gateway for rate limiting
- Implement request/response logging
- Set up monitoring and alerts

### Security
- Always use HTTPS in production
- Implement CORS properly
- Validate all inputs
- Use secure token storage
- Implement request signing

### Performance
- Use connection pooling
- Implement request batching
- Cache frequently accessed data
- Use compression (gzip)
- Implement pagination

---

For more information, see:
- [SETUP.md](./SETUP.md) - Installation guide
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Deployment instructions
- Backend API documentation (when available)
