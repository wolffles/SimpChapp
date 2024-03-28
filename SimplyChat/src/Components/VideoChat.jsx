import { Peer } from "peerjs";
import React, {useEffect, useState, useContext, useRef} from 'react'
import { useNavigate } from 'react-router-dom';
import userContext from '../context/UserContext'


const VideoChat = () => {
    const navigateTo = useNavigate();
    const {user} = useContext(userContext);
    const [peerId, setPeerId] = useState('')
    const [peer, setPeer] = useState(null);
    const [remoteStream, setRemoteStream] = useState(null);
    // User video ref
    const localVideoRef = useRef(null);
    // Other's video ref
    const remoteVideoRef = useRef(null);

    const initializePeer = async () => {
        // Create a PeerJS instance
        const newPeer = new Peer();

        // Listen for open event
        newPeer.on('open', (id) => {
            console.log('My peer ID is: ' + id);
        });

        // Listen for incoming call
        newPeer.on('call', (call) => {
            // Answer the call
            console.log(call)
            call.answer();

            // Receive stream from caller
            call.on('stream', (remoteStream) => {
            setRemoteStream(remoteStream);
            if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = remoteStream;
            }
            });
        });

        // Store the PeerJS instance in state
        setPeer(newPeer);
    };

    useEffect(() => {
        if (!user) {
            navigateTo('/');
        }else{
            console.log('hit')
            initializePeer();
        }
        // Cleanup function
        return () => {
        // Disconnect from PeerJS server when component unmounts
            if (peer) {
                peer.disconnect();
            }
        };
    }, []);

    const handleCall = () => {
        // Get user media
        navigator.mediaDevices
        .getUserMedia({ video: true, audio: true })
        .then((stream) => {
            // Display local video stream
            if (localVideoRef.current) {
                localVideoRef.current.srcObject = stream;
            }

            // Call remote peer
            const call = peer.call(peerId, stream);

            // Listen for stream event
            call.on('stream', (remoteStream) => {
            setRemoteStream(remoteStream);
            if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = remoteStream;
                console.log('remoteVideoRef.current.srcObject', remoteVideoRef.current.srcObject)
            }
            });
        })
        .catch((error) => {
            console.error('Error accessing media devices:', error);
        });
    };

    const endCall = () => {
        if (localVideoRef.current.srcObject) {
            const stream = localVideoRef.current.srcObject;
            
            // Stop each track in the stream
            stream.getTracks().forEach((track) => {
              track.stop();
            });
        
            // Clear the srcObject to stop video playback
            localVideoRef.current.srcObject = null;
        }
        if ( remoteVideoRef.current.srcObject) {
            remoteVideoRef.current.srcObject = null;
        }
    }

    return (
        <div>
        <h1>PeerJS Video Chat</h1>
        <div>
            {/* User's video */}
            <video ref={localVideoRef} autoPlay muted playsInline />
            {/* callers video */}
            <video ref={remoteVideoRef} autoPlay playsInline />
        </div>
        <input
            type="text"
            placeholder="Enter peer ID"
            value={peerId}
            onChange={(e) => setPeerId(e.target.value)}
        />
        <button onClick={handleCall}>Call</button>
        <button onClick={endCall}>End</button>
        </div>
    );
};
    

export default VideoChat