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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-green-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <IconRecycle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Upload Waste Materials</h2>
              <p className="text-sm text-slate-500">Add existing waste pieces to inventory</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <IconX className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Mode Selector */}
          <div className="flex gap-2 mb-6 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setUploadMode("excel")}
              className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${uploadMode === "excel"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
                }`}
            >
              <IconFileSpreadsheet className="w-4 h-4" />
              Excel Upload
            </button>
            <button
              onClick={() => setUploadMode("manual")}
              className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${uploadMode === "manual"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
                }`}
            >
              <IconEdit className="w-4 h-4" />
              Manual Entry
            </button>
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
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}

              <div className="space-y-3">
                {wasteItems.map((item, index) => (
                  <div
                    key={index}
                    className="bg-slate-50 rounded-xl p-4 border border-slate-200 hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {/* Diameter */}
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1.5">
                            Diameter (mm)
                          </label>
                          <input
                            type="number"
                            value={item.dia}
                            onChange={(e) => updateWasteItem(index, "dia", parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="16"
                            min="1"
                          />
                        </div>

                        {/* Length */}
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1.5">
                            Length (mm)
                          </label>
                          <input
                            type="number"
                            value={item.length}
                            onChange={(e) => updateWasteItem(index, "length", parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="2000"
                            min="2000"
                            step="100"
                          />
                          {item.length < 2000 && item.length > 0 && (
                            <p className="text-xs text-red-500 mt-1">Min: 2000mm</p>
                          )}
                        </div>

                        {/* Quantity */}
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1.5">
                            Quantity
                          </label>
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateWasteItem(index, "quantity", parseInt(e.target.value) || 0)}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="1"
                            min="1"
                          />
                        </div>
                      </div>

                      {/* Remove Button */}
                      <button
                        onClick={() => removeWasteItem(index)}
                        disabled={wasteItems.length === 1}
                        className="mt-6 p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
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
                className="mt-4 w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-slate-500 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50/50 transition-all flex items-center justify-center gap-2 font-medium"
              >
                <IconPlus className="w-5 h-5" />
                Add Another Waste Piece
              </button>

              {/* Summary */}
              <div className="mt-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
                <h3 className="text-sm font-semibold text-slate-900 mb-3">Summary</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500">Total Pieces</p>
                    <p className="text-2xl font-bold text-blue-600">{totalPieces}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Total Length</p>
                    <p className="text-2xl font-bold text-indigo-600">
                      {(totalLength / 1000).toFixed(2)}m
                    </p>
                  </div>
                </div>
              </div>

              {/* Info */}
              <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-xs text-amber-800">
                  <span className="font-semibold">Note:</span> Only waste pieces ≥ 2000mm (2m) can be added to inventory.
                  These pieces will be available for reuse in future calculations.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {uploadMode === "manual" && (
          <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200 bg-slate-50">
            <button
              onClick={onClose}
              disabled={uploading}
              className="px-5 py-2.5 border-2 border-slate-200 text-slate-700 rounded-xl hover:bg-slate-100 transition-all font-medium disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={uploading || wasteItems.length === 0}
              className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl hover:from-emerald-600 hover:to-green-700 transition-all font-medium shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <IconUpload className="w-5 h-5" />
              {uploading ? "Uploading..." : `Upload ${totalPieces} Piece${totalPieces !== 1 ? 's' : ''}`}
            </button>
          </div>
        )}
        {uploadMode === "excel" && (
          <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200 bg-slate-50">
            <button
              onClick={onClose}
              className="px-5 py-2.5 border-2 border-slate-200 text-slate-700 rounded-xl hover:bg-slate-100 transition-all font-medium"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
