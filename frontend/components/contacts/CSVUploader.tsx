"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileText, CheckCircle, XCircle } from "lucide-react";
import { contactApi } from "@/lib/api-client";

interface CSVUploaderProps {
  campaignId: string;
  onImport?: (count: number) => void;
}

export function CSVUploader({ campaignId, onImport }: CSVUploaderProps) {
  const [status, setStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [fileName, setFileName] = useState("");

  const onDrop = useCallback(
    async (accepted: File[]) => {
      const file = accepted[0];
      if (!file) return;

      setFileName(file.name);
      setStatus("uploading");
      setMessage("");

      try {
        const contacts = await contactApi.uploadFile(campaignId, file);
        setStatus("success");
        setMessage(`Imported ${contacts.length} contacts`);
        onImport?.(contacts.length);
      } catch (err) {
        setStatus("error");
        setMessage(err instanceof Error ? err.message : "Upload failed");
      }
    },
    [campaignId, onImport]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.ms-excel": [".xls"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
    },
    maxFiles: 1,
    disabled: status === "uploading",
  });

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50 hover:bg-muted/50"
        } ${status === "uploading" ? "opacity-60 cursor-not-allowed" : ""}`}
      >
        <input {...getInputProps()} />
        <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm font-medium">
          {isDragActive ? "Drop your file here" : "Drag & drop or click to upload"}
        </p>
        <p className="text-xs text-muted-foreground mt-1">CSV, XLS, or XLSX files</p>
      </div>

      {fileName && (
        <div className="flex items-center gap-2 text-sm">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">{fileName}</span>
        </div>
      )}

      {status === "uploading" && (
        <div className="flex items-center gap-2 text-sm text-blue-600">
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          Processing file...
        </div>
      )}

      {status === "success" && (
        <div className="flex items-center gap-2 text-sm text-green-600">
          <CheckCircle className="h-4 w-4" />
          {message}
        </div>
      )}

      {status === "error" && (
        <div className="flex items-center gap-2 text-sm text-red-600">
          <XCircle className="h-4 w-4" />
          {message}
        </div>
      )}

      <div className="text-xs text-muted-foreground">
        <p className="font-medium mb-1">Expected CSV columns (any order):</p>
        <code className="bg-muted px-2 py-1 rounded text-xs">
          phone, name, business_name, email, address
        </code>
        <p className="mt-1">The <code>phone</code> column is required.</p>
      </div>
    </div>
  );
}
