<script setup>
import { ref, watch, onMounted } from 'vue'

const props = defineProps({
  message: String,
  type: String
})

const emit = defineEmits(['close'])

const visible = ref(true)

// 3秒后自动关闭
onMounted(() => {
  setTimeout(() => {
    visible.value = false
    emit('close')
  }, 3000)
})

// 手动关闭
function handleClose() {
  visible.value = false
  emit('close')
}

const bgColor = {
  success: 'bg-success',
  error: 'bg-error',
  warning: 'bg-warning'
}
</script>

<template>
  <div
    v-if="visible"
    class="fixed bottom-4 left-1/2 -translate-x-1/2 z-50"
  >
    <div
      class="px-4 py-2 rounded-lg shadow-lg text-white flex items-center gap-2"
      :class="bgColor[type] || bgColor.success"
    >
      <span>{{ message }}</span>
      <button class="hover:opacity-80" @click="handleClose">×</button>
    </div>
  </div>
</template>