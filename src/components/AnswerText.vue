<script setup>
import { computed } from 'vue'
const props = defineProps({ text: { type: String, default: '' } })
// Render model text through Vue escaping; raw HTML and model-created links stay inert.
const paragraphs = computed(() => props.text.split(/\n\s*\n/).map(block => block.split(/(\*\*[^*\n]+\*\*)/g).map(text => ({ bold: text.startsWith('**') && text.endsWith('**'), text: text.startsWith('**') && text.endsWith('**') ? text.slice(2, -2) : text }))))
</script>
<template><div class="answer-text"><p v-for="(paragraph, index) in paragraphs" :key="index"><template v-for="(part, i) in paragraph" :key="i"><strong v-if="part.bold">{{ part.text }}</strong><template v-else>{{ part.text }}</template></template></p></div></template>
<style scoped>.answer-text{white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.9}.answer-text p{margin:0 0 16px}.answer-text strong{font-weight:600}</style>
