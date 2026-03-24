import React from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useQuoteAttachments } from "../hooks/useQuoteAttachments";
import { useQuoteItems } from "../hooks/useQuoteItems";
import { useQuoteStatus } from "../hooks/useQuoteStatus";
import {
  useDuplicateQuote,
  useQuoteExportPdf,
} from "../hooks/useQuoteOperations";
import { quotesIpc } from "../ipc/quotes.ipc";

jest.mock("@/domains/auth", () => ({
  useAuth: () => ({ user: { token: "token-123" } }),
}));

jest.mock("@/domains/quotes/ipc/quotes.ipc", () => ({
  quotesIpc: {
    getAttachments: jest.fn(),
    addItem: jest.fn(),
    markSent: jest.fn(),
    duplicate: jest.fn(),
    exportPdf: jest.fn(),
  },
}));

const mockQuotesIpc = quotesIpc as jest.Mocked<typeof quotesIpc>;

/** Creates a fresh QueryClient per test so caches never bleed across tests. */
function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // Disable retries so tests fail fast on errors
        retry: false,
        // Disable background refetches so tests stay predictable
        staleTime: Infinity,
      },
      mutations: {
        retry: false,
      },
    },
  });

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  }

  return { Wrapper, queryClient };
}

describe("quote hooks IPC contract handling", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("loads attachments from unwrapped safeInvoke payloads", async () => {
    const attachments = [
      {
        id: "att-1",
        quote_id: "quote-1",
        file_name: "photo.jpg",
        file_path: "/tmp/photo.jpg",
        file_size: 1234,
        mime_type: "image/jpeg",
        attachment_type: "image",
        description: null,
        created_at: "2024-01-01T00:00:00Z",
        created_by: "user-1",
      },
    ];
    mockQuotesIpc.getAttachments.mockResolvedValue(attachments);

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useQuoteAttachments("quote-1"), {
      wrapper: Wrapper,
    });

    await waitFor(() =>
      expect(result.current.attachments).toEqual(attachments),
    );
  });

  it("returns quotes directly from item mutations", async () => {
    const quote = {
      id: "quote-1",
      quote_number: "DEV-00001",
      client_id: "client-1",
      task_id: null,
      status: "draft",
      valid_until: null,
      description: null,
      notes: null,
      terms: null,
      subtotal: 1000,
      tax_total: 200,
      total: 1200,
      discount_type: null,
      discount_value: null,
      discount_amount: null,
      vehicle_plate: null,
      vehicle_make: null,
      vehicle_model: null,
      vehicle_year: null,
      vehicle_vin: null,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
      created_by: "user-1",
      items: [],
    };
    mockQuotesIpc.addItem.mockResolvedValue(quote);

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useQuoteItems(), {
      wrapper: Wrapper,
    });

    await expect(
      result.current.addItem("quote-1", {
        kind: "service",
        label: "Test item",
        qty: 1,
        unit_price: 1000,
      }),
    ).resolves.toEqual(quote);
  });

  it("returns unwrapped quote status responses", async () => {
    const quote = { id: "quote-1", status: "sent" };
    mockQuotesIpc.markSent.mockResolvedValue(quote);

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useQuoteStatus(), {
      wrapper: Wrapper,
    });

    await expect(result.current.markSent("quote-1")).resolves.toEqual(quote);
  });

  it("returns unwrapped quote operations payloads", async () => {
    const duplicatedQuote = { id: "quote-copy" };
    const exportResponse = { file_path: "/tmp/DEV-00001.pdf" };
    mockQuotesIpc.duplicate.mockResolvedValue(duplicatedQuote);
    mockQuotesIpc.exportPdf.mockResolvedValue(exportResponse);

    const { Wrapper: DupWrapper } = makeWrapper();
    const { Wrapper: ExportWrapper } = makeWrapper();

    const duplicateHook = renderHook(() => useDuplicateQuote(), {
      wrapper: DupWrapper,
    });
    const exportHook = renderHook(() => useQuoteExportPdf(), {
      wrapper: ExportWrapper,
    });

    await expect(
      duplicateHook.result.current.duplicateQuote("quote-1"),
    ).resolves.toEqual(duplicatedQuote);

    await expect(
      exportHook.result.current.exportPdf("quote-1"),
    ).resolves.toEqual(exportResponse);
  });
});
