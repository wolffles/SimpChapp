import React, { useContext } from 'react';
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

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Box
          sx={{
            minHeight: '100vh',
            bgcolor: 'background.default',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {!user ? (
            <Login />
          ) : (
            <Box
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
                  borderRadius: 2,
                  boxShadow: 3,
                }}
              >
                <Chatroom />
              </Box>

              {/* Video Section - 60% width */}
              <Box
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
