import { Command, CommandResponse } from './types';
import { routeCommand } from './router';

figma.showUI(__html__, { width: 300, height: 400 });

figma.ui.onmessage = async (msg: Command) => {
  try {
    const response = await routeCommand(msg);
    figma.ui.postMessage(response);
  } catch (error) {
    const response: CommandResponse = {
      id: msg.id,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    figma.ui.postMessage(response);
  }
};
