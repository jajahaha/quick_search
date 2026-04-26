<script setup>
import { ref } from 'vue'
import { getCategoryTree, deleteCategory } from '../../utils/database.js'

const props = defineProps({
  categories: Array,
  selectedId: Number | null
})

const emit = defineEmits(['select', 'add', 'edit', 'refresh'])

const isCollapsed = ref(false)
const expandedCategories = ref(new Set()) // 记录展开的分类

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
  if (confirm('确定删除此分类？子分类将变为一级分类，相关命令将移至"未分类"')) {
    deleteCategory(id)
    emit('refresh')
  }
}

// 切换折叠
function toggleCollapse() {
  isCollapsed.value = !isCollapsed.value
}

// 展开/折叠一级分类
function toggleExpand(categoryId) {
  if (expandedCategories.value.has(categoryId)) {
    expandedCategories.value.delete(categoryId)
  } else {
    expandedCategories.value.add(categoryId)
  }
}

// 是否展开
function isExpanded(categoryId) {
  return expandedCategories.value.has(categoryId)
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

      <!-- Category Tree -->
      <div class="mt-1">
        <div v-for="cat in categories" :key="cat.id">
          <!-- 一级分类 -->
          <div
            class="px-3 py-2 cursor-pointer hover:bg-bg-secondary rounded transition-colors flex items-center gap-2 group"
            :class="{ 'bg-bg-secondary font-medium': selectedId === cat.id }"
            @click="handleSelect(cat.id)"
          >
            <!-- 展开/折叠按钮 -->
            <button
              v-if="cat.children && cat.children.length > 0"
              class="w-4 h-4 flex items-center justify-center text-secondary hover:text-primary"
              @click.stop="toggleExpand(cat.id)"
            >
              <span v-if="isExpanded(cat.id)">▼</span>
              <span v-else>►</span>
            </button>
            <span v-else class="w-4"></span>

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

          <!-- 二级分类 -->
          <div v-if="isExpanded(cat.id) && cat.children" class="ml-4">
            <div
              v-for="child in cat.children"
              :key="child.id"
              class="px-3 py-1.5 cursor-pointer hover:bg-bg-secondary rounded transition-colors flex items-center gap-2 group text-sm"
              :class="{ 'bg-bg-secondary font-medium': selectedId === child.id }"
              @click="handleSelect(child.id)"
            >
              <span
                class="w-2.5 h-2.5 rounded-full flex-shrink-0"
                :style="{ backgroundColor: child.color || cat.color }"
              ></span>
              <span class="flex-1 truncate">{{ child.name }}</span>
              <button
                class="opacity-0 group-hover:opacity-100 hover:text-accent text-xs"
                @click.stop="handleEdit(child)"
                title="编辑"
              >
                ✎
              </button>
              <button
                class="opacity-0 group-hover:opacity-100 hover:text-error text-xs"
                @click.stop="handleDelete(child.id)"
                title="删除"
              >
                ×
              </button>
            </div>
          </div>
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