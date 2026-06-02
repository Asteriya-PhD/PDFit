import { useCallback, useState } from 'react'
import { useApp } from '@/contexts/AppContext'
import { useI18n } from '@/i18n'
import {
  Upload,
  Layers,
  Bookmark,
  ArrowLeftRight,
  FileText,
  Shield,
} from 'lucide-react'

interface FeatureGroup {
  key: string
  icon: typeof Layers
  title: string
  desc: string
}

export default function EmptyState() {
  const { addFiles } = useApp()
  const { t } = useI18n()
  const [isDragging, setIsDragging] = useState(false)

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const fileList = Array.from(e.dataTransfer.files).filter(
        f => f.type === 'application/pdf'
      )
      if (fileList.length > 0) addFiles(fileList)
    },
    [addFiles]
  )

  const handleClick = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.pdf'
    input.multiple = true
    input.onchange = async () => {
      if (input.files) addFiles(Array.from(input.files))
    }
    input.click()
  }, [addFiles])

  const featureGroups: FeatureGroup[] = [
    {
      key: 'edit',
      icon: Layers,
      title: t('emptyState.group.edit'),
      desc: t('emptyState.group.edit.desc'),
    },
    {
      key: 'annotate',
      icon: Bookmark,
      title: t('emptyState.group.annotate'),
      desc: t('emptyState.group.annotate.desc'),
    },
    {
      key: 'convert',
      icon: ArrowLeftRight,
      title: t('emptyState.group.convert'),
      desc: t('emptyState.group.convert.desc'),
    },
    {
      key: 'extract',
      icon: FileText,
      title: t('emptyState.group.extract'),
      desc: t('emptyState.group.extract.desc'),
    },
  ]

  return (
    <div className="flex-1 flex flex-col min-h-0 animate-fadeIn">
      {/* 主体内容区：左右分栏，留白自然分割 */}
      <div className="flex-1 flex min-h-0">
        {/* ===== 左侧：品牌 + 示意图（约35%） ===== */}
        <div className="flex-[0.35] flex flex-col justify-center px-10 xl:px-14 relative">
          {/* 背景暖橙光晕 */}
          <div
            className="absolute pointer-events-none"
            style={{
              width: '500px',
              height: '500px',
              borderRadius: '50%',
              background:
                'radial-gradient(circle, var(--color-accent) 0%, transparent 65%)',
              opacity: 0.05,
              top: '10%',
              left: '-10%',
              filter: 'blur(80px)',
            }}
          />

          <div className="relative z-10">
            {/* 品牌标题 */}
            <h1
              className="text-4xl xl:text-5xl font-bold tracking-tight leading-none mb-3"
              style={{
                fontFamily: 'var(--font-heading)',
                color: 'var(--color-text-primary)',
              }}
            >
              PDFit
            </h1>
            <p
              className="text-lg xl:text-xl mb-6"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {t('emptyState.hero.subtitle')}
            </p>

            {/* 橙色短竖线装饰 */}
            <div
              className="mb-8"
              style={{
                width: '3px',
                height: '32px',
                backgroundColor: 'var(--color-accent)',
                borderRadius: '999px',
              }}
            />

            {/* 抽象示意图：PDF → 处理完成 */}
            <div className="flex items-center gap-4 mb-8">
              {/* 原始 PDF 示意 */}
              <div className="flex flex-col items-center gap-2">
                <div
                  className="w-16 h-20 rounded-lg flex flex-col items-center justify-center gap-1"
                  style={{
                    backgroundColor: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  <div
                    className="w-8 h-8 rounded flex items-center justify-center text-xs font-bold"
                    style={{
                      backgroundColor: 'var(--color-accent-100)',
                      color: 'var(--color-accent-700)',
                    }}
                  >
                    PDF
                  </div>
                </div>
                <span
                  className="text-sm"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  {t('emptyState.original')}
                </span>
              </div>

              {/* 箭头 */}
              <div className="flex flex-col items-center">
                <svg width="32" height="16" viewBox="0 0 32 16" fill="none">
                  <path
                    d="M1 8h28M24 2l6 6-6 6"
                    stroke="var(--color-accent)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              {/* 处理后示意 */}
              <div className="flex flex-col items-center gap-2">
                <div
                  className="w-20 h-16 rounded-lg flex flex-col items-center justify-center gap-1 px-2"
                  style={{
                    backgroundColor: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  <div
                    className="w-full h-1 rounded"
                    style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
                  />
                  <div
                    className="w-3/4 h-1 rounded"
                    style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
                  />
                  <div
                    className="w-full h-1 rounded"
                    style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
                  />
                </div>
                <span
                  className="text-sm font-medium"
                  style={{ color: 'var(--color-accent)' }}
                >
                  {t('emptyState.processed')}
                </span>
              </div>
            </div>

            {/* 隐私提示 */}
            <div
              className="flex items-center gap-2 text-sm"
              style={{ color: 'var(--color-text-muted)' }}
            >
              <Shield className="w-4 h-4 shrink-0" />
              <span>{t('emptyState.privacy')}</span>
            </div>
          </div>
        </div>

        {/* ===== 右侧：上传区（约65%，留白自然分割） ===== */}
        <div className="flex-[0.65] flex items-center justify-center px-6 xl:px-10 py-8">
          <div
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={handleClick}
            className="w-full max-w-xl xl:max-w-2xl cursor-pointer transition-all duration-500 relative"
            style={{
              borderRadius: '24px',
              backgroundColor: 'var(--color-surface)',
              border: `1px solid ${isDragging ? 'var(--color-accent)' : 'var(--color-border)'}`,
              boxShadow: isDragging
                ? '0 0 0 4px var(--color-accent-100), 0 16px 48px rgba(20, 20, 19, 0.08)'
                : '0 4px 24px rgba(20, 20, 19, 0.06)',
              padding: '52px 40px',
              transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            onMouseEnter={e => {
              if (!isDragging) {
                e.currentTarget.style.borderColor = 'var(--color-accent)'
                e.currentTarget.style.boxShadow =
                  '0 0 0 4px var(--color-accent-50), 0 16px 48px rgba(20, 20, 19, 0.08)'
              }
            }}
            onMouseLeave={e => {
              if (!isDragging) {
                e.currentTarget.style.borderColor = 'var(--color-border)'
                e.currentTarget.style.boxShadow =
                  '0 4px 24px rgba(20, 20, 19, 0.06)'
              }
            }}
          >
            {/* 左上角小橙色圆点 */}
            <div
              className="absolute top-5 left-5 w-2 h-2 rounded-full"
              style={{ backgroundColor: 'var(--color-accent)', opacity: 0.6 }}
            />

            <div className="flex flex-col items-center text-center">
              {/* PDF 形状靶心（圆角矩形+折角） */}
              <div
                className="relative mb-6 transition-all duration-500"
                style={{
                  width: '88px',
                  height: '110px',
                  borderRadius: '14px',
                  border: `2px dashed ${isDragging ? 'var(--color-accent)' : 'var(--color-border)'}`,
                  backgroundColor: isDragging
                    ? 'var(--color-accent-50)'
                    : 'transparent',
                }}
              >
                {/* 右上角折角 */}
                <div
                  className="absolute top-0 right-0"
                  style={{
                    width: '0',
                    height: '0',
                    borderStyle: 'solid',
                    borderWidth: '0 22px 22px 0',
                    borderColor: `transparent ${isDragging ? 'var(--color-accent-200)' : 'var(--color-border)'} transparent transparent`,
                  }}
                />
                {/* PDF 文字 */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <span
                    className="text-lg font-medium"
                    style={{ color: 'var(--color-accent-700)' }}
                  >
                    PDF
                  </span>
                </div>
              </div>

              <p
                className="text-xl font-semibold mb-2"
                style={{
                  fontFamily: 'var(--font-heading)',
                  color: 'var(--color-text-primary)',
                }}
              >
                {t('emptyState.dropzone.text')}
              </p>
              <p
                className="text-base mb-8"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {t('emptyState.dropzone.hint')}
              </p>

              {/* 按钮 */}
              <span
                className="inline-flex items-center gap-2 px-8 py-3 rounded-full text-base font-semibold transition-all duration-300 hover:-translate-y-[1px] active:translate-y-0"
                style={{
                  backgroundColor: 'var(--color-accent-700)',
                  color: 'white',
                  fontFamily: 'var(--font-heading)',
                  transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              >
                <Upload className="w-5 h-5" />
                {t('emptyState.browseButton')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ===== 底部：4张功能分组卡片 ===== */}
      <div
        className="shrink-0 px-10 xl:px-16 pb-6 pt-2"
        style={{ backgroundColor: 'var(--color-bg-primary)' }}
      >
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {featureGroups.map(group => {
            const Icon = group.icon
            return (
              <div
                key={group.key}
                className="flex items-start gap-3 px-4 py-3 rounded-xl"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                  style={{ backgroundColor: 'var(--color-accent-100)' }}
                >
                  <Icon
                    className="w-5 h-5"
                    style={{ color: 'var(--color-accent)' }}
                  />
                </div>
                <div className="min-w-0">
                  <p
                    className="text-base font-semibold leading-tight mb-1"
                    style={{
                      fontFamily: 'var(--font-heading)',
                      color: 'var(--color-text-primary)',
                    }}
                  >
                    {group.title}
                  </p>
                  <p
                    className="text-sm leading-snug truncate"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    {group.desc}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
