<script setup>
import { ref } from 'vue'
import { getCategories, deleteCategory } from '../../utils/database.js'

const props = defineProps({
  categories: Array,
  selectedId: Number | null
})

const emit = defineEmits(['select', 'add', 'edit', 'refresh'])

const isCollapsed = ref(false)

// 选择分类
function handleSelect(id) {
  emit('select', id)
}

// 新增分类
function handleAdd() {
  emit('add')
}

// 编辑分类
function handleEdit(cat) {
  emit('edit', cat)
}

// 删除分类
function handleDelete(id) {
  if (confirm('确定删除此分类？相关命令将移至"未分类"')) {
    deleteCategory(id)
    emit('refresh')
  }
}

// 切换折叠
function toggleCollapse() {
  isCollapsed.value = !isCollapsed.value
}
</script>

<template>
  <aside
    class="w-60 border-r border-border bg-background flex flex-col transition-all duration-200"
    :class="{ 'w-12': isCollapsed }"
  >
    <!-- Toggle Button -->
    <button
      class="p-2 hover:bg-bg-secondary rounded"
      @click="toggleCollapse"
    >
      <span v-if="isCollapsed">»</span>
      <span v-else>«</span>
    </button>

    <div v-if="!isCollapsed" class="flex-1 overflow-auto">
      <!-- All Commands -->
      <div
        class="px-3 py-2 cursor-pointer hover:bg-bg-secondary rounded transition-colors"
        :class="{ 'bg-bg-secondary font-medium': selectedId === null }"
        @click="handleSelect(null)"
      >
        全部命令
      </div>

      <!-- Category List -->
      <div class="mt-1">
        <div
          v-for="cat in categories"
          :key="cat.id"
          class="px-3 py-2 cursor-pointer hover:bg-bg-secondary rounded transition-colors flex items-center gap-2 group"
          :class="{ 'bg-bg-secondary font-medium': selectedId === cat.id }"
          @click="handleSelect(cat.id)"
        >
          <span
            class="w-3 h-3 rounded-full flex-shrink-0"
            :style="{ backgroundColor: cat.color }"
          ></span>
          <span class="flex-1 truncate">{{ cat.name }}</span>
          <button
            class="opacity-0 group-hover:opacity-100 hover:text-accent"
            @click.stop="handleEdit(cat)"
            title="编辑"
          >
            ✎
          </button>
          <button
            class="opacity-0 group-hover:opacity-100 hover:text-error"
            @click.stop="handleDelete(cat.id)"
            title="删除"
          >
            ×
          </button>
        </div>
      </div>
    </div>

    <!-- Add Category Button -->
    <button
      v-if="!isCollapsed"
      class="m-2 py-2 border border-border rounded hover:bg-bg-secondary transition-colors"
      @click="handleAdd"
    >
      + 新增分类
    </button>
  </aside>
</template>