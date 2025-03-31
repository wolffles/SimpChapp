import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './style.css'
import UserContextProvider from './context/UserContextProvider'

ReactDOM.createRoot(document.getElementById('root')).render(
  //react strictmode will rerender components in dev to help uncover fatal errors
  <React.StrictMode>
    <UserContextProvider>
      <App />
    </UserContextProvider>
  </React.StrictMode>,
)
