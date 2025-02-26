import { supabase } from "./supabase";

export async function getUserRole(userId: string) {
  const { data, error } = await supabase
    .from("users")
    .select("role")
    .eq("id", userId)
    .single();

  if (error) {
    console.error("Error fetching user role:", error);
    return null;
  }

  return data?.role;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;

  if (data.user) {
    const role = await getUserRole(data.user.id);
    return { user: data.user, role };
  }

  return null;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
