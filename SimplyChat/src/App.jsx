import React, { useEffect } from 'react'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import UserContextProvider from './context/UserContextProvider'
import ControlBoard from './Components/ControlBoard'
import Login from './Components/Login'
import Chatroom from './Components/Chatroom'
import VideoChat from './Components/VideoChat'


const App = () => {
  return (
    <Router>
        <UserContextProvider>
          <Routes>
            <Route path='/' element={
              <>
                <Login/>
                {/* <ControlBoard /> */}
                <div className='pages'>
                  <Chatroom/>
                  <VideoChat/>
                </div>
              </>
            } />
            {/* <Route path='chatroom' element={<Chatroom/>}/> */}
            <Route path='/videochat' element={<VideoChat/>} />
          </Routes>
        </UserContextProvider>
      </Router>
  )
}

export default App
