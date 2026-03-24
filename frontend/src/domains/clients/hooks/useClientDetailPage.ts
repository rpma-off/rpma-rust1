import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { logger } from "@/lib/logging";
import { LogDomain } from "@/lib/logging/types";
import { ClientWithTasks, Task } from "@/shared/types";
import { convertTimestamps } from "@/shared/utils";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { useAuth } from "@/shared/hooks/useAuth";
import { clientKeys } from "@/lib/query-keys";
import { clientService } from "../server";

interface UseClientDetailPageOptions {
  params: { id: string };
}

export function useClientDetailPage({ params }: UseClientDetailPageOptions) {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: client = null,
    isLoading: loading,
    error: queryError,
  } = useQuery({
    queryKey: clientKeys.withTasks(params.id),
    queryFn: async () => {
      const response = await clientService.getClientWithTasks(
        params.id,
        user!.token,
      );
      if (!response.success || !response.data) {
        const errorMessage =
          typeof response.error === "string"
            ? response.error
            : response.error?.message || t("clients.notFound");
        throw new Error(errorMessage);
      }
      const convertedClient = convertTimestamps(
        response.data,
      ) as ClientWithTasks;
      if (convertedClient.tasks) {
        convertedClient.tasks = convertedClient.tasks.map(
          (task) => convertTimestamps(task) as Task,
        );
      }
      return convertedClient;
    },
    enabled: !!params?.id && !!user?.token,
    staleTime: 60_000,
  });

  const error = queryError instanceof Error ? queryError.message : null;

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error(t("errors.authRequired"));
      const response = await clientService.deleteClient(params.id, user.token);
      if (response.error)
        throw new Error(response.error || t("errors.deleteFailed"));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clientKeys.all });
      router.push("/clients");
    },
    onError: (err) => {
      logger.error(
        LogDomain.CLIENT,
        "Error deleting client",
        err instanceof Error ? err : new Error(String(err)),
        { client_id: params?.id },
      );
    },
  });

  const handleEdit = () => {
    if (params?.id) router.push(`/clients/${params.id}/edit`);
  };

  const handleDelete = async () => {
    if (!client || !params?.id) return;
    if (!confirm(t("confirm.deleteClient", { name: client.name }))) return;
    await deleteMutation.mutateAsync();
  };

  const handleCreateTask = () => {
    if (params?.id) router.push(`/tasks/new?clientId=${params.id}`);
  };

  return {
    client,
    loading,
    error,
    params,
    t,
    handleEdit,
    handleDelete,
    handleCreateTask,
  };
}
