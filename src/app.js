import http from 'http';

import bodyParser from 'body-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { PrinterTypes, ThermalPrinter } from 'node-thermal-printer';

import routes from './routes/index.js';
import configurationSocket from './socket/index.js';

// const ThermalPrinter = require('node-thermal-printer').printer;
// const PrinterTypes = require('node-thermal-printer').types;

dotenv.config();
const app = express();
const server = http.createServer(app);
const port = process.env.PORT || 3001;

app.use(cors());

// Middleware
app.use(express.json());
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));

// Routes application
routes(app);

app.post('/print-message', async (req, res) => {
    const { nickname, comment, createTime } = req.body;

    const printer = new ThermalPrinter({
        type: PrinterTypes.EPSON,
        interface: 'usb://USB001',
        //   driver: systemPrinter,
    });

    // Format nội dung in
    printer.println(nickname);
    printer.println(comment);
    printer.println(createTime);
    printer.cut();

    try {
        const isConnected = await printer.isPrinterConnected();
        if (!isConnected) {
            return res.status(500).json({ success: false, message: 'Không kết nối được máy in' });
        }

        await printer.execute();
        res.status(200).json({ success: true, message: 'In thành công' });
    } catch (err) {
        console.error('❌ Lỗi in:', err);
        res.status(500).json({ success: false, message: 'In thất bại', error: err.message });
    }
});

// Start server inside an async function
const startServer = async () => {
    try {
        // Connect DB
        // await connectDb();
        console.log('✅ Database connected successfully');

        // Connect socket
        configurationSocket(server);

        server.listen(port, () => {
            console.log(`🚀 Server running on http://localhost:${port}`);
        });
    } catch (error) {
        console.error('❌ Error starting server:', error);
    }
};

startServer();
