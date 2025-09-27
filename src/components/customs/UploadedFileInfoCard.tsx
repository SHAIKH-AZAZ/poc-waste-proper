"use client";
import React from "react";
import AnimatedNumber from "./AnimatedNumber";

interface UploadedFileInfoCardProps {
  fileName: string;
  rows: any[];
  headers: string[];
  jsonData: any[];
  clearData: () => void;
  downloadResults: () => void;
  datasetSizeInfo?: {
    fileSizeMB: number;
    estimatedMemoryUsageMB: number;
    isLargeDataset: boolean;
    isVeryLargeDataset: boolean;
  };
}

const UploadedFileInfoCard: React.FC<UploadedFileInfoCardProps> = ({
  fileName,
  rows,
  headers,
  jsonData,
  clearData,
  downloadResults,
  datasetSizeInfo,
}) => {
  if (!fileName) return null;

  return (
    <div className="max-w-md mx-auto bg-[#ECECEC] shadow-lg rounded-2xl border border-gray-200 p-6 mb-8 text-center animate-fade-in">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl py-3 px-4 mb-5 shadow">
        <p className="text-lg font-bold tracking-wide">
          📂 File: <span className="font-normal">{fileName}</span>
        </p>
      </div>

      {rows.length > 0 ? (
        <>
          {/* Stats */}
          <div className="space-y-2 mb-4">
            <p className="text-gray-700 font-medium">
              <AnimatedNumber value={rows.length} />{" "}
              <span className="text-sm text-gray-500">rows</span>,{" "}
              <AnimatedNumber value={headers.length} />{" "}
              <span className="text-sm text-gray-500">columns</span>
            </p>
            <p className="text-gray-700 font-medium">
              JSON Records:{" "}
              <span className="text-indigo-600 font-semibold">
                <AnimatedNumber value={jsonData.length} />
              </span>
            </p>

            {/* Dataset Size Information */}
            {datasetSizeInfo && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-gray-600">
                    <span className="font-medium">File Size:</span>
                    <div className="text-indigo-600 font-semibold">
                      {datasetSizeInfo.fileSizeMB.toFixed(2)} MB
                    </div>
                  </div>
                  <div className="text-gray-600">
                    <span className="font-medium">Memory Est:</span>
                    <div className="text-indigo-600 font-semibold">
                      ~{datasetSizeInfo.estimatedMemoryUsageMB.toFixed(0)} MB
                    </div>
                  </div>
                </div>

                {/* Dataset Size Indicator */}
                {datasetSizeInfo.isLargeDataset && (
                  <div className="mt-2 flex items-center justify-center">
                    <div
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        datasetSizeInfo.isVeryLargeDataset
                          ? "bg-red-100 text-red-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {datasetSizeInfo.isVeryLargeDataset ? "⚠ Very Large Dataset" : "⚠ Large Dataset"}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="flex justify-center gap-4 mt-6">
            <button
              onClick={clearData}
              className="px-6 py-3 rounded-xl border border-gray-300 text-gray-700 font-semibold 
              bg-white hover:bg-red-500 hover:text-white 
              focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-opacity-50 
              active:scale-95 transition-transform duration-200 shadow-sm hover:shadow-md"
            >
              Clear
            </button>

            <button
              onClick={downloadResults}
              className="px-5 py-2.5 rounded-xl bg-green-600 text-white font-medium shadow-md hover:bg-green-700 active:scale-95 transition-all"
            >
              ⬇ Download Results
            </button>
          </div>
        </>
      ) : (
        <p className="text-gray-500 italic">No data uploaded yet</p>
      )}
    </div>
  );
};

export default UploadedFileInfoCard;
