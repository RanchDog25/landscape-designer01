import { supabase } from "./supabase";
import type { Database } from "@/types/supabase";

type DocumentType = Database["public"]["Enums"]["document_type"];

export async function uploadFile(
  file: File,
  bucket: "documents" | "media" | "assets",
  projectId?: string,
  metadata?: {
    title?: string;
    description?: string;
    type?: DocumentType;
    isPrivate?: boolean;
  },
) {
  try {
    // Generate a unique filename with original extension
    const fileExt = file.name.split(".").pop();
    const fileName = `${Math.random().toString(36).slice(2)}.${fileExt}`;

    // Upload file to storage with proper content type
    const { data: storageData, error: storageError } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: true,
        contentType: file.type, // Important: Set proper content type
      });

    if (storageError) {
      console.error("Storage upload error:", storageError);
      throw storageError;
    }

    // Get public URL
    const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
    const fullUrl = data.publicUrl;

    // Verify the file exists and is accessible
    const { data: checkData, error: checkError } = await supabase.storage
      .from(bucket)
      .download(fileName);

    if (checkError) {
      console.error("File verification failed:", checkError);
      throw checkError;
    }

    // Create database record based on bucket type
    if (bucket === "documents" && metadata?.type) {
      const { error: dbError } = await supabase.from("documents").insert({
        name: metadata.title || file.name,
        type: metadata.type,
        file_url: fullUrl,
        size_bytes: file.size,
        created_at: new Date().toISOString(),
      });

      if (dbError) {
        console.error("Error inserting document:", dbError);
        throw dbError;
      }
    }

    if (bucket === "media") {
      const { data: mediaData, error: dbError } = await supabase
        .from("media")
        .insert({
          title: metadata?.title || file.name,
          description: metadata?.description,
          file_url: fullUrl,
          is_private: metadata?.isPrivate || false,
        })
        .select();

      if (dbError) {
        console.error("Error inserting media record:", dbError);
        throw dbError;
      }

      // Return the full data including the URL for immediate display
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
