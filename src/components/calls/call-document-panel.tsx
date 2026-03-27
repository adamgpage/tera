"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface SharedFile {
  id: string;
  filename: string;
  file_type: string;
  file_size: number;
  storage_url: string;
  uploaded_by_name: string;
}

interface CallDocumentPanelProps {
  conversationId: string;
  files: SharedFile[];
  onUpload: (file: File) => void;
  isUploading?: boolean;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function CallDocumentPanel({
  files,
  onUpload,
  isUploading,
}: CallDocumentPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <Card className={`transition-all ${isExpanded ? "w-80" : "w-12"}`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-3 text-left flex items-center gap-2 border-b"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        {isExpanded && <span className="text-sm font-medium">Documents ({files.length})</span>}
      </button>

      {isExpanded && (
        <div className="p-3 space-y-3">
          {files.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">No documents shared yet</p>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {files.map((file) => (
                <a
                  key={file.id}
                  href={file.storage_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-2 rounded-lg border hover:bg-gray-50 transition-colors"
                >
                  <div className="text-sm font-medium truncate">{file.filename}</div>
                  <div className="text-xs text-gray-500">
                    {formatFileSize(file.file_size)} · by {file.uploaded_by_name}
                  </div>
                </a>
              ))}
            </div>
          )}

          <div className="border-t pt-3">
            <label className="block">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                disabled={isUploading}
                onClick={() => document.getElementById("call-file-upload")?.click()}
              >
                {isUploading ? "Uploading…" : "Share a File"}
              </Button>
              <input
                id="call-file-upload"
                type="file"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onUpload(file);
                }}
              />
            </label>
          </div>
        </div>
      )}
    </Card>
  );
}
