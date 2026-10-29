<script setup>
defineProps({ name: { type: String, default: 'arrow' }, size: { type: [Number, String], default: 20 } })
const paths = {
  search: ['m21 21-4.6-4.6', 'M19 10.8a8.2 8.2 0 1 1-16.4 0 8.2 8.2 0 0 1 16.4 0Z'],
  arrow: ['M5 12h14', 'm13 6 6 6-6 6'],
  back: ['M19 12H5', 'm11 6-6 6 6 6'],
  external: ['M7 17 17 7', 'M7 7h10v10'],
  spark: ['m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z'],
  compass: ['M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z', 'm16 8-2 6-6 2 2-6Z'],
  code: ['m8 6-6 6 6 6', 'm16 6 6 6-6 6', 'm14 3-4 18'],
  grid: ['M3 3h7v7H3z', 'M14 3h7v7h-7z', 'M3 14h7v7H3z', 'M14 14h7v7h-7z'],
  game: ['M7 6h10a4 4 0 0 1 3.9 3.2l1 7a2.5 2.5 0 0 1-4.2 2.2L15 16H9l-2.7 2.4a2.5 2.5 0 0 1-4.2-2.2l1-7A4 4 0 0 1 7 6Z', 'M6 10v4', 'M4 12h4', 'M16 11h.01', 'M19 13h.01'],
  chart: ['M4 20V4', 'M4 20h16', 'M8 16l4-5 3 2 5-7'],
  document: ['M6 3h9l4 4v14H6z', 'M15 3v4h4', 'M9 11h7', 'M9 15h7'],
  heart: ['M20.8 4.8a5.5 5.5 0 0 0-7.8 0L12 5.9l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.4a5.5 5.5 0 0 0 0-7.8Z'],
  bookmark: ['M5 3h14v18l-7-4-7 4Z'],
  eye: ['M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z', 'M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z'],
  pen: ['m16 3 5 5-12 12-6 1 1-6Z', 'm13 6 5 5'],
  chevron: ['m6 9 6 6 6-6'],
  user: ['M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z', 'M4 21v-2a8 8 0 0 1 16 0v2'],
  shield: ['M12 2 3 6v6c0 5 9 10 9 10s9-5 9-10V6Z', 'm8 12 3 3 5-6'],
  logout: ['M9 4H4v16h5', 'M9 12h12', 'm16 7 5 5-5 5'],
  refresh: ['M20 7A9 9 0 1 0 21 15', 'M20 2v5h-5'],
  message: ['M21 15a3 3 0 0 1-3 3H8l-5 4V6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3Z'],
  close: ['m6 6 12 12', 'M18 6 6 18'],
  check: ['m5 12 4 4L19 6'],
  upload: ['M12 16V3', 'm7 8 5-5 5 5', 'M4 16v5h16v-5'],
  lock: ['M5 10h14v11H5Z', 'M8 10V6a4 4 0 0 1 8 0v4', 'M12 14v3'],
}
</script>
<template><svg :width="size" :height="size" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="app-icon"><path v-for="(path, i) in (paths[name] || paths.arrow)" :key="i" :d="path" /></svg></template>
<style scoped>.app-icon{display:inline-block;flex-shrink:0;vertical-align:middle}</style>
