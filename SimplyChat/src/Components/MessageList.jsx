import React from "react";
import {getUsernameColor, isLink} from '../utility/clientChatRoom'


export default function MessageList({ messages} ) {
  let messageList;

  if (messages){
    messageList = messages.map((message, i) =>{
      //handle image input
      let imgObj = null
      let linkObj = null
      let textObj = null
      let userObj = null
    //user message
      if (message[1]){
        userObj = <><span className="spanMessage" key={i} style={{color:getUsernameColor(message[1])}}>{message[1]}</span>:</>
        // if image
        if(message[2]){
          imgObj = <img src={message[2]} key={i} alt="Preview" style={{ maxWidth: '100px' }} />
        }
        // handle links
        if(isLink(message[0])){
          linkObj =<a target="_blank"  rel='noopener noreferrer' href={message[0]}>{message[0]}</a>
        }else {
          // normal text message
          textObj =<>{message[0]}</>
        }
        //server message
      }else {
          textObj = <><div className="serverMessage" key={i}>{message[0]}</div></>
      }
      return (
        <li className="playerMessage" key={i}>
          {userObj && userObj}
          {imgObj && imgObj}
          {linkObj && linkObj}
          {textObj && textObj}
        </li>
      )
    });


  }

  return (
      <ul className="messageList"> {messageList} </ul>
  );
}