import { defineStore } from 'pinia';

// Pinia store for managing the single real user (mario) and the fake friends list.
// The application uses only one real user. All others are fake users for demonstration.
// There is no login page; instead, the user store is initialized on app startup.

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const useUserStore = defineStore('user', {
  state: () => ({
    currentUser: null,
    friends: [],
    loading: false,
    error: null,
  }),
  getters: {
    isLoggedIn: (state) => !!state.currentUser,
    username: (state) => state.currentUser?.username ?? null,
  },
  actions: {
    // Initialize the user store: fetch the real user and the list of fake friends.
    async init() {
      if (this.currentUser) return;
      this.loading = true;
      this.error = null;
      try {
        // Fetch the real user (mario) from the backend.  Use text() first
        // to avoid JSON.parse errors when the response is not JSON (e.g., HTML error pages).
        const userRes = await fetch(`${API_BASE}/api/users/mario`);
        const userText = await userRes.text();
        let userData;
        try {
          userData = JSON.parse(userText);
        } catch {
          throw new Error(`Invalid JSON response for user: ${userText}`);
        }
        if (!userRes.ok) {
          throw new Error(userData.error || 'Failed to load user');
        }
        this.currentUser = userData;

        // Fetch the list of fake friends in the same way.
        const friendsRes = await fetch(`${API_BASE}/api/friends`);
        const friendsText = await friendsRes.text();
        let friendsData;
        try {
          friendsData = JSON.parse(friendsText);
        } catch {
          throw new Error(`Invalid JSON response for friends: ${friendsText}`);
        }
        if (!friendsRes.ok) {
          throw new Error(friendsData.error || 'Failed to load friends');
        }
        // Friends list consists of objects with id and username.
        this.friends = (friendsData.data || []).map((f) => ({
          id: f.id,
          username: f.username,
        }));
      } catch (err) {
        this.error = err.message || 'Error initializing user';
        throw err;
      } finally {
        this.loading = false;
      }
    },

    // Update the current user’s details (e.g. flowers, focus_time) and reload.
    async updateCurrentUser(patch) {
      if (!this.currentUser?.username) {
        throw new Error('No current user');
      }
      const username = this.currentUser.username;
      const res = await fetch(
        `${API_BASE}/api/users/${encodeURIComponent(username)}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update user');
      }
      // Reload the current user from the backend to keep local state in sync
      const freshRes = await fetch(
        `${API_BASE}/api/users/${encodeURIComponent(username)}`
      );
      const freshData = await freshRes.json();
      if (!freshRes.ok) {
        throw new Error(freshData.error || 'Failed to reload user');
      }
      this.currentUser = freshData;
    },
  },
});