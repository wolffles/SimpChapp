import {React} from 'react'
import  {Link} from 'react-router-dom'

const ControlBoard = () => {

    return (
        <div className='controlBoard'>
            <Link to="/">Home</Link>
            <Link to="videochat">Video</Link>     
        </div>
    )
}

export default ControlBoard