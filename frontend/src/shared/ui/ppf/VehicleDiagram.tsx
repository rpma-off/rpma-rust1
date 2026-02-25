'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

export interface Defect {
  id: string;
  zone: string;
  type: 'scratch' | 'dent' | 'chip' | 'paint_issue' | 'crack';
  severity?: 'low' | 'medium' | 'high';
  notes?: string;
}

type DefectSeverity = NonNullable<Defect['severity']>;

interface VehicleDiagramProps {
  defects: Defect[];
  onDefectAdd: (defect: Defect) => void;
  onDefectRemove: (defectId: string) => void;
  readOnly?: boolean;
}

const ZONE_LABELS: Record<string, string> = {
  front_bumper: 'Pare-chocs Avant',
  hood: 'Capot',
  roof: 'Toit',
  trunk: 'Coffre',
  rear_bumper: 'Pare-chocs Arrière',
  left_front_fender: 'Aile AVG',
  right_front_fender: 'Aile AVD',
  left_front_door: 'Porte AVG',
  right_front_door: 'Porte AVD',
  left_rear_door: 'Porte ARG',
  right_rear_door: 'Porte ARD',
  left_rear_fender: 'Aile ARG',
  right_rear_fender: 'Aile ARD',
  windshield: 'Pare-brise',
  rear_window: 'Lunette Arrière'
};

export function VehicleDiagram({ defects, onDefectAdd, onDefectRemove: _onDefectRemove, readOnly = false }: VehicleDiagramProps) {
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [hoveredZone, setHoveredZone] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const [newDefect, setNewDefect] = useState<Partial<Defect>>({
    type: 'scratch',
    severity: 'low',
    notes: ''
  });

  const handleZoneClick = (zone: string) => {
    if (readOnly) return;
    setSelectedZone(zone);
    setNewDefect({ type: 'scratch', severity: 'low', notes: '' });
    setIsDialogOpen(true);
  };

  const handleSaveDefect = () => {
    if (!selectedZone || !newDefect.type) return;

    const defect: Defect = {
      id: `${selectedZone}-${Date.now()}`,
      zone: selectedZone,
      type: newDefect.type,
      severity: newDefect.severity ?? 'low',
      notes: newDefect.notes
    };

    onDefectAdd(defect);
    setIsDialogOpen(false);
    setSelectedZone(null);
  };

  const getZoneStyle = (zoneKey: string) => {
    const zoneDefects = defects.filter(d => d.zone === zoneKey);
    const hasDefects = zoneDefects.length > 0;
    const isCritical = zoneDefects.some(d => d.severity === 'high' || d.type === 'dent');

    const classes = 'transition-all duration-200 cursor-pointer stroke-white/10 hover:stroke-white/30';

    if (hasDefects) {
      return cn(classes, isCritical ? 'fill-red-500/40 hover:fill-red-500/50' : 'fill-orange-500/40 hover:fill-orange-500/50');
    }

    if (hoveredZone === zoneKey) {
      return cn(classes, 'fill-emerald-500/20 stroke-emerald-500/50');
    }

    return cn(classes, 'fill-zinc-800/80');
  };

  return (
    <div className="flex flex-col items-center w-full">
      <div className="w-full flex justify-between items-center mb-4 px-4">
        <div className="text-sm text-zinc-400">
           {hoveredZone ? (
             <span className="text-emerald-400 font-medium transition-all">{ZONE_LABELS[hoveredZone]}</span>
           ) : (
             'Survolez une zone pour commencer'
           )}
        </div>
        <div className="flex gap-3 text-xs text-zinc-500">
          <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-zinc-700" /> Intact</div>
          <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-orange-500/50" /> Défaut</div>
        </div>
      </div>

      <div className="relative w-full max-w-2xl aspect-[2/1] bg-zinc-950/50 rounded-xl border border-white/5 p-4 shadow-2xl">
        <svg
          viewBox="0 0 600 300"
          className="w-full h-full drop-shadow-lg"
          xmlns="http://www.w3.org/2000/svg"
        >
          <g className="pointer-events-none">
             <rect x="85" y="30" width="60" height="20" rx="4" fill="#18181b" />
             <rect x="85" y="250" width="60" height="20" rx="4" fill="#18181b" />
             <rect x="430" y="30" width="60" height="20" rx="4" fill="#18181b" />
             <rect x="430" y="250" width="60" height="20" rx="4" fill="#18181b" />
          </g>

          <g 
            className="transform translate-x-[20px] translate-y-[20px]" 
            onMouseLeave={() => setHoveredZone(null)}
          >
            <path
              d="M 40 70 Q 10 70 10 150 Q 10 230 40 230 L 60 230 L 60 70 Z"
              className={getZoneStyle('front_bumper')}
              onClick={() => handleZoneClick('front_bumper')}
              onMouseEnter={() => setHoveredZone('front_bumper')}
            />

            <path
              d="M 62 70 L 180 80 L 180 220 L 62 230 Z"
              className={getZoneStyle('hood')}
              onClick={() => handleZoneClick('hood')}
              onMouseEnter={() => setHoveredZone('hood')}
            />

            <path
              d="M 182 80 L 230 90 L 230 210 L 182 220 Z"
              className="fill-cyan-900/20 stroke-white/5"
            />

            <path
              d="M 232 90 L 380 90 L 380 210 L 232 210 Z"
              className={getZoneStyle('roof')}
              onClick={() => handleZoneClick('roof')}
              onMouseEnter={() => setHoveredZone('roof')}
            />

            <path
              d="M 382 90 L 430 80 L 430 220 L 382 210 Z"
              className="fill-cyan-900/20 stroke-white/5"
            />

            <path
              d="M 432 80 L 530 85 L 530 215 L 432 220 Z"
              className={getZoneStyle('trunk')}
              onClick={() => handleZoneClick('trunk')}
              onMouseEnter={() => setHoveredZone('trunk')}
            />

            <path
              d="M 532 85 Q 560 85 560 150 Q 560 215 532 215 Z"
              className={getZoneStyle('rear_bumper')}
              onClick={() => handleZoneClick('rear_bumper')}
              onMouseEnter={() => setHoveredZone('rear_bumper')}
            />

            <path
              d="M 60 68 L 180 78 L 180 40 Q 120 40 60 68 Z"
              className={getZoneStyle('left_front_fender')}
              onClick={() => handleZoneClick('left_front_fender')}
              onMouseEnter={() => setHoveredZone('left_front_fender')}
            />
            <path
              d="M 182 78 L 290 88 L 290 40 L 182 40 Z"
              className={getZoneStyle('left_front_door')}
              onClick={() => handleZoneClick('left_front_door')}
              onMouseEnter={() => setHoveredZone('left_front_door')}
            />
             <path
              d="M 292 88 L 390 88 L 390 40 L 292 40 Z"
              className={getZoneStyle('left_rear_door')}
              onClick={() => handleZoneClick('left_rear_door')}
              onMouseEnter={() => setHoveredZone('left_rear_door')}
            />
            <path
              d="M 392 88 L 430 78 L 530 83 L 530 55 Q 460 40 392 40 Z"
              className={getZoneStyle('left_rear_fender')}
              onClick={() => handleZoneClick('left_rear_fender')}
              onMouseEnter={() => setHoveredZone('left_rear_fender')}
            />

            <path
              d="M 60 232 L 180 222 L 180 260 Q 120 260 60 232 Z"
              className={getZoneStyle('right_front_fender')}
              onClick={() => handleZoneClick('right_front_fender')}
              onMouseEnter={() => setHoveredZone('right_front_fender')}
            />
             <path
              d="M 182 222 L 290 212 L 290 260 L 182 260 Z"
              className={getZoneStyle('right_front_door')}
              onClick={() => handleZoneClick('right_front_door')}
              onMouseEnter={() => setHoveredZone('right_front_door')}
            />
             <path
              d="M 292 212 L 390 212 L 390 260 L 292 260 Z"
              className={getZoneStyle('right_rear_door')}
              onClick={() => handleZoneClick('right_rear_door')}
              onMouseEnter={() => setHoveredZone('right_rear_door')}
            />
            <path
              d="M 392 212 L 430 222 L 530 217 L 530 245 Q 460 260 392 260 Z"
              className={getZoneStyle('right_rear_fender')}
              onClick={() => handleZoneClick('right_rear_fender')}
              onMouseEnter={() => setHoveredZone('right_rear_fender')}
            />

          </g>
        </svg>

        <div className="absolute top-2 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none opacity-50">
          <span className="text-[10px] uppercase tracking-widest text-zinc-500">Avant</span>
          <div className="w-px h-4 bg-gradient-to-b from-zinc-500 to-transparent"></div>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px] bg-[#121212] border-zinc-800 text-zinc-100">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-500" />
              Signaler un défaut : {selectedZone ? ZONE_LABELS[selectedZone] : ''}
            </DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="type" className="text-zinc-400">Type de dommage</Label>
              <Select
                value={newDefect.type}
                onValueChange={(v: Defect['type']) => setNewDefect({ ...newDefect, type: v })}
              >
                <SelectTrigger className="bg-zinc-900 border-zinc-700 focus:ring-emerald-600">
                  <SelectValue placeholder="Sélectionner le type" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-200">
                  <SelectItem value="scratch">Rayure</SelectItem>
                  <SelectItem value="dent">Bosselure</SelectItem>
                  <SelectItem value="chip">Éclat de peinture</SelectItem>
                  <SelectItem value="paint_issue">Défaut vernis</SelectItem>
                  <SelectItem value="crack">Fissure</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label className="text-zinc-400">Gravité</Label>
              <div className="flex gap-2">
                {(['low', 'medium', 'high'] as const).map((sev: DefectSeverity) => (
                  <button
                    key={sev}
                    onClick={() => setNewDefect({ ...newDefect, severity: sev })}
                    className={cn(
                      'flex-1 py-2 text-xs uppercase tracking-wider rounded border transition-colors',
                      newDefect.severity === sev 
                        ? 'bg-zinc-800 border-emerald-500 text-emerald-400' 
                        : 'bg-transparent border-zinc-700 text-zinc-500 hover:bg-zinc-900'
                    )}
                  >
                    {sev === 'low' ? 'Léger' : sev === 'medium' ? 'Moyen' : 'Grave'}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="notes" className="text-zinc-400">Notes</Label>
              <Textarea
                id="notes"
                className="bg-zinc-900 border-zinc-700 focus:ring-emerald-600 min-h-[100px]"
                placeholder="Description détaillée..."
                value={newDefect.notes}
                onChange={(e) => setNewDefect({ ...newDefect, notes: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Annuler
            </Button>
            <Button variant="default" onClick={handleSaveDefect}>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
