import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { logger } from "@/lib/logging";
import { LogDomain } from "@/lib/logging/types";
import { clientKeys } from "@/lib/query-keys";
import { useTranslation } from "@/shared/hooks/useTranslation";
import type { Client, UpdateClientDTO } from "@/shared/types";
import { useAuth } from "@/shared/hooks/useAuth";
import { clientService } from "../server";

interface UseEditClientPageOptions {
  params: { id: string };
}

const EMPTY_FORM: Partial<Client> = {
  id: "",
  name: "",
  email: undefined,
  phone: undefined,
  address_street: undefined,
  address_city: undefined,
  address_state: undefined,
  address_zip: undefined,
  address_country: undefined,
  company_name: undefined,
  customer_type: "individual",
  notes: undefined,
};

export function useEditClientPage({ params }: UseEditClientPageOptions) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [formData, setFormData] = useState<Partial<Client>>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<
    Partial<UpdateClientDTO & { general?: string }>
  >({});

  const {
    data: client = null,
    isLoading: loading,
    error: queryError,
  } = useQuery({
    queryKey: clientKeys.byId(params.id),
    queryFn: async () => {
      const response = await clientService.getClientById(
        params.id,
        user?.token,
      );
      if (response.error) {
        throw new Error(
          typeof response.error === "string"
            ? response.error
            : response.error.message || "Client not found",
        );
      }
      if (response.data) {
        setFormData({
          id: response.data.id,
          name: response.data.name,
          email: response.data.email || undefined,
          phone: response.data.phone || undefined,
          address_street: response.data.address_street || undefined,
          address_city: response.data.address_city || undefined,
          address_state: response.data.address_state || undefined,
          address_zip: response.data.address_zip || undefined,
          address_country: response.data.address_country || undefined,
          company_name: response.data.company_name || undefined,
          customer_type:
            response.data.customer_type === "business"
              ? "business"
              : "individual",
          notes: response.data.notes || undefined,
        });
      }
      return response.data as Client;
    },
    enabled: !!params?.id && !!user,
    staleTime: 60_000,
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!user?.token) throw new Error(t("errors.authRequired"));
      const response = await clientService.updateClient(
        params.id,
        formData,
        user.token,
      );
      if (response.error)
        throw new Error(response.error || t("errors.unexpectedError"));
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: clientKeys.all });
      router.push(`/clients/${params.id}`);
    },
    onError: (err) => {
      logger.error(
        LogDomain.CLIENT,
        "Error updating client",
        err instanceof Error ? err : new Error(String(err)),
        { client_id: params?.id },
      );
      setFormErrors({
        general:
          err instanceof Error ? err.message : "An unexpected error occurred",
      });
    },
  });

  const error = queryError instanceof Error ? queryError.message : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!params?.id || !user) {
      toast.error("Invalid request");
      return;
    }
    setFormErrors({});
    await updateMutation.mutateAsync();
  };

  const handleCancel = () => {
    if (params?.id) router.push(`/clients/${params.id}`);
  };

  const handleInputChange = (field: keyof UpdateClientDTO, value: string) => {
    const finalValue = value.trim() === "" ? undefined : value;
    setFormData((prev: Partial<Client>) => ({ ...prev, [field]: finalValue }));
    if (formErrors[field]) {
      setFormErrors((prev: Record<string, string | undefined>) => ({
        ...prev,
        [field]: undefined,
      }));
    }
  };

  return {
    client,
    loading,
    error,
    submitting: updateMutation.isPending,
    formData,
    formErrors,
    params,
    t,
    handleSubmit,
    handleCancel,
    handleInputChange,
  };
}
