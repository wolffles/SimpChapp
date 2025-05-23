import React, { useEffect, useContext, useState } from 'react'
import userContext from '../context/UserContext'
import {sendMessage, socket} from '../utility/socket.js';
import MessageList from './MessageList.jsx'
import {cleanInput} from '../utility/clientChatRoom.js'
import ExpandLessIcon from '@mui/icons-material/ExpandLess';

const Chatroom = ({isMobile}) => {
  const {user} = useContext(userContext)
  const [message, setMessage] = useState('')
  const [image, setImage] = useState(null);
  const [localMessageList, setLocalMessageList] = useState([])
  const [isOpen, setIsOpen] = useState(false);
  function addMessage(message, username, image = null ){
    let updatedState = Object.assign([],localMessageList);
    if(!!image){
      setLocalMessageList(localMessageList.concat())
    }
    
    updatedState = localMessageList.concat([[message, username, image]]) 
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
    sendMessage({message:message, username:user.username, image: image});
    addMessage(message, user.username, image);
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

  const toggleMobileChat = () => {

    setIsOpen(!isOpen);
  };


  useEffect(() => {
    socket.on('message', (data) =>{
        addMessage(data.message, data.username, data.image);

    });

    socket.on('disconnect', (reason) => {
      console.log("Disconnect reason:", reason);  // Add this to see what's happening
  
      // Let's be more specific about which reasons to ignore
      const ignoredReasons = [
        'io client disconnect',    // Manual disconnection
        'transport close',         // Normal transport closure
        'transport error',         // Initial connection attempts
        'ping timeout',           // Initial connection attempts
        'client namespace disconnect' // Client-side namespace disconnect
      ];
    
      if (!ignoredReasons.includes(reason)) {
        var today = new Date();
        var time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds() + ":" + today.getMilliseconds();
        console.log("you've been disconnected ", time)
        addMessage('you have been disconnected');
      }
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

  useEffect(() => {
      if(!isMobile){
      setIsOpen(false)
      }
  }, [isMobile])

  // sx={{
  //   display: 'flex',
  //   flexDirection: 'column',
  //   overflow: 'hidden',
  //   bgcolor: 'background.paper',
  //   borderRadius: 2,
  //   boxShadow: 3,
  // }}
  return (
    <div className={`${isMobile ? "mobile-chat-container" : "chat-container"} ${isOpen ? "active" : ""}`}>
      {isMobile && (
        <div className={`mobileChatToggle ${isOpen ? "active" : ""}`}
            style={{
                width: '100%',
                color: 'white',
                backgroundColor: 'black',
                textAlign: 'center',
                fontSize: '2rem',
                height: '50px'
            }}
            onClick={toggleMobileChat}
        >
            <ExpandLessIcon onClick={toggleMobileChat}/>
        </div>
      )}
      <div className="chatArea">
        <div id="messages" className={"messages "+ (image ? "withpreview" : "")}>
          <h1 style={{margin: 'auto', textAlign: 'center'}}>Simply Chat</h1>
          <MessageList messages={localMessageList} />   
        </div>
        {/* the image && will not display if image is null */}
        <div className='imgPreviewBox img-tooltip'>
          {image && <img className="imgPreview" src={image} alt="Preview" 
          style={{ maxWidth: '100px' }} 
          onClick={() => {
            setImage(null);
            document.getElementById('imgTag').value = '';
          }}
          />}
        </div>
        <div className={"inputMessageBox" }>
          <form className="inputForm"onSubmit={submitMessage} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) {submitMessage(e)}}}>
              {/* File input for selecting image */}
              <input id='imgTag' type="file" onChange={handleImageChange} accept="image/*" />
              <textarea className="inputMessage"
                rows={6}
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