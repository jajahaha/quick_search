<script setup>
import { computed, ref } from 'vue'
import { getCommandContentByArch, hasArchContent, getCommandDisplayContent } from '../../utils/database.js'

const props = defineProps({
  command: Object,
  archMode: String
})

const emit = defineEmits(['edit', 'delete', 'copy'])

// 复制下拉菜单状态
const showCopyMenu = ref(false)

// 标签列表
const tagsList = computed(() => {
  if (!props.command.tags) return []
  return props.command.tags.split(',').map(t => t.trim()).filter(t => t)
})

// 是否为全部模式
const isBothMode = computed(() => {
  return props.archMode === 'both'
})

// 全部模式下的内容列表
const contentList = computed(() => {
  if (!isBothMode.value) {
    return null
  }
  return getCommandContentByArch(props.command, 'both')
})

// 单一架构模式下的显示内容
const displayContent = computed(() => {
  if (isBothMode.value) {
    return null
  }
  return getCommandContentByArch(props.command, props.archMode)
})

// 架构内容状态
const archStatus = computed(() => {
  return hasArchContent(props.command)
})

// 架构图标
const archIcon = computed(() => {
  if (props.archMode === 'centralized') {
    return '🔵'
  } else if (props.archMode === 'distributed') {
    return '🟢'
  }
  // 全部模式：显示多个图标
  const icons = []
  if (archStatus.value.hasCentralized) icons.push('🔵')
  if (archStatus.value.hasDistributed) icons.push('🟢')
  if (archStatus.value.hasCommon && icons.length === 0) icons.push('⚪')
  return icons.join(' ')
})

// 复制命令
function handleCopy(content) {
  emit('copy', content)
  showCopyMenu.value = false
}

// 复制当前架构内容（单一模式）
function handleCopyCurrent() {
  if (displayContent.value) {
    handleCopy(displayContent.value)
  }
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

// 切换复制菜单
function toggleCopyMenu() {
  showCopyMenu.value = !showCopyMenu.value
}
</script>

<template>
  <div class="card p-4 hover:shadow-md transition-shadow group relative">
    <!-- Header -->
    <div class="flex items-center gap-2 mb-2">
      <span class="text-sm">{{ archIcon }}</span>
      <span
        v-if="command.categoryName"
        class="px-2 py-0.5 text-xs rounded text-white"
        :style="{ backgroundColor: command.categoryColor }"
      >
        {{ command.categoryName }}
      </span>
      <h3 class="font-medium flex-1 truncate">{{ command.name }}</h3>
      <!-- Copy Button with Dropdown -->
      <div class="relative">
        <button
          class="btn btn-primary opacity-0 group-hover:opacity-100"
          @click="toggleCopyMenu"
        >
          复制
        </button>
        <!-- Copy Menu Dropdown -->
        <div
          v-if="showCopyMenu"
          class="absolute right-0 top-full mt-1 bg-background border border-border rounded shadow-lg z-10 min-w-[140px]"
        >
          <button
            v-if="archStatus.hasCentralized"
            class="w-full px-3 py-2 text-left text-sm hover:bg-bg-secondary flex items-center gap-2"
            @click="handleCopy(command.centralizedContent)"
          >
            <span class="text-blue-500">🔵</span>
            集中式
          </button>
          <button
            v-if="archStatus.hasDistributed"
            class="w-full px-3 py-2 text-left text-sm hover:bg-bg-secondary flex items-center gap-2"
            @click="handleCopy(command.distributedContent)"
          >
            <span class="text-green-500">🟢</span>
            分布式
          </button>
          <button
            v-if="archStatus.hasCommon"
            class="w-full px-3 py-2 text-left text-sm hover:bg-bg-secondary flex items-center gap-2"
            @click="handleCopy(command.content)"
          >
            <span class="text-gray-400">⚪</span>
            通用
          </button>
        </div>
      </div>
    </div>

    <!-- 单一架构模式：显示单个内容 -->
    <div
      v-if="!isBothMode && displayContent"
      class="bg-bg-secondary p-2 rounded font-mono text-sm break-all cursor-pointer hover:bg-border transition-colors"
      @click="handleCopyCurrent"
      title="点击复制"
    >
      {{ displayContent }}
    </div>

    <!-- 全部模式：显示所有架构内容 -->
    <div v-if="isBothMode && contentList && contentList.length > 0" class="space-y-2">
      <div
        v-for="item in contentList"
        :key="item.type"
        class="bg-bg-secondary p-2 rounded font-mono text-sm break-all cursor-pointer hover:bg-border transition-colors"
        @click="handleCopy(item.content)"
        title="点击复制"
      >
        <div class="flex items-center gap-1 mb-1">
          <span :class="item.type === 'centralized' ? 'text-blue-500' : item.type === 'distributed' ? 'text-green-500' : 'text-gray-400'">
            {{ item.type === 'centralized' ? '🔵' : item.type === 'distributed' ? '🟢' : '⚪' }}
          </span>
          <span class="text-xs text-secondary">{{ item.label }}</span>
        </div>
        {{ item.content }}
      </div>
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