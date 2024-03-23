import React, { useEffect, useContext, useState } from 'react'
import userContext from '../context/UserContext'
import {sendMessage, socket, updatePlayerInfo} from '../utility/socket.js';
import MessageList from './MessageList.jsx'
import {cleanInput} from '../utility/clientChatRoom.js'

const Chatroom = () => {
  const {user} = useContext(userContext)
  const [message, setMessage] = useState('')
  const [localMessageList, setLocalMessageList] = useState([])

  function addMessage(message, username){
    let updatedState = Object.assign([],localMessageList);
    updatedState = localMessageList.concat([[message, username]]) 
    //you could save messages at this point if you send it to the back end
    setLocalMessageList(updatedState);   
    //don't know if I need this
    // updatePlayerInfo({messages:updatedState, username:userInfo.username, action:'chat'})
  }

  const submitMessage = (e) => {
    e.preventDefault();
    setMessage(cleanInput(message));
    // Prevent markup from being injected into the message 
    // TODO this doesn't actually clean the message *BUG*
    sendMessage({message:message, username:user.username});
    addMessage(message, user.username);
    console.log(user)
    setMessage("")
  }

  useEffect(() => {
    socket.on('message', (data) =>{
        addMessage(data.message, data.username);
        console.log('hit')
    });
    return function cleanup() {
       socket.off('message');
      };
  });

  return (
    <div className="pages">
    <div className={`chat page ${user ? "" : "hidden"}`}>
      <div className="chatArea">
        <div id="messages" className="messages">
            <MessageList messages={localMessageList} />   
        </div>
      </div>
      <form className="messageInput" onSubmit={submitMessage}>
          <input className="inputMessage"
            placeholder="Type here..."
            value={message}
            onChange={(e) => {setMessage(e.target.value)}}
          />
      </form>
    </div>
  </div>
  )
}

export default Chatroom