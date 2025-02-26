import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Upload, Download, Trash2 } from "lucide-react";
import { uploadFile } from "@/lib/uploadFile";
import { supabase } from "@/lib/supabase";
import { Document, Page } from "react-pdf";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import type { Database } from "@/types/supabase";

import "@/lib/pdfjs-worker";
import { pdfjs } from "react-pdf";

console.log("[DocumentManager] PDF.js version:", pdfjs.version);

type Document = Database["public"]["Tables"]["documents"]["Row"];

interface DocumentManagerProps {
  projectId?: string;
}

const DocumentManager = ({ projectId }: DocumentManagerProps) => {
  const [activeTab, setActiveTab] = useState<"technical" | "business">(
    "technical",
  );
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedPdf, setSelectedPdf] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const loadDocuments = async () => {
    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .eq("type", activeTab);

    if (error) {
      console.error("Error loading documents:", error);
      return;
    }

    setDocuments(data || []);
  };

  useEffect(() => {
    loadDocuments();
  }, [activeTab]);

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      const file = files[0];
      await uploadFile(file, "documents", undefined, {
        title: file.name,
        type: activeTab,
      });

      await loadDocuments();

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("Error uploading file:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (documentId: string) => {
    const document = documents.find((d) => d.id === documentId);
    if (!document) return;

    try {
      // Delete from storage
      const fileName = document.file_url.split("/").pop();
      if (fileName) {
        await supabase.storage.from("documents").remove([fileName]);
      }

      // Delete from database
      await supabase.from("documents").delete().eq("id", documentId);

      await loadDocuments();
    } catch (error) {
      console.error("Error deleting document:", error);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const DocumentList = ({ docs }: { docs: Document[] }) => (
    <ScrollArea className="h-[700px] w-full pr-4">
      <div className="space-y-4">
        {docs.map((doc) => (
          <Card key={doc.id} className="p-4 hover:bg-gray-50">
            <div className="flex items-center justify-between">
              <div
                className="flex items-center space-x-4 cursor-pointer"
                onClick={() => setSelectedPdf(doc.file_url)}
              >
                <FileText className="h-6 w-6 text-gray-500" />
                <div>
                  <p className="font-medium">{doc.name}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(doc.created_at || "").toLocaleDateString()} •{" "}
                    {formatFileSize(doc.size_bytes || 0)}
                  </p>
                </div>
              </div>
              <div className="flex space-x-2">
                <Button variant="ghost" size="icon" asChild>
                  <a
                    href={doc.file_url}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Download className="h-4 w-4" />
                  </a>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(doc.id)}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );

  return (
    <div className="h-full w-full bg-white p-6">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold">Document Manager</h2>
        <div className="flex space-x-4">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            {isUploading ? "Uploading..." : "Upload Document"}
          </Button>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as typeof activeTab)}
        className="w-full"
      >
        <TabsList className="mb-4">
          <TabsTrigger value="technical">Technical Documents</TabsTrigger>
          <TabsTrigger value="business">Business Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="technical">
          <DocumentList docs={documents} />
        </TabsContent>

        <TabsContent value="business">
          <DocumentList docs={documents} />
        </TabsContent>
      </Tabs>

      <Dialog open={!!selectedPdf} onOpenChange={() => setSelectedPdf(null)}>
        <DialogContent className="max-w-4xl h-[80vh]">
          <DialogHeader>
            <DialogTitle>Document Viewer</DialogTitle>
            <DialogDescription>
              View and navigate through document pages. Click to zoom or
              download.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1 w-full h-full">
            {selectedPdf && (
              <Document
                file={selectedPdf}
                onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                loading={<Loader2 className="h-8 w-8 animate-spin" />}
                error={
                  <div>
                    Failed to load PDF file. Please try downloading instead.
                  </div>
                }
              >
                {Array.from(new Array(numPages || 0), (_, index) => (
                  <Page
                    key={`page_${index + 1}`}
                    pageNumber={index + 1}
                    width={800}
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                  />
                ))}
              </Document>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DocumentManager;
