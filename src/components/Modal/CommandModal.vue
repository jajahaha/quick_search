<script setup>
import { ref, watch, computed } from 'vue'

const props = defineProps({
  command: Object | null,
  categories: Array, // 树形分类数据
  archMode: String
})

const emit = defineEmits(['close', 'save'])

const form = ref({
  name: '',
  content: '',
  centralizedContent: '',
  distributedContent: '',
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
      centralizedContent: cmd.centralizedContent || '',
      distributedContent: cmd.distributedContent || '',
      categoryId: cmd.categoryId,
      description: cmd.description,
      tags: cmd.tags
    }
  } else {
    form.value = {
      name: '',
      content: '',
      centralizedContent: '',
      distributedContent: '',
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
  // 至少需要一个命令内容
  if (!form.value.content.trim() && !form.value.centralizedContent.trim() && !form.value.distributedContent.trim()) {
    alert('请至少填写一个命令内容')
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
    <div class="card w-full max-w-xl mx-4 p-6 max-h-[90vh] overflow-auto">
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

        <!-- Common Command -->
        <div>
          <label class="block text-sm font-medium mb-1">
            <span class="flex items-center gap-1">
              <span class="text-gray-400">⚪</span>
              通用命令
            </span>
          </label>
          <textarea
            v-model="form.content"
            class="input min-h-[80px]"
            placeholder="集中式和分布式都可用的通用命令"
          ></textarea>
          <p class="text-secondary text-xs mt-1">两种架构都可用的命令内容</p>
        </div>

        <!-- Centralized Command -->
        <div>
          <label class="block text-sm font-medium mb-1">
            <span class="flex items-center gap-1">
              <span class="text-blue-500">🔵</span>
              集中式命令
            </span>
          </label>
          <textarea
            v-model="form.centralizedContent"
            class="input min-h-[80px]"
            placeholder="集中式架构专用命令（如有则优先使用）"
          ></textarea>
          <p class="text-secondary text-xs mt-1">集中式架构专用命令，切换到集中式模式时显示此内容</p>
        </div>

        <!-- Distributed Command -->
        <div>
          <label class="block text-sm font-medium mb-1">
            <span class="flex items-center gap-1">
              <span class="text-green-500">🟢</span>
              分布式命令
            </span>
          </label>
          <textarea
            v-model="form.distributedContent"
            class="input min-h-[80px]"
            placeholder="分布式架构专用命令（如有则优先使用）"
          ></textarea>
          <p class="text-secondary text-xs mt-1">分布式架构专用命令，切换到分布式模式时显示此内容</p>
        </div>

        <!-- Category - 分组选择 -->
        <div>
          <label class="block text-sm font-medium mb-1">分类</label>
          <select v-model="form.categoryId" class="input">
            <option :value="null">未分类</option>
            <!-- 一级分类及其二级分类 -->
            <template v-for="cat in categories" :key="cat.id">
              <!-- 如果一级分类没有二级分类，可以直接选择 -->
              <option v-if="!cat.children || cat.children.length === 0" :value="cat.id">
                {{ cat.name }}
              </option>
              <!-- 如果有二级分类，显示分组 -->
              <optgroup v-else :label="cat.name">
                <option v-for="child in cat.children" :key="child.id" :value="child.id">
                  {{ child.name }}
                </option>
              </optgroup>
            </template>
          </select>
          <p class="text-secondary text-xs mt-1">命令将关联到选中的分类</p>
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