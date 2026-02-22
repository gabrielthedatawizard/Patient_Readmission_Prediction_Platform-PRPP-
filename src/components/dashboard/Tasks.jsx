import React, { useState } from 'react';
import { 
  CheckCircle, Clock, AlertCircle, Phone, FileText,
  User, Calendar, ChevronRight, Filter, ArrowRight,
  Pill, Home, MessageSquare, Stethoscope
} from 'lucide-react';
import Card from '../common/Card';
import Badge from '../common/Badge';
import Button from '../common/Button';
import { SAMPLE_PATIENTS } from '../../data/patients';

/**
 * Tasks Component
 * Action queue for follow-ups, discharge tasks, and interventions
 */

const Tasks = ({ onPatientSelect }) => {
  const [filter, setFilter] = useState('all'); // all, pending, overdue, completed
  const [priorityFilter, setPriorityFilter] = useState('all');

  // Generate tasks from patient data
  const generateTasks = () => {
    const tasks = [];
    
    SAMPLE_PATIENTS.forEach(patient => {
      // Add intervention tasks
      patient.interventionsNeeded?.forEach((intervention, idx) => {
        if (intervention.status !== 'completed') {
          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + (intervention.priority === 'high' ? 0 : 1));
          
          tasks.push({
            id: `${patient.id}-int-${idx}`,
            type: intervention.type,
            title: getInterventionTitle(intervention.type),
            patient: patient,
            priority: intervention.priority,
            status: intervention.status,
            dueDate: dueDate,
            category: 'intervention'
          });
        }
      });

      // Add follow-up calls based on risk
      if (patient.riskTier === 'High') {
        tasks.push({
          id: `${patient.id}-fu-3`,
          type: 'followup-3day',
          title: '3-Day Follow-up Call',
          patient: patient,
          priority: 'high',
          status: 'scheduled',
          dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          category: 'followup'
        });
      }
    });

    // Sort by priority and due date
    return tasks.sort((a, b) => {
      if (a.priority === 'high' && b.priority !== 'high') return -1;
      if (a.priority !== 'high' && b.priority === 'high') return 1;
      return a.dueDate - b.dueDate;
    });
  };

  const getInterventionTitle = (type) => {
    const titles = {
      'medication-reconciliation': 'Medication Reconciliation',
      'patient-education': 'Patient Education Session',
      'followup-7day': '7-Day Follow-up Call',
      'followup-14day': '14-Day Follow-up Call',
      'caregiver-training': 'Caregiver Training',
      'wound-care-education': 'Wound Care Education',
      'inhaler-technique-education': 'Inhaler Technique Training',
      'community-health-worker-visit': 'CHW Home Visit',
      'mobility-training': 'Mobility Training',
    };
    return titles[type] || type.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getTaskIcon = (category, type) => {
    switch (category) {
      case 'intervention':
        if (type.includes('medication')) return <Pill className="w-5 h-5" />;
        if (type.includes('education') || type.includes('training')) return <MessageSquare className="w-5 h-5" />;
        if (type.includes('chw') || type.includes('home')) return <Home className="w-5 h-5" />;
        return <FileText className="w-5 h-5" />;
      case 'followup':
        return <Phone className="w-5 h-5" />;
      default:
        return <CheckCircle className="w-5 h-5" />;
    }
  };

  const allTasks = generateTasks();

  const filteredTasks = allTasks.filter(task => {
    if (filter === 'pending') return task.status === 'pending' || task.status === 'scheduled';
    if (filter === 'overdue') return new Date() > task.dueDate && task.status !== 'completed';
    if (filter === 'completed') return task.status === 'completed';
    return true;
  }).filter(task => {
    if (priorityFilter === 'all') return true;
    return task.priority === priorityFilter;
  });

  const stats = {
    total: allTasks.length,
    highPriority: allTasks.filter(t => t.priority === 'high' && t.status !== 'completed').length,
    overdue: allTasks.filter(t => new Date() > t.dueDate && t.status !== 'completed').length,
    completed: allTasks.filter(t => t.status === 'completed').length
  };

  const isOverdue = (date) => new Date() > date;

  const formatDueDate = (date) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tasks & Follow-up</h1>
          <p className="text-gray-600 mt-1">Manage interventions and follow-up activities</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" icon={<Filter className="w-4 h-4" />}>
            Filter
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4" hover={false}>
          <p className="text-sm text-gray-500">Total Tasks</p>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </Card>
        <Card className="p-4 bg-red-50/50" hover={false}>
          <p className="text-sm text-red-600">High Priority</p>
          <p className="text-2xl font-bold text-red-700">{stats.highPriority}</p>
        </Card>
        <Card className="p-4 bg-amber-50/50" hover={false}>
          <p className="text-sm text-amber-600">Overdue</p>
          <p className="text-2xl font-bold text-amber-700">{stats.overdue}</p>
        </Card>
        <Card className="p-4 bg-emerald-50/50" hover={false}>
          <p className="text-sm text-emerald-600">Completed</p>
          <p className="text-2xl font-bold text-emerald-700">{stats.completed}</p>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: 'all', label: 'All Tasks' },
          { id: 'pending', label: 'Pending' },
          { id: 'overdue', label: 'Overdue' },
          { id: 'completed', label: 'Completed' }
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filter === f.id
                ? 'bg-teal-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {f.label}
          </button>
        ))}
        <div className="w-px h-8 bg-gray-300 mx-2" />
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-teal-500 outline-none text-sm"
        >
          <option value="all">All Priorities</option>
          <option value="high">High Priority</option>
          <option value="medium">Medium Priority</option>
        </select>
      </div>

      {/* Tasks List */}
      <div className="space-y-3">
        {filteredTasks.map((task) => (
          <Card 
            key={task.id}
            className={`p-4 cursor-pointer transition-all hover:shadow-lg ${
              isOverdue(task.dueDate) && task.status !== 'completed'
                ? 'border-red-300 bg-red-50/30'
                : task.priority === 'high' && task.status !== 'completed'
                ? 'border-amber-300 bg-amber-50/30'
                : ''
            }`}
            onClick={() => onPatientSelect?.(task.patient)}
          >
            <div className="flex items-start gap-4">
              {/* Icon */}
              <div className={`p-3 rounded-xl ${
                task.category === 'followup' ? 'bg-blue-100 text-blue-600' :
                task.priority === 'high' ? 'bg-red-100 text-red-600' :
                'bg-teal-100 text-teal-600'
              }`}>
                {getTaskIcon(task.category, task.type)}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-gray-900">{task.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      <User className="w-4 h-4 inline mr-1" />
                      {task.patient.name}
                      <span className="mx-2">·</span>
                      <Badge variant={task.patient.riskTier.toLowerCase()} size="sm">
                        {task.patient.riskTier} Risk
                      </Badge>
                    </p>
                  </div>
                  <div className="text-right">
                    <div className={`flex items-center gap-1 text-sm font-medium ${
                      isOverdue(task.dueDate) && task.status !== 'completed'
                        ? 'text-red-600'
                        : task.priority === 'high'
                        ? 'text-amber-600'
                        : 'text-gray-600'
                    }`}>
                      {isOverdue(task.dueDate) && task.status !== 'completed' ? (
                        <AlertCircle className="w-4 h-4" />
                      ) : (
                        <Clock className="w-4 h-4" />
                      )}
                      {formatDueDate(task.dueDate)}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {task.patient.ward}
                    </p>
                  </div>
                </div>

                {/* Tags */}
                <div className="flex items-center gap-2 mt-3">
                  <Badge 
                    variant={task.priority === 'high' ? 'danger' : 'warning'}
                    size="sm"
                  >
                    {task.priority} Priority
                  </Badge>
                  {task.status === 'in-progress' && (
                    <Badge variant="primary" size="sm">In Progress</Badge>
                  )}
                  {isOverdue(task.dueDate) && task.status !== 'completed' && (
                    <Badge variant="danger" size="sm">Overdue</Badge>
                  )}
                  <span className="text-xs text-gray-500 ml-auto">
                    {task.patient.id}
                  </span>
                </div>
              </div>

              {/* Arrow */}
              <ChevronRight className="w-5 h-5 text-gray-400 self-center" />
            </div>
          </Card>
        ))}

        {/* Empty State */}
        {filteredTasks.length === 0 && (
          <Card className="p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No tasks found</h3>
            <p className="text-gray-600">All caught up! Check back later for new tasks.</p>
          </Card>
        )}
      </div>

      {/* Today's Schedule */}
      <Card className="p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Today's Schedule</h3>
        <div className="space-y-3">
          <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
            <div className="text-center min-w-16">
              <p className="text-sm font-bold text-gray-900">09:00</p>
              <p className="text-xs text-gray-500">AM</p>
            </div>
            <div className="w-px h-10 bg-gray-300" />
            <div className="flex-1">
              <p className="font-medium text-gray-900">Medication Reconciliation</p>
              <p className="text-sm text-gray-600">Grace Massawe (PT-2025-0856)</p>
            </div>
            <Badge variant="warning">Medium</Badge>
          </div>
          <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
            <div className="text-center min-w-16">
              <p className="text-sm font-bold text-gray-900">11:30</p>
              <p className="text-xs text-gray-500">AM</p>
            </div>
            <div className="w-px h-10 bg-gray-300" />
            <div className="flex-1">
              <p className="font-medium text-gray-900">Patient Education Session</p>
              <p className="text-sm text-gray-600">Amina Mwambungu (PT-2025-0847)</p>
            </div>
            <Badge variant="danger">High</Badge>
          </div>
          <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
            <div className="text-center min-w-16">
              <p className="text-sm font-bold text-gray-900">14:00</p>
              <p className="text-xs text-gray-500">PM</p>
            </div>
            <div className="w-px h-10 bg-gray-300" />
            <div className="flex-1">
              <p className="font-medium text-gray-900">7-Day Follow-up Calls</p>
              <p className="text-sm text-gray-600">12 patients scheduled</p>
            </div>
            <Badge variant="primary">Batch</Badge>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Tasks;
