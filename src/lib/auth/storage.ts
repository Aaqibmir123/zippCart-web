// Preferences and session markers only. Credentials stay in HttpOnly cookies.
const prefix = "zippcart.web.";
const storage = {
  async getItem(key: string) {
    return localStorage.getItem(prefix + key);
  },
  async setItem(key: string, value: string) {
    localStorage.setItem(prefix + key, value);
  },
  async removeItem(key: string) {
    localStorage.removeItem(prefix + key);
  },
  async getAllKeys() {
    return Object.keys(localStorage)
      .filter((key) => key.startsWith(prefix))
      .map((key) => key.slice(prefix.length));
  },
  async multiRemove(keys: string[]) {
    keys.forEach((key) => localStorage.removeItem(prefix + key));
  },
};
export default storage;
