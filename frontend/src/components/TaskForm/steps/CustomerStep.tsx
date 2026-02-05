"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  User,
  Info,
  CheckCircle,
  AlertCircle,
  Phone,
  Mail,
  MapPin,
  Plus,
  Search,
  X,
} from "lucide-react";
import { FormStepProps } from "../types";

import { Client } from "@/lib/backend";
// Legacy service imports removed - now using API routes

export const CustomerStep: React.FC<FormStepProps> = ({
  formData,
  onChange,
  errors = {},
  isLoading = false,
  sessionToken,
}) => {
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showClientSelector, setShowClientSelector] = useState(false);
  const [useExistingClient, setUseExistingClient] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch clients using TanStack Query
  const { data: clientsData = [] } = useQuery({
    queryKey: ['clients', sessionToken],
    queryFn: async () => {
      const { ipcClient } = await import('@/lib/ipc');
      const clientListResponse = await ipcClient.clients.list({
        page: 1,
        limit: 100,
        sort_by: 'name',
        sort_order: 'asc'
      }, sessionToken!);
      return clientListResponse.data || [];
    },
    enabled: !!sessionToken,
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch pre-filled client if needed
  const { data: prefilledClient } = useQuery({
    queryKey: ['client', formData.client_id, sessionToken],
    queryFn: async () => {
      const { ipcClient } = await import('@/lib/ipc');
      return await ipcClient.clients.get(formData.client_id!, sessionToken!);
    },
    enabled: !!formData.client_id && !!sessionToken && !clientsData.find((c: Client) => c.id === formData.client_id),
    retry: 1,
    staleTime: 5 * 60 * 1000,
  });

  // Use query data for clients
  const clients = clientsData;

  // Focus on the first field with error
  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      const firstErrorField = Object.keys(errors)[0];
      const element = document.querySelector(`[name="${firstErrorField}"]`);
      if (element) {
        (element as HTMLElement).focus();
      }
    }
  }, [errors]);



  // Handle pre-filled client_id
  useEffect(() => {
    const client = prefilledClient || clients.find((c: Client) => c.id === formData.client_id);
    if (client && !selectedClient) {
      setSelectedClient(client);
      setUseExistingClient(true);
      // Pre-fill customer information
      onChange({
        customer_name: client.name,
        customer_email: client.email || '',
        customer_phone: client.phone || '',
        customer_address: client.address_street ? `${client.address_street}, ${client.address_city || ''} ${client.address_zip || ''}`.trim() : '',
      });
    }
  }, [formData.client_id, clients, prefilledClient, selectedClient, onChange]); // Keep onChange but ensure it's stable

  // Filter clients based on search query
  const filteredClients = useMemo(() => {
    if (!searchQuery.trim()) {
      return clients;
    } else {
      return clients.filter(
        (client: Client) =>
          client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (client.email &&
            client.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (client.phone && client.phone.includes(searchQuery)) ||
          (client.company_name &&
            client.company_name
              .toLowerCase()
              .includes(searchQuery.toLowerCase())),
      );
    }
  }, [searchQuery, clients]);

  // Handle client selection
  const handleClientSelect = (client: Client) => {
    setSelectedClient(client);
    setUseExistingClient(true);
    setShowClientSelector(false);

    // Update form data with client information
    onChange({
      client_id: client.id,
      customer_name: client.name,
      customer_email: client.email || "",
      customer_phone: client.phone || "",
      customer_address: [client.address_street, client.address_city, client.address_zip, client.address_country]
        .filter(Boolean)
        .join(', ') || "",
    });
  };

  // Handle manual customer entry
  const handleManualEntry = () => {
    setUseExistingClient(false);
    setSelectedClient(null);
    onChange({
      client_id: null,
      customer_name: "",
      customer_email: "",
      customer_phone: "",
      customer_address: "",
    });
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    onChange({ [name]: value });
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, ""); // Remove non-digits

    // Format French phone number: 06 12 34 56 78
    if (value.startsWith("33")) {
      value = "0" + value.slice(2); // Convert +33 to 0
    }

    if (value.length >= 2) {
      value = value.slice(0, 2) + " " + value.slice(2);
    }
    if (value.length >= 5) {
      value = value.slice(0, 5) + " " + value.slice(5);
    }
    if (value.length >= 8) {
      value = value.slice(0, 8) + " " + value.slice(8);
    }
    if (value.length >= 11) {
      value = value.slice(0, 11) + " " + value.slice(11);
    }

    onChange({ customer_phone: value.slice(0, 14) }); // Limit to 14 chars (with spaces)
  };

  const validateEmail = (email: string) => {
    if (!email) return true;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validatePhone = (phone: string) => {
    if (!phone) return true;
    const cleanPhone = phone.replace(/\s/g, "");
    return /^(\+33|0)[1-9](\d{8})$/.test(cleanPhone);
  };

  const getFieldStatus = (fieldName: string) => {
    if (errors[fieldName]) return "error";

    // Special validation for email and phone
    if (fieldName === "customer_email" && formData.customer_email) {
      return validateEmail(formData.customer_email) ? "success" : "error";
    }
    if (fieldName === "customer_phone" && formData.customer_phone) {
      return validatePhone(formData.customer_phone) ? "success" : "error";
    }

    if (formData[fieldName as keyof typeof formData]) return "success";
    return "default";
  };

  const renderFieldIcon = (fieldName: string) => {
    const status = getFieldStatus(fieldName);
    if (status === "error") {
      return <AlertCircle className="w-4 h-4 text-red-500" />;
    } else if (status === "success") {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
    return null;
  };

  const isFormEmpty =
    !formData.customer_name &&
    !formData.customer_email &&
    !formData.customer_phone &&
    !formData.customer_address;

  return (
    <div className="p-3 sm:p-6 max-w-2xl mx-auto">
      <div className="bg-muted rounded-lg border border-[hsl(var(--rpma-border))] overflow-hidden">
        {/* Header */}
        <div className="bg-[hsl(var(--rpma-surface))] p-3 sm:p-4 border-b border-[hsl(var(--rpma-border))]">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
            <div className="flex items-center">
              <User className="w-5 h-5 text-[hsl(var(--rpma-teal))] mr-2" />
              <h3 className="text-base sm:text-lg font-semibold text-foreground">
                Informations client
              </h3>
            </div>
            <div className="text-xs sm:text-sm bg-[hsl(var(--rpma-teal))]/10 px-2 sm:px-3 py-1 rounded-full">
              <span className="font-medium text-[hsl(var(--rpma-teal))]">
                {isFormEmpty ? "À remplir" : "Complété"}
              </span>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Saisissez les informations du client pour cette tâche
          </p>
        </div>

        {/* Form Content */}
        <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
          {/* Client Selection Options */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Select Existing Client */}
              <button
                type="button"
                onClick={() => {
                  setShowClientSelector(true);
                  setSearchQuery("");
                }}
                className={`
                  flex-1 flex items-center justify-center px-4 py-3 rounded-lg border-2 transition-all duration-200
                  ${
                    useExistingClient && selectedClient
                      ? "border-[hsl(var(--rpma-teal))] bg-[hsl(var(--rpma-teal))]/10 text-[hsl(var(--rpma-teal))]"
                      : "border-[hsl(var(--rpma-border))] bg-white text-foreground hover:bg-muted"
                  }
                `}
                disabled={isLoading}
              >
                <Search className="w-5 h-5 mr-2" />
                <span className="font-medium">
                  {selectedClient
                    ? `Client sélectionné: ${selectedClient.name}`
                    : "Sélectionner un client existant"}
                </span>
              </button>

              {/* Manual Entry */}
              <button
                type="button"
                onClick={handleManualEntry}
                className={`
                  flex-1 flex items-center justify-center px-4 py-3 rounded-lg border-2 transition-all duration-200
                  ${
                    !useExistingClient
                      ? "border-[hsl(var(--rpma-teal))] bg-[hsl(var(--rpma-teal))]/10 text-[hsl(var(--rpma-teal))]"
                      : "border-[hsl(var(--rpma-border))] bg-white text-foreground hover:bg-muted"
                  }
                `}
                disabled={isLoading}
              >
                <Plus className="w-5 h-5 mr-2" />
                <span className="font-medium">Saisir manuellement</span>
              </button>
            </div>

            {/* Selected Client Info */}
            {selectedClient && (
              <div className="bg-[hsl(var(--rpma-teal))]/10 border border-[hsl(var(--rpma-teal))]/30 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-[hsl(var(--rpma-teal))] mr-2" />
                    <div>
                      <p className="font-medium text-foreground">
                        {selectedClient.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {selectedClient.email && `${selectedClient.email} • `}
                        {selectedClient.phone && `${selectedClient.phone} • `}
                        {selectedClient.customer_type === "business"
                          ? "Entreprise"
                          : "Particulier"}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleManualEntry}
                    className="text-sm text-[hsl(var(--rpma-teal))] hover:text-[hsl(var(--rpma-teal))]-hover underline"
                  >
                    Changer
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Client Selector Modal */}
          {showClientSelector && (
            <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
              <div className="bg-muted rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden border border-[hsl(var(--rpma-border))]">
                <div className="p-4 border-b border-[hsl(var(--rpma-border))]">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-foreground">
                      Sélectionner un client
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowClientSelector(false)}
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
                            onClick={() => handleClientSelect(client)}
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
                              {selectedClient?.id === client.id && (
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
          )}

          {/* Manual Entry Form - Only show if not using existing client */}
          {!useExistingClient && (
            <div className="space-y-4">
              <div className="bg-[hsl(var(--rpma-teal))]/10 border border-[hsl(var(--rpma-teal))]/30 rounded-lg p-4">
                <div className="flex items-start">
                  <Info className="w-5 h-5 text-[hsl(var(--rpma-teal))] mr-2 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-foreground">
                    <p className="font-medium">Nouveau client</p>
                    <p className="text-muted-foreground mt-1">
                      Saisissez les informations du client. Un nouveau profil
                      client sera créé.
                    </p>
                  </div>
                </div>
              </div>

              {/* Customer Name */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground">
                  <User className="w-4 h-4 inline mr-1" />
                  Nom du client
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="customer_name"
                    value={formData.customer_name || ""}
                    onChange={handleChange}
                    placeholder="Ex: Jean Dupont"
                    className={`
                  w-full px-3 py-2 border rounded-lg transition-all duration-200 bg-white text-foreground placeholder-muted-foreground
                  ${
                    errors.customer_name
                      ? "border-red-500 focus:border-red-500 focus:ring-red-500/50"
                      : formData.customer_name
                        ? "border-[hsl(var(--rpma-teal))] focus:border-[hsl(var(--rpma-teal))] focus:ring-[hsl(var(--rpma-teal))]/20/50"
                        : "border-[hsl(var(--rpma-border))] focus:border-[hsl(var(--rpma-border))]-light focus:ring-border-light/50"
                  }
                  focus:ring-2 focus:outline-none
                  disabled:opacity-50 disabled:cursor-not-allowed
                `}
                    disabled={isLoading}
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    {renderFieldIcon("customer_name")}
                  </div>
                </div>
                {errors.customer_name && (
                  <p className="text-sm text-red-400 flex items-center mt-1">
                    <AlertCircle className="w-4 h-4 mr-1 flex-shrink-0" />
                    {errors.customer_name}
                  </p>
                )}
              </div>

              {/* Email and Phone */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Email */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-foreground">
                    <Mail className="w-4 h-4 inline mr-1" />
                    Email
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      name="customer_email"
                      value={formData.customer_email || ""}
                      onChange={handleChange}
                      placeholder="client@example.com"
                      className={`
                    w-full px-3 py-2 border rounded-lg transition-all duration-200 bg-white text-foreground placeholder-muted-foreground
                    ${
                      errors.customer_email ||
                      (formData.customer_email &&
                        !validateEmail(formData.customer_email))
                        ? "border-red-500 focus:border-red-500 focus:ring-red-500/50"
                        : formData.customer_email &&
                            validateEmail(formData.customer_email)
                          ? "border-[hsl(var(--rpma-teal))] focus:border-[hsl(var(--rpma-teal))] focus:ring-[hsl(var(--rpma-teal))]/20/50"
                          : "border-[hsl(var(--rpma-border))] focus:border-[hsl(var(--rpma-border))]-light focus:ring-border-light/50"
                    }
                    focus:ring-2 focus:outline-none
                    disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                      disabled={isLoading}
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      {renderFieldIcon("customer_email")}
                    </div>
                  </div>
                  {formData.customer_email &&
                    !validateEmail(formData.customer_email) && (
                      <p className="text-sm text-red-400 flex items-center mt-1">
                        <AlertCircle className="w-4 h-4 mr-1 flex-shrink-0" />
                        Format d&apos;email invalide
                      </p>
                    )}
                  {errors.customer_email && (
                    <p className="text-sm text-red-400 flex items-center mt-1">
                      <AlertCircle className="w-4 h-4 mr-1 flex-shrink-0" />
                      {errors.customer_email}
                    </p>
                  )}
                </div>

                {/* Phone */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-foreground">
                    <Phone className="w-4 h-4 inline mr-1" />
                    Téléphone
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      name="customer_phone"
                      value={formData.customer_phone || ""}
                      onChange={handlePhoneChange}
                      placeholder="06 12 34 56 78"
                      className={`
                    w-full px-3 py-2 border rounded-lg font-mono transition-all duration-200 bg-white text-foreground placeholder-muted-foreground
                    ${
                      errors.customer_phone ||
                      (formData.customer_phone &&
                        !validatePhone(formData.customer_phone))
                        ? "border-red-500 focus:border-red-500 focus:ring-red-500/50"
                        : formData.customer_phone &&
                            validatePhone(formData.customer_phone)
                          ? "border-[hsl(var(--rpma-teal))] focus:border-[hsl(var(--rpma-teal))] focus:ring-[hsl(var(--rpma-teal))]/20/50"
                          : "border-[hsl(var(--rpma-border))] focus:border-[hsl(var(--rpma-border))]-light focus:ring-border-light/50"
                    }
                    focus:ring-2 focus:outline-none
                    disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                      disabled={isLoading}
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      {renderFieldIcon("customer_phone")}
                    </div>
                  </div>
                  {formData.customer_phone &&
                    !validatePhone(formData.customer_phone) && (
                      <p className="text-sm text-red-400 flex items-center mt-1">
                        <AlertCircle className="w-4 h-4 mr-1 flex-shrink-0" />
                        Format de téléphone invalide
                      </p>
                    )}
                  {errors.customer_phone && (
                    <p className="text-sm text-red-400 flex items-center mt-1">
                      <AlertCircle className="w-4 h-4 mr-1 flex-shrink-0" />
                      {errors.customer_phone}
                    </p>
                  )}
                </div>
              </div>

              {/* Address */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground">
                  <MapPin className="w-4 h-4 inline mr-1" />
                  Adresse
                </label>
                <div className="relative">
                  <textarea
                    name="customer_address"
                    value={formData.customer_address || ""}
                    onChange={handleChange}
                    placeholder="123 Rue de la Paix, 75001 Paris"
                    rows={3}
                    maxLength={200}
                    className={`
                  w-full px-3 py-2 border rounded-lg transition-all duration-200 resize-none bg-white text-foreground placeholder-muted-foreground
                  ${
                    errors.customer_address
                      ? "border-red-500 focus:border-red-500 focus:ring-red-500/50"
                      : formData.customer_address
                        ? "border-[hsl(var(--rpma-teal))] focus:border-[hsl(var(--rpma-teal))] focus:ring-[hsl(var(--rpma-teal))]/20/50"
                        : "border-[hsl(var(--rpma-border))] focus:border-[hsl(var(--rpma-border))]-light focus:ring-border-light/50"
                  }
                  focus:ring-2 focus:outline-none
                  disabled:opacity-50 disabled:cursor-not-allowed
                `}
                    disabled={isLoading}
                  />
                  <div className="absolute right-3 top-3">
                    {renderFieldIcon("customer_address")}
                  </div>
                </div>
                {errors.customer_address && (
                  <p className="text-sm text-red-400 flex items-center mt-1">
                    <AlertCircle className="w-4 h-4 mr-1 flex-shrink-0" />
                    {errors.customer_address}
                  </p>
                )}
                {formData.customer_address && (
                  <p className="text-xs text-muted-foreground">
                    {formData.customer_address.length}/200 caractères
                  </p>
                )}
              </div>

              {/* Benefits of providing customer info */}
              <div className="bg-[hsl(var(--rpma-teal))]/10 border border-[hsl(var(--rpma-teal))]/30 rounded-lg p-4">
                <div className="flex items-start">
                  <Info className="w-5 h-5 text-[hsl(var(--rpma-teal))] mr-2 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-foreground">
                    <p className="font-medium mb-1">
                      Avantages de renseigner ces informations :
                    </p>
                    <ul className="space-y-1 text-muted-foreground">
                      <li>
                        • Communication directe en cas de questions ou retards
                      </li>
                      <li>
                        • Notifications automatiques de l&apos;avancement des
                        travaux
                      </li>
                      <li>
                        • Historique client pour les interventions futures
                      </li>
                      <li>• Facturation et suivi comptable facilités</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Summary of entered information */}
              {!isFormEmpty && (
                <div className="bg-white border border-[hsl(var(--rpma-border))] rounded-lg p-4">
                  <h4 className="text-sm font-medium text-foreground mb-2">
                    Résumé des informations :
                  </h4>
                  <div className="text-sm text-muted-foreground space-y-1">
                    {formData.customer_name && (
                      <div className="flex items-center">
                        <User className="w-4 h-4 mr-2 text-muted-foreground" />
                        <span>{formData.customer_name}</span>
                      </div>
                    )}
                    {formData.customer_email &&
                      validateEmail(formData.customer_email) && (
                        <div className="flex items-center">
                          <Mail className="w-4 h-4 mr-2 text-muted-foreground" />
                          <span>{formData.customer_email}</span>
                        </div>
                      )}
                    {formData.customer_phone &&
                      validatePhone(formData.customer_phone) && (
                        <div className="flex items-center">
                          <Phone className="w-4 h-4 mr-2 text-muted-foreground" />
                          <span>{formData.customer_phone}</span>
                        </div>
                      )}
                    {formData.customer_address && (
                      <div className="flex items-start">
                        <MapPin className="w-4 h-4 mr-2 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <span className="break-words">
                          {formData.customer_address}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Quick Skip Option - Only show if no client selected and no manual entry */}
          {!useExistingClient && !selectedClient && isFormEmpty && (
            <div className="bg-[hsl(var(--rpma-surface))] border border-[hsl(var(--rpma-border))] rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-start">
                  <Info className="w-5 h-5 text-muted-foreground mr-2 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-foreground">
                    <p className="font-medium">
                      Pas d&apos;informations client ?
                    </p>
                    <p className="text-muted-foreground mt-1">
                      Vous pouvez passer cette étape et l&apos;remplir plus tard
                      si nécessaire.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
