<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  keyword: String
})

const emit = defineEmits(['search'])

const inputKeyword = ref(props.keyword || '')

// 监听输入变化
watch(inputKeyword, (val) => {
  emit('search', val)
})

// 快捷键聚焦
function handleKeydown(e) {
  if (e.key === '/' && !inputKeyword.value) {
    e.target.focus()
  }
}
</script>

<template>
  <div class="relative">
    <span class="absolute left-3 top-1/2 -translate-y-1/2 text-secondary">🔍</span>
    <input
      v-model="inputKeyword"
      type="text"
      placeholder="搜索命令..."
      class="input pl-9"
      @keydown="handleKeydown"
    />
    <span
      v-if="inputKeyword"
      class="absolute right-2 top-1/2 -translate-y-1/2 text-secondary cursor-pointer hover:text-primary px-1"
      @click="inputKeyword = ''"
    >
      ×
    </span>
  </div>
</template>