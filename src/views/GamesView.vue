<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import AppIcon from '@/components/AppIcon.vue'

const GAME_URL = '/games/orbipom/play/game.html?lang=zh-cn'
const state = ref('idle')
const frameLoading = ref(false)
const frameKey = ref(0)
const gameFrame = ref(null)
const startButton = ref(null)
const paused = ref(false)
let controller
let disposed = false

async function startGame() {
  if (state.value === 'checking') return
  controller?.abort()
  controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10000)
  state.value = 'checking'
  try {
    const response = await fetch(GAME_URL, { signal: controller.signal, cache: 'no-store' })
    if (!response.ok || !response.headers.get('content-type')?.includes('text/html')) {
      throw new Error('Game unavailable')
    }
    const html = await response.text()
    const page = new DOMParser().parseFromString(html, 'text/html')
    // SPA hosts may return the community index with HTTP 200 for missing static files.
    if (page.querySelector('#app') && page.title === document.title) {
      throw new Error('Missing game assets')
    }
    if (disposed) return
    frameKey.value++
    paused.value = false
    frameLoading.value = true
    state.value = 'playing'
  } catch {
    if (!disposed) state.value = 'error'
  } finally {
    clearTimeout(timeout)
  }
}

async function closeGame() {
  state.value = 'idle'
  frameLoading.value = false
  paused.value = false
  await nextTick()
  startButton.value?.focus()
}

function togglePause() {
  paused.value = !paused.value
  gameFrame.value?.contentWindow?.postMessage(
    { type: paused.value ? 'orbipom:pause' : 'orbipom:resume' },
    window.location.origin,
  )
}

function onGameMessage(event) {
  if (event.origin !== window.location.origin || event.source !== gameFrame.value?.contentWindow) {
    return
  }
  if (event.data?.type === 'orbipom:close') closeGame()
}

onMounted(() => window.addEventListener('message', onGameMessage))
onBeforeUnmount(() => {
  disposed = true
  controller?.abort()
  window.removeEventListener('message', onGameMessage)
})
</script>

<template>
  <section class="games-page">
    <header class="page-heading">
      <div>
        <span class="eyebrow">TAKE A LITTLE BREAK</span>
        <h1>休闲小游戏</h1>
        <p>发现和创作之间，给自己一点轻松的时间。</p>
      </div>
      <RouterLink to="/" class="button button-secondary">
        <AppIcon name="back" :size="16" />
        回到发现
      </RouterLink>
    </header>

    <section class="game-panel surface">
      <header class="game-heading">
        <span class="game-heading-icon">
          <AppIcon name="game" :size="23" />
        </span>
        <div>
          <h2>合成小游戏</h2>
          <span>融合！山团团！ · 来玩一局，换换思路。</span>
        </div>
        <div v-if="state === 'playing'" class="game-controls">
          <button class="text-action" :disabled="frameLoading" @click="togglePause">
            {{ paused ? '继续游戏' : '暂停游戏' }}
          </button>
          <button class="text-action" @click="closeGame">
            <AppIcon name="close" :size="16" />
            退出游戏
          </button>
        </div>
      </header>

      <div v-if="state !== 'playing'" class="game-launch" :aria-busy="state === 'checking'">
        <div class="game-symbol" aria-hidden="true">
          <AppIcon name="game" :size="46" />
        </div>
        <h3>{{ state === 'error' ? '游戏暂时无法打开' : '让灵感，休息一下。' }}</h3>
        <p v-if="state === 'error'" role="alert">游戏还没有准备好，请稍后重试。</p>
        <p v-else>点击开始，进入合成小游戏。退出或刷新后，本局进度会重置。</p>
        <button
          ref="startButton"
          class="button button-primary"
          :disabled="state === 'checking'"
          @click="startGame"
        >
          <AppIcon :name="state === 'error' ? 'refresh' : 'game'" :size="17" />
          {{
            state === 'checking'
              ? '正在准备…'
              : state === 'error'
                ? '重新尝试'
                : '开始游戏'
          }}
        </button>
      </div>

      <div v-else class="game-player" :aria-busy="frameLoading">
        <p v-if="frameLoading" class="frame-status" role="status">正在加载游戏…</p>
        <iframe
          :key="frameKey"
          ref="gameFrame"
          :src="GAME_URL"
          title="合成小游戏"
          class="game-frame"
          allow="fullscreen"
          @load="frameLoading = false"
          @error="
            state = 'error';
            frameLoading = false
          "
        ></iframe>
      </div>
    </section>
  </section>
</template>

<style scoped>
.games-page {
  max-width: 1180px;
  margin: auto;
}

.game-panel {
  overflow: hidden;
  border-radius: 20px;
}

.game-heading {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 20px 26px;
  border-bottom: 1px solid var(--line);
}

.game-heading-icon {
  display: grid;
  place-items: center;
  width: 46px;
  height: 46px;
  background: var(--soft);
  color: var(--brand);
  border-radius: 13px;
}

.game-heading h2 {
  font-size: 17px;
  font-weight: 800;
  margin: 0 0 3px;
  color: var(--ink);
}

.game-heading > div > span {
  font-size: 12px;
  color: var(--muted);
}

.game-controls {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 22px;
}

.game-controls .text-action {
  font-size: 12.5px;
}

.game-controls button:disabled {
  opacity: 0.5;
}

.game-launch {
  min-height: 480px;
  padding: 70px 30px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: radial-gradient(ellipse at 50% 38%, rgba(0, 102, 255, 0.08), transparent 65%);
}

.game-symbol {
  display: grid;
  place-items: center;
  width: 108px;
  height: 108px;
  background: linear-gradient(135deg, #0a0d14, #1e293b);
  color: #ffffff;
  border-radius: 30px;
  transform: rotate(-6deg);
  margin-bottom: 24px;
  box-shadow: 0 16px 32px -8px rgba(10, 13, 20, 0.22);
}

.game-symbol > svg {
  transform: rotate(6deg);
}

.game-launch h3 {
  font-size: 25px;
  letter-spacing: -0.6px;
  font-weight: 800;
  margin: 0 0 10px;
  color: var(--ink);
}

.game-launch p {
  color: var(--muted);
  font-size: 13px;
  margin-bottom: 24px;
}

.game-player {
  position: relative;
  background: #f8fafc;
}

.game-frame {
  display: block;
  width: 100%;
  height: 720px;
  border: 0;
}

.frame-status {
  position: absolute;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  padding: 7px 15px;
  background: var(--glass-bg-strong);
  color: var(--muted);
  border: 1px solid var(--line);
  border-radius: 999px;
  font-size: 12px;
  pointer-events: none;
}
</style>
