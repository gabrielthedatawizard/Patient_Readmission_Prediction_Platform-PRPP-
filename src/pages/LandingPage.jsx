import React from 'react';
import { 
  Activity, Shield, Users, TrendingUp, ArrowRight, Check, 
  Heart, Database, Lock, Globe, Clock, Award, Stethoscope,
  Star, Menu, X
} from 'lucide-react';

const LandingPage = ({ onLogin }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const features = [
    {
      icon: Activity,
      title: 'AI-Powered Risk Prediction',
      description: 'Machine learning models analyze patient data to predict readmission risk with 84% accuracy.',
      color: 'from-teal-400 to-teal-600'
    },
    {
      icon: Shield,
      title: 'Clinical Decision Support',
      description: 'Evidence-based recommendations guide discharge planning and intervention strategies.',
      color: 'from-blue-400 to-blue-600'
    },
    {
      icon: Users,
      title: 'Multi-Level Access',
      description: 'Role-based dashboards for clinicians, managers, and health administrators.',
      color: 'from-purple-400 to-purple-600'
    },
    {
      icon: TrendingUp,
      title: 'Real-time Analytics',
      description: 'Track readmission trends, intervention outcomes, and facility benchmarks.',
      color: 'from-emerald-400 to-emerald-600'
    },
    {
      icon: Database,
      title: 'EMR Integration',
      description: 'Seamlessly connects with existing hospital information systems.',
      color: 'from-amber-400 to-amber-600'
    },
    {
      icon: Globe,
      title: 'Multi-language Support',
      description: 'Available in English and Swahili for Tanzania healthcare facilities.',
      color: 'from-pink-400 to-pink-600'
    }
  ];

  const stats = [
    { value: '30%', label: 'Reduction in Readmissions', icon: TrendingUp },
    { value: '150+', label: 'Healthcare Facilities', icon: Building },
    { value: '1M+', label: 'Patients Monitored', icon: Users },
    { value: '84%', label: 'Prediction Accuracy', icon: Award }
  ];

  const testimonials = [
    {
      quote: "TRIP has transformed how we manage patient discharges. The AI predictions help us focus resources on high-risk patients.",
      author: "Dr. Samwel Mhagama",
      role: "Medical Director, Muhimbili Hospital",
      avatar: "SM"
    },
    {
      quote: "We've seen a significant reduction in unplanned readmissions since implementing TRIP across our facilities.",
      author: "Dr. Anna Kavishe",
      role: "Regional Health Coordinator",
      avatar: "AK"
    },
    {
      quote: "The multi-language support and intuitive interface make it accessible for all our healthcare workers.",
      author: "Grace Massawe",
      role: "Nurse Manager, Temeke Hospital",
      avatar: "GM"
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-teal-700 rounded-xl flex items-center justify-center shadow-lg">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">TRIP</span>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-gray-600 hover:text-teal-600 font-medium transition-colors">Features</a>
              <a href="#about" className="text-gray-600 hover:text-teal-600 font-medium transition-colors">About</a>
              <a href="#testimonials" className="text-gray-600 hover:text-teal-600 font-medium transition-colors">Testimonials</a>
              <a href="#contact" className="text-gray-600 hover:text-teal-600 font-medium transition-colors">Contact</a>
            </div>

            {/* CTA Buttons */}
            <div className="hidden md:flex items-center gap-4">
              <button 
                onClick={onLogin}
                className="text-teal-600 font-semibold hover:text-teal-700 transition-colors"
              >
                Sign In
              </button>
              <button 
                onClick={onLogin}
                className="px-5 py-2.5 bg-gradient-to-r from-teal-500 to-teal-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:from-teal-600 hover:to-teal-700 transition-all"
              >
                Get Started
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button 
              className="md:hidden p-2 rounded-lg hover:bg-gray-100"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 px-4 py-4 space-y-3">
            <a href="#features" className="block py-2 text-gray-600 hover:text-teal-600">Features</a>
            <a href="#about" className="block py-2 text-gray-600 hover:text-teal-600">About</a>
            <a href="#testimonials" className="block py-2 text-gray-600 hover:text-teal-600">Testimonials</a>
            <button 
              onClick={onLogin}
              className="w-full py-3 bg-gradient-to-r from-teal-500 to-teal-600 text-white font-semibold rounded-xl mt-4"
            >
              Get Started
            </button>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-32 overflow-hidden">
        {/* Background Decorations */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-teal-400/20 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 -left-40 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 right-1/4 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-teal-50 border border-teal-100 rounded-full mb-8">
              <span className="flex h-2 w-2 rounded-full bg-teal-500 animate-pulse"></span>
              <span className="text-sm font-semibold text-teal-700">
                Ministry of Health, Tanzania
              </span>
            </div>

            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Prevent Readmissions with{' '}
              <span className="bg-gradient-to-r from-teal-500 to-teal-700 bg-clip-text text-transparent">
                AI-Powered Intelligence
              </span>
            </h1>

            <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
              TRIP helps healthcare providers identify high-risk patients, optimize discharge planning, 
              and reduce preventable readmissions across Tanzania.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button 
                onClick={onLogin}
                className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-teal-500 to-teal-600 text-white font-semibold rounded-xl shadow-xl hover:shadow-2xl hover:from-teal-600 hover:to-teal-700 transition-all flex items-center justify-center gap-2"
              >
                Start Free Trial
                <ArrowRight className="w-5 h-5" />
              </button>
              <button className="w-full sm:w-auto px-8 py-4 bg-white text-gray-700 font-semibold rounded-xl border-2 border-gray-200 hover:border-teal-300 hover:bg-teal-50 transition-all flex items-center justify-center gap-2">
                <Stethoscope className="w-5 h-5" />
                Watch Demo
              </button>
            </div>

            {/* Trust Badges */}
            <div className="mt-16 pt-8 border-t border-gray-100">
              <p className="text-sm text-gray-500 mb-6">Trusted by leading healthcare institutions</p>
              <div className="flex flex-wrap items-center justify-center gap-8 opacity-50">
                <div className="flex items-center gap-2 text-xl font-bold text-gray-400">
                  <Building className="w-6 h-6" />
                  MNH
                </div>
                <div className="flex items-center gap-2 text-xl font-bold text-gray-400">
                  <Heart className="w-6 h-6" />
                  Bugando MC
                </div>
                <div className="flex items-center gap-2 text-xl font-bold text-gray-400">
                  <Activity className="w-6 h-6" />
                  Temeke RH
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, idx) => (
              <div key={idx} className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-teal-100 rounded-xl mb-4">
                  <stat.icon className="w-6 h-6 text-teal-600" />
                </div>
                <p className="text-3xl md:text-4xl font-bold text-gray-900 mb-1">{stat.value}</p>
                <p className="text-sm text-gray-600">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Everything You Need to{' '}
              <span className="text-teal-600">Reduce Readmissions</span>
            </h2>
            <p className="text-lg text-gray-600">
              Comprehensive tools designed specifically for Tanzania's healthcare system
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, idx) => (
              <div 
                key={idx} 
                className="group p-8 bg-white rounded-2xl border border-gray-100 hover:border-teal-200 hover:shadow-xl transition-all duration-300"
              >
                <div className={`w-14 h-14 bg-gradient-to-br ${feature.color} rounded-2xl flex items-center justify-center shadow-lg mb-6 group-hover:scale-110 transition-transform`}>
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                Built for Tanzania's{' '}
                <span className="text-teal-600">Healthcare System</span>
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                TRIP (Tanzania Readmission Intelligence Platform) is developed in partnership 
                with the Ministry of Health to address the unique challenges of patient care 
                in Tanzania's diverse healthcare landscape.
              </p>

              <div className="space-y-4">
                {[
                  'HIPAA-compliant data security',
                  'Offline-capable for rural facilities',
                  'Integrated with DHIS2 and national HMIS',
                  '24/7 technical support in English & Swahili'
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-teal-100 rounded-full flex items-center justify-center">
                      <Check className="w-4 h-4 text-teal-600" />
                    </div>
                    <span className="text-gray-700">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-teal-500 to-blue-500 rounded-3xl transform rotate-3 opacity-10"></div>
              <div className="relative bg-white p-8 rounded-3xl shadow-xl">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-teal-700 rounded-2xl flex items-center justify-center">
                    <Activity className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">TRIP Platform</h3>
                    <p className="text-gray-500">Version 2.3.0</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <Clock className="w-5 h-5 text-teal-600" />
                      <span className="text-gray-700">Real-time Monitoring</span>
                    </div>
                    <span className="text-sm font-semibold text-teal-600">Active</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <Lock className="w-5 h-5 text-teal-600" />
                      <span className="text-gray-700">Data Security</span>
                    </div>
                    <span className="text-sm font-semibold text-teal-600">256-bit</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <Database className="w-5 h-5 text-teal-600" />
                      <span className="text-gray-700">Uptime</span>
                    </div>
                    <span className="text-sm font-semibold text-teal-600">99.9%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Trusted by Healthcare{' '}
              <span className="text-teal-600">Professionals</span>
            </h2>
            <p className="text-lg text-gray-600">
              See what healthcare providers across Tanzania say about TRIP
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, idx) => (
              <div 
                key={idx} 
                className="p-8 bg-white rounded-2xl border border-gray-100 hover:shadow-xl transition-shadow"
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-amber-400 fill-current" />
                  ))}
                </div>
                <p className="text-gray-700 mb-6 leading-relaxed">"{testimonial.quote}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-teal-700 rounded-full flex items-center justify-center text-white font-bold">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{testimonial.author}</p>
                    <p className="text-sm text-gray-500">{testimonial.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-teal-500 to-teal-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Reduce Readmissions?
          </h2>
          <p className="text-xl text-teal-100 mb-10">
            Join 150+ healthcare facilities across Tanzania using TRIP to improve patient outcomes.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button 
              onClick={onLogin}
              className="w-full sm:w-auto px-8 py-4 bg-white text-teal-600 font-semibold rounded-xl shadow-xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
            >
              Get Started Now
              <ArrowRight className="w-5 h-5" />
            </button>
            <button className="w-full sm:w-auto px-8 py-4 bg-teal-600 text-white font-semibold rounded-xl border-2 border-teal-400 hover:bg-teal-500 transition-colors">
              Contact Sales
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-teal-700 rounded-xl flex items-center justify-center">
                  <Activity className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold">TRIP</span>
              </div>
              <p className="text-gray-400 text-sm">
                Tanzania Readmission Intelligence Platform - 
                AI-powered healthcare solution for reducing preventable readmissions.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Security</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Integrations</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-white transition-colors">API Reference</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Status</a></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-gray-800 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-gray-500 text-sm">
              © 2025 Ministry of Health, Tanzania. All rights reserved.
            </p>
            <div className="flex items-center gap-6 text-gray-400 text-sm">
              <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-white transition-colors">Cookie Policy</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

// Building icon component
const Building = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
);

export default LandingPage;
