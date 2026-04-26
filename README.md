# GaussDB快捷命令管理器

一个现代化的快捷命令管理工具，帮助用户高效地存储、分类、检索和复用常用命令。

**版本**: v5.5.0

## 文档

- [设计文档](设计文档.md) - 详细的设计说明和技术方案
- [Release Notes](RELEASE_NOTES.md) - 版本更新记录

## 功能特性

- 命令管理：添加、编辑、删除命令
- 分类管理：创建、编辑、删除分类
- 搜索检索：按关键词、分类筛选命令
- 一键复制：快速复制命令到剪贴板
- Excel 导入导出：支持 Excel 格式数据交换
- 数据库文件导入导出：支持 SQLite 数据库文件备份恢复

## 技术栈

| 技术 | 版本 | 用途 |
|-----|------|------|
| Vue 3 | 3.4.x | 前端框架 |
| Vite | 5.x | 构建工具 |
| Tailwind CSS | 3.4.x | 样式框架 |
| sql.js | 1.14.x | 浏览器端 SQLite |
| xlsx | 0.18.x | Excel 处理 |

## 安装运行

```bash
# 安装依赖
npm install

# 开发模式运行
npm run dev

# 构建生产版本
npm run build
```

或双击 `启动项目.bat` 脚本。

## 使用说明

### 添加命令

1. 点击右上角"新增"按钮
2. 填写命令名称、内容、分类、描述、标签
3. 点击保存

### 搜索命令

- 在顶部搜索框输入关键词
- 支持搜索名称、命令内容、描述、标签

### 导入导出

- **Excel 导入**：支持 .xlsx/.xls 格式
- **Excel 导出**：导出所有命令为 Excel 文件
- **数据库导出**：导出完整 SQLite 数据库文件
- **数据库导入**：导入 .db 文件恢复数据

## 项目结构

```
quick_search/
├── public/
│   ├── favicon.svg
│   ├── sql-wasm-browser.js
│   └── sql-wasm-browser.wasm
├── src/
│   ├── components/
│   ├── utils/
│   ├── App.vue
│   └── main.js
├── 设计文档.md
├── RELEASE_NOTES.md
├── 启动项目.bat
├── 关闭项目.bat
```