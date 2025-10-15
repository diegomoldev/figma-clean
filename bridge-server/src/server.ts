import WebSocket from 'ws';
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { CommandQueue } from './queue';

interface Command {
  id: string;
  type: string;
  payload: any;
}

interface CommandResponse {
  id: string;
  success: boolean;
  data?: any;
  error?: string;
}

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

app.post('/api/batch-commands', async (req, res) => {
  const commands = req.body.commands;

  console.log(`[HTTP] Received batch-commands command`);

  if (!pluginConnection || pluginConnection.readyState !== WebSocket.OPEN) {
    console.error('[HTTP] Plugin not connected');
    return res.status(503).json({
      success: false,
      error: 'Figma plugin not connected',
    });
  }

  const command: Command = {
    id: generateCommandId(),
    type: 'batch-commands',
    payload: { commands },
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

app.post('/api/load-icons', async (req, res) => {
  const { directory, pattern } = req.body;

  if (!directory) {
    return res.status(400).json({
      success: false,
      error: 'Directory path is required',
    });
  }

  try {
    const absolutePath = path.resolve(directory);

    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({
        success: false,
        error: `Directory not found: ${absolutePath}`,
      });
    }

    const stats = fs.statSync(absolutePath);
    if (!stats.isDirectory()) {
      return res.status(400).json({
        success: false,
        error: 'Path is not a directory',
      });
    }

    const files = fs.readdirSync(absolutePath);
    const svgPattern = pattern || /\.svg$/i;
    const regex = typeof svgPattern === 'string' ? new RegExp(svgPattern) : svgPattern;

    const icons = files
      .filter(file => regex.test(file))
      .map(file => {
        const filePath = path.join(absolutePath, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const name = path.basename(file, path.extname(file));

        return {
          name,
          fileName: file,
          svg: content,
          path: filePath
        };
      });

    console.log(`[HTTP] Loaded ${icons.length} icons from ${absolutePath}`);

    res.json({
      success: true,
      data: {
        directory: absolutePath,
        count: icons.length,
        icons
      }
    });
  } catch (error) {
    console.error('[HTTP] Error loading icons:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

app.post('/api/import-icons-as-components', async (req, res) => {
  const { directory, pattern, componentSetName, x, y, properties, targetSize } = req.body;

  if (!directory) {
    return res.status(400).json({
      success: false,
      error: 'Directory path is required',
    });
  }

  if (!pluginConnection || pluginConnection.readyState !== WebSocket.OPEN) {
    return res.status(503).json({
      success: false,
      error: 'Figma plugin not connected',
    });
  }

  try {
    const absolutePath = path.resolve(directory);

    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({
        success: false,
        error: `Directory not found: ${absolutePath}`,
      });
    }

    const files = fs.readdirSync(absolutePath);
    const svgPattern = pattern || /\.svg$/i;
    const regex = typeof svgPattern === 'string' ? new RegExp(svgPattern) : svgPattern;

    const variants = files
      .filter(file => regex.test(file))
      .map(file => {
        const filePath = path.join(absolutePath, file);
        let content = fs.readFileSync(filePath, 'utf-8');
        const name = path.basename(file, path.extname(file));

        // Resize SVG if targetSize is specified
        if (targetSize) {
          content = resizeSvg(content, targetSize);
        }

        return {
          name,
          svg: content,
          properties: properties || {}
        };
      });

    if (variants.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No SVG files found matching pattern',
      });
    }

    console.log(`[HTTP] Importing ${variants.length} icons as component set`);

    const command: Command = {
      id: generateCommandId(),
      type: 'create-component-set',
      payload: {
        name: componentSetName || 'Icons',
        x: x || 0,
        y: y || 0,
        variants
      },
    };

    pluginConnection.send(JSON.stringify(command));
    console.log(`[HTTP] Sent command ${command.id} to plugin`);

    const response = await queue.addCommand(command);
    console.log(`[HTTP] Command ${command.id} completed successfully`);

    res.json(response);
  } catch (error) {
    console.error('[HTTP] Error importing icons:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

app.post('/api/replace-component-content-from-file', async (req, res) => {
  const { componentId, iconName, iconDirectory, targetSize, renameComponent } = req.body;

  if (!componentId) {
    return res.status(400).json({
      success: false,
      error: 'componentId is required',
    });
  }

  if (!iconName) {
    return res.status(400).json({
      success: false,
      error: 'iconName is required',
    });
  }

  if (!iconDirectory) {
    return res.status(400).json({
      success: false,
      error: 'iconDirectory is required',
    });
  }

  if (!pluginConnection || pluginConnection.readyState !== WebSocket.OPEN) {
    return res.status(503).json({
      success: false,
      error: 'Figma plugin not connected',
    });
  }

  try {
    const absolutePath = path.resolve(iconDirectory);
    const iconPath = path.join(absolutePath, `${iconName}.svg`);

    if (!fs.existsSync(iconPath)) {
      return res.status(404).json({
        success: false,
        error: `Icon file not found: ${iconPath}`,
      });
    }

    let svgContent = fs.readFileSync(iconPath, 'utf-8');

    // Resize SVG if targetSize is specified
    if (targetSize) {
      svgContent = resizeSvg(svgContent, targetSize);
    }

    console.log(`[HTTP] Replacing component ${componentId} with icon ${iconName}`);

    // First, rename the component if requested
    if (renameComponent) {
      const renameCommand: Command = {
        id: generateCommandId(),
        type: 'update-node',
        payload: {
          nodeId: componentId,
          name: renameComponent
        },
      };

      pluginConnection.send(JSON.stringify(renameCommand));
      await queue.addCommand(renameCommand);
    }

    // Then replace the content
    const command: Command = {
      id: generateCommandId(),
      type: 'replace-component-content',
      payload: {
        componentId,
        svg: svgContent,
        targetSize: targetSize || 40,
        convertToStroke: false
      },
    };

    pluginConnection.send(JSON.stringify(command));
    console.log(`[HTTP] Sent command ${command.id} to plugin`);

    const response = await queue.addCommand(command);
    console.log(`[HTTP] Command ${command.id} completed successfully`);

    res.json(response);
  } catch (error) {
    console.error('[HTTP] Error replacing component content:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

app.post('/api/batch-replace-icons', async (req, res) => {
  const { icons, iconDirectory, targetSize } = req.body;

  if (!icons || !Array.isArray(icons)) {
    return res.status(400).json({
      success: false,
      error: 'icons array is required',
    });
  }

  if (!iconDirectory) {
    return res.status(400).json({
      success: false,
      error: 'iconDirectory is required',
    });
  }

  if (!pluginConnection || pluginConnection.readyState !== WebSocket.OPEN) {
    return res.status(503).json({
      success: false,
      error: 'Figma plugin not connected',
    });
  }

  try {
    const absolutePath = path.resolve(iconDirectory);
    const results = [];

    for (const icon of icons) {
      const { id, iconName, variantName } = icon;

      if (!id || !iconName) {
        results.push({
          id,
          iconName,
          success: false,
          error: 'Missing id or iconName'
        });
        continue;
      }

      try {
        const iconPath = path.join(absolutePath, `${iconName}.svg`);

        if (!fs.existsSync(iconPath)) {
          results.push({
            id,
            iconName,
            success: false,
            error: `Icon file not found: ${iconPath}`
          });
          continue;
        }

        let svgContent = fs.readFileSync(iconPath, 'utf-8');

        // Resize SVG if targetSize is specified
        if (targetSize) {
          svgContent = resizeSvg(svgContent, targetSize);
        }

        console.log(`[HTTP] Processing ${iconName} for component ${id}`);

        // Rename the component if variantName is provided
        if (variantName) {
          const renameCommand: Command = {
            id: generateCommandId(),
            type: 'update-node',
            payload: {
              nodeId: id,
              name: variantName
            },
          };

          pluginConnection.send(JSON.stringify(renameCommand));
          await queue.addCommand(renameCommand);
        }

        // Replace the content
        const command: Command = {
          id: generateCommandId(),
          type: 'replace-component-content',
          payload: {
            componentId: id,
            svg: svgContent,
            targetSize: targetSize || 40,
            convertToStroke: false
          },
        };

        pluginConnection.send(JSON.stringify(command));
        const response = await queue.addCommand(command);

        results.push({
          id,
          iconName,
          variantName,
          success: response.success,
          error: response.error
        });

      } catch (error) {
        results.push({
          id,
          iconName,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    console.log(`[HTTP] Batch replace completed: ${results.filter(r => r.success).length}/${results.length} successful`);

    res.json({
      success: true,
      data: {
        total: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results
      }
    });

  } catch (error) {
    console.error('[HTTP] Error in batch replace:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
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

function resizeSvg(svg: string, targetSize: number): string {
  return svg.replace(/<svg([^>]*)>/, `<svg$1 width="${targetSize}" height="${targetSize}">`);
}

process.on('SIGINT', () => {
  console.log('\n[Bridge] Shutting down...');
  wss.close(() => {
    console.log('[WebSocket] Server closed');
    process.exit(0);
  });
});
