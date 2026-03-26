"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { User, ClipboardList, Package, FileText, Loader2 } from "lucide-react";
import { systemOperations } from "@/lib/ipc/domains/system";
import type { GlobalSearchResult } from "@/lib/backend";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useDebounce } from "@/shared/hooks/useDebounce";

interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ROUTES: Record<GlobalSearchResult["type"], (id: string) => string> = {
  task: (id) => `/tasks/${id}`,
  client: (id) => `/clients/${id}`,
  material: (id) => `/inventory/materials/${id}`,
  quote: (id) => `/quotes/${id}`,
};

export function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const debouncedQuery = useDebounce(query, 300);

  const { data, isFetching } = useQuery({
    queryKey: ["global-search", debouncedQuery],
    queryFn: () => systemOperations.globalSearch(debouncedQuery),
    enabled: open && debouncedQuery.length >= 2,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });

  const results = data?.results ?? [];

  const handleSelect = (result: GlobalSearchResult) => {
    onOpenChange(false);
    setQuery("");
    const route = ROUTES[result.type];
    if (route) router.push(route(result.id));
  };

  const tasks = results.filter(
    (r): r is Extract<GlobalSearchResult, { type: "task" }> =>
      r.type === "task",
  );
  const clients = results.filter(
    (r): r is Extract<GlobalSearchResult, { type: "client" }> =>
      r.type === "client",
  );
  const materials = results.filter(
    (r): r is Extract<GlobalSearchResult, { type: "material" }> =>
      r.type === "material",
  );
  const quotes = results.filter(
    (r): r is Extract<GlobalSearchResult, { type: "quote" }> =>
      r.type === "quote",
  );

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Rechercher une tâche, un client, un matériel..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {isFetching && (
          <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Recherche en cours...
          </div>
        )}

        {!isFetching && query.length >= 2 && results.length === 0 && (
          <CommandEmpty>
            Aucun résultat trouvé pour &quot;{query}&quot;.
          </CommandEmpty>
        )}

        {!isFetching && query.length < 2 && (
          <div className="py-6 text-center text-sm text-muted-foreground">
            Entrez au moins 2 caractères pour commencer la recherche.
          </div>
        )}

        {tasks.length > 0 && (
          <CommandGroup heading="Tâches">
            {tasks.map((task) => (
              <CommandItem
                key={task.id}
                onSelect={() => handleSelect(task)}
                className="cursor-pointer"
              >
                <ClipboardList className="mr-2 h-4 w-4" />
                <div className="flex flex-col">
                  <span>{task.title}</span>
                  <span className="text-xs text-muted-foreground">
                    #{task.task_number} • {task.status}
                  </span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {clients.length > 0 && (
          <CommandGroup heading="Clients">
            {clients.map((client) => (
              <CommandItem
                key={client.id}
                onSelect={() => handleSelect(client)}
                className="cursor-pointer"
              >
                <User className="mr-2 h-4 w-4" />
                <div className="flex flex-col">
                  <span>{client.name}</span>
                  {client.email && (
                    <span className="text-xs text-muted-foreground">
                      {client.email}
                    </span>
                  )}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {materials.length > 0 && (
          <CommandGroup heading="Matériaux">
            {materials.map((material) => (
              <CommandItem
                key={material.id}
                onSelect={() => handleSelect(material)}
                className="cursor-pointer"
              >
                <Package className="mr-2 h-4 w-4" />
                <div className="flex flex-col">
                  <span>{material.name}</span>
                  <span className="text-xs text-muted-foreground">
                    SKU: {material.sku}
                  </span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {quotes.length > 0 && (
          <CommandGroup heading="Devis">
            {quotes.map((quote) => (
              <CommandItem
                key={quote.id}
                onSelect={() => handleSelect(quote)}
                className="cursor-pointer"
              >
                <FileText className="mr-2 h-4 w-4" />
                <div className="flex flex-col">
                  <span>Devis #{quote.quote_number}</span>
                  {quote.description && (
                    <span className="text-xs text-muted-foreground truncate max-w-[300px]">
                      {quote.description}
                    </span>
                  )}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
