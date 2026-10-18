<script setup>
import AppIcon from './AppIcon.vue'
defineProps({ title: String, description: String, error: Boolean })
defineEmits(['retry'])
</script>
<template><div class="content-state" :role="error ? 'alert' : 'status'"><span class="state-symbol"><AppIcon :name="error ? 'refresh' : 'search'" :size="27" /></span><h3>{{ title }}</h3><p v-if="description">{{ description }}</p><button v-if="error" class="button button-secondary" @click="$emit('retry')">重新加载</button><slot /></div></template>
