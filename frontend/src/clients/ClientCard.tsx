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
        'group relative overflow-hidden bg-white border-border/20 hover:border-accent/30 transition-all duration-300 cursor-pointer hover:shadow-sm',
        selectable && selected && 'ring-2 ring-accent/50 border-accent',
        className
      )}
      onClick={handleCardClick}
    >

       <CardHeader className="pb-3 md:pb-4 relative z-10">
         <div className="flex flex-col gap-3">
           <div className="flex items-start justify-between gap-3">
             <div className="flex items-center gap-3 md:gap-4 min-w-0 flex-1">
               <div className={cn(
                 "p-2 md:p-3 rounded-lg md:rounded-xl border border-border/10 bg-muted/10 flex-shrink-0"
               )}>
                 <User className="h-4 w-4 md:h-6 md:w-6 text-foreground" />
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
                  <div className="inline-flex items-center rounded text-xs font-bold px-1.5 py-0.5 bg-accent/10 border border-accent/30 text-accent">
                    PRO
                  </div>
                )}

               {showActions && (
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 md:h-9 md:w-9 p-0 bg-muted/10 hover:bg-muted/20 border border-border/20 hover:border-border transition-all duration-200"
                      >
                        <MoreVertical className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-white border-border/20">
                      {onView && (
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            onView(client);
                          }}
                          className="text-foreground hover:bg-muted/10 focus:bg-muted/10"
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
                          className="text-foreground hover:bg-muted/10 focus:bg-muted/10"
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
                          className="text-foreground hover:bg-muted/10 focus:bg-muted/10"
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
                          className="text-error hover:bg-error/10 focus:bg-error/10"
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
                <div className="flex items-center gap-2 md:gap-3 p-2 md:p-3 bg-muted/5 border border-border/10 rounded-lg">
                  <div className="p-1.5 md:p-2 bg-muted/10 rounded-lg flex-shrink-0">
                    <Mail className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Email</p>
                    <p className="text-xs md:text-sm text-foreground truncate">{client.email}</p>
                  </div>
                </div>
              )}

              {client.phone && (
                <div className="flex items-center gap-2 md:gap-3 p-2 md:p-3 bg-muted/5 border border-border/10 rounded-lg">
                  <div className="p-1.5 md:p-2 bg-muted/10 rounded-lg flex-shrink-0">
                    <Phone className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Téléphone</p>
                    <p className="text-xs md:text-sm text-foreground">{client.phone}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Information */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 md:pt-4 border-t border-border/10">
              <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground">
                <Calendar className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground flex-shrink-0" />
                 <span>Créé le {formatDate(client.created_at as unknown as string)}</span>
              </div>

              {client.total_tasks !== undefined && (
                <div className="flex items-center gap-2">
                  <div className="p-1.5 md:p-2 bg-accent/10 border border-accent/30 rounded-lg">
                    <CheckCircle className="h-3 w-3 md:h-4 md:w-4 text-accent" />
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Tâches</p>
                    <p className="text-xs md:text-sm font-semibold text-foreground">{client.total_tasks}</p>
                  </div>
                </div>
              )}
            </div>

          {client.notes && (
            <div className="pt-4 border-t border-border/10">
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-2">Notes</p>
              <p className="text-sm text-foreground line-clamp-2 leading-relaxed">
                {client.notes}
              </p>
            </div>
          )}

          {tasks && tasks.length > 0 && (
            <div className="pt-4 border-t border-border/10">
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-3">Tâches récentes</p>
              <div className="space-y-2">
                {tasks.slice(0, 3).map((task) => (
                  <div key={task.id} className="flex items-center justify-between p-3 bg-muted/5 border border-border/10 hover:bg-muted/10 hover:border-border/20 transition-colors duration-200 rounded-lg">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="flex-shrink-0">
                        {task.status === 'completed' ? (
                          <div className="p-1.5 bg-accent/10 border border-accent/30 rounded-lg">
                            <CheckCircle className="h-4 w-4 text-accent" />
                          </div>
                        ) : task.status === 'in_progress' ? (
                          <div className="p-1.5 bg-accent/10 border border-accent/30 rounded-lg">
                            <Clock className="h-4 w-4 text-accent" />
                          </div>
                        ) : (
                          <div className="p-1.5 bg-muted/10 border border-border/10 rounded-lg">
                            <XCircle className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">{task.title}</p>
                        <p className="text-xs text-muted-foreground capitalize">
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
