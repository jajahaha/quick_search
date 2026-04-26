<script setup>
import { ref, watch, computed } from 'vue'
import { addCategory, updateCategory, getCategories } from '../../utils/database.js'

const props = defineProps({
  category: Object | null
})

const emit = defineEmits(['close', 'refresh'])

const form = ref({
  name: '',
  color: '#0066CC',
  parentId: null
})

const colorOptions = [
  '#0066CC', '#0F7B6C', '#D9730D', '#E03E3E',
  '#7C3AED', '#EC4899', '#14B8A6', '#F59E0B'
]

// 分类级别：1 = 一级分类，2 = 二级分类
const categoryLevel = ref(1)

// 获取一级分类列表（作为父分类选项）
const parentCategories = computed(() => {
  return getCategories(null) // 只获取一级分类
})

// 是否是编辑模式
const isEditing = computed(() => props.category !== null)

// 编辑时，当前分类不能作为自己的父分类
const availableParents = computed(() => {
  if (!isEditing.value) return parentCategories.value
  return parentCategories.value.filter(c => c.id !== props.category.id)
})

// 监听编辑数据
watch(() => props.category, (cat) => {
  if (cat) {
    const parentId = cat.parentId || cat.parent_id || null
    form.value = {
      name: cat.name,
      color: cat.color,
      parentId: parentId
    }
    categoryLevel.value = parentId ? 2 : 1
  } else {
    form.value = {
      name: '',
      color: '#0066CC',
      parentId: null
    }
    categoryLevel.value = 1 // 默认一级分类
  }
}, { immediate: true })

// 切换分类级别时清空父分类
watch(categoryLevel, (level) => {
  if (level === 1) {
    form.value.parentId = null
  }
})

// 保存
async function handleSave() {
  if (!form.value.name.trim()) {
    alert('请输入分类名称')
    return
  }
  // 二级分类必须选择父分类
  if (categoryLevel.value === 2 && !form.value.parentId) {
    alert('二级分类需要选择父分类')
    return
  }
  try {
    if (props.category) {
      updateCategory(props.category.id, form.value.name, form.value.color, form.value.parentId)
    } else {
      addCategory(form.value.name, form.value.color, form.value.parentId)
    }
    emit('refresh')
    emit('close')
  } catch (e) {
    alert(e.message)
  }
}

// 关闭
function handleClose() {
  emit('close')
}
</script>

<template>
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" @click.self="handleClose">
    <div class="card w-full max-w-md mx-4 overflow-hidden">
      <!-- Header -->
      <div class="px-5 py-4 border-b border-border flex items-center justify-between">
        <h2 class="text-lg font-semibold">
          {{ category ? '✏️ 编辑分类' : '📁 新增分类' }}
        </h2>
        <button class="text-secondary hover:text-primary text-xl" @click="handleClose">×</button>
      </div>

      <!-- Content -->
      <div class="p-5 space-y-4">
        <!-- Name -->
        <div>
          <label class="block text-sm font-medium mb-1.5">分类名称</label>
          <input
            v-model="form.name"
            type="text"
            class="input"
            placeholder="输入分类名称"
          />
        </div>

        <!-- Category Level (only for new category) -->
        <div v-if="!isEditing">
          <label class="block text-sm font-medium mb-1.5">分类级别</label>
          <div class="flex gap-2">
            <button
              class="btn flex-1"
              :class="categoryLevel === 1 ? 'btn-primary' : 'btn-secondary'"
              @click="categoryLevel = 1"
            >
              ● 一级分类
            </button>
            <button
              class="btn flex-1"
              :class="categoryLevel === 2 ? 'btn-primary' : 'btn-secondary'"
              @click="categoryLevel = 2"
            >
              ◆ 二级分类
            </button>
          </div>
        </div>

        <!-- Parent Category (only show when level=2) -->
        <div v-if="categoryLevel === 2">
          <label class="block text-sm font-medium mb-1.5">父分类</label>
          <select v-model="form.parentId" class="input">
            <option :value="null" disabled>请选择父分类</option>
            <option v-for="cat in availableParents" :key="cat.id" :value="cat.id">
              {{ cat.name }}
            </option>
          </select>
        </div>

        <!-- Color -->
        <div>
          <label class="block text-sm font-medium mb-1.5">颜色</label>
          <div class="flex gap-2 flex-wrap">
            <button
              v-for="color in colorOptions"
              :key="color"
              class="w-7 h-7 rounded-full border-2 transition-transform hover:scale-110"
              :style="{ backgroundColor: color, borderColor: form.color === color ? 'var(--color-primary)' : 'transparent' }"
              @click="form.color = color"
            ></button>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="px-5 py-3 border-t border-border flex justify-end gap-2">
        <button class="btn btn-secondary" @click="handleClose">
          取消
        </button>
        <button class="btn btn-primary" @click="handleSave">
          保存
        </button>
      </div>
    </div>
  </div>
</template>