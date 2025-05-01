import io from 'socket.io-client';

const getSocketHost = () => {
    if (window.location.hostname === 'localhost') {
        return 'http://localhost:5050';
    }
    // For production, use the current hostname with HTTPS
    return `https://${window.location.hostname}`;
};

// Create socket with proper configuration
const socket = io(getSocketHost(), {
    transports: ['polling'],  // Start with polling only
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
    path: '/socket.io/',
    secure: window.location.hostname !== 'localhost',
    withCredentials: true, 
    closeOnBeforeunload: false
});

// Log connection events for debugging
socket.on('connect', () => {
    console.log('Socket connected successfully');
});

socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
});

socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason);
});

export const hostname = window.location.hostname;

// to server
export const sendMessage = (data) => {
    socket.emit('user message', data);
}

export const addUser = (data) => {
    socket.emit('add user', data)
}

export const updatePlayers = (data) => {
    socket.emit('update players', data)
}

export const updatePlayerInfo = (data) => {
    socket.emit('update player info', data)
}

export { socket };
