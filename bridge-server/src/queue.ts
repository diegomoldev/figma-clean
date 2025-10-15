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

interface PendingCommand {
  command: Command;
  resolve: (response: CommandResponse) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
}

export class CommandQueue {
  private pendingCommands: Map<string, PendingCommand> = new Map();
  private commandTimeout = 30000;

  addCommand(command: Command): Promise<CommandResponse> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingCommands.delete(command.id);
        reject(new Error(`Command ${command.id} timed out after ${this.commandTimeout}ms`));
      }, this.commandTimeout);

      this.pendingCommands.set(command.id, {
        command,
        resolve,
        reject,
        timeout,
      });
    });
  }

  resolveCommand(response: CommandResponse): boolean {
    const pending = this.pendingCommands.get(response.id);
    if (!pending) {
      return false;
    }

    clearTimeout(pending.timeout);
    this.pendingCommands.delete(response.id);

    if (response.success) {
      pending.resolve(response);
    } else {
      pending.reject(new Error(response.error || 'Command failed'));
    }

    return true;
  }

  getPendingCount(): number {
    return this.pendingCommands.size;
  }

  clearAll(): void {
    for (const [id, pending] of this.pendingCommands) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Queue cleared'));
    }
    this.pendingCommands.clear();
  }
}
