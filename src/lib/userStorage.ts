export interface User {
  id: string;
  username: string;
  password: string;
  avatarUrl?: string;
}

const USERS_KEY = "app_users";
const CURRENT_USER_KEY = "current_user";

export const getUsers = (): User[] => {
  const users = localStorage.getItem(USERS_KEY);
  return users ? JSON.parse(users) : [];
};

export const saveUser = (user: User): void => {
  const users = getUsers();
  users.push(user);
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

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

export const updateUserAvatar = (userId: string, avatarUrl: string): void => {
  const users = getUsers();
  const userIndex = users.findIndex((u) => u.id === userId);
  if (userIndex >= 0) {
    users[userIndex].avatarUrl = avatarUrl;
    localStorage.setItem(USERS_KEY, JSON.stringify(users));

    const currentUser = getCurrentUser();
    if (currentUser && currentUser.id === userId) {
      setCurrentUser({ ...currentUser, avatarUrl });
    }
  }
};
