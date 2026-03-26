import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import type { Quote } from "@/types/quote.types";
import { QuoteDetailsTab } from "../QuoteDetailsTab";
import { QuoteItemsTab } from "../QuoteItemsTab";

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

jest.mock("lucide-react", () => {
  const Icon = ({ className }: { className?: string }) => <span className={className} />;

  return {
    Clock: Icon,
    FileText: Icon,
    FileUp: Icon,
    Send: Icon,
    CheckCircle: Icon,
    XCircle: Icon,
    CheckCheck: Icon,
    AlertCircle: Icon,
    Plus: Icon,
    Trash2: Icon,
  };
});

jest.mock("../QuoteWorkflowPanel", () => ({
  QuoteWorkflowPanel: ({
    onConvertToTask,
  }: {
    onConvertToTask: () => void;
  }) => (
    <button type="button" onClick={onConvertToTask}>
      Open convert dialog
    </button>
  ),
}));

const baseQuote: Quote = {
  id: "quote-1",
  quote_number: "DEV-0001",
  client_id: "client-1",
  task_id: "task-12345678",
  status: "accepted",
  valid_until: "2024-02-01T00:00:00Z",
  description: null,
  notes: "Remember to inspect the roof.",
  terms: "Payment due within 30 days.",
  subtotal: 10000,
  tax_total: 2000,
  total: 12000,
  discount_type: null,
  discount_value: null,
  discount_amount: null,
  vehicle_plate: "AB-123-CD",
  vehicle_make: "Tesla",
  vehicle_model: "Model 3",
  vehicle_year: "2024",
  vehicle_vin: "VIN123",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
  created_by: null,
  items: [
    {
      id: "item-1",
      quote_id: "quote-1",
      position: 0,
      kind: "service",
      label: "PPF Capot",
      description: "Protection avant",
      qty: 2,
      unit_price: 5000,
      tax_rate: 20,
      material_id: null,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    },
  ],
};

const expectedTaskLinkText = `${baseQuote.task_id?.slice(0, 8)}...`;

describe("QuoteItemsTab", () => {
  it("delegates add-item form and delete actions through props", () => {
    const onAddItem = jest.fn();
    const onCancelAddItem = jest.fn();
    const onDeleteItem = jest.fn();

    render(
      <QuoteItemsTab
        quote={baseQuote}
        canEdit
        showAddItem
        newLabel="PPF Capot"
        newKind="service"
        newQty={1}
        newUnitPrice={120}
        newDescription="Description"
        onOpenAddItem={jest.fn()}
        onCancelAddItem={onCancelAddItem}
        onNewLabelChange={jest.fn()}
        onNewKindChange={jest.fn()}
        onNewQtyChange={jest.fn()}
        onNewUnitPriceChange={jest.fn()}
        onNewDescriptionChange={jest.fn()}
        onAddItem={onAddItem}
        onDeleteItem={onDeleteItem}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Ajouter$/i }));
    fireEvent.click(screen.getByRole("button", { name: /Annuler/i }));
    fireEvent.click(screen.getByRole("button", { name: /Supprimer PPF Capot/i }));

    expect(onAddItem).toHaveBeenCalled();
    expect(onCancelAddItem).toHaveBeenCalled();
    expect(onDeleteItem).toHaveBeenCalledWith("item-1");
  });

  it("truncates long delete labels for accessibility", () => {
    const longLabel =
      "Film de protection capot complet avec finition brillante premium";

    render(
      <QuoteItemsTab
        quote={{
          ...baseQuote,
          items: [
            {
              ...baseQuote.items[0],
              id: "item-long",
              label: longLabel,
            },
          ],
        }}
        canEdit
        showAddItem={false}
        newLabel=""
        newKind="service"
        newQty={1}
        newUnitPrice={0}
        newDescription=""
        onOpenAddItem={jest.fn()}
        onCancelAddItem={jest.fn()}
        onNewLabelChange={jest.fn()}
        onNewKindChange={jest.fn()}
        onNewQtyChange={jest.fn()}
        onNewUnitPriceChange={jest.fn()}
        onNewDescriptionChange={jest.fn()}
        onAddItem={jest.fn()}
        onDeleteItem={jest.fn()}
      />,
    );

    expect(
      screen.getByRole("button", {
        name: `Supprimer ${longLabel.slice(0, 37)}...`,
      }),
    ).toBeInTheDocument();
  });
});

describe("QuoteDetailsTab", () => {
  it("renders quote details and delegates workflow actions", () => {
    const onOpenConvertDialog = jest.fn();

    render(
      <QuoteDetailsTab
        quote={baseQuote}
        statusLoading={false}
        exportLoading={false}
        duplicateLoading={false}
        onMarkSent={jest.fn()}
        onMarkAccepted={jest.fn()}
        onMarkRejected={jest.fn()}
        onMarkExpired={jest.fn()}
        onMarkChangesRequested={jest.fn()}
        onReopen={jest.fn()}
        onDuplicate={jest.fn()}
        onDelete={jest.fn()}
        onExportPdf={jest.fn()}
        onOpenConvertDialog={onOpenConvertDialog}
      />,
    );

    expect(screen.getByText("Informations générales")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: expectedTaskLinkText }),
    ).toHaveAttribute("href", "/tasks/task-12345678");
    expect(screen.getByText("Remember to inspect the roof.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Open convert dialog/i }));

    expect(onOpenConvertDialog).toHaveBeenCalled();
  });
});
