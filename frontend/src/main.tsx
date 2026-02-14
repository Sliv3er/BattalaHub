import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="bottom-right"
        toastOptions={{
          className: '',
          duration: 4000,
          style: {
            background: '#2f3136',
            color: '#fff',
            border: '1px solid #36393f',
          },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>,
)