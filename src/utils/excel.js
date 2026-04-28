import * as XLSX from 'xlsx';

// 标准字段列表（固定列）
export const STANDARD_FIELDS = [
  '一级分类', '二级分类', '名称', '通用命令', '集中式命令', '分布式命令', '描述', '标签'
];

// 导出命令到 Excel（支持扩展字段）
export function exportToExcel(commands, filename = 'commands.xlsx') {
  // 收集所有扩展字段名
  const allExtraFields = new Set();
  commands.forEach(cmd => {
    if (cmd.extraFields) {
      Object.keys(cmd.extraFields).forEach(key => allExtraFields.add(key));
    }
  });
  const extraFieldList = Array.from(allExtraFields).sort();

  // 构建导出数据
  const data = commands.map(cmd => {
    const row = {
      '一级分类': cmd.parentCategoryName || '',
      '二级分类': cmd.categoryName || '',
      '名称': cmd.name,
      '通用命令': cmd.content || '',
      '集中式命令': cmd.centralizedContent || '',
      '分布式命令': cmd.distributedContent || '',
      '描述': cmd.description || '',
      '标签': cmd.tags || ''
    };
    // 添加扩展字段
    if (cmd.extraFields) {
      extraFieldList.forEach(field => {
        row[field] = cmd.extraFields[field] || '';
      });
    } else {
      extraFieldList.forEach(field => {
        row[field] = '';
      });
    }
    return row;
  });

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '命令列表');

  // 设置列宽：标准列 + 扩展列
  const cols = [
    { wch: 15 },  // 一级分类
    { wch: 15 },  // 二级分类
    { wch: 20 },  // 名称
    { wch: 50 },  // 通用命令
    { wch: 50 },  // 集中式命令
    { wch: 50 },  // 分布式命令
    { wch: 30 },  // 描述
    { wch: 20 },  // 标签
  ];
  // 扩展列默认宽度
  extraFieldList.forEach(() => cols.push({ wch: 20 }));
  worksheet['!cols'] = cols;

  XLSX.writeFile(workbook, filename);
}

// 从 Excel 导入命令（支持动态扩展列）
export function parseExcelFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet);
        resolve(jsonData);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

// 解析 Excel 行数据，分离标准字段和扩展字段
export function parseRowData(row) {
  const standardData = {
    parentCategoryName: row['一级分类'] ? row['一级分类'].trim() : '',
    categoryName: row['二级分类'] ? row['二级分类'].trim() : '',
    name: row['名称'] ? row['名称'].trim() : '',
    content: row['通用命令'] ? row['通用命令'].trim() : (row['命令'] ? row['命令'].trim() : ''),
    centralizedContent: row['集中式命令'] ? row['集中式命令'].trim() : '',
    distributedContent: row['分布式命令'] ? row['分布式命令'].trim() : '',
    description: row['描述'] ? row['描述'].trim() : '',
    tags: row['标签'] ? row['标签'].trim() : ''
  };

  // 提取扩展字段（非标准列）
  const extraFields = {};
  Object.keys(row).forEach(key => {
    if (!STANDARD_FIELDS.includes(key) && key !== '命令') {
      const value = row[key];
      if (value !== undefined && value !== null && value !== '') {
        extraFields[key] = String(value).trim();
      }
    }
  });

  return { ...standardData, extraFields };
}

// 导出分类到 Excel
export function exportCategoriesToExcel(categories, filename = 'categories.xlsx') {
  // 扁平化分类数据
  const data = [];
  categories.forEach(cat => {
    // 一级分类
    data.push({
      '一级分类': cat.name,
      '二级分类': '',
      '颜色': cat.color
    });
    // 二级分类
    if (cat.children && cat.children.length > 0) {
      cat.children.forEach(child => {
        data.push({
          '一级分类': cat.name,
          '二级分类': child.name,
          '颜色': child.color || cat.color
        });
      });
    }
  });

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '分类列表');

  worksheet['!cols'] = [
    { wch: 20 },  // 一级分类
    { wch: 20 },  // 二级分类
    { wch: 10 },  // 颜色
  ];

  XLSX.writeFile(workbook, filename);
}