'use client';

import { useState } from 'react';
import { QuoteAttachment, AttachmentType } from '@/types/quote.types';

export interface QuoteAttachmentsManagerProps {
  quoteId: string | null;
  attachments: QuoteAttachment[];
  onRefresh: () => void;
  onCreateAttachment: (data: { file_name: string; file_path: string; file_size: number; mime_type: string; attachment_type?: AttachmentType | null; description?: string | null }) => Promise<QuoteAttachment | null>;
  onUpdateAttachment: (attachmentId: string, data: { description?: string | null; attachment_type?: AttachmentType | null }) => Promise<QuoteAttachment | null>;
  onDeleteAttachment: (attachmentId: string) => Promise<boolean>;
  disabled?: boolean;
}

export function QuoteAttachmentsManager({
  quoteId,
  attachments = [],
  onRefresh,
  onCreateAttachment,
  onUpdateAttachment,
  onDeleteAttachment,
  disabled = false,
}: QuoteAttachmentsManagerProps) {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [editingAttachment, setEditingAttachment] = useState<QuoteAttachment | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadAttachmentType, setUploadAttachmentType] = useState<AttachmentType>('other');
  const [editDescription, setEditDescription] = useState('');
  const [editAttachmentType, setEditAttachmentType] = useState<AttachmentType>('other');
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getAttachmentIcon = (attachmentType: AttachmentType): string => {
    switch (attachmentType) {
      case 'image':
        return '📷';
      case 'document':
        return '📄';
      default:
        return '📎';
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadFile(file);
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      
      if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExt || '')) {
        setUploadAttachmentType('image');
      } else if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt', 'csv'].includes(fileExt || '')) {
        setUploadAttachmentType('document');
      } else {
        setUploadAttachmentType('other');
      }
    }
  };

  const handleUpload = async () => {
    if (!uploadFile || !quoteId) return;

    setIsUploading(true);
    try {
      const file_path = URL.createObjectURL(uploadFile);
      const mime_type = uploadFile.type || 'application/octet-stream';
      
      const newAttachment = await onCreateAttachment({
        file_name: uploadFile.name,
        file_path,
        file_size: uploadFile.size,
        mime_type,
        attachment_type: uploadAttachmentType,
        description: uploadDescription || null,
      });

      if (newAttachment) {
        setShowUploadModal(false);
        setUploadFile(null);
        setUploadDescription('');
        setUploadAttachmentType('other');
        onRefresh();
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleEdit = (attachment: QuoteAttachment) => {
    setEditingAttachment(attachment);
    setEditDescription(attachment.description || '');
    setEditAttachmentType(attachment.attachment_type);
  };

  const handleSaveEdit = async () => {
    if (!editingAttachment || !quoteId) return;

    setIsSaving(true);
    try {
      const updated = await onUpdateAttachment(editingAttachment.id, {
        description: editDescription || null,
        attachment_type: editAttachmentType,
      });

      if (updated) {
        setEditingAttachment(null);
        setEditDescription('');
        setEditAttachmentType('other');
        onRefresh();
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (attachmentId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette pièce jointe ?')) return;
    if (!quoteId) return;

    setIsDeleting(true);
    try {
      const deleted = await onDeleteAttachment(attachmentId);
      if (deleted) {
        onRefresh();
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="rounded-lg border bg-white p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">Pièces jointes</h3>
        <span className="text-xs text-gray-500">
          {attachments.length} {attachments.length === 1 ? 'fichier' : 'fichiers'}
        </span>
      </div>

      {attachments.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p className="text-sm">Aucune pièce jointe</p>
          {!disabled && (
            <button
              onClick={() => setShowUploadModal(true)}
              className="mt-2 text-sm text-blue-600 hover:text-blue-700"
            >
              + Ajouter un fichier
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="flex items-center justify-between rounded-md border border-gray-200 p-3 hover:bg-gray-50"
            >
              <div className="flex items-center gap-3 flex-1">
                <span className="text-2xl">
                  {getAttachmentIcon(attachment.attachment_type)}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {attachment.file_name}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>{formatFileSize(attachment.file_size)}</span>
                    <span>•</span>
                    <span>{formatDate(attachment.created_at)}</span>
                  </div>
                  {attachment.description && (
                    <p className="text-xs text-gray-600 mt-1 truncate">
                      {attachment.description}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleEdit(attachment)}
                  disabled={disabled}
                  className="text-gray-400 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Modifier"
                >
                  ✏️
                </button>
                <button
                  onClick={() => handleDelete(attachment.id)}
                  disabled={disabled || isDeleting}
                  className="text-gray-400 hover:text-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Supprimer"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!disabled && attachments.length > 0 && (
        <button
          onClick={() => setShowUploadModal(true)}
          className="w-full text-sm text-blue-600 hover:text-blue-700 py-2 border-t border-gray-200"
        >
          + Ajouter un fichier
        </button>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h4 className="text-lg font-semibold mb-4">Ajouter une pièce jointe</h4>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fichier
                </label>
                <input
                  type="file"
                  onChange={handleFileSelect}
                  className="w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-full file:border-0
                    file:text-sm file:font-semibold
                    file:bg-blue-50 file:text-blue-700
                    hover:file:bg-blue-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type
                </label>
                <select
                  value={uploadAttachmentType}
                  onChange={(e) => setUploadAttachmentType(e.target.value as AttachmentType)}
                  className="w-full h-9 px-3 py-2 text-sm rounded-md border border-gray-300 bg-white focus:border-blue-500 focus:outline-none"
                >
                  <option value="image">Image</option>
                  <option value="document">Document</option>
                  <option value="other">Autre</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (optionnel)
                </label>
                <textarea
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 bg-white focus:border-blue-500 focus:outline-none"
                  placeholder="Description de la pièce jointe..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadFile(null);
                  setUploadDescription('');
                  setUploadAttachmentType('other');
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
              >
                Annuler
              </button>
              <button
                onClick={handleUpload}
                disabled={!uploadFile || isUploading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploading ? 'Téléchargement...' : 'Ajouter'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingAttachment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h4 className="text-lg font-semibold mb-4">Modifier la pièce jointe</h4>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom du fichier
                </label>
                <input
                  type="text"
                  value={editingAttachment.file_name}
                  disabled
                  className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 bg-gray-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type
                </label>
                <select
                  value={editAttachmentType}
                  onChange={(e) => setEditAttachmentType(e.target.value as AttachmentType)}
                  className="w-full h-9 px-3 py-2 text-sm rounded-md border border-gray-300 bg-white focus:border-blue-500 focus:outline-none"
                >
                  <option value="image">Image</option>
                  <option value="document">Document</option>
                  <option value="other">Autre</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 bg-white focus:border-blue-500 focus:outline-none"
                  placeholder="Description de la pièce jointe..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setEditingAttachment(null);
                  setEditDescription('');
                  setEditAttachmentType('other');
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
              >
                Annuler
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={isSaving}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
