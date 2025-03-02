import React, { useState, useEffect } from "react";
import {
  FileText,
  FileImage,
  FileVideo,
  File,
  ChevronLeft,
  ChevronRight,
  Download,
} from "lucide-react";
import { Document, Page, pdfjs } from "react-pdf";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

// Initialize PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";

interface MediaRendererProps {
  url: string;
  title: string;
  fileType?: string;
  className?: string;
  controls?: boolean;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  onClick?: () => void;
  fullView?: boolean;
}

const MediaRenderer: React.FC<MediaRendererProps> = ({
  url,
  title,
  fileType,
  className = "",
  controls = true,
  autoPlay = false,
  muted = true,
  loop = false,
  onClick,
  fullView = false,
}) => {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Determine file type if not provided
  const getFileType = () => {
    if (fileType) return fileType;

    const extension = url.split(".").pop()?.toLowerCase();

    if (
      ["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(extension || "")
    ) {
      return "image";
    } else if (["mp4", "webm", "ogg", "mov"].includes(extension || "")) {
      return "video";
    } else if (["pdf"].includes(extension || "")) {
      return "pdf";
    } else if (["doc", "docx"].includes(extension || "")) {
      return "document";
    }

    return "unknown";
  };

  const type = getFileType();

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setIsLoading(false);
  };

  const onDocumentLoadError = (error: Error) => {
    console.error("Error loading PDF:", error);
    setError(error);
    setIsLoading(false);
  };

  const changePage = (offset: number) => {
    setPageNumber((prevPageNumber) => {
      const newPageNumber = prevPageNumber + offset;
      return numPages ? Math.min(Math.max(1, newPageNumber), numPages) : 1;
    });
  };

  const previousPage = () => changePage(-1);
  const nextPage = () => changePage(1);

  const renderPdfPreview = () => {
    if (fullView) {
      return (
        <div
          className={`flex flex-col items-center w-full h-full ${className}`}
        >
          <div className="flex-1 w-full overflow-auto">
            <ScrollArea className="h-full w-full">
              <Document
                file={url}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={onDocumentLoadError}
                loading={
                  <div className="flex items-center justify-center h-full">
                    Loading PDF...
                  </div>
                }
                error={
                  <div className="text-red-500">
                    Failed to load PDF. Please try downloading it.
                  </div>
                }
              >
                <Page
                  pageNumber={pageNumber}
                  width={fullView ? 800 : 300}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                />
              </Document>
            </ScrollArea>
          </div>

          {numPages && numPages > 0 && (
            <div className="flex items-center justify-between w-full mt-4 px-4">
              <Button
                variant="outline"
                size="sm"
                onClick={previousPage}
                disabled={pageNumber <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <div className="text-sm">
                Page {pageNumber} of {numPages}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={nextPage}
                disabled={pageNumber >= (numPages || 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>

              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-4"
              >
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </a>
            </div>
          )}
        </div>
      );
    } else {
      // Thumbnail preview for grid view
      return (
        <div
          className={`relative flex flex-col items-center justify-center w-full h-full bg-gray-100 ${className}`}
          onClick={onClick}
        >
          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : error ? (
            <>
              <FileText className="w-16 h-16 text-gray-400" />
              <p className="mt-2 text-sm font-medium">{title}</p>
              <p className="text-xs text-red-500">Error loading preview</p>
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center overflow-hidden">
              <Document
                file={url}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={onDocumentLoadError}
                loading={<div className="animate-pulse">Loading...</div>}
              >
                <Page
                  pageNumber={1}
                  width={300}
                  height={200}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                  scale={0.5}
                />
              </Document>
            </div>
          )}
        </div>
      );
    }
  };

  const renderMedia = () => {
    switch (type) {
      case "image":
        return (
          <img
            src={url}
            alt={title}
            className={`object-cover w-full h-full ${className}`}
            onClick={onClick}
            onError={(e) => {
              console.error("Image failed to load:", url);
              e.currentTarget.src = `https://picsum.photos/seed/${title}/800/600`;
            }}
            loading="lazy"
          />
        );

      case "video":
        return (
          <video
            src={url}
            className={`object-cover w-full h-full ${className}`}
            controls={controls}
            autoPlay={autoPlay}
            muted={muted}
            loop={loop}
            onClick={onClick ? onClick : undefined}
            preload={fullView ? "auto" : "metadata"}
            poster={`https://api.dicebear.com/7.x/shapes/svg?seed=${title}`}
          >
            <source src={url} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        );

      case "pdf":
        return renderPdfPreview();

      case "document":
        return (
          <div
            className={`flex flex-col items-center justify-center w-full h-full bg-gray-100 ${className}`}
            onClick={onClick}
          >
            <FileText className="w-16 h-16 text-gray-400" />
            <p className="mt-2 text-sm font-medium">{title}</p>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 text-xs text-blue-500 hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              Download Document
            </a>
          </div>
        );

      default:
        return (
          <div
            className={`flex flex-col items-center justify-center w-full h-full bg-gray-100 ${className}`}
            onClick={onClick}
          >
            <File className="w-16 h-16 text-gray-400" />
            <p className="mt-2 text-sm font-medium">{title}</p>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 text-xs text-blue-500 hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              Download File
            </a>
          </div>
        );
    }
  };

  // File type icon for thumbnails
  const renderFileTypeIcon = () => {
    switch (type) {
      case "image":
        return <FileImage className="h-5 w-5 text-blue-500" />;
      case "video":
        return <FileVideo className="h-5 w-5 text-red-500" />;
      case "pdf":
        return <FileText className="h-5 w-5 text-orange-500" />;
      case "document":
        return <FileText className="h-5 w-5 text-green-500" />;
      default:
        return <File className="h-5 w-5 text-gray-500" />;
    }
  };

  return (
    <div className="relative">
      {renderMedia()}
      {!fullView && (
        <div className="absolute top-2 right-2 bg-white rounded-full p-1 shadow-sm">
          {renderFileTypeIcon()}
        </div>
      )}
    </div>
  );
};

export default MediaRenderer;
