import { Command, CommandResponse } from '../types';
import { routeCommand } from '../router';

export async function handleBatchCommands(msg: Command): Promise<CommandResponse> {
  const { commands } = msg.payload;

  if (!Array.isArray(commands)) {
    return {
      id: msg.id,
      success: false,
      error: 'Commands must be an array',
    };
  }

  const results: any[] = [];
  for (const command of commands) {
    const response = await routeCommand(command);
    results.push(response);
  }

  return {
    id: msg.id,
    success: true,
    data: { results },
  };
}
