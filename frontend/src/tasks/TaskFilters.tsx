import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type TaskFiltersProps = {
  filters: {
    status: string;
    technicianId: string;
    ppfZone: string;
  };
  onFilterChange: (filters: {
    status: string;
    technicianId: string;
    ppfZone: string;
  }) => void;
};

export function TaskFilters({ filters, onFilterChange }: TaskFiltersProps) {
  // These would typically come from your API or context
  const statusOptions: { value: string; label: string }[] = [
    { value: 'all', label: 'All Statuses' },
    { value: 'pending', label: 'Pending' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'invalid', label: 'Invalid' },
    { value: 'archived', label: 'Archived' },
  ];

  // Mock data - replace with actual data from your API
  const technicianOptions = [
    { id: '1', name: 'John Doe' },
    { id: '2', name: 'Jane Smith' },
    { id: '3', name: 'Mike Johnson' },
  ];

  const ppfZoneOptions = [
    'Front Bumper',
    'Full Front',
    'Full Car',
    'Hood',
    'Fenders',
    'Mirrors',
    'A-Pillars',
    'Rockers',
    'Door Cups',
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
        <Select
          value={filters.status}
          onValueChange={(value) =>
            onFilterChange({ ...filters, status: value })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="technician">Technician</Label>
          <Select
            value={filters.technicianId || 'all'}
            onValueChange={(value) =>
              onFilterChange({ ...filters, technicianId: value === 'all' ? '' : value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="All Technicians" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Technicians</SelectItem>
              {technicianOptions.map((tech) => (
                <SelectItem key={tech.id} value={tech.id}>
                  {tech.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="ppfZone">PPF Zone</Label>
          <Select
            value={filters.ppfZone || 'all'}
            onValueChange={(value) =>
              onFilterChange({ ...filters, ppfZone: value === 'all' ? '' : value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="All Zones" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Zones</SelectItem>
              {ppfZoneOptions.map((zone) => (
                <SelectItem key={zone} value={zone}>
                  {zone}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
      </div>
    </div>
  );
}
