// HELPER FUNCTIONS

/**
 * emitDataToClient sends information to the client listening or that requested information, designed to go inside of a listener
 * @param {Object} room 
 */
export const clearToBroadcast = (room) => {
    room.toBroadcast = {
        userJoined:"",
        userLeft: "",
        userRemoved: "",
        numUsers: ""
    }
}

/**
 * emitDataToClient sends information to the client listening or that requested information, designed to go inside of a listener
 * @param {socket} socket 
 * @param {String} listenString 
 * @param {Object} dataObj 
 */
export const emitDataToClient= (socket, listenString, dataObj) => {
    socket.emit(listenString, dataObj)
}

/**
 * broad cast to all in room exluding sender
 * @param {Socket} socket 
 * @param {String} listenString 
 * @param {Object} dataObj 
 */
export const broadcastRoomExcludeSender = (socket, roomName, listenString, dataObj ) => {
    socket.to(roomName).emit(listenString, dataObj)
}

/**
 * broad cast to all in room including sender 
 * @param {*} io 
 * @param {*} roomName 
 * @param {*} listenString 
 * @param {*} roomObj 
 */
export const broadcastToRoom = (io, roomName, listenString, roomObj) => { 
    io.in(roomName).emit(listenString, roomObj);
}
