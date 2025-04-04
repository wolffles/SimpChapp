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
    
    // Reference to the local video element
    const localVideoRef = useRef(null);
    // Reference to the remote video element
    const remoteVideoRef = useRef(null);
    // Reference to store the connection timeout ID for cleanup
    const connectionTimeoutRef = useRef(null);

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
                port: 5051,
                path: "/peerjs/peerConnect",
                debug: 0,
                // Configure STUN server for NAT traversal
                config: {
                    iceServers: [
                        { urls: 'stun:stun.l.google.com:19302' }
                    ]
                }
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
            
            // Answer the call with the local stream
            call.answer(stream);
            // Set up stream handling for the call
            handleStream(stream, call);
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
        if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
            setLocalStream(stream);
        }

        // Handle incoming remote stream
        call.on('stream', (remoteStream) => {
            setRemoteStream(remoteStream);
            if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = remoteStream;
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
            // Set up stream handling for the call
            handleStream(stream, call);
        } catch (err) {
            setError('Failed to access media devices. Please check permissions.');
            setIsInCall(false);
        }
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

    // Add these styles at the top of the file after the imports
    const videoStyles = {
        videoGrid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '16px',
            padding: '16px',
            height: '100%',
            width: '100%',
            backgroundColor: '#1a1a1a',
            borderRadius: '8px',
        },
        videoContainer: {
            position: 'relative',
            width: '100%',
            aspectRatio: '16/9',
            backgroundColor: '#2a2a2a',
            borderRadius: '8px',
            overflow: 'hidden',
        },
        videoElement: {
            width: '100%',
            height: '100%',
            objectFit: 'cover',
        },
        videoLabel: {
            position: 'absolute',
            bottom: '8px',
            left: '8px',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '14px',
        },
    };

    return (
        <div className={`videoContainer ${user ? "" : "hidden"}`}>
            <div className="video-toolbar">
                <div className="toolbar-left" style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%'
                }}>
                    <h1 className="toolbar-title" style={{paddingLeft: '20px'}}>Simply Chat</h1>
                    <span className="call-id" style={{paddingRight: '20px'}}>ID: {callId}</span>
                </div>
                
                <div className="toolbar-center">
                    {error && <div className="error-message">{error}</div>}
                    {isConnecting && <div className="connecting-message">Connecting to server...</div>}
                </div>

                <div className="toolbar-right">
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
            </div>
            <div style={videoStyles.videoGrid}>
                <div style={videoStyles.videoContainer}>
                    <video 
                        ref={localVideoRef} 
                        autoPlay 
                        muted 
                        playsInline 
                        style={videoStyles.videoElement}
                    />
                    <div style={videoStyles.videoLabel}>You</div>
                </div>
                <div style={videoStyles.videoContainer}>
                    <video 
                        ref={remoteVideoRef} 
                        autoPlay 
                        playsInline 
                        style={videoStyles.videoElement}
                    />
                    <div style={videoStyles.videoLabel}>Remote User</div>
                </div>
            </div>
        </div>
    );
};

export default VideoChat;