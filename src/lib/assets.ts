import { supabase } from "./supabase";

export async function uploadAsset(file: File, fileName: string) {
  if (!file) throw new Error("No file provided");

  try {
    // Upload new file with upsert
    const { data, error } = await supabase.storage
      .from("assets")
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: true,
      });

    if (error) throw error;

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("assets").getPublicUrl(fileName);

    // Add cache busting
    const url = new URL(publicUrl);
    url.searchParams.set("v", new Date().getTime().toString());
    return url.toString();
  } catch (error) {
    console.error("Error uploading asset:", error);
    throw error;
  }
}

export async function getAssetUrl(path: string) {
  try {
    // Check if file exists
    const { data } = await supabase.storage
      .from("assets")
      .list("", { search: path });

    if (!data?.length) return null;

    // Get public URL with cache busting
    const {
      data: { publicUrl },
    } = supabase.storage.from("assets").getPublicUrl(path);

    const url = new URL(publicUrl);
    url.searchParams.set("v", new Date().getTime().toString());
    return url.toString();
  } catch (error) {
    console.error("Error getting asset URL:", error);
    return null;
  }
}
