'use client';

import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { LoadingState } from '@/shared/ui/layout/LoadingState';
import { usePerformanceConfig } from '../hooks/usePerformanceConfig';
import { PerformanceConfigForm } from './PerformanceConfigForm';
import { PerformanceConfigCard, PerformanceConfigEmptyState } from './PerformanceConfigCard';

export function PerformanceTab() {
  const {
    performanceConfigs,
    loading,
    saving,
    showCreateDialog,
    setShowCreateDialog,
    editingConfig,
    setEditingConfig,
    activeSubTab,
    setActiveSubTab,
    deleteConfirmOpen,
    setDeleteConfirmOpen,
    configToDelete,
    formData,
    setFormData,
    savePerformanceConfig,
    deletePerformanceConfig,
    confirmDeletePerformanceConfig,
    toggleConfigStatus,
    resetForm,
    openEditDialog,
  } = usePerformanceConfig();

  if (loading) {
    return <LoadingState />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Performance</h2>
          <p className="text-gray-600">
            Gérez les paramètres de performance et d&apos;optimisation
          </p>
        </div>
        <Button onClick={() => { resetForm(); setEditingConfig(null); setShowCreateDialog(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle Configuration
        </Button>
      </div>

      <PerformanceConfigForm
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        editingConfig={editingConfig}
        formData={formData}
        setFormData={setFormData}
        activeSubTab={activeSubTab}
        setActiveSubTab={setActiveSubTab}
        saving={saving}
        onSave={savePerformanceConfig}
      />

      {/* Performance Configs List */}
      <div className="grid gap-4">
        {performanceConfigs.map((config) => (
          <PerformanceConfigCard
            key={config.id}
            config={config}
            onToggleStatus={toggleConfigStatus}
            onEdit={openEditDialog}
            onDelete={confirmDeletePerformanceConfig}
          />
        ))}

        {performanceConfigs.length === 0 && (
          <PerformanceConfigEmptyState onCreateClick={() => setShowCreateDialog(true)} />
        )}
      </div>

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Supprimer la configuration"
        description={`Voulez-vous vraiment supprimer "${configToDelete?.name || 'cette configuration'}" ?`}
        confirmText="Supprimer"
        cancelText="Annuler"
        variant="destructive"
        onConfirm={deletePerformanceConfig}
      />
    </div>
  );
}
