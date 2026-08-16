import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './lib/theme'
import '@fontsource-variable/plus-jakarta-sans'
import '@fontsource-variable/inter'
import '@fontsource-variable/manrope'
import '@fontsource-variable/dm-sans'
import '@fontsource-variable/geist'
import '@fontsource-variable/ibm-plex-sans'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
