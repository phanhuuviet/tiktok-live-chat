import { Server } from 'socket.io';
import { WebcastPushConnection } from 'tiktok-live-connector';

import { SOCKET_MESSAGE, TIKTOK_LIVE_MESSAGE } from '../constants/socket-message.js';
import { convertTimestampToISO } from '../utils/index.js';

const liveConnectionsBySocketId = {}; // Store connection for each socket

const configurationSocket = (server) => {
    const io = new Server(server, {
        cors: {
            origin: '*',
        },
    });

    io.on(SOCKET_MESSAGE.CONNECTION, (socket) => {
        console.log(`User connected: ${socket.id}`);

        socket.on(SOCKET_MESSAGE.JOIN_LIVE, async (data) => {
            try {
                const { tiktokUsername } = data;
                if (!tiktokUsername) {
                    socket.emit('error', { message: 'TikTok username is required' });
                    return;
                }

                // Check if a connection already exists for the username
                if (liveConnectionsBySocketId[socket.id]) {
                    socket.emit('error', { message: 'Already connected to a live' });
                    return;
                }

                console.log(`Connecting to TikTok Live for ${tiktokUsername}...`);

                const tiktokLiveConnection = new WebcastPushConnection(tiktokUsername, {
                    requestOptions: {
                        timeout: 30000,
                    },
                });

                // Store the connection for the username
                liveConnectionsBySocketId[socket.id] = tiktokLiveConnection;

                tiktokLiveConnection
                    .connect()
                    .then((state) => {
                        console.info(`Connected to roomId ${state.roomId}`);
                    })
                    .catch((err) => {
                        console.error('Failed to connect', err);
                    });

                // Listen for chat messages
                tiktokLiveConnection.on(TIKTOK_LIVE_MESSAGE.CHAT, (chatData) => {
                    console.log(
                        `${chatData.uniqueId} (userId:${chatData.userId}, userName: ${chatData.nickname}) writes: ${
                            chatData.comment
                        }. At: ${convertTimestampToISO(chatData.createTime)}`,
                    );
                    socket.emit('chat-message', chatData);
                });

                // Listen for stream end
                tiktokLiveConnection.on(TIKTOK_LIVE_MESSAGE.STREAM_END, () => {
                    console.log('Stream ended');
                    socket.emit('stream-end', { message: 'Stream ended' });
                    if (liveConnectionsBySocketId[socket.id]) {
                        liveConnectionsBySocketId[socket.id].disconnect();
                        delete liveConnectionsBySocketId[socket.id];
                        console.log(`Disconnected from TikTok Live for ${tiktokUsername} due to stream end`);
                        // socket.emit('live-disconnected', { message: `Disconnected from ${tiktokUsername}` });
                    }
                });

                // Listen for disconnect request
                socket.on(SOCKET_MESSAGE.LEAVE_LIVE, () => {
                    if (liveConnectionsBySocketId[socket.id]) {
                        liveConnectionsBySocketId[socket.id].disconnect();
                        delete liveConnectionsBySocketId[socket.id];
                        console.log(`Disconnected from TikTok Live for ${tiktokUsername}`);
                        socket.emit('live-disconnected', { message: `Disconnected from ${tiktokUsername}` });
                    }
                });
            } catch (err) {
                console.error('Failed to connect', err);
                socket.emit('error', { message: 'Failed to connect to TikTok Live' });
                return;
            }
        });

        // DISCONNECT
        socket.on(SOCKET_MESSAGE.DISCONNECT, () => {
            // Clean up any existing live connections for this socket
            console.log(`User disconnected: ${socket.id}`);
            if (liveConnectionsBySocketId[socket.id]) {
                liveConnectionsBySocketId[socket.id].disconnect();
                delete liveConnectionsBySocketId[socket.id];
            }
        });
    });
};

export default configurationSocket;
