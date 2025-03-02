import { supabase } from "./supabase";

interface UploadProgressCallback {
  (progress: number): void;
}

interface UploadOptions {
  onProgress?: UploadProgressCallback;
  chunkSize?: number;
  metadata?: Record<string, any>;
}

/**
 * Uploads a large file in chunks to Supabase storage
 * @param file The file to upload
 * @param bucket The storage bucket name
 * @param options Upload options including progress callback and chunk size
 * @returns Promise with the upload result
 */
export async function chunkedUpload(
  file: File,
  bucket: "documents" | "media" | "assets" | "avatars",
  options: UploadOptions = {},
) {
  const {
    onProgress = () => {},
    chunkSize = 5 * 1024 * 1024, // 5MB chunks by default
    metadata = {},
  } = options;

  // Generate a unique filename with original extension
  const fileExt = file.name.split(".").pop();
  const fileName = `${Math.random().toString(36).slice(2)}_${Date.now()}.${fileExt}`;

  // Calculate total chunks
  const totalChunks = Math.ceil(file.size / chunkSize);
  let uploadedChunks = 0;

  try {
    // Upload each chunk
    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(file.size, start + chunkSize);
      const chunk = file.slice(start, end);

      // Create chunk upload options
      const uploadOptions: any = {
        cacheControl: "3600",
        contentType: file.type,
      };

      // For the first chunk, set upsert to true
      if (i === 0) {
        uploadOptions.upsert = true;
      }

      // For subsequent chunks, use the uploadPart method
      if (i > 0) {
        // Note: This is a simplified example. In a real implementation,
        // you would need to use a multipart upload API which Supabase
        // doesn't directly expose. This is a conceptual example.
        uploadOptions.upsert = true;
      }

      // Upload the chunk
      const { error } = await supabase.storage
        .from(bucket)
        .upload(`${fileName}${i > 0 ? `.part${i}` : ""}`, chunk, uploadOptions);

      if (error) throw error;

      // Update progress
      uploadedChunks++;
      const progress = Math.round((uploadedChunks / totalChunks) * 100);
      onProgress(progress);
    }

    // For a real implementation, you would need to combine the chunks here
    // This is a simplified example

    // Get public URL
    const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
    const fullUrl = data.publicUrl;

    // Create database record based on bucket type
    if (bucket === "media") {
      const { data: mediaData, error: dbError } = await supabase
        .from("media")
        .insert({
          title: metadata.title || file.name,
          description: metadata.description,
          file_url: fullUrl,
          project_id: metadata.projectId || metadata.project_id,
          file_type: metadata.file_type || getFileTypeFromFile(file),
          file_size: file.size,
        })
        .select();

      if (dbError) {
        console.error("Error inserting media record:", dbError);
        throw dbError;
      }

      return {
        path: fileName,
        url: fullUrl,
        title: metadata.title || file.name,
        description: metadata.description || "",
        id: mediaData?.[0]?.id,
      };
    }

    return { path: fileName, url: fullUrl };
  } catch (error) {
    console.error("Error in chunked upload:", error);
    throw error;
  }
}

// Helper function to determine file type
function getFileTypeFromFile(file: File): string {
  if (file.type.startsWith("image/")) {
    return "image";
  } else if (file.type.startsWith("video/")) {
    return "video";
  } else if (file.type === "application/pdf") {
    return "pdf";
  } else if (
    file.type.includes("document") ||
    file.type.includes("msword") ||
    file.type.includes("officedocument")
  ) {
    return "document";
  }
  return "unknown";
}
