"use client";

import React, { useState } from "react";
import FileUpload from "./FileUpload";
import { parseExcelFile } from "@/utils/excelParser";
import { error } from "console";

interface ExcelUploaderProps {
  onDataParsed: (data: any[]) => void;
}

export default function ExcelUploader({ onDataParsed }: ExcelUploaderProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any[] | null>(null);

  const handleFileUpload = async (file: File) => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");
      const result = await res.json();

      console.log("server parsed Data : ", result.data);
      setData(result.data);
      // checking for length of json
    } catch (err) {
        console.error(err);
    } finally {
        setLoading(false);
    }
};
const numRows = data?.length || 0;
const numCols = data && data.length > 0 ? Object.keys(data[0]).length : 0;

  return (
    <div>
      <FileUpload onFileUpload={handleFileUpload} isLoading={loading}>
        {data && (
          <div className="mt-6 w-full max-w-lg">
            <h2 className="font-bold mb-2">Preview Data</h2>
            <p className="text-sm mb-2">
              Rows: <span className="font-medium">{numRows}</span>, Columns:{" "}
              <span className="font-medium">{numCols}</span>
            </p>

            {/* Optional: table preview */}
            <div className="overflow-auto max-h-64 border rounded">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-200 sticky top-0">
                  <tr>
                    {Object.keys(data[0]).map((col) => (
                      <th key={col} className="p-2 border">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.slice(0, 5).map(
                    (
                      row,
                      i // show first 5 rows
                    ) => (
                      <tr key={i} className="even:bg-gray-50">
                        {Object.values(row).map((val, j) => (
                          <td key={j} className="p-2 border">
                            {val}
                          </td>
                        ))}
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </FileUpload>
    </div>
  );
}
