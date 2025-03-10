import { supabase } from "./supabase";

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

export async function uploadFile(
  file: File,
  bucket: "documents" | "media" | "assets" | "avatars",
  projectId?: string,
  metadata?: {
    title?: string;
    description?: string;
    file_type?: string;
    file_size?: number;
  },
) {
  try {
    // Generate a unique filename with original extension
    const fileExt = file.name.split(".").pop();
    const fileName = `${Math.random().toString(36).slice(2)}_${Date.now()}.${fileExt}`;

    // Upload file to storage with content type
    const { error: storageError } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, {
        contentType: file.type,
        cacheControl: "3600",
      });

    if (storageError) {
      console.error("Storage upload error:", storageError);
      throw storageError;
    }

    // Get public URL
    const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
    const fullUrl = data.publicUrl;

    // Create database record based on bucket type
    if (bucket === "media") {
      const { data: mediaData, error: dbError } = await supabase
        .from("media")
        .insert({
          title: metadata?.title || file.name,
          description: metadata?.description,
          file_url: fullUrl,
          project_id: projectId,
          file_type: metadata?.file_type || getFileTypeFromFile(file),
          file_size: metadata?.file_size || file.size,
        })
        .select();

      if (dbError) {
        console.error("Error inserting media record:", dbError);
        throw dbError;
      }

      return {
        path: fileName,
        url: fullUrl,
        title: metadata?.title || file.name,
        description: metadata?.description || "",
        id: mediaData?.[0]?.id,
      };
    }

    return { path: fileName, url: fullUrl };
  } catch (error) {
    console.error("Error uploading file:", error);
    throw error;
  }
}
