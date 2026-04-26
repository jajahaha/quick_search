import * as XLSX from 'xlsx';

// 导出命令到 Excel（支持二级分类）
export function exportToExcel(commands, filename = 'commands.xlsx') {
  const data = commands.map(cmd => ({
    '一级分类': cmd.parentCategoryName || '',
    '二级分类': cmd.categoryName || '',
    '名称': cmd.name,
    '命令': cmd.content,
    '描述': cmd.description || '',
    '标签': cmd.tags || ''
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '命令列表');

  // 设置列宽
  worksheet['!cols'] = [
    { wch: 15 },  // 一级分类
    { wch: 15 },  // 二级分类
    { wch: 20 },  // 名称
    { wch: 50 },  // 命令
    { wch: 30 },  // 描述
    { wch: 20 },  // 标签
  ];

  XLSX.writeFile(workbook, filename);
}

// 从 Excel 导入命令
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