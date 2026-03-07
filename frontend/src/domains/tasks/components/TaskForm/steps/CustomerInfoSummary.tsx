"use client";

import React from "react";
import { User, Mail, Phone, MapPin } from "lucide-react";

interface CustomerInfoSummaryProps {
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  customerAddress?: string;
  validateEmail: (email: string) => boolean;
  validatePhone: (phone: string) => boolean;
}

export const CustomerInfoSummary: React.FC<CustomerInfoSummaryProps> = ({
  customerName,
  customerEmail,
  customerPhone,
  customerAddress,
  validateEmail,
  validatePhone,
}) => (
  <div className="bg-white border border-[hsl(var(--rpma-border))] rounded-lg p-4">
    <h4 className="text-sm font-medium text-foreground mb-2">
      Résumé des informations :
    </h4>
    <div className="text-sm text-muted-foreground space-y-1">
      {customerName && (
        <div className="flex items-center">
          <User className="w-4 h-4 mr-2 text-muted-foreground" />
          <span>{customerName}</span>
        </div>
      )}
      {customerEmail && validateEmail(customerEmail) && (
        <div className="flex items-center">
          <Mail className="w-4 h-4 mr-2 text-muted-foreground" />
          <span>{customerEmail}</span>
        </div>
      )}
      {customerPhone && validatePhone(customerPhone) && (
        <div className="flex items-center">
          <Phone className="w-4 h-4 mr-2 text-muted-foreground" />
          <span>{customerPhone}</span>
        </div>
      )}
      {customerAddress && (
        <div className="flex items-start">
          <MapPin className="w-4 h-4 mr-2 text-muted-foreground mt-0.5 flex-shrink-0" />
          <span className="break-words">{customerAddress}</span>
        </div>
      )}
    </div>
  </div>
);
