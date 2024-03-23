import React from 'react'
import Login from './Components/Login'
import Chatroom from './Components/Chatroom'
import UserContextProvider from './context/UserContextProvider'

const App = () => {
  return (
    <UserContextProvider>
    <Login/>
    <Chatroom />

    </UserContextProvider>
  )
}

export default App
