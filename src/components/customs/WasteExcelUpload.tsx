"use client";
import { useState, useRef } from "react";
import { IconUpload, IconFileSpreadsheet, IconAlertCircle, IconCheck } from "@tabler/icons-react";

interface WasteExcelUploadProps {
  projectId: string;
  onSuccess: () => void;
}

import { toast } from "sonner";

export default function WasteExcelUpload({ projectId, onSuccess }: WasteExcelUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [details, setDetails] = useState<{ created: number; rows?: number; skipped: number; errors?: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      toast.error("Please upload an Excel file (.xlsx or .xls)");
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(null);
    setDetails(null);
    const toastId = toast.loading("Processing Excel file...");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("projectId", projectId);

      const response = await fetch("/api/waste/excel-upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        toast.success(data.message || "Waste upload successful!", { id: toastId });
        setSuccess(data.message);
        setDetails({
          created: data.created,
          rows: data.rows,
          skipped: data.skipped,
          errors: data.errors,
        });
        onSuccess();

        // Clear file input
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      } else {
        toast.error(data.error || "Failed to upload waste Excel", { id: toastId });
        setError(data.error || "Failed to upload waste Excel");
        if (data.details) {
          setDetails({ created: 0, rows: 0, skipped: 0, errors: data.details });
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload waste Excel", { id: toastId });
      setError(err instanceof Error ? err.message : "Failed to upload waste Excel");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Upload Button */}
      <div className="bg-white rounded-xl border-2 border-dashed border-slate-300 hover:border-blue-400 transition-all p-6">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center">
            <IconFileSpreadsheet className="w-8 h-8 text-blue-600" />
          </div>

          <div className="text-center">
            <h3 className="font-semibold text-slate-900 mb-1">Upload OFFCUT Excel File</h3>
            <p className="text-sm text-slate-500">
              Excel file with waste materials (Dia and Length columns)
            </p>
          </div>

          <label className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all cursor-pointer shadow-lg shadow-blue-500/20 font-medium disabled:opacity-50">
            <IconUpload className="w-5 h-5" />
            {uploading ? "Uploading..." : "Choose Excel File"}
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileSelect}
              disabled={uploading}
              className="hidden"
            />
          </label>

          <p className="text-xs text-slate-400">
            Supported formats: .xlsx, .xls
          </p>
        </div>
      </div>

      {/* Success Message */}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <IconCheck className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="flex-1">
              <p className="text-emerald-800 font-medium">{success}</p>
              {details && (
                <div className="mt-2 text-sm text-emerald-700">
                  <p>✓ Created: {details.created} pieces{details.rows ? ` from ${details.rows} rows` : ''}</p>
                  {details.skipped > 0 && (
                    <p className="text-amber-700">⚠ Skipped: {details.skipped} rows (validation errors)</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <IconAlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <div className="flex-1">
              <p className="text-red-800 font-medium">{error}</p>
              {details?.errors && details.errors.length > 0 && (
                <div className="mt-2 text-sm text-red-700">
                  <p className="font-medium mb-1">Validation errors:</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    {details.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Format Guide */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <h4 className="text-sm font-semibold text-blue-900 mb-2">Excel Format Requirements:</h4>
        <div className="text-sm text-blue-800 space-y-1">
          <p>• Column 1: <span className="font-mono bg-white px-1 rounded">Dia</span> or <span className="font-mono bg-white px-1 rounded">Diameter</span> (in mm)</p>
          <p>• Column 2: <span className="font-mono bg-white px-1 rounded">Length</span> or <span className="font-mono bg-white px-1 rounded">Cutting Length</span> (in mm, minimum 2000mm)</p>
          <p>• Column 3 (Optional): <span className="font-mono bg-white px-1 rounded">Repetition</span>, <span className="font-mono bg-white px-1 rounded">Quantity</span>, or <span className="font-mono bg-white px-1 rounded">Qty</span> (defaults to 1)</p>
          <p>• Each row = one waste specification</p>
          <p>• Empty rows will be skipped</p>
        </div>

        <div className="mt-3 bg-white rounded-lg p-3 border border-blue-100">
          <p className="text-xs font-semibold text-slate-600 mb-2">Example with Repetition:</p>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-1 px-2 font-semibold text-slate-700">Dia</th>
                <th className="text-left py-1 px-2 font-semibold text-slate-700">Cutting Length</th>
                <th className="text-left py-1 px-2 font-semibold text-slate-700">Repetition</th>
              </tr>
            </thead>
            <tbody className="text-slate-600">
              <tr className="border-b border-slate-100">
                <td className="py-1 px-2">16</td>
                <td className="py-1 px-2">4983</td>
                <td className="py-1 px-2">43</td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="py-1 px-2">20</td>
                <td className="py-1 px-2">3000</td>
                <td className="py-1 px-2">25</td>
              </tr>
              <tr>
                <td className="py-1 px-2">25</td>
                <td className="py-1 px-2">4500</td>
                <td className="py-1 px-2">10</td>
              </tr>
            </tbody>
          </table>
          <p className="text-xs text-slate-500 mt-2">
            ↑ This will create 43 + 25 + 10 = 78 waste pieces
          </p>
        </div>

        <div className="mt-3 bg-white rounded-lg p-3 border border-blue-100">
          <p className="text-xs font-semibold text-slate-600 mb-2">Example without Repetition (defaults to 1 each):</p>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-1 px-2 font-semibold text-slate-700">Dia</th>
                <th className="text-left py-1 px-2 font-semibold text-slate-700">Length</th>
              </tr>
            </thead>
            <tbody className="text-slate-600">
              <tr className="border-b border-slate-100">
                <td className="py-1 px-2">16</td>
                <td className="py-1 px-2">2500</td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="py-1 px-2">20</td>
                <td className="py-1 px-2">3000</td>
              </tr>
              <tr>
                <td className="py-1 px-2">25</td>
                <td className="py-1 px-2">4500</td>
              </tr>
            </tbody>
          </table>
          <p className="text-xs text-slate-500 mt-2">
            ↑ This will create 3 waste pieces (1 of each)
          </p>
        </div>
      </div>
    </div>
  );
}
