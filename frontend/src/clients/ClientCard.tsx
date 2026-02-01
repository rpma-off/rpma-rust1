'use client';

import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  User,
  Mail,
  Phone,
  Building,
  MapPin,
  Calendar,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Plus,
  CheckCircle,
  Clock,
  XCircle
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Client, ClientWithTasks, Task } from '@/lib/backend';
import { cn } from '@/lib/utils';

interface ClientCardProps {
  client: Client | ClientWithTasks;
  tasks?: Task[];
  onView?: (client: Client | ClientWithTasks) => void;
  onEdit?: (client: Client | ClientWithTasks) => void;
  onDelete?: (client: Client | ClientWithTasks) => void;
  onCreateTask?: (client: Client | ClientWithTasks) => void;
  showActions?: boolean;
  selectable?: boolean;
  selected?: boolean;
  onSelect?: (client: Client | ClientWithTasks) => void;
  className?: string;
}

export function ClientCard({
  client,
  tasks,
  onView,
  onEdit,
  onDelete,
  onCreateTask,
  showActions = true,
  selectable = false,
  selected = false,
  onSelect,
  className
}: ClientCardProps) {
  const handleCardClick = () => {
    if (selectable && onSelect) {
      onSelect(client);
    } else if (onView) {
      onView(client);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <Card
      className={cn(
        'group relative overflow-hidden bg-gradient-to-br from-zinc-900 to-zinc-800 border-zinc-700/50 hover:border-zinc-600 transition-all duration-300 cursor-pointer hover:shadow-xl hover:shadow-blue-500/10 hover:-translate-y-1',
        selectable && selected && 'ring-2 ring-blue-500 border-blue-500',
        className
      )}
      onClick={handleCardClick}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

       <CardHeader className="pb-3 md:pb-4 relative z-10">
         <div className="flex flex-col gap-3">
           <div className="flex items-start justify-between gap-3">
             <div className="flex items-center gap-3 md:gap-4 min-w-0 flex-1">
               <div className={cn(
                 "p-2 md:p-3 rounded-lg md:rounded-xl shadow-lg transition-shadow duration-300 flex-shrink-0",
                 client.customer_type === 'business'
                   ? "bg-gradient-to-br from-blue-500 to-blue-600 group-hover:shadow-blue-500/25"
                   : "bg-gradient-to-br from-emerald-500 to-emerald-600 group-hover:shadow-emerald-500/25"
               )}>
                 <User className="h-4 w-4 md:h-6 md:w-6 text-white" />
               </div>
               <div className="min-w-0 flex-1">
                 <h3 className="font-bold text-lg md:text-xl text-white mb-1 truncate">{client.name}</h3>
                 {client.company_name && (
                   <p className="text-xs md:text-sm text-zinc-400 flex items-center gap-1 md:gap-2">
                     <Building className="h-3 w-3 md:h-4 md:w-4 text-zinc-500 flex-shrink-0" />
                     <span className="truncate">{client.company_name}</span>
                   </p>
                 )}
               </div>
             </div>

             <div className="flex items-center gap-2 flex-shrink-0">
               {client.customer_type === 'business' && (
                 <div className="inline-flex items-center rounded text-xs font-bold px-1.5 py-0.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white border border-blue-500/50">
                   PRO
                 </div>
               )}

               {showActions && (
                 <DropdownMenu>
                   <DropdownMenuTrigger asChild>
                     <Button
                       variant="ghost"
                       size="sm"
                       className="h-8 w-8 md:h-9 md:w-9 p-0 bg-zinc-800/50 hover:bg-zinc-700 border border-zinc-600/50 hover:border-zinc-500 transition-all duration-200 focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-0"
                     >
                       <MoreVertical className="h-3 w-3 md:h-4 md:w-4 text-zinc-400" />
                     </Button>
                   </DropdownMenuTrigger>
                   <DropdownMenuContent align="end" className="bg-zinc-800 border-zinc-700">
                     {onView && (
                       <DropdownMenuItem
                         onClick={(e) => {
                           e.stopPropagation();
                           onView(client);
                         }}
                         className="text-zinc-300 hover:bg-zinc-700 focus:bg-zinc-700"
                       >
                         <Eye className="h-4 w-4 mr-3" />
                         Voir le profil
                       </DropdownMenuItem>
                     )}
                     {onEdit && (
                       <DropdownMenuItem
                         onClick={(e) => {
                           e.stopPropagation();
                           onEdit(client);
                         }}
                         className="text-zinc-300 hover:bg-zinc-700 focus:bg-zinc-700"
                       >
                         <Edit className="h-4 w-4 mr-3" />
                         Modifier
                       </DropdownMenuItem>
                     )}
                     {onCreateTask && (
                       <DropdownMenuItem
                         onClick={(e) => {
                           e.stopPropagation();
                           onCreateTask(client);
                         }}
                         className="text-zinc-300 hover:bg-zinc-700 focus:bg-zinc-700"
                       >
                         <Plus className="h-4 w-4 mr-3" />
                         Créer une tâche
                       </DropdownMenuItem>
                     )}
                     {onDelete && (
                       <DropdownMenuItem
                         onClick={(e) => {
                           e.stopPropagation();
                           onDelete(client);
                         }}
                         className="text-red-400 hover:bg-red-900/50 focus:bg-red-900/50"
                       >
                         <Trash2 className="h-4 w-4 mr-3" />
                         Supprimer
                       </DropdownMenuItem>
                     )}
                   </DropdownMenuContent>
                 </DropdownMenu>
               )}
             </div>
           </div>
         </div>
       </CardHeader>
      
       <CardContent className="pt-0 relative z-10">
         <div className="space-y-3 md:space-y-4">
           {/* Contact Information */}
           <div className="grid grid-cols-1 gap-2 md:gap-3">
             {client.email && (
               <div className="flex items-center gap-2 md:gap-3 p-2 md:p-3 bg-zinc-800/30 rounded-lg border border-zinc-700/30">
                 <div className="p-1.5 md:p-2 bg-zinc-700/50 rounded-lg flex-shrink-0">
                   <Mail className="h-3 w-3 md:h-4 md:w-4 text-zinc-400" />
                 </div>
                 <div className="min-w-0 flex-1">
                   <p className="text-xs text-zinc-500 uppercase tracking-wide font-medium">Email</p>
                   <p className="text-xs md:text-sm text-zinc-300 truncate">{client.email}</p>
                 </div>
               </div>
             )}

             {client.phone && (
               <div className="flex items-center gap-2 md:gap-3 p-2 md:p-3 bg-zinc-800/30 rounded-lg border border-zinc-700/30">
                 <div className="p-1.5 md:p-2 bg-zinc-700/50 rounded-lg flex-shrink-0">
                   <Phone className="h-3 w-3 md:h-4 md:w-4 text-zinc-400" />
                 </div>
                 <div className="min-w-0 flex-1">
                   <p className="text-xs text-zinc-500 uppercase tracking-wide font-medium">Téléphone</p>
                   <p className="text-xs md:text-sm text-zinc-300">{client.phone}</p>
                 </div>
               </div>
             )}
           </div>

           {/* Footer Information */}
           <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 md:pt-4 border-t border-zinc-700/50">
             <div className="flex items-center gap-2 text-xs md:text-sm text-zinc-400">
               <Calendar className="h-3 w-3 md:h-4 md:w-4 text-zinc-500 flex-shrink-0" />
                <span>Créé le {formatDate(client.created_at as unknown as string)}</span>
             </div>

             {client.total_tasks !== undefined && (
               <div className="flex items-center gap-2">
                 <div className="p-1.5 md:p-2 bg-gradient-to-r from-green-500/10 to-green-600/10 rounded-lg border border-green-500/20">
                   <CheckCircle className="h-3 w-3 md:h-4 md:w-4 text-green-400" />
                 </div>
                 <div className="text-right">
                   <p className="text-xs text-zinc-500 uppercase tracking-wide font-medium">Tâches</p>
                   <p className="text-xs md:text-sm font-semibold text-green-400">{client.total_tasks}</p>
                 </div>
               </div>
             )}
           </div>

          {client.notes && (
            <div className="pt-4 border-t border-zinc-700/50">
              <p className="text-xs text-zinc-500 uppercase tracking-wide font-medium mb-2">Notes</p>
              <p className="text-sm text-zinc-300 line-clamp-2 leading-relaxed">
                {client.notes}
              </p>
            </div>
          )}

          {tasks && tasks.length > 0 && (
            <div className="pt-4 border-t border-zinc-700/50">
              <p className="text-xs text-zinc-500 uppercase tracking-wide font-medium mb-3">Tâches récentes</p>
              <div className="space-y-2">
                {tasks.slice(0, 3).map((task) => (
                  <div key={task.id} className="flex items-center justify-between p-3 bg-zinc-800/20 rounded-lg border border-zinc-700/30 hover:bg-zinc-800/40 transition-colors duration-200">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="flex-shrink-0">
                        {task.status === 'completed' ? (
                          <div className="p-1.5 bg-green-500/10 rounded-lg">
                            <CheckCircle className="h-4 w-4 text-green-400" />
                          </div>
                        ) : task.status === 'in_progress' ? (
                          <div className="p-1.5 bg-blue-500/10 rounded-lg">
                            <Clock className="h-4 w-4 text-blue-400" />
                          </div>
                        ) : (
                          <div className="p-1.5 bg-gray-500/10 rounded-lg">
                            <XCircle className="h-4 w-4 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-zinc-200 truncate">{task.title}</p>
                        <p className="text-xs text-zinc-500 capitalize">
                          {task.status === 'completed' ? 'Terminée' :
                           task.status === 'in_progress' ? 'En cours' : 'En attente'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
     </Card>
   );
 }
