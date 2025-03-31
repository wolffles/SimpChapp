import React, { useState, useContext, useEffect } from 'react';
import { Box, TextField, Typography, Paper, Container, Alert } from '@mui/material';
import userContext from '../context/UserContext';
import {socket} from '../utility/socket.js';

const Login = () => {
    const [username, setUsername] = useState('');
    const [error, setError] = useState('');
    const { setUser } = useContext(userContext);

    useEffect(() => {
        // Log socket connection status
        console.log('Socket connected:', socket.connected);
        
        // Listen for socket connection events
        socket.on('connect', () => {
            console.log('Socket connected successfully');
        });

        socket.on('connect_error', (error) => {
            console.error('Socket connection error:', error);
            setError('Connection error. Please try again.');
        });

        return () => {
            socket.off('connect');
            socket.off('connect_error');
        };
    }, []);

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');
        
        if (!username.trim()) {
            setError('Please enter a username');
            return;
        }

        if (!socket.connected) {
            setError('Not connected to server. Please try again.');
            return;
        }

        try {
            const tempUser = {username: username, roomName: undefined};
            console.log('Setting user:', tempUser);
            setUser(tempUser);
            console.log('Emitting add user event');
            socket.emit('add user', tempUser);
        } catch (err) {
            console.error('Error in handleSubmit:', err);
            setError('An error occurred. Please try again.');
        }
    };

    return (
        <Box
            sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'background.default',
            }}
        >
            <Container maxWidth="sm">
                <Paper
                    elevation={3}
                    sx={{
                        p: 4,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        bgcolor: 'background.paper',
                    }}
                >
                    <Typography
                        variant="h4"
                        component="h1"
                        sx={{
                            mb: 4,
                            color: 'primary.main',
                            fontWeight: 300,
                        }}
                    >
                        Welcome to SimplyChat
                    </Typography>
                    {error && (
                        <Alert severity="error" sx={{ mb: 2, width: '100%' }}>
                            {error}
                        </Alert>
                    )}
                    <form onSubmit={handleSubmit} style={{ width: '100%' }}>
                        <TextField
                            fullWidth
                            variant="outlined"
                            placeholder="Enter your username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    '& fieldset': {
                                        borderColor: 'primary.main',
                                    },
                                    '&:hover fieldset': {
                                        borderColor: 'primary.light',
                                    },
                                },
                                '& .MuiInputLabel-root': {
                                    color: 'text.secondary',
                                },
                            }}
                        />
                    </form>
                </Paper>
            </Container>
        </Box>
    );
};

export default Login;
