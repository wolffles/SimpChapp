import React, { useEffect, useContext, useState } from 'react'
import userContext from '../context/UserContext'
import {sendMessage, socket, updatePlayerInfo} from '../utility/socket.js';
import MessageList from './MessageList.jsx'
import {cleanInput} from '../utility/clientChatRoom.js'

const Chatroom = () => {
  const {user} = useContext(userContext)
  const [message, setMessage] = useState('')
  const [image, setImage] = useState(null);
  const [localMessageList, setLocalMessageList] = useState([])

  function addMessage(message, username, image = null ){
    let updatedState = Object.assign([],localMessageList);
    if(!!image){
      setLocalMessageList(localMessageList.concat())
    }
    
    updatedState = localMessageList.concat([[message, username, image]]) 
    //you could save messages at this point if you send it to the back end
    console.log(localMessageList)
    setLocalMessageList(updatedState);   
    //don't know if I need this
    // updatePlayerInfo({messages:updatedState, username:userInfo.username, action:'chat'})
  }

  const submitMessage = (e) => {
    e.preventDefault();
    setMessage(cleanInput(message));
    // Prevent markup from being injected into the message 
    // TODO this doesn't actually clean the message *BUG*
    sendMessage({message:message, username:user.username, image: image});
    addMessage(message, user.username, image);
    console.log(user)
    setMessage("")
    setImage(null)
    document.getElementById('imgTag').value = ''
  }

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImage(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };


  useEffect(() => {
    socket.on('message', (data) =>{
        addMessage(data.message, data.username, data.image);

    });

    socket.on('disconnect', () => {
      var today = new Date();
      var time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds() + ":" + today.getMilliseconds();
      console.log("you've been disconnected ", time)
      addMessage('you have been disconnected');
    });

    socket.on('update room state', (roomData) => {
      let updatedState = Object.assign([],localMessageList);
      if(roomData.toBroadcast.userJoined){updatedState.push([roomData.toBroadcast.userJoined])}
      if(roomData.toBroadcast.userLeft){updatedState.push([roomData.toBroadcast.userLeft])}
      if(roomData.toBroadcast.numUsers){updatedState.push([roomData.toBroadcast.numUsers])}
      if(roomData.toBroadcast.userRemoved){updatedState.push([roomData.toBroadcast.userRemoved])}
      if(roomData.toBroadcast.userRmovedError){updatedState.push(oomData.toBroadcast.userRemovedError)}
      setLocalMessageList(updatedState);   
    });

    return function cleanup() {
      socket.off('message');
      socket.off('disconnect');
      socket.off('update room state');
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
      <div className="messageInput">
        {/* the image && will not display if image is null */}
        {image && <img src={image} alt="Preview" style={{ maxWidth: '100px' }} />}
        <form onSubmit={submitMessage} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) {submitMessage(e)}}}>
            {/* File input for selecting image */}
            <input id='imgTag' type="file" onChange={handleImageChange} accept="image/*" />
            <textarea className="inputMessage"
              placeholder="Type here..."
              value={message}
              onChange={(e) => {setMessage(e.target.value)}}
            />
        </form>
      </div>
    </div>
  </div>
  )
}

export default Chatroom