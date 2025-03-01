import { supabase } from "./supabase";

export interface User {
  id: string;
  username: string;
  avatar_url?: string;
  role: string;
}

const CURRENT_USER_KEY = "current_user";

export const getCurrentUser = (): User | null => {
  const user = localStorage.getItem(CURRENT_USER_KEY);
  return user ? JSON.parse(user) : null;
};

export const setCurrentUser = (user: User | null): void => {
  if (user) {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(CURRENT_USER_KEY);
  }
};

export const login = async (
  username: string,
  password: string,
): Promise<User> => {
  const { data, error } = await supabase
    .from("users")
    .select()
    .eq("username", username)
    .eq("password", password)
    .single();

  if (error) throw new Error("Invalid username or password");
  if (!data) throw new Error("User not found");

  const user = {
    id: data.id,
    username: data.username,
    avatar_url: data.avatar_url,
    role: data.role,
  };

  setCurrentUser(user);
  return user;
};

export const register = async (
  username: string,
  password: string,
): Promise<void> => {
  // Check if username exists
  const { data: existingUser } = await supabase
    .from("users")
    .select()
    .eq("username", username)
    .single();

  if (existingUser) {
    throw new Error("Username already exists");
  }

  // Create new user
  const { error } = await supabase.from("users").insert({
    username,
    password,
    role: "user",
    avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
  });

  if (error) throw error;
};

export const updateAvatar = async (
  userId: string,
  avatarUrl: string,
): Promise<void> => {
  const { error } = await supabase
    .from("users")
    .update({ avatar_url: avatarUrl })
    .eq("id", userId);

  if (error) throw error;

  const currentUser = getCurrentUser();
  if (currentUser && currentUser.id === userId) {
    setCurrentUser({ ...currentUser, avatar_url: avatarUrl });
  }
};

export const getUserProjects = async (userId: string) => {
  const { data, error } = await supabase
    .from("user_projects")
    .select(
      `
      project_id,
      projects (id, name)
    `,
    )
    .eq("user_id", userId);

  if (error) throw error;
  return data?.map((up) => up.projects) || [];
};

export const logout = (): void => {
  setCurrentUser(null);
};
