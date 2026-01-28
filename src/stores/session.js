import { defineStore } from 'pinia';

// Pinia store for managing study sessions persisted in the backend.
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const useSessionStore = defineStore('session', {
  state: () => ({
    byId: {},        // sessions keyed by id
    loading: false,  // global loading flag
    error: null,     // global error message
  }),
  getters: {
    sessions: (state) => Object.values(state.byId),
    getSession: (state) => (id) => state.byId[id] || null,
  },
  actions: {
    // Fetch all sessions from the backend and normalise snake_case fields
    async fetchSessions() {
      this.loading = true;
      this.error = null;
      try {
        const res = await fetch(`${API_BASE}/api/sessions`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to fetch sessions');
        const nextById = {};
        data.data.forEach((s) => {
          nextById[s.id] = {
            id: s.id,
            privacy: s.privacy,
            topic: s.topic,
            duration: s.duration,
            adminUsername: s.admin_username,
            startTime: s.start_time,
            invitedFriendIds: s.invited_ids || [],
            todos: s.todos || [],
            personalTodos: s.personal_todos || [],
          };
        });
        this.byId = nextById;
      } catch (err) {
        this.error = err.message || 'Error fetching sessions';
        throw err;
      } finally {
        this.loading = false;
      }
    },

    // Fetch a single session by id
    async fetchSession(id) {
      this.loading = true;
      this.error = null;
      try {
        const res = await fetch(`${API_BASE}/api/sessions/${id}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load session');
        this.byId[id] = {
          id: data.id,
          privacy: data.privacy,
          topic: data.topic,
          duration: data.duration,
          adminUsername: data.admin_username,
          startTime: data.start_time,
          invitedFriendIds: data.invited_ids || [],
          todos: data.todos || [],
          personalTodos: data.personal_todos || [],
        };
        return this.byId[id];
      } catch (err) {
        this.error = err.message || 'Error loading session';
        throw err;
      } finally {
        this.loading = false;
      }
    },

    // Create a new session
    async createSession(payload) {
      const res = await fetch(`${API_BASE}/api/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create session');
      await this.fetchSession(data.id);
      return data.id;
    },

    // Update an existing session
    async updateSession(id, patch) {
      const res = await fetch(`${API_BASE}/api/sessions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update session');
      return await this.fetchSession(id);
    },

    // Convenience wrappers for updating different session parts
    updateInvitedFriendIds(id, invitedFriendIds) {
      this.byId[id] && (this.byId[id].invitedFriendIds = invitedFriendIds);
      this.updateSession(id, { invitedFriendIds }).catch((e) =>
        console.error('Failed to update invited ids', e),
      );
    },
    updateTodos(id, todos) {
      this.byId[id] && (this.byId[id].todos = todos);
      this.updateSession(id, { todos }).catch((e) =>
        console.error('Failed to update todos', e),
      );
    },
    updatePersonalTodos(id, personalTodos) {
      this.byId[id] && (this.byId[id].personalTodos = personalTodos);
      this.updateSession(id, { personal_todos: personalTodos }).catch((e) =>
        console.error('Failed to update personal todos', e),
      );
    },
  },
});