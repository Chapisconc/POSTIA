import { QRCodeCanvas } from 'qrcode.react'
import React from 'react'
import { Printer, Download } from 'lucide-react'
import { Button, Modal } from '../ui'

export default function QRCodeModal({ open, onClose, title, url, qrId }) {
  const handleDownload = () => {
    const canvas = document.getElementById(qrId)
    if (!canvas) return
    const link = document.createElement('a')
    link.download = `${title.replace(/\s+/g, '_')}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=400,height=500')
    if (!printWindow) return
    const imgSrc = document.getElementById(qrId)?.toDataURL()
    printWindow.document.write(`
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: sans-serif; text-align: center; padding: 20px; }
            h2 { margin-bottom: 5px; font-size: 24px; }
            p { color: #666; margin: 5px 0 20px; }
            img { width: 256px; height: 256px; }
            .footer { margin-top: 20px; font-size: 12px; color: #999; }
          </style>
        </head>
        <body>
          <h2>${title}</h2>
          <p>Escanea para ver el menú y hacer tu pedido</p>
          <img src="${imgSrc}" alt="QR" />
          <div class="footer">POSTIA · Punto de Venta</div>
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.print()
  }

  return (
    <Modal open={open} onClose={onClose} title={`QR · ${title}`} maxW="max-w-sm" zIndex="z-[100]">
      <div className="bg-card border border-line rounded-xl p-6 flex flex-col items-center gap-4">
        <QRCodeCanvas
          id={qrId}
          value={url}
          size={200}
          level="H"
          includeMargin
          bgColor="transparent"
          fgColor="currentColor"
          className="text-night"
        />
        <div className="text-center">
          <p className="text-sm text-muted">Escanea para abrir el menú</p>
          <p className="text-xs text-muted font-mono mt-1 break-all">{url}</p>
        </div>
      </div>

      <div className="flex gap-2 mt-4">
        <Button variant="outline" className="flex-1" onClick={handleDownload}>
          <Download size={16} className="mr-1" /> Descargar
        </Button>
        <Button className="flex-1" onClick={handlePrint}>
          <Printer size={16} className="mr-1" /> Imprimir
        </Button>
      </div>
    </Modal>
  )
}
