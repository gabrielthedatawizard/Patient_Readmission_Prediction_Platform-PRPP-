/**
 * TRIP Design System - Color Palette
 * Tanzania Readmission Intelligence Platform
 * 
 * Professional clinical color system with accessibility compliance
 */

export const TRIP_COLORS = {
  // Primary Clinical Palette - Sophisticated teal/blue medical system
  primary: {
    50: '#E6F7F7',
    100: '#B3E8E8',
    200: '#80D9D9',
    300: '#4DCACA',
    400: '#26B8B8',
    500: '#00A6A6',
    600: '#008F8F',
    700: '#007878',
    800: '#006161',
    900: '#004A4A'
  },

  // Risk Level Colors - Clinical risk stratification
  risk: {
    low: {
      main: '#10B981',
      bg: '#D1FAE5',
      border: '#6EE7B7',
      text: '#047857'
    },
    medium: {
      main: '#F59E0B',
      bg: '#FEF3C7',
      border: '#FCD34D',
      text: '#B45309'
    },
    high: {
      main: '#EF4444',
      bg: '#FEE2E2',
      border: '#FCA5A5',
      text: '#B91C1C'
    }
  },

  // Neutral Professional Grays
  neutral: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827'
  },

  // Accent Colors - Feature highlights
  accent: {
    purple: '#8B5CF6',
    pink: '#EC4899',
    amber: '#F59E0B',
    emerald: '#10B981',
    sky: '#0EA5E9',
    rose: '#F43F5E',
    indigo: '#6366F1'
  },

  // Semantic Colors - Status indicators
  semantic: {
    success: {
      main: '#10B981',
      bg: '#D1FAE5',
      text: '#047857'
    },
    warning: {
      main: '#F59E0B',
      bg: '#FEF3C7',
      text: '#B45309'
    },
    error: {
      main: '#EF4444',
      bg: '#FEE2E2',
      text: '#B91C1C'
    },
    info: {
      main: '#3B82F6',
      bg: '#DBEAFE',
      text: '#1E40AF'
    }
  },

  // Gradients - Modern visual effects
  gradients: {
    primary: 'linear-gradient(135deg, #00A6A6 0%, #007878 100%)',
    risk: {
      low: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
      medium: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
      high: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)'
    },
    accent: {
      purple: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
      blue: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
      teal: 'linear-gradient(135deg, #14B8A6 0%, #0D9488 100%)'
    }
  },

  // Background patterns
  backgrounds: {
    dashboard: 'linear-gradient(135deg, #F9FAFB 0%, #EFF6FF 50%, #F0FDFA 100%)',
    card: '#FFFFFF',
    subtle: 'linear-gradient(to bottom, #FFFFFF, #F9FAFB)'
  }
};

// Color utility functions
export const getRiskColor = (tier) => {
  const tierLower = tier?.toLowerCase();
  return TRIP_COLORS.risk[tierLower] || TRIP_COLORS.risk.low;
};

export const getRiskGradient = (tier) => {
  const tierLower = tier?.toLowerCase();
  return TRIP_COLORS.gradients.risk[tierLower] || TRIP_COLORS.gradients.risk.low;
};

export default TRIP_COLORS;
