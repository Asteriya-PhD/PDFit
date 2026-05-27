# PDFit

> 隐私优先的浏览器端 PDF 小工具 — 分割、合并、删除、旋转，全部在本地完成，不上传任何文件。

## ✨ 功能

| 工具 | 说明 |
|------|------|
| 深色模式 | 🌙/☀️ 一键切换，跟随系统偏好，自动持久化 |
| 合并 | 将多个 PDF 文件合并为一个，支持拖拽调整顺序 |
| 分割 | 提取指定页面，或按页码范围分割成多个文件 |
| 删除页面 | 输入页码或点选页面，快速删除不需要的内容 |
| 旋转页面 | 90°/180°/270°，可旋转全部页面或指定页码 |
| 添加页码 | 自定义位置、字号、颜色、前缀后缀，支持"X / Y"格式 |
| PDF 转图片 | 将 PDF 页面导出为 PNG/JPEG，支持自定义 DPI |
| 图片转 PDF | 将 PNG/JPEG/WebP 图片合成为 PDF |
| 提取 Markdown | 从 PDF 提取文本内容并格式化为 Markdown |
| 快捷键 | `Ctrl+O` 打开文件，`Ctrl+M/S/D/R/N/I` 切换工具，`1`-`8` 快速切换，`Esc` 取消选择 |

## 🚀 在线使用

https://asteriya-phd.github.io/PDFit/

所有操作在浏览器本地完成，文件不会离开你的电脑。

## 🛠️ 技术栈

- **框架**: React 19 + TypeScript 5.7
- **构建**: Vite 6
- **样式**: Tailwind CSS 4
- **PDF 引擎**: pdf-lib (操作) + pdfjs-dist (预览)
- **部署**: GitHub Pages + GitHub Actions

## 📦 本地开发

```bash
npm install
npm run dev      # 本地开发
npm run build    # 构建
npm run preview  # 预览构建结果
```

## 📚 文档

- [架构文档](docs/architecture.md) — 技术栈、代码规范、Git 规范
- [开发计划](docs/plan.md) — 路线图和各阶段规划
- [进度记录](docs/progress.md) — 实现了什么、修了什么 Bug
- [AI 代理知识库](AGENTS.md) — 给 AI 协作的上下文

## 📄 许可

MIT
