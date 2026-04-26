<script setup>
import { ref, watch } from 'vue'
import { addCategory, updateCategory } from '../../utils/database.js'

const props = defineProps({
  category: Object | null
})

const emit = defineEmits(['close', 'refresh'])

const form = ref({
  name: '',
  color: '#0066CC'
})

const colorOptions = [
  '#0066CC', '#0F7B6C', '#D9730D', '#E03E3E',
  '#7C3AED', '#EC4899', '#14B8A6', '#F59E0B'
]

// 监听编辑数据
watch(() => props.category, (cat) => {
  if (cat) {
    form.value = {
      name: cat.name,
      color: cat.color
    }
  } else {
    form.value = {
      name: '',
      color: '#0066CC'
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
      updateCategory(props.category.id, form.value.name, form.value.color)
    } else {
      addCategory(form.value.name, form.value.color)
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