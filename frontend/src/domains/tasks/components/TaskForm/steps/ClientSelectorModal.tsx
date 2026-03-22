"use client";

import React, { useState, useMemo } from "react";
import { User, CheckCircle, Search, X } from "lucide-react";
import { Client } from "@/lib/backend";

interface ClientSelectorModalProps {
  clients: Client[];
  selectedClientId?: string;
  onSelect: (client: Client) => void;
  onClose: () => void;
}

export const ClientSelectorModal: React.FC<ClientSelectorModalProps> = ({
  clients,
  selectedClientId,
  onSelect,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredClients = useMemo(() => {
    if (!searchQuery.trim()) return clients;
    const q = searchQuery.toLowerCase();
    return clients.filter(
      (client) =>
        client.name.toLowerCase().includes(q) ||
        (client.email?.toLowerCase().includes(q) ?? false) ||
        (client.phone?.includes(searchQuery) ?? false) ||
        (client.company_name?.toLowerCase().includes(q) ?? false),
    );
  }, [searchQuery, clients]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-muted rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden border border-[hsl(var(--rpma-border))]">
        <div className="p-4 border-b border-[hsl(var(--rpma-border))]">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">
              Sélectionner un client
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
        <div className="p-4">
          <div className="space-y-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Rechercher un client..."
                value={searchQuery}
                className="w-full pl-10 pr-4 py-2 bg-white border border-[hsl(var(--rpma-border))] text-foreground placeholder-muted-foreground rounded-lg focus:ring-2 focus:ring-[hsl(var(--rpma-teal))]/20 focus:border-[hsl(var(--rpma-teal))]"
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Client List */}
            <div className="max-h-60 overflow-y-auto space-y-2">
              {filteredClients.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  {searchQuery
                    ? "Aucun client trouvé pour cette recherche"
                    : "Aucun client disponible"}
                </div>
              ) : (
                filteredClients.map((client: Client) => (
                  <button
                    key={client.id}
                    type="button"
                    onClick={() => onSelect(client)}
                    className="w-full text-left p-3 border border-[hsl(var(--rpma-border))] bg-white rounded-lg hover:bg-muted hover:border-[hsl(var(--rpma-border))]-light transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <User className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-foreground">
                            {client.name}
                          </p>
                          <div className="text-sm text-muted-foreground space-y-1">
                            {client.email && <p>{client.email}</p>}
                            {client.phone && <p>{client.phone}</p>}
                            {client.company_name && (
                              <p className="text-[hsl(var(--rpma-teal))]">
                                {client.company_name}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                      {selectedClientId === client.id && (
                        <CheckCircle className="h-5 w-5 text-[hsl(var(--rpma-teal))]" />
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
