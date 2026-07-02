'use client'

import React, { useRef } from 'react'

interface PosterPreviewProps {
  nome: string
  slug: string
  codigoAcesso: string
  posterTitle: string
  posterInstructions: string
  posterTheme: 'blue' | 'zinc' | 'emerald'
}

export default function PosterPreview({
  nome, slug, codigoAcesso, posterTitle, posterInstructions, posterTheme
}: PosterPreviewProps) {
  const printRef = useRef<HTMLDivElement>(null)
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(`https://zelify.vercel.app/${slug}`)}`

  const handlePrint = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const themeColor = posterTheme === 'blue' ? '#001CFF'
      : posterTheme === 'emerald' ? '#10B981'
      : '#18181B'

    printWindow.document.write(`
      <html>
        <head>
          <title>${nome} - Zelcore</title>
          <style>
            @page { size: A4 portrait; margin: 0; }
            body { margin: 0; padding: 40px; background: white; color: black; font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: space-between; min-height: 100vh; box-sizing: border-box; text-align: center; }
            .border-frame { border: 12px double ${themeColor}; padding: 30px; border-radius: 0; width: 100%; height: 100%; box-sizing: border-box; display: flex; flex-direction: column; align-items: center; justify-content: space-between; }
            .header { display: flex; align-items: center; justify-content: center; gap: 12px; }
            .header-icon { font-size: 48px; color: ${themeColor}; }
            .header-title { font-size: 30px; font-weight: 900; letter-spacing: 4px; text-transform: uppercase; }
            .badge { background: #E4E4E7; font-weight: 900; text-transform: uppercase; padding: 8px 16px; border-radius: 8px; border: 1px solid #D4D4D8; font-size: 14px; display: inline-block; }
            .main-title { font-size: 36px; font-weight: 900; line-height: 1.2; }
            .subtitle { font-size: 16px; color: #52525B; font-weight: 600; max-width: 500px; line-height: 1.5; }
            .qr-box { border: 4px solid ${themeColor}40; padding: 24px; border-radius: 24px; background: #FAFAFA; display: inline-block; }
            .qr-box img { width: 256px; height: 256px; object-fit: contain; display: block; }
            .info-box { background: #FAFAFA; border: 1px solid #E4E4E7; border-radius: 16px; padding: 24px; max-width: 500px; width: 100%; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
            .info-label { font-size: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; color: #71717A; }
            .info-code { font-size: 36px; font-weight: 900; letter-spacing: 4px; color: ${themeColor}; }
            .info-link { font-size: 14px; color: #52525B; font-family: monospace; }
            .footer { font-size: 10px; color: #A1A1AA; font-weight: 900; text-transform: uppercase; letter-spacing: 4px; }
          </style>
        </head>
        <body>
          <div class="border-frame">
            <div>
              <div class="header">
                <span class="header-icon">&#9670;</span>
                <span class="header-title">Zelcore</span>
              </div>
              <br/>
              <div class="badge">${nome}</div>
              <h1 class="main-title">${posterTitle}</h1>
              <p class="subtitle">${posterInstructions}</p>
            </div>
            <div class="qr-box">
              <img src="${qrUrl}" alt="QR Code" />
            </div>
            <div class="info-box">
              <div class="info-label">Código de Acesso</div>
              <div class="info-code">${codigoAcesso}</div>
              <div class="info-link">zelify.vercel.app/${slug}</div>
            </div>
            <div class="footer">Gerado automaticamente pelo Zelcore</div>
          </div>
        </body>
      </html>
    `)
    printWindow.document.close()
    setTimeout(() => printWindow.print(), 500)
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`https://zelify.vercel.app/${slug}`)
  }

  const handleDownloadQR = () => {
    const link = document.createElement('a')
    link.href = qrUrl
    link.download = `qr-code-${slug}.png`
    link.click()
  }

  return (
    <div className="flex flex-col items-center space-y-6 py-4">
      {/* Poster Preview */}
      <div
        ref={printRef}
        className="bg-white rounded-2xl border-4 border-double overflow-hidden w-full max-w-sm shadow-lg text-zinc-900"
        style={{ borderColor: posterTheme === 'blue' ? '#001CFF' : posterTheme === 'emerald' ? '#10B981' : '#18181B' }}
      >
        <div className="p-6 flex flex-col items-center text-center space-y-4">
          <div className="flex items-center space-x-2">
            <span className="text-2xl font-black tracking-widest uppercase" style={{ color: posterTheme === 'blue' ? '#001CFF' : posterTheme === 'emerald' ? '#059669' : '#18181B' }}>Zelcore</span>
          </div>
          <div className="text-xs bg-zinc-200 font-black uppercase px-3 py-1 rounded-lg tracking-widest border border-zinc-300">
            {nome}
          </div>
          <h2 className="text-lg font-black tracking-tight leading-tight">{posterTitle}</h2>
          <p className="text-[11px] text-zinc-600 font-semibold leading-relaxed px-4">{posterInstructions}</p>
          <div className="bg-zinc-50 p-3 rounded-xl border-2" style={{ borderColor: `${posterTheme === 'blue' ? '#001CFF' : posterTheme === 'emerald' ? '#10B981' : '#18181B'}40` }}>
            <img src={qrUrl} alt="QR Code" className="w-32 h-32 object-contain" />
          </div>
          <div className="w-full bg-zinc-50 rounded-xl border border-zinc-200 p-4 space-y-2">
            <div className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Código de Acesso</div>
            <div className="text-2xl font-black tracking-widest" style={{ color: posterTheme === 'blue' ? '#001CFF' : posterTheme === 'emerald' ? '#059669' : '#18181B' }}>
              {codigoAcesso || '----'}
            </div>
            <div className="text-[10px] text-zinc-500 font-mono">
              zelify.vercel.app/{slug}
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="w-full max-w-sm space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center justify-center space-x-2 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold rounded-xl border border-zinc-800 transition-all active:scale-[0.98] cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
            <span>Imprimir Placa</span>
          </button>
          <button
            type="button"
            onClick={handleDownloadQR}
            className="flex items-center justify-center space-x-2 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold rounded-xl border border-zinc-800 transition-all active:scale-[0.98] cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            <span>Baixar QR Code</span>
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handleCopyLink}
            className="flex items-center justify-center space-x-2 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold rounded-xl border border-zinc-800 transition-all active:scale-[0.98] cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
            <span>Copiar Link</span>
          </button>
          <a
            href="/dashboard/configuracoes?tab=geral"
            className="flex items-center justify-center space-x-2 py-2.5 bg-brand hover:bg-brand/90 text-white text-xs font-semibold rounded-xl transition-all active:scale-[0.98]"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            <span>Editar Placa</span>
          </a>
        </div>
      </div>
    </div>
  )
}
