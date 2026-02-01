import React from 'react';

const TaskSkeleton = () => {
  return (
    <div className="animate-pulse bg-card rounded-lg shadow-sm border border-border overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="h-4 bg-muted/60 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-muted/40 rounded w-1/2 mb-3"></div>
            
            <div className="flex items-center space-x-2 mb-3">
              <div className="h-3 w-3 bg-muted/60 rounded-full"></div>
              <div className="h-3 bg-muted/40 rounded w-1/4"></div>
            </div>
            
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 bg-muted/60 rounded-full"></div>
              <div className="h-3 bg-muted/40 rounded w-1/3"></div>
            </div>
          </div>
          
          <div className="flex flex-col items-end space-y-2">
            <div className="h-4 bg-muted/60 rounded w-16"></div>
            <div className="h-3 bg-muted/40 rounded w-12"></div>
          </div>
        </div>
        
        <div className="mt-4 pt-3 border-t border-border/50 flex justify-between items-center">
          <div className="flex space-x-2">
            <div className="h-6 w-16 bg-muted/40 rounded-md"></div>
            <div className="h-6 w-16 bg-muted/40 rounded-md"></div>
          </div>
          <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
        </div>
      </div>
    </div>
  );
};

export default TaskSkeleton;
