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
    form.value = {
      name: cat.name,
      color: cat.color,
      parentId: cat.parentId || cat.parent_id || null
    }
  } else {
    form.value = {
      name: '',
      color: '#0066CC',
      parentId: null
    }
  }
}, { immediate: true })

// 保存
async function handleSave() {
  if (!form.value.name.trim()) {
    alert('请输入分类名称')
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
    <div class="card w-full max-w-md mx-4 p-6">
      <h2 class="text-lg font-semibold mb-4">
        {{ category ? '编辑分类' : '新增分类' }}
      </h2>

      <div class="space-y-4">
        <!-- Name -->
        <div>
          <label class="block text-sm font-medium mb-1">分类名称 *</label>
          <input
            v-model="form.name"
            type="text"
            class="input"
            placeholder="分类名称"
          />
        </div>

        <!-- Parent Category -->
        <div>
          <label class="block text-sm font-medium mb-1">父分类（可选）</label>
          <select v-model="form.parentId" class="input">
            <option :value="null">无（一级分类）</option>
            <option v-for="cat in availableParents" :key="cat.id" :value="cat.id">
              {{ cat.name }}
            </option>
          </select>
          <p class="text-secondary text-xs mt-1">选择父分类将创建二级分类</p>
        </div>

        <!-- Color -->
        <div>
          <label class="block text-sm font-medium mb-1">颜色</label>
          <div class="flex gap-2">
            <button
              v-for="color in colorOptions"
              :key="color"
              class="w-8 h-8 rounded-full border-2 transition-transform hover:scale-110"
              :style="{ backgroundColor: color, borderColor: form.color === color ? '#37352F' : 'transparent' }"
              @click="form.color = color"
            ></button>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="mt-6 flex justify-end gap-2">
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