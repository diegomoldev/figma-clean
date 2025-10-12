import WebSocket from 'ws';
import express from 'express';
import cors from 'cors';
import { Command, CommandResponse } from '../../shared/types';
import { CommandQueue } from './queue';

const WS_PORT = 3000;
const HTTP_PORT = 3001;

const app = express();
const wss = new WebSocket.Server({ port: WS_PORT });
const queue = new CommandQueue();

let pluginConnection: WebSocket | null = null;

app.use(cors());
app.use(express.json());

wss.on('connection', (ws: WebSocket) => {
  console.log('[WebSocket] Plugin connected');
  pluginConnection = ws;

  ws.on('message', (message: string) => {
    try {
      const response: CommandResponse = JSON.parse(message.toString());
      console.log(`[WebSocket] Received response for command ${response.id}:`, response.success ? 'SUCCESS' : 'FAILED');

      const resolved = queue.resolveCommand(response);
      if (!resolved) {
        console.warn(`[WebSocket] No pending command found for response ${response.id}`);
      }
    } catch (error) {
      console.error('[WebSocket] Error parsing response:', error);
    }
  });

  ws.on('close', () => {
    console.log('[WebSocket] Plugin disconnected');
    if (pluginConnection === ws) {
      pluginConnection = null;
    }
    queue.clearAll();
  });

  ws.on('error', (error) => {
    console.error('[WebSocket] Error:', error);
  });
});

app.post('/api/:commandType', async (req, res) => {
  const commandType = req.params.commandType;
  const payload = req.body;

  console.log(`[HTTP] Received ${commandType} command`);

  if (!pluginConnection || pluginConnection.readyState !== WebSocket.OPEN) {
    console.error('[HTTP] Plugin not connected');
    return res.status(503).json({
      success: false,
      error: 'Figma plugin not connected',
    });
  }

  const command: Command = {
    id: generateCommandId(),
    type: commandType as any,
    payload,
  };

  try {
    pluginConnection.send(JSON.stringify(command));
    console.log(`[HTTP] Sent command ${command.id} to plugin`);

    const response = await queue.addCommand(command);
    console.log(`[HTTP] Command ${command.id} completed successfully`);

    res.json(response);
  } catch (error) {
    console.error(`[HTTP] Command ${command.id} failed:`, error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

app.get('/api/status', (req, res) => {
  res.json({
    connected: pluginConnection !== null && pluginConnection.readyState === WebSocket.OPEN,
    pendingCommands: queue.getPendingCount(),
  });
});

app.listen(HTTP_PORT, () => {
  console.log(`[HTTP] Server listening on http://localhost:${HTTP_PORT}`);
  console.log(`[WebSocket] Server listening on ws://localhost:${WS_PORT}`);
  console.log('[Bridge] Figma Bridge Server ready');
  console.log('[Bridge] Waiting for plugin connection...');
});

function generateCommandId(): string {
  return `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

process.on('SIGINT', () => {
  console.log('\n[Bridge] Shutting down...');
  wss.close(() => {
    console.log('[WebSocket] Server closed');
    process.exit(0);
  });
});
