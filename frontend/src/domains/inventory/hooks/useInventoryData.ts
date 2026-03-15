import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryKeys } from '@/lib/query-keys';
import { useAuth } from '@/shared/hooks/useAuth';
import { inventoryIpc } from '../ipc/inventory.ipc';
import type { CreateSupplierRequest } from '../server';

/**
 * Hook to fetch inventory reports data
 */
export function useInventoryReports() {
  const { user } = useAuth();

  return useQuery({
    queryKey: inventoryKeys.reports(),
    queryFn: async () => {
      if (!user?.token) throw new Error('User not authenticated');
      
      const [lowStock, movements] = await Promise.all([
        inventoryIpc.getLowStockMaterials(),
        inventoryIpc.getMovementSummaries(),
      ]);
      
      return {
        lowStockMaterials: lowStock.items,
        movementSummary: movements
      };
    },
    enabled: !!user?.token,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to manage inventory categories
 */
export function useInventoryCategories() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const query = useQuery({
    queryKey: inventoryKeys.categories(),
    queryFn: async () => {
      if (!user?.token) throw new Error('User not authenticated');
      return await inventoryIpc.category.listCategories();
    },
    enabled: !!user?.token,
  });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      if (!user?.token) throw new Error('User not authenticated');
      return await inventoryIpc.category.createCategory(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.categories() });
    },
  });

  return {
    categories: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    createCategory: createMutation,
  };
}

/**
 * Hook to manage inventory suppliers
 */
export function useInventorySuppliers() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const query = useQuery({
    queryKey: inventoryKeys.suppliers(),
    queryFn: async () => {
      if (!user?.token) throw new Error('User not authenticated');
      return await inventoryIpc.supplier.listSuppliers();
    },
    enabled: !!user?.token,
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateSupplierRequest) => {
      if (!user?.token) throw new Error('User not authenticated');
      return await inventoryIpc.supplier.createSupplier(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.suppliers() });
    },
  });

  return {
    suppliers: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    createSupplier: createMutation,
  };
}
