import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <div class="pages">
          <div class="chat page">
          <button id="bellbtn">bell</button>
          <button id="push">push</button>
            <div class="chatArea">
              <div class="messages"></div>
            </div>
            <input class="inputMessage" placeholder="Type here..."/>
          </div>
          <div class="login page">
            <div id="entername" class="form" onsubmit="playForm" >
              <h3 class="title">What's your nickname?</h3>
              <input class="usernameInput" type="text" maxlength="14" />
            </div>
          </div>
        </div>
    </>
  )
}

export default App
