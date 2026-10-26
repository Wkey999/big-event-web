<script setup>
import BrandMark from './BrandMark.vue'
</script>

<template>
  <div class="auth-page">
    <header>
      <BrandMark />
      <span>关于 AI，关于科技，关于新的可能。</span>
    </header>
    <main>
      <section class="auth-intro">
        <span class="eyebrow">STAY CURIOUS · KEEP CREATING</span>
        <h1>
          好奇心，<br />
          值得被看见<span>.</span>
        </h1>
        <p>
          发现有意思的技术，记录亲手做过的实践。<br />
          和同样好奇的人，一起把想法变成内容。
        </p>
        <div class="auth-art" aria-hidden="true">
          <span>AI</span>
          <i>IDEAS</i>
          <b>↗</b>
          <small>MAKE SOMETHING NEW</small>
        </div>
      </section>
      <section class="auth-panel surface">
        <slot />
      </section>
    </main>
    <footer>BOOM · 大事件　 /　 给每一个正在探索的人</footer>
  </div>
</template>

<style scoped>
.auth-page {
  min-height: 100vh;
  padding: 32px 6%;
  background: var(--page);
}

.auth-page > header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.auth-page > header > span {
  font-size: 12.5px;
  font-weight: 500;
  color: var(--muted);
}

.auth-page > main {
  max-width: 1120px;
  margin: 72px auto 60px;
  display: grid;
  grid-template-columns: 1.3fr 1fr;
  gap: 88px;
  align-items: center;
}

.auth-intro h1 {
  font-size: 60px;
  font-weight: 800;
  line-height: 1.18;
  letter-spacing: -2.6px;
  margin: 20px 0;
  color: var(--ink);
}

.auth-intro h1 > span {
  color: var(--brand);
}

.auth-intro p {
  color: var(--muted);
  font-size: 14.5px;
  line-height: 1.95;
}

.auth-panel {
  border-radius: 24px;
  padding: 42px;
  background: var(--glass-bg-strong);
}

.auth-art {
  width: 360px;
  height: 152px;
  margin-top: 34px;
  position: relative;
  background: linear-gradient(135deg, #0a0d14 0%, #1e293b 70%, #0052cc 100%);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 16px 36px -10px rgba(10, 13, 20, 0.25);
}

.auth-art > span {
  position: absolute;
  left: 28px;
  top: 2px;
  font-size: 92px;
  font-weight: 900;
  letter-spacing: -6px;
  color: rgba(255, 255, 255, 0.92);
}

.auth-art > i {
  position: absolute;
  left: 150px;
  top: 52px;
  font-size: 20px;
  font-weight: 700;
  font-style: normal;
  transform: rotate(-10deg);
  background: var(--brand);
  color: #ffffff;
  border-radius: 8px;
  padding: 5px 16px;
}

.auth-art > b {
  position: absolute;
  right: 18px;
  top: 2px;
  font-size: 82px;
  font-weight: 400;
  color: rgba(96, 165, 250, 0.55);
}

.auth-art > small {
  position: absolute;
  bottom: 14px;
  left: 30px;
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: 2px;
  color: rgba(255, 255, 255, 0.65);
}

.auth-page > footer {
  text-align: center;
  font-size: 11.5px;
  color: var(--muted);
  letter-spacing: 1px;
}
</style>
