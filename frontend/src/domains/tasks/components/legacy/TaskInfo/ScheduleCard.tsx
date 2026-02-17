import React, { memo } from 'react';
import { Calendar, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import { formatDate } from '@/lib/date-utils';
import { TaskDisplay } from '@/types/task.types';

interface ScheduleCardProps {
  task: TaskDisplay;
}

const ScheduleCard: React.FC<ScheduleCardProps> = ({ task }) => {
  const isPastDue = task.scheduled_date && new Date(task.scheduled_date) < new Date();
  const hasStarted = task.start_time && new Date(task.start_time) <= new Date();
  const isCompleted = task.status === 'completed';

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-5 shadow-sm hover:shadow transition-shadow duration-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-medium text-gray-900 flex items-center">
          <Calendar className="h-5 w-5 text-blue-500 mr-2" />
          Planification
        </h3>
        
        {isPastDue && !isCompleted && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <AlertCircle className="h-3.5 w-3.5 mr-1" />
            En retard
          </span>
        )}
        
        {isCompleted && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="h-3.5 w-3.5 mr-1" />
            Terminé
          </span>
        )}
      </div>
      
      <div className="space-y-4">
        {/* Scheduled Date */}
        <div className="flex items-start">
          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center mr-3">
            <Calendar className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Date prévue</p>
            <p className="text-base font-medium text-gray-900">
              {task.scheduled_date
                ? formatDate(task.scheduled_date, 'EEEE dd MMMM')
                : 'Non définie'}
            </p>
            {task.scheduled_date && (
              <p className="text-sm text-gray-500 mt-0.5">
                {formatDate(task.scheduled_date, 'HH:mm')}
              </p>
            )}
          </div>
        </div>
        
        {/* Time Slots */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Start Time */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="flex items-center text-sm text-gray-500 mb-1">
              <Clock className="h-4 w-4 mr-1.5 text-gray-400" />
              Début
            </div>
            {task.start_time ? (
              <div className="flex items-center">
                <span className="text-sm font-medium text-gray-900">
                  {formatDate(task.start_time, 'HH:mm')}
                </span>
                {hasStarted && !isCompleted && (
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    En cours
                  </span>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">Non commencé</p>
            )}
          </div>
          
          {/* End Time */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="flex items-center text-sm text-gray-500 mb-1">
              <Clock className="h-4 w-4 mr-1.5 text-gray-400" />
              Fin
            </div>
            {task.end_time ? (
              <p className="text-sm font-medium text-gray-900">
                {formatDate(task.end_time, 'HH:mm')}
              </p>
            ) : (
              <p className="text-sm text-gray-500 italic">Non terminé</p>
            )}
          </div>
        </div>
        
        {/* Duration */}
        {task.start_time && task.end_time && (
          <div className="pt-2 border-t border-gray-100">
            <div className="flex items-center text-sm text-gray-500">
              <Clock className="h-4 w-4 mr-1.5 text-gray-400" />
              Durée
            </div>
            <p className="text-sm text-gray-900 font-medium">
              {calculateDuration(task.start_time, task.end_time)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// Helper function to calculate duration between two dates
function calculateDuration(start: string | Date, end: string | Date): string {
  try {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffMs = endDate.getTime() - startDate.getTime();
    
    if (diffMs < 0) return 'Invalide';
    
    const diffMins = Math.round(diffMs / 60000);
    const hours = Math.floor(diffMins / 60);
    const minutes = diffMins % 60;
    
    if (hours > 0) {
      return `${hours}h${minutes > 0 ? ` ${minutes}min` : ''}`.trim();
    }
    return `${minutes} min`;
  } catch (error) {
    console.error('Error calculating duration:', error);
    return 'Inconnue';
  }
}

const ScheduleCardComponent = memo(ScheduleCard);
export { ScheduleCardComponent as ScheduleCard };
export default ScheduleCardComponent;
