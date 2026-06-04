<div align="center">

# PDFit

> 隐私优先的浏览器端 PDF 工具 — 所有操作在本地完成，文件永不离开你的电脑

[![GitHub stars](https://img.shields.io/github/stars/asteriya-phd/PDFit?style=flat-square&color=blue)](https://github.com/asteriya-phd/PDFit)
[![GitHub license](https://img.shields.io/github/license/asteriya-phd/PDFit?style=flat-square&color=green)](LICENSE)
[![GitHub version](https://img.shields.io/github/package-api/v/asteriya-phd/PDFit?style=flat-square&color=orange)](https://github.com/asteriya-phd/PDFit/releases)
[![GitHub issues](https://img.shields.io/github/issues/asteriya-phd/PDFit?style=flat-square&color=red)](https://github.com/asteriya-phd/PDFit/issues)
[![GitHub pull requests](https://img.shields.io/github/issues-pr/asteriya-phd/PDFit?style=flat-square&color=purple)](https://github.com/asteriya-phd/PDFit/pulls)

[🌐 **在线使用**](https://asteriya-phd.github.io/PDFit/) · 
[📖 **文档**](docs/architecture.md) · 
[💬 **反馈**](https://github.com/asteriya-phd/PDFit/issues)

</div>

---

## 🎯 为什么选择 PDFit？

| 特性 | PDFit | 传统在线工具 | Adobe Acrobat |
|------|-------|-------------|---------------|
| **隐私保护** | ✅ 100% 本地处理，文件不上传 | ❌ 文件上传到第三方服务器 | ❌ 文件可能被分析 |
| **离线可用** | ✅ PWA 支持，安装后离线使用 | ❌ 需要网络 | ❌ 需要激活/订阅 |
| **免费** | ✅ MIT 协议，完全免费 | ❌ 通常有限制 | ❌ 订阅制昂贵 |
| **透明度** | ✅ 开源，代码可审计 | ❌ 黑盒 | ❌ 闭源 |
| **轻量** | ✅ 无后端，纯前端，加载快 | ❌ 依赖云端 | ❌ 资源占用大 |

---

## 🛠️ 功能清单

所有操作在浏览器本地完成，基于 `pdf-lib` 和 `pdfjs-dist` 引擎：

| 工具 | 说明 |
|------|------|
| **合并** | 多个 PDF 合并为一个，拖拽调整顺序 |
| **分割** | 提取指定页面，或按页码范围分割 |
| **删除页面** | 输入页码或点选删除 |
| **旋转页面** | 90°/180°/270°，支持全部或指定 |
| **页面排序** | 拖拽缩略图调整顺序 |
| **添加页码** | 自定义位置、字号、颜色、前缀后缀 |
| **添加水印** | 文字水印，自定义透明度、角度、范围，实时预览 |
| **PDF 转图片** | 导出为 PNG/JPEG，支持 DPI 调整 |
| **图片转 PDF** | 将 PNG/JPEG/WebP 合成 PDF |
| **提取 Markdown** | 从 PDF 提取文本并格式化为 Markdown（LiteParse WASM 引擎，本地完成） |
| **PDF 转 Word** | 将 PDF 转换为可编辑的 .docx 文档（LiteParse + docx 包，全本地） |

---

## 🚀 快速开始

### 在线使用
直接访问 https://asteriya-phd.github.io/PDFit/ — 无需安装，无需注册。

### 本地开发
```bash
git clone https://github.com/asteriya-phd/PDFit.git
cd PDFit
npm install
npm run dev
```

### 构建部署
```bash
npm run build           # 构建 Web 版
npm run preview         # 预览
npm run deploy          # 部署到 GitHub Pages
npm run tauri:build     # 构建桌面版（macOS/Windows/Linux）
```

---

## 📦 技术栈

| 层级 | 技术 |
|------|------|
| **框架** | React 19 + TypeScript 5.7 |
| **构建** | Vite 6 |
| **样式** | Tailwind CSS 4 + Anthropic 设计系统 |
| **PDF 引擎** | pdf-lib 1.17（操作） + pdfjs-dist 4.10（预览） |
| **桌面端** | Tauri v2（Rust） + 原生插件 |
| **部署** | GitHub Pages（Web） + 多平台安装包 |
| **PWA** | Service Worker + 离线缓存 |

---

## 📄 许可

MIT — 自由使用、修改、分发。
