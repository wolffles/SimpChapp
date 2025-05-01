import React, { useContext, useEffect, useState } from 'react';
import { ThemeProvider, createTheme, CssBaseline, Box } from '@mui/material';
import Login from './Components/Login';
import Chatroom from './Components/Chatroom';
import VideoChat from './Components/VideoChat';
import userContext from './context/UserContext';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Create a theme instance
const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#90caf9',
    },
    secondary: {
      main: '#f48fb1',
    },
    background: {
      default: '#121212',
      paper: '#1e1e1e',
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          margin: 0,
          padding: 0,
        },
      },
    },
  },
});

function App() {
  const { user } = useContext(userContext);
  const [isMobile, setIsMobile] = useState(false);
  
  const handleResize = () => {
    setIsMobile(window.innerWidth <= 768);
  };

  useEffect(() => {
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Box
          sx={{
            maxHeight: '100vh',
            bgcolor: 'background.default',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {!user ? (
            <Login />
          ) : (
            <Box
              id="app-container"
              sx={{
                display: 'flex',
                flex: 1,
                overflow: 'hidden',
                position: 'relative',
                p: 2,
                gap: 2,
                width: '100%',
              }}
            >
              {/* Chat Section - 40% width */}
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  bgcolor: 'background.paper',
                  borderRadius: 3,
                }}
              >
                <Chatroom isMobile={isMobile} />
              </Box>

              {/* Video Section - 60% width */}
              <Box
                id='video-box'
                sx={{
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  bgcolor: 'background.paper',
                  borderRadius: 2,
                  boxShadow: 3,
                }}
              >
                <VideoChat />
              </Box>
            </Box>
          )}
        </Box>
      </Router>
    </ThemeProvider>
  );
}

export default App;
