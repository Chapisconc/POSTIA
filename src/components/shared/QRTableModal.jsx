import React from 'react'
import QRCodeModal from './QRCodeModal'

// QR para mesa: ?menu=1&table={id}
export default function QRTableModal({ table, baseUrl, onClose }) {
  const url = `${baseUrl}?menu=1&table=${table.id}`
  return <QRCodeModal open={!!table} onClose={onClose} title={`Mesa ${table.name}`} url={url} qrId={`qr-${table.id}`} />
}
