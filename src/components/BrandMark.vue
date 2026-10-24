<template>
  <RouterLink to="/" class="brand-mark" aria-label="BOOM 大事件首页">
    <span class="brand-symbol">
      <span class="brand-dot"></span>
      B
    </span>
    <span class="brand-name">
      BOOM
      <small>大事件社区</small>
    </span>
  </RouterLink>
</template>

<style scoped>
.brand-mark {
  display: inline-flex;
  align-items: center;
  gap: 11px;
  color: var(--ink);
  text-decoration: none;
  flex-shrink: 0;
}

.brand-symbol {
  position: relative;
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  background: linear-gradient(145deg, #0a0d14 0%, #1e293b 100%);
  color: #ffffff;
  border-radius: 11px;
  font: 800 20px/1 Inter, -apple-system, BlinkMacSystemFont, sans-serif;
  letter-spacing: -0.8px;
  box-shadow:
    0 6px 16px rgba(10, 13, 20, 0.16),
    inset 0 1px 0 rgba(255, 255, 255, 0.22);
  transition: transform 0.2s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.2s ease;
}

.brand-dot {
  position: absolute;
  top: 7px;
  right: 7px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--brand);
  box-shadow: 0 0 8px var(--brand);
}

.brand-mark:hover .brand-symbol {
  transform: translateY(-1px) scale(1.02);
  box-shadow:
    0 8px 20px rgba(0, 102, 255, 0.22),
    inset 0 1px 0 rgba(255, 255, 255, 0.28);
}

.brand-name {
  font-size: 20px;
  font-weight: 800;
  letter-spacing: -0.6px;
  line-height: 1.05;
  color: var(--ink);
}

.brand-name small {
  display: block;
  margin-top: 4px;
  color: var(--muted);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 2px;
}
</style>
