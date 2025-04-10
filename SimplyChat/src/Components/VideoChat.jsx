import { Peer } from "peerjs";
import React, {useEffect, useState, useContext, useRef} from 'react'
import { useNavigate } from 'react-router-dom';
import {hostname} from '../utility/socket'
import userContext from "../context/UserContext";

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
                port: hostname === 'localhost' ? 5051 : 443,
                path: "/peerjs/peerConnect",
                debug: 0,
                // Configure STUN server for NAT traversal
                config: {
                    iceServers: [
                        { urls: 'stun:stun.l.google.com:19302' },
                        { urls: 'stun:stun1.l.google.com:19302' },
                        { urls: 'stun:stun2.l.google.com:19302' }
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
                setError('Disconnected from server. Attempting to reconnect...');
                newPeer.reconnect();
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
            // Request access to user's media devices
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: true, 
                audio: true 
            });

            // Set up local video stream
            if (localVideoRef.current) {
                localVideoRef.current.srcObject = stream;
                setLocalStream(stream);
            }

            // Initiate the call
            const call = peer.call(remotePeerId, stream);
            // Set up remotestream handling for the call
            // handleStream(stream, call);
            call.on('stream', (remoteStream) => {
                if (remoteVideoRef.current) {
                    remoteVideoRef.current.srcObject = remoteStream;
                }
                setPinnedVideo(remoteStream);
            });

        } catch (err) {
            setError('Failed to access media devices. Please check permissions.');
            setIsInCall(false);
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
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: true, 
                audio: true 
            });
            // Set up local video
            if (localVideoRef.current) {
                localVideoRef.current.srcObject = stream;
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
                }
                setPinnedVideo(remoteStream);
            });

        } catch (err) {
            setError('Failed to access media devices. Please check permissions.');
            call.close();
            setIsInCall(false);
        }
    };

    /**
     * Handle media streams with error checking
     * Manages both local and remote streams
     * Sets up event handlers for stream events
     */
    const handleStream = (stream, call) => {
        // Set up local video stream
        let localvideo;
        let remotevideo;

        if (localVideoRef.current) {
            console.log("local video ref", localVideoRef.current)
            localVideoRef.current.srcObject = stream;
            setLocalStream(stream);
            localvideo =  {
                    id: call.peer || "local",
                    ref: localVideoRef,
                    stream: stream,
                    muted: true
                };
        }

        // Handle incoming remote stream
        call.on('stream', (remoteStream) => {
            if (remoteVideoRef.current) {
                console.log("remote video ref", remoteVideoRef.current)
                remoteVideoRef.current.srcObject = remoteStream;
                setRemoteStream(remoteStream);
                remotevideo = {
                    id: call.peer,
                    ref: remoteVideoRef,
                    stream: remoteStream,
                    muted: false
                };
                setPinnedVideo(remotevideo);
            }
        });
        

        
        // Handle call closure
        call.on('close', () => {
            endCall();
        });

        // Handle call errors
        call.on('error', (err) => {
            setError(`Call error: ${err.message}`);
            endCall();
        });
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
            <div className="video-toolbar" style={{display: 'flex', paddingTop: '10px', paddingBottom: '10px'}}>
                <div className="toolbar-left">
                    <input
                        className="call-input"
                        type="text"
                        placeholder="Enter Call ID"
                        value={remotePeerId}
                        onChange={(e) => setRemotePeerId(e.target.value)}
                        disabled={isInCall}
                    />
                    <button 
                        className="toolbar-button call-button"
                        onClick={handleCall}
                        disabled={isInCall || isConnecting}
                    >
                        Call
                    </button>
                    <button 
                        className="toolbar-button end-button"
                        onClick={endCall}
                        disabled={!isInCall}
                    >
                        End
                    </button>
                </div>
                <div className="toolbar-right" style={{marginLeft: 'auto', cursor: 'pointer', position: 'relative'}}>
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
                            paddingRight: '20px', 
                            cursor: 'pointer',
                            transition: 'background-color 0.2s'
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
            <div className="toolbar-messages">
                    {error && <div className="error-message">{error}</div>}
                    {isConnecting && <div className="connecting-message">Connecting to server...</div>}
                </div>
            <div className="video-container">
                <video 
                    ref={pinnedVideo?.id === 'local' ? localVideoRef : remoteVideoRef} 
                    autoPlay 
                    muted 
                    playsInline 
                    className="main-video"
                />
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
