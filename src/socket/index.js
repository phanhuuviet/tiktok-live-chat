import { Server } from 'socket.io';

import { SOCKET_MESSAGE } from '../constants/socket-message.js';

const configurationSocket = (server) => {
    const io = new Server(server, {
        cors: {
            origin: '*',
        },
    });

    io.on(SOCKET_MESSAGE.CONNECTION, (socket) => {
        console.log(`User connected: ${socket.id}`);

        // DISCONNECT
        socket.on(SOCKET_MESSAGE.DISCONNECT, () => {
            console.log('User disconnected');
        });
    });
};

export default configurationSocket;
