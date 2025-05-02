import { Peer } from "peerjs";
import React, {useEffect, useState, useContext, useRef} from 'react'
import { useNavigate } from 'react-router-dom';
import {hostname} from '../utility/socket'
import userContext from "../context/UserContext";
import CallRoundedIcon from '@mui/icons-material/CallRounded';
import CallEndRoundedIcon from '@mui/icons-material/CallEndRounded';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';

const VideoChat = () => {
    const navigateTo = useNavigate();
    const {user} = useContext(userContext);
    // State for managing the current user's call ID
    const [callId, setCallId] = useState('')
    // State for storing the ID of the peer we want to call
    const [remotePeerId, setRemotePeerId] = useState('')
    // State for storing the PeerJS instance
    const [peer, setPeer] = useState(null);
    // State for storing the remote user's media stream
    const [remoteStream, setRemoteStream] = useState(null);
    // State for storing the local user's media stream
    const [localStream, setLocalStream] = useState(null);
    // State for displaying error messages to the user
    const [error, setError] = useState(null);
    // State to track if we're currently establishing a connection
    const [isConnecting, setIsConnecting] = useState(false);
    // State to track if we're currently in an active call
    const [isInCall, setIsInCall] = useState(false);
    const [pinnedVideo, setPinnedVideo] = useState(null);
    // Reference to the local video element
    const localVideoRef = useRef(null);
    // Reference to the remote video element
    const remoteVideoRef = useRef(null);
    // Reference to store the connection timeout ID for cleanup
    const connectionTimeoutRef = useRef(null);
    const [showCopied, setShowCopied] = useState(false);
    const [isMuted, setIsMuted] = useState(false);

    // Add these constraints for better mobile support
    const mediaConstraints = {
        video: {
            facingMode: 'user', // Use front camera by default
            width: { ideal: 1280 },
            height: { ideal: 720 },
            aspectRatio: { ideal: 1.7777777778 }
        },
        audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
        }
    };

    /**
     * Initialize PeerJS connection with error handling and timeout
     * Sets up the peer connection with proper error handling and connection timeout
     * Also configures STUN server for NAT traversal
     */
    const initializePeer = () => {
        if (!peer) {
            setIsConnecting(true);
            setError(null);

            // Set a 10-second timeout for the connection attempt
            connectionTimeoutRef.current = setTimeout(() => {
                if (!peer) {
                    setError('Connection timeout. Please try again.');
                    setIsConnecting(false);
                }
            }, 10000);

            // Create new PeerJS instance with configuration
            const newPeer = new Peer({
                host: hostname,
                port: hostname === 'localhost' ? 5050 : 443,
                path: "/peerjs/peerConnect",
                debug: 3,
                config: {
                    iceServers: [
                        { urls: 'stun:stun.l.google.com:19302' }
                    ]
                },
                secure: hostname !== 'localhost'
            });

            // Handle successful connection
            newPeer.on('open', (id) => {
                clearTimeout(connectionTimeoutRef.current);
                setCallId(id);
                setIsConnecting(false);
            });

            // Handle connection errors
            newPeer.on('error', (err) => {
                clearTimeout(connectionTimeoutRef.current);
                setError(`Connection error: ${err.message}`);
                setIsConnecting(false);
            });

            // Handle disconnection with automatic reconnection
            newPeer.on('disconnected', () => {
                let attempts = 0;
                const maxAttempts = 10;
                const attemptReconnect = () => {
                    if (attempts < maxAttempts) {
                        setError(`Disconnected from server. Attempting to reconnect... (Attempt ${attempts + 1}/${maxAttempts})`);
                        newPeer.reconnect();
                        attempts++;
                    } else {
                        setError('Unable to reconnect. Please refresh the page to try again.');
                    }
                };
                attemptReconnect();
            });

            // Handle permanent connection closure
            newPeer.on('close', () => {
                setError('Connection closed. Please refresh the page.');
                setIsConnecting(false);
            });

            // Set up handler for incoming calls
            newPeer.on('call', handleIncomingCall);
            setPeer(newPeer);
        }
    };

    /**
     * Initiate outgoing call with validation
     * Handles the process of making an outgoing call
     * Includes input validation and media device access
     */
    const handleCall = async () => {


        // Validate remote peer ID
        if (!remotePeerId.trim()) {
            setError('Please enter a valid call ID');
            return;
        }

        // Check if peer connection is established
        if (!peer) {
            setError('Not connected to server. Please wait or refresh.');
            return;
        }

        try {
            setIsInCall(true);
            
            // Check if the browser supports getUserMedia
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('Your browser does not support media devices. Please try a different browser.');
            }

            // Check if the device has the required media capabilities
            const devices = await navigator.mediaDevices.enumerateDevices();
            const hasVideo = devices.some(device => device.kind === 'videoinput');
            const hasAudio = devices.some(device => device.kind === 'audioinput');

            if (!hasVideo || !hasAudio) {
                throw new Error(`Missing required devices: ${!hasVideo ? 'camera ' : ''}${!hasAudio ? 'microphone' : ''}`);
            }

            // Request permissions with fallback options
            const stream = await navigator.mediaDevices.getUserMedia({
                video: hasVideo ? mediaConstraints.video : false,
                audio: hasAudio ? mediaConstraints.audio : false
            }).catch(async (err) => {
                console.warn('Failed to get ideal constraints, trying fallback:', err);
                // Fallback to basic constraints
                return navigator.mediaDevices.getUserMedia({
                    video: hasVideo ? true : false,
                    audio: hasAudio ? true : false
                });
            });

            // Set up local video stream
            if (localVideoRef.current) {
                localVideoRef.current.srcObject = stream;
                // Ensure video plays on iOS Safari
                localVideoRef.current.setAttribute('playsinline', 'true');
                setLocalStream(stream);
            }

            // Initiate the call
            const call = peer.call(remotePeerId, stream);
            // Set up remotestream handling for the call
            // handleStream(stream, call);
            call.on('stream', (remoteStream) => {
                if (remoteVideoRef.current) {
                    remoteVideoRef.current.srcObject = remoteStream;
                    // Ensure video plays on iOS Safari
                    remoteVideoRef.current.setAttribute('playsinline', 'true');
                }
                setPinnedVideo(remoteStream);
            });

        } catch (err) {
            console.error('Media access error:', err);
            setIsInCall(false);
            setError(
                err.name === 'NotAllowedError' ? 
                'Camera/Microphone access denied. Please check your permissions.' :
                err.name === 'NotFoundError' ? 
                'No camera or microphone found on your device.' :
                `Failed to access media devices: ${err.message}`
            );
        }
    };

    /**
     * Handle incoming calls with proper error handling
     * Manages the process of answering an incoming call
     * Includes media device access and stream handling
     */
    const handleIncomingCall = async (call) => {
        try {
            setIsInCall(true);
            // Request access to user's media devices
            const stream = await navigator.mediaDevices.getUserMedia(mediaConstraints)
                .catch(async () => {
                    // Fallback to basic constraints
                    return navigator.mediaDevices.getUserMedia({
                        video: true,
                        audio: true
                    });
                });

            // Set up local video stream
            if (localVideoRef.current) {
                localVideoRef.current.srcObject = stream;
                localVideoRef.current.setAttribute('playsinline', 'true');
                setLocalStream(stream);
            }
            
            // Answer the call with the local stream
            call.answer(stream);
            // Set up stream handling for the call
            // handleStream(stream, call);
             // Handle incoming stream from the caller
            call.on('stream', (remoteStream) => {
                if (remoteVideoRef.current) {
                    remoteVideoRef.current.srcObject = remoteStream;
                    remoteVideoRef.current.setAttribute('playsinline', 'true');
                }
                setPinnedVideo(remoteStream);
            });

        } catch (err) {
            console.error('Media access error:', err);
            setError(`Failed to access media devices: ${err.message}`);
            call.close();
            setIsInCall(false);
        }
    };

    const handleVideoClick = () => {
        setPinnedVideo({
            id: pinnedVideo?.id === 'local' ? 'remote' : 'local',
            ref: pinnedVideo?.id === 'local' ? remoteVideoRef : localVideoRef,
            stream: pinnedVideo?.id === 'local' ? remoteStream : localStream,
            muted: pinnedVideo?.id === 'local' ? false : true
        });
        console.log("pinned video", pinnedVideo)
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(callId);
        setShowCopied(true);
        setTimeout(() => setShowCopied(false), 1000);
    };

   
    /**
     * Clean up all connections and media streams
     * Ensures proper cleanup of all resources when ending a call
     * Handles both peer connections and media tracks
     */
    const endCall = () => {
        // Clean up peer connections
        if (peer) {
            Object.values(peer.connections).forEach(conns => {
                conns.forEach(conn => {
                    if (conn.peerConnection) {
                        conn.peerConnection.close();
                    }
                    if (conn.close) {
                        conn.close();
                    }
                });
            });
        }

        // Clean up local video stream
        if (localVideoRef.current?.srcObject) {
            const stream = localVideoRef.current.srcObject;
            stream.getTracks().forEach(track => track.stop());
            localVideoRef.current.srcObject = null;
            setLocalStream(null);
        }

        // Clean up remote video stream
        if (remoteVideoRef.current?.srcObject) {
            const stream = remoteVideoRef.current.srcObject;
            stream.getTracks().forEach(track => track.stop());
            remoteVideoRef.current.srcObject = null;
            setRemoteStream(null);
        }

        setIsInCall(false);
    };

    const videoControls = () => {
        return (
            <div id="video-toolbar-controls"
                    style={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: '10px',
                        position: 'absolute',
                        bottom: '10px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        zIndex: 200
                    }}
                >
                    <button className="scaleHover" style={{backgroundColor: 'transparent', color: 'red', cursor: 'pointer', border: 'none', outline: 'none'}} onClick={endCall}>
                        <CallEndRoundedIcon />
                    </button>
                    <button
                        className="scaleHover"
                        onClick={() => {
                            if (localStream) {
                                localStream.getAudioTracks().forEach(track => {
                                    track.enabled = !track.enabled;
                                });
                                setIsMuted(prev => !prev);
                            }
                        }}
                        style={{
                            backgroundColor: 'transparent',
                            border: 'none',
                            outline: 'none',
                            cursor: 'pointer',
                            padding: '8px',
                            borderRadius: '4px'
                            }}
                        >
                        {isMuted ? 
                            <MicOffIcon sx={{color: 'red'}}/> : 
                            <MicIcon sx={{color: 'green'}}/>
                        }
                    </button>
                </div>
        )
    }

    // Initialize peer connection on component mount
    useEffect(() => {
        initializePeer();

        // Cleanup function for component unmount
        return () => {
            clearTimeout(connectionTimeoutRef.current);
            endCall();
            if (peer) {
                peer.disconnect();
            }
        };
    }, []);

    return (
        <div className={`video-space ${user ? "" : "hidden"}`} >
            <div className="video-toolbar" style={{display: 'flex', paddingTop: '10px', paddingBottom: '5px'}}>
                <div className="toolbar-left"   style={{paddingLeft: '10px', display: 'flex', alignItems: 'center'}}>
                    <input
                        className="call-input"
                        type="text"
                        placeholder="Enter Call ID"
                        value={remotePeerId}
                        onChange={(e) => setRemotePeerId(e.target.value)}
                        disabled={isInCall}
                        style={{
                            borderRadius: '10px'
                        }}
                    />
                    <button 
                        style={{
                            backgroundColor: 'transparent', 
                            border: 'none', 
                            outline: 'none', 
                            cursor: 'pointer',
                            transition: 'background-color 0.2s ease',
                            padding: '8px',
                            borderRadius: '4px'
                        }}
                        className="toolbar-button call-button scaleHover"
                        onClick={handleCall}
                        disabled={isInCall || isConnecting}
                    >
                        <CallRoundedIcon sx={{color: 'green', outline: 'none'}}/>
                    </button>
                    <button 
                        style={{backgroundColor: 'transparent', border: 'none', outline: 'none'}}
                        className="toolbar-button end-button scaleHover"
                        onClick={endCall}
                        disabled={!isInCall}
                    >
                        <CallEndRoundedIcon sx={{color: 'red', fill: 'red', cursor: 'pointer', outline: 'none'}}/>
                    </button>
                </div>
                <div className="toolbar-right" style={{marginLeft: 'auto', cursor: 'pointer', position: 'relative', paddingRight: '10px',}}>
                    <button 
                        className="call-id" 
                        onClick={() => {
                            handleCopy();
                            // Add darker color on click via inline styles
                            const btn = event.target;
                            btn.style.backgroundColor = '#2a2a2a';
                            setTimeout(() => btn.style.backgroundColor = '', 200);
                          
                        }} 
                        style={{
                            
                            cursor: 'pointer',
                            transition: 'background-color 0.2s',
                            borderRadius: '10px'
                        }}
                    >
                        call id: {callId}
                    </button>
                    {showCopied && (
                        <div style={{
                            position: 'absolute',
                            backgroundColor: '#2a2a2a',
                            color: 'white',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            top: '100%',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            zIndex: 1000
                        }}>
                            Copied!
                        </div>
                    )}
                </div>
            </div>
            <div className="toolbar-messages" style={{paddingLeft: '10px'}}>
                    {error && <div className="error-message">{error}</div>}
                    {isConnecting && <div className="connecting-message">Connecting to server...</div>}
                </div>
            <div className="video-container">
                <video 
                    ref={pinnedVideo?.id === 'local' ? localVideoRef : remoteVideoRef} 
                    autoPlay 
                    muted={pinnedVideo?.id === 'local'}
                    playsInline 
                    className="main-video"
                />
                {videoControls()}
                <div className="videoLabel">
                    {pinnedVideo === null ? 'Video not started' : pinnedVideo?.id === 'local' ? 'You' : 'Remote User'}
                </div>
            </div>
            <div className="video-thumbnails">
                <div 
                    className="thumbnail"
                    >
                    <video
                        onClick={() => handleVideoClick()}
                        ref={pinnedVideo?.id === 'local' ? remoteVideoRef : localVideoRef}
                        autoPlay
                        playsInline
                        muted={pinnedVideo?.id === 'local'}
                    />
                </div>
            </div>
        </div>
    );
};

export default VideoChat;
