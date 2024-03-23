import React, { useContext, useState } from 'react'
import userContext from '../context/UserContext'
import {socket} from '../utility/socket.js';

const Login = () => {
    const [username, setuserName] = useState('')

    const {user,setUser} = useContext(userContext);

    const createUser =(e)=>{
        e.preventDefault();
        setUser({username:username, roomName:''});
        socket.emit('add user', user);
    }

  return (
    <div className={`login page ${user?.username ? "hidden" : ""}`}>
      <form id="entername" className="form" type="form" onSubmit={createUser} >
        <h3 className="title">What's your nickname?</h3>
        <input type='text ' value={username}  placeholder='enter your name ' onChange={(e)=> setuserName(e.target.value)}/>
      </form>
    </div>
  )
}

export default Login
