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
      <div className="rounded-[16px] border-2 border-dashed border-[var(--color-line-2)] bg-white p-6 transition-all hover:border-accent/40">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-accent/10 to-sky/[0.08]">
            <IconFileSpreadsheet className="h-8 w-8 text-accent" />
          </div>

          <div className="text-center">
            <h3 className="mb-1 font-display text-[16px] font-bold tracking-[-0.02em]">Upload Offcut Excel File</h3>
            <p className="font-body text-sm text-ink-2">
              Excel file with offcut materials (Dia and Length columns)
            </p>
          </div>

          <label className="flex cursor-pointer items-center gap-2 rounded-full bg-accent px-5 py-2.5 font-body font-bold text-white shadow-[0_8px_24px_rgba(99,102,241,0.34)] transition-all hover:-translate-y-0.5 hover:bg-accent-deep">
            <IconUpload className="w-5 h-5" />
            {uploading ? "Uploading…" : "Choose Excel File"}
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileSelect}
              disabled={uploading}
              className="absolute h-0 w-0 overflow-hidden opacity-0"
            />
          </label>

          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-ink-3">
            .xlsx · .xls
          </p>
        </div>
      </div>

      {/* Success Message */}
      {success && (
        <div className="rounded-[14px] border border-grass/20 bg-grass/[0.07] p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-grass/15">
              <IconCheck className="h-5 w-5 text-grass" />
            </div>
            <div className="flex-1">
              <p className="font-body font-semibold text-[#059669]">{success}</p>
              {details && (
                <div className="mt-2 font-body text-sm text-[#059669]">
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
        <div className="rounded-[14px] border border-rose-200 bg-rose-50 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-100">
              <IconAlertCircle className="h-5 w-5 text-rose-600" />
            </div>
            <div className="flex-1">
              <p className="font-body font-semibold text-rose-800">{error}</p>
              {details?.errors && details.errors.length > 0 && (
                <div className="mt-2 font-body text-sm text-rose-700">
                  <p className="mb-1 font-medium">Validation errors:</p>
                  <ul className="list-inside list-disc space-y-0.5">
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
      <div className="rounded-[14px] border border-accent/15 bg-accent/[0.05] p-4">
        <h4 className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-accent">Excel Format Requirements</h4>
        <div className="space-y-1 font-body text-sm text-ink-2">
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
