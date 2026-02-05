import React, { useState } from 'react';
import { 
  Activity, Eye, EyeOff, Lock, Mail, ArrowRight, Shield, 
  Check, Globe, Building, User, AlertCircle, Loader2
} from 'lucide-react';

const LoginPage = ({ onLogin, onBack }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedRole, setSelectedRole] = useState('facility-manager');
  const [currentStep, setCurrentStep] = useState(1);

  const roles = [
    { id: 'moh', label: 'MoH National Admin', icon: Building },
    { id: 'rhmt', label: 'Regional Health Management', icon: Globe },
    { id: 'chmt', label: 'Council/District Health', icon: Building },
    { id: 'facility-manager', label: 'Facility Manager', icon: Building },
    { id: 'clinician', label: 'Clinician (Doctor)', icon: User },
    { id: 'nurse', label: 'Nurse / Discharge Coordinator', icon: User },
    { id: 'pharmacist', label: 'Pharmacist', icon: User },
    { id: 'hro', label: 'Health Records Officer', icon: User },
    { id: 'chw', label: 'Community Health Worker', icon: User },
    { id: 'ml-engineer', label: 'ML Engineer / Data Steward', icon: User }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setIsLoading(false);
    onLogin(selectedRole);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-blue-50 to-purple-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-teal-400/30 rounded-full mix-blend-multiply filter blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-400/30 rounded-full mix-blend-multiply filter blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-400/20 rounded-full mix-blend-multiply filter blur-3xl animate-pulse delay-500"></div>
      </div>

      <div className="w-full max-w-5xl relative z-10">
        <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden flex flex-col lg:flex-row">
          
          {/* Left Side - Image & Info */}
          <div className="lg:w-5/12 bg-gradient-to-br from-teal-500 to-teal-700 p-8 lg:p-12 text-white flex flex-col justify-between relative overflow-hidden">
            {/* Decorative Circles */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full -ml-24 -mb-24"></div>
            
            <div className="relative z-10">
              <button 
                onClick={onBack}
                className="flex items-center gap-2 text-white/80 hover:text-white mb-8 transition-colors"
              >
                <ArrowRight className="w-4 h-4 rotate-180" />
                Back to Home
              </button>

              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                  <Activity className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">TRIP</h2>
                  <p className="text-teal-100 text-sm">Healthcare Intelligence</p>
                </div>
              </div>

              <h3 className="text-3xl font-bold mb-4">
                Welcome Back!
              </h3>
              <p className="text-teal-100 leading-relaxed mb-8">
                Access the Tanzania Readmission Intelligence Platform to monitor patient outcomes, 
                predict readmissions, and improve healthcare delivery.
              </p>

              <div className="space-y-4">
                <div className="flex items-center gap-3 bg-white/10 backdrop-blur rounded-xl p-4">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                    <Check className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-semibold">AI-Powered</p>
                    <p className="text-sm text-teal-100">84% prediction accuracy</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-white/10 backdrop-blur rounded-xl p-4">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-semibold">Secure</p>
                    <p className="text-sm text-teal-100">256-bit encryption</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-white/10 backdrop-blur rounded-xl p-4">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-semibold">Nationwide</p>
                    <p className="text-sm text-teal-100">150+ facilities</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative z-10 mt-8 pt-8 border-t border-white/20">
              <p className="text-sm text-teal-100">
                © 2025 Ministry of Health, Tanzania
              </p>
            </div>
          </div>

          {/* Right Side - Login Form */}
          <div className="lg:w-7/12 p-8 lg:p-12">
            {/* Step Indicator */}
            <div className="flex items-center gap-4 mb-8">
              <div className={`flex items-center gap-2 ${currentStep === 1 ? 'text-teal-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                  currentStep === 1 ? 'bg-teal-100 text-teal-600' : 'bg-gray-100'
                }`}>
                  1
                </div>
                <span className="text-sm font-medium">Select Role</span>
              </div>
              <div className="flex-1 h-px bg-gray-200"></div>
              <div className={`flex items-center gap-2 ${currentStep === 2 ? 'text-teal-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                  currentStep === 2 ? 'bg-teal-100 text-teal-600' : 'bg-gray-100'
                }`}>
                  2
                </div>
                <span className="text-sm font-medium">Sign In</span>
              </div>
            </div>

            {currentStep === 1 ? (
              <div className="animate-fade-in">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Select Your Role</h2>
                <p className="text-gray-600 mb-6">Choose your role to access the appropriate dashboard</p>

                <div className="grid grid-cols-2 gap-3 mb-6">
                  {roles.map((role) => (
                    <button
                      key={role.id}
                      onClick={() => setSelectedRole(role.id)}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        selectedRole === role.id
                          ? 'border-teal-500 bg-teal-50'
                          : 'border-gray-100 hover:border-teal-200 hover:bg-gray-50'
                      }`}
                    >
                      <role.icon className={`w-5 h-5 mb-2 ${
                        selectedRole === role.id ? 'text-teal-600' : 'text-gray-400'
                      }`} />
                      <p className={`text-sm font-semibold ${
                        selectedRole === role.id ? 'text-teal-900' : 'text-gray-700'
                      }`}>
                        {role.label}
                      </p>
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setCurrentStep(2)}
                  className="w-full py-4 bg-gradient-to-r from-teal-500 to-teal-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:from-teal-600 hover:to-teal-700 transition-all flex items-center justify-center gap-2"
                >
                  Continue
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="animate-fade-in">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Sign In</h2>
                <p className="text-gray-600 mb-6">
                  Sign in as <span className="font-semibold text-teal-600">
                    {roles.find(r => r.id === selectedRole)?.label}
                  </span>
                </p>

                {error && (
                  <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700">
                    <AlertCircle className="w-5 h-5" />
                    <p className="text-sm">{error}</p>
                  </div>
                )}

                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Email / Staff ID
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-teal-500 focus:bg-white transition-all outline-none"
                        placeholder="staffid@moh.go.tz"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-12 pr-12 py-4 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-teal-500 focus:bg-white transition-all outline-none"
                        placeholder="••••••••"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-5 h-5 text-teal-600 rounded border-gray-300 focus:ring-teal-500"
                      />
                      <span className="text-sm text-gray-600">Remember me</span>
                    </label>
                    <a href="#" className="text-sm font-semibold text-teal-600 hover:text-teal-700">
                      Forgot password?
                    </a>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-4 bg-gradient-to-r from-teal-500 to-teal-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:from-teal-600 hover:to-teal-700 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      <Lock className="w-5 h-5" />
                      Sign In Securely
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="w-full mt-3 py-3 text-gray-600 font-medium hover:text-gray-800 transition-colors"
                >
                  ← Change Role
                </button>

                <div className="mt-6 pt-6 border-t border-gray-100">
                  <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                    <Shield className="w-5 h-5 text-teal-600" />
                    <p className="text-xs text-gray-600">
                      <span className="font-semibold">MFA Required</span> · SSO Ready · ISO 27001 Compliant
                    </p>
                  </div>
                </div>

                <div className="mt-4 text-center">
                  <p className="text-sm text-gray-500">
                    Need help? <a href="#" className="text-teal-600 font-semibold hover:underline">Contact Support</a>
                  </p>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Language Selector */}
        <div className="mt-6 flex justify-center">
          <select className="px-4 py-2 bg-white/80 backdrop-blur rounded-lg border border-gray-200 text-sm text-gray-600 focus:border-teal-500 outline-none">
            <option value="en">English</option>
            <option value="sw">Kiswahili</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
