import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const notifyAnotherTing = ( title, message) => {
    let data = JSON.stringify({
    "userId": process.env.ANOTHER_TING_USER_ID,
    "title": title,
    "message": message,
    "email": process.env.ANOTHER_TING_EMAIL
    });

    let config = {
    method: 'post',
    maxBodyLength: Infinity,
    url: process.env.ANOTHER_TING_URL,
    headers: { 
        'Content-Type': 'application/json'
    },
    data : data
    };

    axios.request(config)
    .then((response) => {
    console.log(JSON.stringify(response.data));
    })
    .catch((error) => {
    console.log(error);
    });
}

export default notifyAnotherTing;