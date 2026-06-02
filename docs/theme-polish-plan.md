# PDFit 主题系统精致打磨规划方案

> 基于 Phase 5 Anthropic 设计系统的深化升级，目标：提升品牌视觉一致性、让深色/浅色模式切换更自然护眼。

---

## 一、当前现状诊断

### 1.1 已有基础（Phase 5 成果）
- Anthropic 设计系统：暖橙主色 `#d97757`，Poppins + Lora 字体组合
- 三层主题支持：`light | dark | system`，localStorage 持久化
- CSS Token 体系：语义化变量（bg/text/border/surface/shadow）
- 基础组件类：`.btn-primary`、`.btn-secondary`、`.card`、`.input`、`.badge` 等
- 自定义滚动条、动画关键帧（fadeIn / slideUp / scaleIn）
- 响应式断点、减少动效媒体查询 `prefers-reduced-motion`

### 1.2 现存问题
| 问题 | 影响 | 位置 |
|------|------|------|
| 深色模式背景偏灰、对比度不足 | 长时间使用易疲劳 | `--color-bg-primary: #1a1a19` 偏暖灰 |
| 阴影在深色模式使用黑色 rgba | 不自然、发闷 | `.dark` shadow tokens |
| 组件中存在硬编码颜色 | 维护困难、主题一致性差 | `rgba(217,119,87,0.1)` 等散落各处 |
| 主题切换无过渡动画 | 突兀、体验割裂 | `document.documentElement.classList.toggle` |
| 暖橙 accent 在深色模式下饱和度过高 | 刺眼、不够优雅 | `#d97757` 在 `#1a1a19` 上对比强烈 |
| Thumbnail 预览 Canvas 背景硬编码白色 | 深色模式不协调 | `ctx.fillStyle = '#fff'` |
| 无系统级 `color-scheme` 声明 | 浏览器原生控件（如滚动条、input date）不跟随主题 | `<meta>` / CSS |
| 字体加载依赖 Google Fonts CDN | 国内访问不稳定 | 可配置 fallback |

---

## 二、打磨目标

1. **护眼深色模式**：降低蓝光感、提升对比度舒适度、避免纯黑死寂
2. **丝滑主题切换**：添加 200-300ms 过渡动画，所有颜色/阴影/背景平滑过渡
3. **Token 体系完善**：消除硬编码颜色，建立完整的语义层 + 组件层 Token
4. **品牌一致性**：accent 色在双主题下都有良好表现，PDF 预览 Canvas 自适应
5. **无障碍达标**：WCAG AA 对比度、尊重 `prefers-reduced-motion`、支持 `prefers-contrast`

---

## 三、具体改动规划（7 大模块）

### 模块 A：深色模式护眼色彩重构

**当前问题**：深色背景 `#1a1a19` 偏暖灰，阴影使用纯黑 rgba，整体发闷。

**改动方案**：
- **背景层**：引入真正的深色层级系统
  - `bg-primary`: `#0f0f0f` → `#121212`（微抬，避免死黑）
  - `bg-secondary`: `#1a1a1a` → `#1e1e1e`
  - `bg-tertiary`: `#2a2a29` → `#2d2d2d`
  - 保留极微弱的暖色底调（Anthropic 基因），但大幅降低
- **文字层**：
  - `text-primary`: `#faf9f5`（保持）
  - `text-secondary`: `#a8a6a0` → `#b0ada8`（稍微提亮，提升可读性）
  - `text-muted`: `#6a6864` → `#7a7770`（降低对比度落差）
- **阴影层**：深色模式阴影改用 **带色偏的暗色** 而非纯黑
  - `shadow-md`: `0 4px 12px rgba(0,0,0,0.3)` → `0 4px 12px rgba(15,15,15,0.5)`
  - 添加微弱的环境光感，避免"黑洞"效果
- **Surface 层级**：
  - `surface`: `#1a1a1a` → `#1c1c1c`（与 bg-secondary 拉开微妙层次）
  - `surface-elevated`: `#2a2a29` → `#252525`（降低亮度，避免浮起感过强）
  - `surface-active`: `#332d2a` → `rgba(217,119,87,0.08)`（从实色改为 accent 透明叠加）

**技术路径**：
```css
.dark {
  --color-bg-primary: #121212;
  --color-bg-secondary: #1a1a1a;
  --color-bg-tertiary: #252525;
  --color-text-primary: #f5f5f0;
  --color-text-secondary: #b0ada8;
  --color-text-muted: #7a7770;
  --color-surface: #1c1c1c;
  --color-surface-elevated: #252525;
  --color-surface-active: rgba(217, 119, 87, 0.08);
  /* 阴影改用带环境色的暗色 */
  --shadow-md: 0 4px 12px rgba(10, 10, 10, 0.5);
}
```

---

### 模块 B：CSS Token 体系完善（消除硬编码）

**当前问题**：大量 `rgba(217,119,87,0.x)` 硬编码散落组件中。

**改动方案**：
1. **新增语义 Token**：
   ```css
   :root {
     --color-accent-50: rgba(217, 119, 87, 0.05);
     --color-accent-100: rgba(217, 119, 87, 0.1);
     --color-accent-200: rgba(217, 119, 87, 0.2);
     --color-accent-300: rgba(217, 119, 87, 0.3);
     --color-accent-500: #d97757;
     --color-accent-600: #c4664a;
   }
   ```
2. **深色模式 accent 降级**：
   ```css
   .dark {
     --color-accent-500: #e08a6d;  /* 稍微提亮，降低饱和度 */
     --color-accent-600: #d97757;
   }
   ```
3. **全局替换**：将组件中所有硬编码 `rgba(217,119,87,x)` 替换为对应的 Token
   - EmptyState.tsx 背景光晕、图标背景、按钮
   - FileDropzone.tsx 拖拽状态
   - FileList.tsx 激活态图标背景
   - Header.tsx logo 背景
   - ThumbnailGrid.tsx hover 边框
   - 各 Tool 组件中的 accent 引用

**涉及文件**：
- `src/index.css`（新增 Token）
- `src/components/EmptyState.tsx`
- `src/components/FileDropzone.tsx`
- `src/components/FileList.tsx`
- `src/components/Header.tsx`
- `src/components/ThumbnailGrid.tsx`
- `src/components/tools/*.tsx`

---

### 模块 C：主题切换过渡动画

**当前问题**：切换瞬间完成，无任何过渡，体验割裂。

**改动方案**：
1. **全局过渡声明**：
   ```css
   @layer base {
     html, body, #root {
       transition: background-color 300ms cubic-bezier(0.4, 0, 0.2, 1),
                   color 300ms cubic-bezier(0.4, 0, 0.2, 1);
     }
     
     /* 所有使用 CSS 变量的元素默认过渡 */
     *, *::before, *::after {
       transition: background-color 200ms ease,
                   border-color 200ms ease,
                   box-shadow 200ms ease,
                   color 150ms ease;
     }
   }
   ```
2. **排除无需过渡的元素**：
   ```css
   canvas, img, video, iframe {
     transition: none !important;
   }
   ```
3. **ThemeToggle 按钮动效**：图标切换时添加旋转/淡入淡出
   - Sun → Moon：旋转 180° + scale 0.8→1
   - Moon → Sun：反向旋转
4. **尊重 `prefers-reduced-motion`**：
   ```css
   @media (prefers-reduced-motion: reduce) {
     *, *::before, *::after {
       transition-duration: 0.01ms !important;
     }
   }
   ```

**涉及文件**：
- `src/index.css`
- `src/components/ThemeToggle.tsx`
- `src/contexts/ThemeContext.tsx`（可选：在切换时添加 class 触发过渡）

---

### 模块 D：品牌视觉一致性提升

**当前问题**：Logo 区域较朴素，空状态布局在不同主题下质感差异大。

**改动方案**：
1. **Logo 区域精致化**：
   - 添加微渐变背景（light: 纯白→微暖白，dark: 微提亮）
   - Logo 图标添加 subtle glow 效果
   - 品牌名添加 letter-spacing 微调
2. **EmptyState 左侧品牌区**：
   - 背景光晕从固定 opacity 改为 theme-aware（深色模式更柔和）
   - PDF 示意卡片添加 subtle 内发光/外阴影层次
3. **Upload 区域**：
   - 拖拽状态的光晕效果 theme-aware
   - 按钮 hover 添加 glow 扩散效果
4. **全局 focus ring**：
   - 当前：`0 0 0 3px rgba(217,119,87,0.3)`
   - 优化：添加 `outline-offset: 2px`，深色模式增强对比

**涉及文件**：
- `src/components/Header.tsx`
- `src/components/EmptyState.tsx`
- `src/components/FileDropzone.tsx`
- `src/index.css`

---

### 模块 E：组件状态精细化

**当前问题**：部分交互状态缺少视觉反馈或反馈不够细腻。

**改动方案**：
1. **Button 加载态**：
   - 新增 `.btn-loading` 类，带 spinner 动画 + 文字淡出
2. **Input 错误态**：
   - 新增 `.input-error` 类，边框变红 + 微抖动动画
3. **FileList 拖拽排序态**：
   - 拖拽时添加抬升阴影 + 缩放效果
4. **Thumbnail 选中态**：
   - 当前 hover 有 scale(1.02)，但缺少明确的"选中"状态
   - 添加选中时的 accent border + checkmark 图标
5. **Toast/Notification 系统**（可选增强）：
   - 操作成功/失败的轻量提示，带 slideIn + fadeOut

**涉及文件**：
- `src/index.css`
- `src/components/FileList.tsx`
- `src/components/ThumbnailGrid.tsx`
- 各 Tool 组件

---

### 模块 F：字体与排版优化

**当前问题**：Google Fonts CDN 国内不稳定，字体回退不够优雅。

**改动方案**：
1. **字体栈增强**：
   ```css
   --font-heading: 'Poppins', 'PingFang SC', 'Microsoft YaHei', 'Hiragino Sans GB', Arial, sans-serif;
   --font-body: 'Lora', 'Noto Serif SC', 'Songti SC', Georgia, serif;
   ```
2. **font-display: swap**：避免 FOIT（Flash of Invisible Text）
3. **中文排版优化**：
   - 标题行高从默认 1.2 调至 1.3（中文需要更多呼吸空间）
   - 正文行高 1.6-1.8
   - 中文标点优化（`text-spacing-trim` 等，视浏览器支持）
4. **数字等宽**：
   ```css
   font-variant-numeric: tabular-nums;
   ```
   应用于文件大小、页码等

**涉及文件**：
- `src/index.css`

---

### 模块 G：无障碍与系统级适配

**当前问题**：缺少 `color-scheme` 声明，浏览器原生控件不跟随主题。

**改动方案**：
1. **CSS `color-scheme`**：
   ```css
   :root { color-scheme: light; }
   .dark { color-scheme: dark; }
   ```
2. **`<meta name="color-scheme">`**：
   ```html
   <meta name="color-scheme" content="light dark">
   ```
3. **高对比度模式支持**：
   ```css
   @media (prefers-contrast: high) {
     :root {
       --color-border: #000;
       --shadow-sm: none;
       --shadow-md: none;
     }
     .dark {
       --color-border: #fff;
     }
   }
   ```
4. **焦点管理**：
   - 确保所有交互元素有可见 focus indicator
   - 当前已有 `:focus-visible` 支持，需验证各组件

**涉及文件**：
- `src/index.css`
- `index.html`

---

## 四、实施优先级

| 优先级 | 模块 | 预估工时 | 影响面 |
|--------|------|----------|--------|
| P0 | A 深色护眼色彩重构 | 2h | 全局深色体验 |
| P0 | C 主题切换过渡动画 | 1.5h | 全局体验 |
| P0 | G 系统级 color-scheme | 0.5h | 浏览器原生控件 |
| P1 | B Token 体系完善 | 3h | 维护性 + 一致性 |
| P1 | D 品牌视觉一致性 | 2h | 品牌感知 |
| P2 | F 字体排版优化 | 1h | 中文体验 |
| P2 | E 组件状态精细化 | 2h | 交互细节 |

**总计**：约 12 小时，可分 2-3 次迭代交付。

---

## 五、验收标准

- [ ] 深色模式连续使用 30 分钟无视觉疲劳感
- [ ] 主题切换时所有元素平滑过渡，无闪烁/跳变
- [ ] 全局搜索 `rgba(217,119,87` 无硬编码（Token 化率 100%）
- [ ] 浏览器滚动条、input date picker 等原生控件跟随主题
- [ ] Lighthouse Accessibility 评分 ≥ 95
- [ ] 减少动效设置下无过渡动画（尊重用户偏好）
- [ ] 中文标题/正文排版舒适，无拥挤感

---

## 六、风险与回退

| 风险 | 缓解措施 |
|------|----------|
| 过渡动画影响性能 | 限制在 `transform` / `opacity` / `color` 属性，避免 layout thrashing |
| 深色色彩调整过激进 | 保留旧值注释，可快速回退 |
| Token 替换遗漏 | 全局搜索 `d97757` / `217, 119, 87` 双重校验 |
| 中文字体栈导致 FOIT | 使用 `font-display: swap` + 系统字体优先 |

---

*规划版本：v1.0*
*日期：2026-05-31*
