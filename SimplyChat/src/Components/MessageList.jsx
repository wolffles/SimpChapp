import React, {useContext} from "react";
import {getUsernameColor, isLink} from '../utility/clientChatRoom'
import  userContext  from "../context/UserContext"


export default function MessageList({ messages} ) {
  const {user} = useContext(userContext)
  let messageList;

  if (messages){
    messageList = messages.map((message, i) =>{
      //handle image input
      let imgObj = null
      let linkObj = null
      let textObj = null
      let userObj = null
      let messageSRC = null
    //user message
      if (message[1]){
        messageSRC = message[1] == user.username ? "userMessage" : "otherUserMessage"
        userObj = <div className={"usernameText"} key={i} style={{color:getUsernameColor(message[1])}}>{message[1]}</div>
        // if image
        if(message[2]){
          imgObj = <img src={message[2]} key={i+"img"} alt="Preview" style={{ maxWidth: '100px' }} />
        }
        // handle links
        if(isLink(message[0])){
          linkObj =<a target="_blank"  rel='noopener noreferrer' href={message[0]}>{message[0]}</a>
        }else {
          // normal text message
          textObj =<span>{message[0]}</span>
        }
        //server message
      }else {
          textObj = <><div key={i}>{message[0]}</div></>
          messageSRC = "serverMessage"
      }
      
        if (userObj){
          return ( 
            <div className={"messageBox"+ " " + (messageSRC)} key={i}>
              <li className={"messageItem" + " " + (messageSRC)} >
                {userObj && userObj}
                {imgObj && imgObj}
                {linkObj && linkObj}
                {textObj && textObj}
              </li>
            </div>
          )
        }else {
          return (
            <li className={"messageItem" + " " + (messageSRC)} key={i}>
              {imgObj && imgObj}
              {linkObj && linkObj}
              {textObj && textObj}
            </li>
          )
        }
    });


  }

  return (
      <ul className="messageList"> {messageList} </ul>
  );
}