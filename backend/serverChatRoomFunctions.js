import { clearToBroadcast } from './broadcastFunctions.js';

const COLORS2 = [
    '#e21400', '#91580f', '#f8a700', '#f78b00',
    '#58dc00', '#287b00', '#a8f07a', '#4ae8c4',
    '#3b88eb', '#3824aa', '#a700ff', '#d300e7'
];

const COLORS = [
    '#1A1A1D', '#6F2232', '#950740',
    '#C3073F', '#226d2b', '#226d5a', '#079732',
    '#07977a', '#c507a5', '#7562d1',
    '#3ab4bd', '#07c559', '#dcde64', '#e08207'
];

// Colors correlate to #4 in following link: https://digitalsynopsis.com/design/website-color-schemes-palettes-combinations/

// Gets the color of a username through our hash function
const getUsernameColor = (username) => {
    // Compute hash code
    var hash = 7;
    for (var i = 0; i < username.length; i++) {
        hash = username.charCodeAt(i) + (hash << 5) - hash;
    }
    // Calculate color
    var index = Math.abs(hash % COLORS.length);
    return COLORS[index];
}


 const createChatRoom = (roomName) => {
        return {
            roomID: '',
            roomName: roomName,
            numUsers: 0,
            connectedUsersList: [],
            broadcast: false,
            toBroadcast: {
                userJoined:"",
                userLeft: "",
                userRemoved: "",
                numUsers: ""
            }
        }
    }
 const createPlayerObj = (username, data) => {
        return {
            username: username,
            id: data.id ,
            points:[['Input title...','0']],
            password: data.password, 
            color: getUsernameColor(username),
            roomName: data.roomName,
            messages: [['Welcome To TieBreaker', undefined]],
            scratchPad: [['input','here']]
        }
    }

// newPlayerInRoom: function(room,player){
//     room.savedPlayers[player.username] = player
//     room.savedPlayersList.push(player.username)
//     return room
// },

const userConnectedToRoom = (room, username) => {
    room.connectedUsersList.push(username);
    clearToBroadcast(room)
    room.broadcast = true
    room.toBroadcast.userJoined = [`New user, ${username} joined `, undefined]
    room.toBroadcast.numUsers = [`There's ${room.connectedUsersList.length} participants`, undefined]
    return room
}

const userDisconnected = (room, username) => {
    let idx = room.connectedUsersList.indexOf(username);
    room.connectedUsersList.splice(idx, 1);
    clearToBroadcast(room)
    room.broadcast = true
    room.toBroadcast.userLeft = [username + " left the room"]
    room.toBroadcast.numUsers = [`There's ${room.connectedUsersList.length} participants`]
}

 const removeUser = (room, username) => {
        delete room.savedPlayers[username];
        let idx = room.savedPlayersList.indexOf(username);
        room.savedPlayersList.splice(idx,1);
        clearToBroadcast(room);
        room.broadcast = true
        room.toBroadcast.userRemoved = [`${username}'s player area was removed.`]

    }
 const deleteRoom = (rooms, roomName) => {
        if (rooms[roomName].connectedUsersList.length == 0){
            delete rooms[roomName];
        }
    }

export {
    getUsernameColor,
    createChatRoom,
    createPlayerObj,
    userConnectedToRoom,
    userDisconnected,
    removeUser,
    deleteRoom
};