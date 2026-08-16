import React from 'react'
import QRCodeModal from './QRCodeModal'

// QR para menú digital (standalone, sin mesa)
export default function QRMenuModal({ url, onClose }) {
  return <QRCodeModal open={!!url} onClose={onClose} title="Menú Digital" url={url} qrId="qr-menu" />
}
