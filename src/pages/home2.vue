<template>
  <div class="home-page">
    <!-- Header -->
    <div class="header">
      <div class="greeting">
        <h1>Hello, Luca</h1>
        <p class="subtitle">Ready to grow your focus?</p>
      </div>
      <div class="avatar">
        <img src="@/assets/user.jpg" alt="avatar" />
      </div>
    </div>

    <!-- Stats -->
    <div class="stats">
      <div class="stat-card">
        <h2>3</h2>
        <p>Streaks</p>
      </div>
      <div class="stat-card">
        <h2>13</h2>
        <p>Blooms</p>
      </div>
    </div>

    <!-- Main Actions -->
    <div class="actions">
      <div class="action-card primary" @click="goAvailable">
        <div class="text">
          <h3>Available Session</h3>
          <p>Join a co-study room</p>
        </div>
        <div class="icon">👥</div>
      </div>

      <div class="action-card" @click="goHost">
        <div class="text">
          <h3>Host Session</h3>
          <p>Set up your co-study room</p>
        </div>
        <div class="icon">＋</div>
      </div>

      <div class="action-card" @click="goGarden">
        <div class="text">
          <h3>Garden</h3>
          <p>See your recent growth</p>
        </div>
        <div class="icon">🌱</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

const goAvailable = () => router.push('/sessions')
const goHost = () => router.push('/host')
const goGarden = () => router.push('/garden')
</script>

<style scoped>
.home-page {
  padding: 20px;
  font-family: inherit;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.greeting h1 {
  margin: 0;
}

.subtitle {
  font-size: 14px;
  opacity: 0.7;
}

.avatar img {
  width: 48px;
  height: 48px;
  border-radius: 50%;
}

.stats {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
}

.stat-card {
  flex: 1;
  border: 2px solid var(--primary-color);
  border-radius: 12px;
  padding: 12px;
  text-align: center;
}

.stat-card h2 {
  margin: 0;
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.action-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border: 2px solid var(--primary-color);
  border-radius: 14px;
  padding: 16px;
  cursor: pointer;
}

.action-card.primary {
  background: var(--primary-color);
  color: white;
}

.action-card .text h3 {
  margin: 0 0 4px 0;
}

.action-card .text p {
  margin: 0;
  font-size: 13px;
  opacity: 0.8;
}

.icon {
  font-size: 22px;
}
</style>
