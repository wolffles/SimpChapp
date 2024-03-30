import { Peer } from "peerjs";
import React, {useEffect, useState, useContext, useRef} from 'react'
import { useNavigate } from 'react-router-dom';
import {hostname} from '../utility/socket'
import userContext from "../context/UserContext";


const VideoChat = () => {
    const navigateTo = useNavigate();
    const {user} = useContext(userContext);
    const [callId, setCallId] = useState('')
    const [remotePeerId, setRemotePeerId] = useState('')
    const [peer, setPeer] = useState(null);
    const [remoteStream, setRemoteStream] = useState(null);
    const [localStream, setLocalStream] = useState(null);
    // User video ref
    const localVideoRef = useRef(null);
    // Other's video ref
    const remoteVideoRef = useRef(null);

    const initializePeer = () => {
        // Create a PeerJS instance\
        if (!peer){
            //saving this for when we can figure it out
            // const newPeer = new Peer(user.username,{
            const newPeer = new Peer({
                host: hostname,
                port: 5051,
                path: "/peerjs/peerConnect",
                debug: 0,
            });
    
            // Listen for open event
            newPeer.on('open', (id) => {
                console.log('My peer ID is: ' + id);
                console.log(newPeer)
                setCallId(id)
            });
    
            // Listen for incoming call
            newPeer.on('call', (call) => {
                // Answer the call
                console.log(call)
                navigator.mediaDevices
                .getUserMedia({ video: true, audio: true })
                .then((stream) => {
                    call.answer(stream);
                    // Display local video stream
                    if (localVideoRef.current) {
                        localVideoRef.current.srcObject = stream
                        setLocalStream(localVideoRef.current.srcObject)
                    }
                    
                    // Receive stream from caller
                    call.on('stream', (remoteStream) => {
                        setRemoteStream(remoteStream);
                        if (remoteVideoRef.current) {
                            remoteVideoRef.current.srcObject = remoteStream;
                        }
                    });
                })
                newPeer.on('close', endCall)
            });
    
            // Store the PeerJS instance in state
            setPeer(newPeer);
        }
    };

    const handleCall = () => {
        // Get user media

        navigator.mediaDevices
        .getUserMedia({ video: true, audio: true })
        .then((stream) => {
            // Display local video stream
            if (localVideoRef.current) {
                localVideoRef.current.srcObject = stream
                setLocalStream(localVideoRef.current.srcObject)
            }

            console.log(stream)

            console.log('RemotepeerId',remotePeerId)
            // Call remote peer
            const call = peer.call(remotePeerId, localVideoRef.current.srcObject);

            // Listen for stream event
            call.on('stream', (remoteStream) => {
                console.log(remoteStream)
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
        console.log(peer.connections)
        for (let conns in peer.connections) {
            peer.connections[conns].forEach((conn, index, array) => {
              console.log(`closing ${conn.connectionId} peerConnection (${index + 1}/${array.length})`, conn.peerConnection);
              conn.peerConnection.close();
        
              // close it using peerjs methods
              if (conn.close)
                conn.close();
            });
          }
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
            const stream = remoteVideoRef.current.srcObject;
            
            console.log('stream tracks', stream.getTracks())
            // way to turn off media devices
            stream.getTracks().forEach((track) => {
              track.stop();
            });
            remoteVideoRef.current.srcObject = null;
            console.log('2nd stream tracks', stream.getTracks())
        }
    }

    useEffect(() => {
        // if (!user) {
        //     navigateTo('/');
        // }else{
            initializePeer()
        // }

        // Cleanup function
        return () => {
        // Disconnect from PeerJS server when component unmounts
            if (peer) {
                peer.disconnect();
            }
        };
    }, []);

    return (
        <div className={`videoContainer ${user ? "" : "hidden"}`}>
            <h1>PeerJS Video Chat</h1>
            <h3>Your call id is: {callId}</h3>
            <div>
                {/* User's video */}
                <video style={{width:'25%', height:'auto'}} ref={localVideoRef} autoPlay muted playsInline />
                {/* callers video */}
                <video ref={remoteVideoRef} autoPlay playsInline />
            </div>
            <input
                type="text"
                placeholder="Enter peer ID"
                value={remotePeerId}
                onChange={(e) => setRemotePeerId(e.target.value)}
            />
            <button onClick={handleCall}>Call</button>
            <button onClick={endCall}>End</button>
        </div>
    );
};
    

export default VideoChat