"use client";
import React, { useState } from "react";
import { EXPECTED_HEADERS, SAMPLE_DATA } from "@/utils/excelTemplate";

export default function ExcelFormatGuide() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="mb-6">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
      >
        <span>📋</span>
        Excel Format Guide
        <span className={`transform transition-transform ${isOpen ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>

      {isOpen && (
        <div className="mt-4 p-6 bg-gray-50 border border-gray-200 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Required Excel Column Format
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Expected Headers */}
            <div>
              <h4 className="font-medium text-gray-700 mb-3">Expected Columns:</h4>
              <div className="space-y-2">
                {Object.entries(EXPECTED_HEADERS).map(([header, type]) => (
                  <div key={header} className="flex justify-between items-center p-2 bg-white rounded border">
                    <span className="font-mono text-sm text-blue-600">{header}</span>
                    <span className="text-xs text-gray-500">{type}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Sample Data */}
            <div>
              <h4 className="font-medium text-gray-700 mb-3">Sample Data:</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs border border-gray-300">
                  <thead className="bg-gray-100">
                    <tr>
                      {Object.keys(EXPECTED_HEADERS).map((header) => (
                        <th key={header} className="px-2 py-1 border border-gray-300 font-medium text-xs">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {SAMPLE_DATA.slice(0, 2).map((row, index) => (
                      <tr key={index} className="bg-white">
                        <td className="px-2 py-1 border border-gray-300">{row["SI no"]}</td>
                        <td className="px-2 py-1 border border-gray-300">{row["Label"]}</td>
                        <td className="px-2 py-1 border border-gray-300">{row["Dia"]}</td>
                        <td className="px-2 py-1 border border-gray-300">{row["Total Bars"]}</td>
                        <td className="px-2 py-1 border border-gray-300">{row["Cutting Length"].toFixed(3)}</td>
                        <td className="px-2 py-1 border border-gray-300">{row["Lap Length"].toFixed(3)}</td>
                        <td className="px-2 py-1 border border-gray-300">{row["No of lap"]}</td>
                        <td className="px-2 py-1 border border-gray-300">{row["Element"]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
              <p className="text-sm text-yellow-800">
                <strong>Important:</strong> Column headers must match exactly (case-sensitive). 
                The &quot;Label&quot; field is required after &quot;SI no&quot;. 
                Cutting Length and Lap Length will be rounded to 3 decimal places.
              </p>
            </div>
            <div className="p-3 bg-blue-50 border border-blue-200 rounded">
              <p className="text-sm text-blue-800">
                <strong>Display Note:</strong> In the table view, SI no and Label will be combined into a BarCode field (format: SI no/Label/Dia).
                The &quot;No of lap&quot; column will be hidden in the display.
              </p>
              <p className="text-xs text-blue-600 mt-1">
                Example: SI no &quot;1&quot;, Label &quot;B1&quot;, Dia &quot;12&quot; → BarCode &quot;1/B1/12&quot;
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}