"use client";

import React, { useEffect, useState } from "react";
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
} from "lucide-react";
import { Client } from "@/lib/backend";
import { useClients, useClient } from "@/domains/clients";
import { FormStepProps } from "../types";
import { ClientSelectorModal } from "./ClientSelectorModal";
import { CustomerInfoSummary } from "./CustomerInfoSummary";
import {
  FieldError,
  FieldStatusIcon,
  focusFirstInvalidField,
  getInputClassName,
} from "./stepFieldShared";
import {
  formatFrenchPhoneNumber,
  getClearedCustomerForm,
  getCustomerFieldStatus,
  getPrefilledCustomerForm,
  isCustomerFormEmpty,
  mapClientToCustomerForm,
  validateEmail,
  validatePhone,
} from "./customerStep.helpers";

export const CustomerStep: React.FC<FormStepProps> = ({
  formData,
  onChange,
  errors = {},
  isLoading = false,
  sessionToken: _sessionToken,
}) => {
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showClientSelector, setShowClientSelector] = useState(false);
  const [useExistingClient, setUseExistingClient] = useState(false);

  // Use domain hooks instead of raw useQuery
  const { clients = [] } = useClients();
  const { client: prefilledClient } = useClient({ clientId: formData.client_id || undefined });

  // Focus on the first field with error
  useEffect(() => {
    focusFirstInvalidField(errors);
  }, [errors]);

  // Handle pre-filled client_id
  useEffect(() => {
    const client = (prefilledClient as Client) || clients.find((c: Client) => c.id === formData.client_id);
    if (client && !selectedClient) {
      setSelectedClient(client);
      setUseExistingClient(true);
      onChange(getPrefilledCustomerForm(client));
    }
  }, [formData.client_id, clients, prefilledClient, selectedClient, onChange]);

  // Handle client selection
  const handleClientSelect = (client: Client) => {
    setSelectedClient(client);
    setUseExistingClient(true);
    setShowClientSelector(false);

    onChange(mapClientToCustomerForm(client));
  };

  // Handle manual customer entry
  const handleManualEntry = () => {
    setUseExistingClient(false);
    setSelectedClient(null);
    onChange(getClearedCustomerForm());
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    onChange({ [name]: value });
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ customer_phone: formatFrenchPhoneNumber(e.target.value) });
  };
  const isFormEmpty = isCustomerFormEmpty(formData);

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
                onClick={() => setShowClientSelector(true)}
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
            <ClientSelectorModal
              clients={clients}
              selectedClientId={selectedClient?.id}
              onSelect={handleClientSelect}
              onClose={() => setShowClientSelector(false)}
            />
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
                    className={getInputClassName(
                      "w-full rounded-lg border bg-white px-3 py-2 text-foreground placeholder-muted-foreground transition-all duration-200",
                      getCustomerFieldStatus("customer_name", formData, errors),
                      "border-[hsl(var(--rpma-border))] focus:border-border-light focus:ring-border-light/50",
                    )}
                    disabled={isLoading}
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <FieldStatusIcon status={getCustomerFieldStatus("customer_name", formData, errors)} />
                  </div>
                </div>
                <FieldError message={errors.customer_name} />
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
                      className={getInputClassName(
                        "w-full rounded-lg border bg-white px-3 py-2 text-foreground placeholder-muted-foreground transition-all duration-200",
                        getCustomerFieldStatus("customer_email", formData, errors),
                        "border-[hsl(var(--rpma-border))] focus:border-border-light focus:ring-border-light/50",
                      )}
                      disabled={isLoading}
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <FieldStatusIcon status={getCustomerFieldStatus("customer_email", formData, errors)} />
                    </div>
                  </div>
                  {formData.customer_email &&
                    !validateEmail(formData.customer_email) && (
                      <FieldError message="Format d'email invalide" />
                    )}
                  <FieldError message={errors.customer_email} />
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
                      <FieldStatusIcon status={getCustomerFieldStatus("customer_phone", formData, errors)} />
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
                    <FieldStatusIcon status={getCustomerFieldStatus("customer_address", formData, errors)} />
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
                <CustomerInfoSummary
                  customerName={formData.customer_name}
                  customerEmail={formData.customer_email}
                  customerPhone={formData.customer_phone}
                  customerAddress={formData.customer_address}
                  validateEmail={validateEmail}
                  validatePhone={validatePhone}
                />
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
