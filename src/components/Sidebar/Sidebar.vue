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

// 选择分类（点击一级分类切换展开/折叠）
function handleSelect(id) {
  emit('select', id)
  // 如果点击的是一级分类且有子分类，切换展开状态
  const cat = props.categories.find(c => c.id === id)
  if (cat && cat.children && cat.children.length > 0) {
    if (expandedCategories.value.has(id)) {
      expandedCategories.value.delete(id)
    } else {
      expandedCategories.value.add(id)
    }
  }
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

// 全部展开
function expandAll() {
  props.categories.forEach(cat => {
    if (cat.children && cat.children.length > 0) {
      expandedCategories.value.add(cat.id)
    }
  })
}

// 全部折叠
function collapseAll() {
  expandedCategories.value.clear()
}

// 是否全部展开
function isAllExpanded() {
  const expandableCount = props.categories.filter(cat => cat.children && cat.children.length > 0).length
  return expandableCount > 0 && expandedCategories.value.size === expandableCount
}

// 切换全部展开/折叠
function toggleAllExpand() {
  if (isAllExpanded()) {
    collapseAll()
  } else {
    expandAll()
  }
}
</script>

<template>
  <aside
    class="border-r border-border bg-background flex flex-col transition-all duration-300"
    :class="isCollapsed ? 'w-12' : 'w-60'"
  >
    <!-- Toggle Button -->
    <button
      class="p-2 hover:bg-bg-secondary rounded flex items-center justify-center transition-colors"
      :class="isCollapsed ? 'w-12 h-12' : ''"
      @click="toggleCollapse"
      :title="isCollapsed ? '展开侧边栏' : '收起侧边栏'"
    >
      <svg
        class="w-5 h-5 text-secondary"
        :class="{ 'rotate-180': isCollapsed }"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
      </svg>
    </button>

    <div v-if="!isCollapsed" class="flex-1 overflow-auto">
      <!-- All Commands with Expand/Collapse Toggle -->
      <div
        class="px-3 py-2 cursor-pointer hover:bg-bg-secondary rounded transition-colors flex items-center gap-2"
        :class="{ 'bg-bg-secondary font-medium': selectedId === null }"
        @click="handleSelect(null)"
      >
        <span class="w-4 text-center">📋</span>
        <span class="flex-1">全部命令</span>
        <!-- Expand/Collapse Toggle Button -->
        <button
          v-if="categories.some(cat => cat.children && cat.children.length > 0)"
          class="text-xs text-secondary hover:text-accent px-1"
          @click.stop="toggleAllExpand"
          :title="isAllExpanded() ? '全部折叠' : '全部展开'"
        >
          {{ isAllExpanded() ? '◀' : '▶' }}
        </button>
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
              class="w-4 h-4 flex items-center justify-center text-secondary hover:text-primary text-xs"
              @click.stop="toggleExpand(cat.id)"
            >
              <span v-if="isExpanded(cat.id)">▼</span>
              <span v-else>►</span>
            </button>
            <span v-else class="w-4"></span>

            <!-- 一级分类图标：圆形 -->
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
              <span class="w-4"></span>
              <!-- 二级分类图标：菱形 -->
              <span
                class="w-2.5 h-2.5 flex-shrink-0 rotate-45"
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