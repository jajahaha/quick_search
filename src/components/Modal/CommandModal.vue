<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  command: Object | null,
  categories: Array
})

const emit = defineEmits(['close', 'save'])

const form = ref({
  name: '',
  content: '',
  categoryId: null,
  description: '',
  tags: ''
})

// 监听编辑数据
watch(() => props.command, (cmd) => {
  if (cmd) {
    form.value = {
      name: cmd.name,
      content: cmd.content,
      categoryId: cmd.categoryId,
      description: cmd.description,
      tags: cmd.tags
    }
  } else {
    form.value = {
      name: '',
      content: '',
      categoryId: null,
      description: '',
      tags: ''
    }
  }
}, { immediate: true })

// 保存
function handleSave() {
  if (!form.value.name.trim()) {
    alert('请输入命令名称')
    return
  }
  if (!form.value.content.trim()) {
    alert('请输入命令内容')
    return
  }
  emit('save', form.value)
}

// 关闭
function handleClose() {
  emit('close')
}
</script>

<template>
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" @click.self="handleClose">
    <div class="card w-full max-w-lg mx-4 p-6">
      <h2 class="text-lg font-semibold mb-4">
        {{ command ? '编辑命令' : '新增命令' }}
      </h2>

      <div class="space-y-4">
        <!-- Name -->
        <div>
          <label class="block text-sm font-medium mb-1">名称 *</label>
          <input
            v-model="form.name"
            type="text"
            class="input"
            placeholder="命令名称"
          />
        </div>

        <!-- Content -->
        <div>
          <label class="block text-sm font-medium mb-1">命令内容 *</label>
          <textarea
            v-model="form.content"
            class="input min-h-[100px]"
            placeholder="实际命令"
          ></textarea>
        </div>

        <!-- Category -->
        <div>
          <label class="block text-sm font-medium mb-1">分类</label>
          <select v-model="form.categoryId" class="input">
            <option :value="null">未分类</option>
            <option v-for="cat in categories" :key="cat.id" :value="cat.id">
              {{ cat.name }}
            </option>
          </select>
        </div>

        <!-- Description -->
        <div>
          <label class="block text-sm font-medium mb-1">描述</label>
          <input
            v-model="form.description"
            type="text"
            class="input"
            placeholder="命令用途说明"
          />
        </div>

        <!-- Tags -->
        <div>
          <label class="block text-sm font-medium mb-1">标签</label>
          <input
            v-model="form.tags"
            type="text"
            class="input"
            placeholder="多个标签用逗号分隔"
          />
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