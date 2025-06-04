import { Server } from 'socket.io';
import { TikTokLiveConnection, WebcastEvent } from 'tiktok-live-connector';

import { SOCKET_MESSAGE } from '../constants/socket-message.js';
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
            const { tiktokUsername } = data;

            if (!tiktokUsername) {
                socket.emit('error', { message: 'TikTok username is required' });
                return;
            }

            if (liveConnectionsBySocketId[socket.id]) {
                socket.emit('error', { message: 'Already connected to a live' });
                return;
            }

            console.log(`Connecting to TikTok Live for ${tiktokUsername}...`);
            const tiktokLiveConnection = new TikTokLiveConnection(tiktokUsername, {
                requestOptions: {
                    timeout: 30000,
                },
                generateSignatureFunction: async (url) => {
                    console.log('📦 Sign request for:', url);

                    // eslint-disable-next-line no-undef
                    const response = await fetch('http://localhost:8080/signature', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ url }),
                    });

                    const data = await response.json();
                    return data.signedUrl;
                },
            });

            try {
                const state = await tiktokLiveConnection.connect();

                // Chỉ khi kết nối thành công mới lưu và lắng nghe
                liveConnectionsBySocketId[socket.id] = tiktokLiveConnection;

                console.info(`Connected to roomId ${state.roomId}`);

                tiktokLiveConnection.on(WebcastEvent.CHAT, (chatData) => {
                    socket.emit('chat-message', {
                        userId: chatData.user.userId,
                        nickname: chatData.user.nickname,
                        uniqueId: chatData.user.uniqueId,
                        comment: chatData.comment,
                        createTime: convertTimestampToISO(chatData.common.createTime),
                    });
                });

                tiktokLiveConnection.on(WebcastEvent.STREAM_END, () => {
                    socket.emit('stream-end', { message: 'Stream ended' });
                    tiktokLiveConnection.disconnect();
                    delete liveConnectionsBySocketId[socket.id];
                });

                socket.on(SOCKET_MESSAGE.LEAVE_LIVE, () => {
                    if (liveConnectionsBySocketId[socket.id]) {
                        liveConnectionsBySocketId[socket.id].disconnect();
                        delete liveConnectionsBySocketId[socket.id];
                        socket.emit('live-disconnected', { message: `Disconnected from ${tiktokUsername}` });
                    }
                });
            } catch (err) {
                console.error('❌ Failed to connect to live:', err.message || err);
                socket.emit('error', {
                    message: `Failed to connect to ${tiktokUsername}. This live may have ended or does not exist.`,
                });
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
