<script setup>
import { computed } from 'vue'

const props = defineProps({
  command: Object
})

const emit = defineEmits(['edit', 'delete', 'copy'])

const tagsList = computed(() => {
  if (!props.command.tags) return []
  return props.command.tags.split(',').map(t => t.trim()).filter(t => t)
})

// 复制命令
function handleCopy() {
  emit('copy', props.command.content)
}

// 编辑命令
function handleEdit() {
  emit('edit', props.command)
}

// 删除命令
function handleDelete() {
  if (confirm('确定删除此命令？')) {
    emit('delete', props.command.id)
  }
}
</script>

<template>
  <div class="card p-4 hover:shadow-md transition-shadow group">
    <!-- Header -->
    <div class="flex items-center gap-2 mb-2">
      <span
        v-if="command.categoryName"
        class="px-2 py-0.5 text-xs rounded text-white"
        :style="{ backgroundColor: command.categoryColor }"
      >
        {{ command.categoryName }}
      </span>
      <h3 class="font-medium flex-1 truncate">{{ command.name }}</h3>
      <button
        class="btn btn-primary opacity-0 group-hover:opacity-100"
        @click="handleCopy"
      >
        复制
      </button>
    </div>

    <!-- Command Content -->
    <div
      class="bg-bg-secondary p-2 rounded font-mono text-sm break-all cursor-pointer hover:bg-border transition-colors"
      @click="handleCopy"
    >
      {{ command.content }}
    </div>

    <!-- Description -->
    <p v-if="command.description" class="mt-2 text-secondary text-sm">
      {{ command.description }}
    </p>

    <!-- Tags -->
    <div v-if="tagsList.length" class="mt-2 flex gap-1 flex-wrap">
      <span v-for="tag in tagsList" :key="tag" class="tag">
        {{ tag }}
      </span>
    </div>

    <!-- Actions -->
    <div class="mt-3 flex gap-2 opacity-0 group-hover:opacity-100">
      <button class="text-secondary hover:text-accent text-sm" @click="handleEdit">
        编辑
      </button>
      <button class="text-secondary hover:text-error text-sm" @click="handleDelete">
        删除
      </button>
    </div>
  </div>
</template>