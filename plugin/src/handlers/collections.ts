import { Command, CommandResponse } from '../types';

export async function handleDeleteCollection(msg: Command): Promise<CommandResponse> {
  const { name } = msg.payload;

  const collection = figma.variables
    .getLocalVariableCollections()
    .find((c) => c.name === name);

  if (!collection) {
    return {
      id: msg.id,
      success: false,
      error: `Collection '${name}' not found`,
    };
  }

  collection.remove();

  return {
    id: msg.id,
    success: true,
    data: { deleted: name },
  };
}

export async function handleDeleteAllCollections(msg: Command): Promise<CommandResponse> {
  const collections = figma.variables.getLocalVariableCollections();
  const deletedNames: string[] = [];

  for (const collection of collections) {
    deletedNames.push(collection.name);
    collection.remove();
  }

  return {
    id: msg.id,
    success: true,
    data: { deleted: deletedNames, count: deletedNames.length },
  };
}
