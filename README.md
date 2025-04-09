# SimpChapp

Simple Chat APP

Node, express, socketIO, PeerJS, Vite, React
SocketIO for chats, and PeerJs for video calls.
How Video Chat Works (WebRTC - real time communication.):
When User A wants to call User B:
User A connects to PeerServer and gets an ID
User B connects to PeerServer and gets an ID
User A initiates call using User B's ID
PeerServer helps establish direct P2P connection
Video/Audio streams directly between users (not through server).

## to Deploy
in production it serves static files created in dist/ 
1. npm run build
2. to deploy to fly.io flyctl deploy

for dev/local "npm run dev" runs concurrently and nodemon to hot reload.

#TODO
* clean up code
* fix the tab title says vite+react
* controlboard
    - add call incoming.
    - add post call id to chatroom
    - add more zoom like features
    - add better messaging in chat instead of video section
    - add ability to toggle views like in zoom.
    - 



