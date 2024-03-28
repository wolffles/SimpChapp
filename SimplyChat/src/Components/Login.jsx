import React, { useContext, useState } from 'react'
import userContext from '../context/UserContext'
import {socket} from '../utility/socket.js';

const Login = () => {
    const [username, setuserName] = useState('')

    const {user,setUser} = useContext(userContext);


    const createUser =(e)=>{
        e.preventDefault();
        let tempUser = {username:username, roomName:undefined}
        // because react states are async we will have to set a temp user object
        setUser(tempUser);
        socket.emit('add user', tempUser);
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
