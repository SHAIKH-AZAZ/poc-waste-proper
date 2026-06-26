"use client";
import { useState } from "react";
import { IconX, IconPlus, IconTrash, IconUpload, IconRecycle, IconFileSpreadsheet, IconEdit } from "@tabler/icons-react";
import { toast } from "sonner";
import WasteExcelUpload from "./WasteExcelUpload";

interface WasteItem {
  dia: number;
  length: number;
  quantity: number;
}

interface WasteUploadModalProps {
  projectId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function WasteUploadModal({ projectId, onClose, onSuccess }: WasteUploadModalProps) {
  const [uploadMode, setUploadMode] = useState<"manual" | "excel">("excel");
  const [wasteItems, setWasteItems] = useState<WasteItem[]>([
    { dia: 16, length: 2000, quantity: 1 }
  ]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addWasteItem = () => {
    setWasteItems([...wasteItems, { dia: 16, length: 2000, quantity: 1 }]);
  };

  const removeWasteItem = (index: number) => {
    setWasteItems(wasteItems.filter((_, i) => i !== index));
  };

  const updateWasteItem = (index: number, field: keyof WasteItem, value: number) => {
    const updated = [...wasteItems];
    updated[index][field] = value;
    setWasteItems(updated);
  };

  const handleSubmit = async () => {
    // Validation
    const invalidItems = wasteItems.filter(
      item => item.dia <= 0 || item.length < 2000 || item.quantity <= 0
    );

    if (invalidItems.length > 0) {
      toast.error("All items must have valid diameter, length ≥ 2000mm, and quantity > 0");
      setError("All items must have valid diameter, length ≥ 2000mm, and quantity > 0");
      return;
    }

    setUploading(true);
    setError(null);
    const toastId = toast.loading("Processing manual entry...");

    try {
      const response = await fetch("/api/waste/manual-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: parseInt(projectId),
          wasteItems,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(data.message || "Manual waste upload successful!", { id: toastId });
        onSuccess();
        onClose();
      } else {
        toast.error(data.error || "Failed to upload waste", { id: toastId });
        setError(data.error || "Failed to upload waste");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload waste", { id: toastId });
      setError(err instanceof Error ? err.message : "Failed to upload waste");
    } finally {
      setUploading(false);
    }
  };

  const totalPieces = wasteItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalLength = wasteItems.reduce((sum, item) => sum + (item.length * item.quantity), 0);

  return (
    <div className="anim-fade-up fixed inset-0 z-[60] flex items-center justify-center bg-[rgba(15,17,23,0.45)] p-4 backdrop-blur-[6px]">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-[24px] border border-[var(--color-line)] bg-white shadow-[0_30px_80px_rgba(0,0,0,0.3)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-line)] p-6">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-[13px] bg-gradient-to-br from-grass to-[#059669] shadow-[0_8px_20px_rgba(16,185,129,0.3)]">
              <IconRecycle className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="font-display text-[19px] font-extrabold tracking-[-0.03em]">Upload Offcut Materials</h2>
              <p className="font-body text-[12.5px] text-ink-2">Add existing offcut pieces to inventory</p>
            </div>
          </div>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-3 transition-colors hover:bg-canvas hover:text-ink">
            <IconX className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Mode Selector */}
          <div className="mb-6 flex gap-[3px] rounded-[14px] border border-[var(--color-line)] bg-[rgba(241,243,248,0.9)] p-1">
            {[
              { k: "excel" as const, Icon: IconFileSpreadsheet, label: "Excel Upload" },
              { k: "manual" as const, Icon: IconEdit, label: "Manual Entry" },
            ].map((m) => (
              <button
                key={m.k}
                onClick={() => setUploadMode(m.k)}
                className={`flex flex-1 items-center justify-center gap-2 rounded-[10px] px-4 py-2.5 font-body text-[13.5px] font-bold transition-all ${uploadMode === m.k ? "bg-white text-ink shadow-[0_1px_3px_rgba(0,0,0,0.1)]" : "text-ink-2 hover:text-ink"}`}
              >
                <m.Icon className="h-4 w-4" />
                {m.label}
              </button>
            ))}
          </div>

          {/* Excel Upload Mode */}
          {uploadMode === "excel" && (
            <WasteExcelUpload
              projectId={projectId}
              onSuccess={() => {
                onSuccess();
                onClose();
              }}
            />
          )}

          {/* Manual Entry Mode */}
          {uploadMode === "manual" && (
            <>
              {error && (
                <div className="mb-4 rounded-[14px] border border-rose-200 bg-rose-50 p-4">
                  <p className="font-body text-sm text-rose-700">{error}</p>
                </div>
              )}

              <div className="space-y-3">
                {wasteItems.map((item, index) => (
                  <div
                    key={index}
                    className="rounded-[13px] border border-[var(--color-line)] bg-canvas p-4 transition-colors hover:border-accent/30"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {/* Diameter */}
                        <div>
                          <label className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-ink-3">
                            Diameter (mm)
                          </label>
                          <input
                            type="number"
                            value={item.dia}
                            onChange={(e) => updateWasteItem(index, "dia", parseFloat(e.target.value) || 0)}
                            className="w-full rounded-lg border-[1.5px] border-[var(--color-line-2)] bg-white px-3 py-2 font-body text-sm outline-none focus:border-accent"
                            placeholder="16"
                            min="1"
                          />
                        </div>

                        {/* Length */}
                        <div>
                          <label className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-ink-3">
                            Length (mm)
                          </label>
                          <input
                            type="number"
                            value={item.length}
                            onChange={(e) => updateWasteItem(index, "length", parseFloat(e.target.value) || 0)}
                            className="w-full rounded-lg border-[1.5px] border-[var(--color-line-2)] bg-white px-3 py-2 font-body text-sm outline-none focus:border-accent"
                            placeholder="2000"
                            min="2000"
                            step="100"
                          />
                          {item.length < 2000 && item.length > 0 && (
                            <p className="mt-1 font-body text-xs text-rose-500">Min: 2000mm</p>
                          )}
                        </div>

                        {/* Quantity */}
                        <div>
                          <label className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-ink-3">
                            Quantity
                          </label>
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateWasteItem(index, "quantity", parseInt(e.target.value) || 0)}
                            className="w-full rounded-lg border-[1.5px] border-[var(--color-line-2)] bg-white px-3 py-2 font-body text-sm outline-none focus:border-accent"
                            placeholder="1"
                            min="1"
                          />
                        </div>
                      </div>

                      {/* Remove Button */}
                      <button
                        onClick={() => removeWasteItem(index)}
                        disabled={wasteItems.length === 1}
                        className="mt-6 rounded-lg p-2 text-ink-3 transition-all hover:bg-rose-500/[0.08] hover:text-rose-500 disabled:cursor-not-allowed disabled:opacity-30"
                        title="Remove item"
                      >
                        <IconTrash className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add More Button */}
              <button
                onClick={addWasteItem}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-[13px] border-2 border-dashed border-[var(--color-line-2)] py-3 font-body font-bold text-ink-3 transition-all hover:border-accent/40 hover:bg-accent/[0.04] hover:text-accent"
              >
                <IconPlus className="w-5 h-5" />
                Add Another Offcut Piece
              </button>

              {/* Summary */}
              <div className="mt-6 rounded-[14px] border border-accent/15 bg-accent/[0.05] p-4">
                <h3 className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-ink-3">Summary</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="font-body text-xs text-ink-3">Total Pieces</p>
                    <p className="font-display text-2xl font-extrabold tracking-[-0.03em] text-accent">{totalPieces}</p>
                  </div>
                  <div>
                    <p className="font-body text-xs text-ink-3">Total Length</p>
                    <p className="font-display text-2xl font-extrabold tracking-[-0.03em] text-sky">{(totalLength / 1000).toFixed(2)}m</p>
                  </div>
                </div>
              </div>

              {/* Info */}
              <div className="mt-4 rounded-[14px] border border-amber-x/20 bg-amber-x/[0.08] p-4">
                <p className="font-body text-xs text-amber-800">
                  <span className="font-bold">Note:</span> Only offcut pieces ≥ 2000mm (2m) can be added to inventory.
                  These pieces will be available for reuse in future calculations.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {uploadMode === "manual" && (
          <div className="flex items-center justify-end gap-3 border-t border-[var(--color-line)] p-6">
            <button
              onClick={onClose}
              disabled={uploading}
              className="rounded-full px-5 py-2.5 font-body font-bold text-ink-2 transition-all hover:bg-canvas hover:text-ink disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={uploading || wasteItems.length === 0}
              className="flex items-center gap-2 rounded-full bg-grass px-5 py-2.5 font-body font-bold text-white shadow-[0_8px_24px_rgba(16,185,129,0.34)] transition-all hover:-translate-y-0.5 hover:bg-[#059669] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <IconUpload className="w-5 h-5" />
              {uploading ? "Uploading…" : `Upload ${totalPieces} Piece${totalPieces !== 1 ? 's' : ''}`}
            </button>
          </div>
        )}
        {uploadMode === "excel" && (
          <div className="flex items-center justify-end gap-3 border-t border-[var(--color-line)] p-6">
            <button
              onClick={onClose}
              className="rounded-full px-5 py-2.5 font-body font-bold text-ink-2 transition-all hover:bg-canvas hover:text-ink"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
