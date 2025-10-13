const STORAGE_KEY = "user";

const authService = {
  saveUser(user, staySignedIn) {
    const storage = staySignedIn ? localStorage : sessionStorage;
    storage.setItem(STORAGE_KEY, JSON.stringify(user));
    // Remove from the other storage to avoid conflicts
    (staySignedIn ? sessionStorage : localStorage).removeItem(STORAGE_KEY);
  },
  getUser() {
    // Prefer sessionStorage if present, else localStorage
    const user =
      sessionStorage.getItem(STORAGE_KEY) || localStorage.getItem(STORAGE_KEY);
    return user ? JSON.parse(user) : null;
  },
  logout() {
    sessionStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_KEY);
  },
  getToken() {
    const user = authService.getUser();
    return user ? user.token : null;
  },
};

export default authService;
