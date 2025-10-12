import { Command, CommandResponse } from '../types';

export async function handleSyncVariables(msg: Command): Promise<CommandResponse> {
  const { collection: collectionData } = msg.payload;

  let collection = figma.variables
    .getLocalVariableCollections()
    .find((c) => c.name === collectionData.name);

  if (!collection) {
    collection = figma.variables.createVariableCollection(collectionData.name);
  }

  if (collectionData.hiddenFromPublishing !== undefined) {
    collection.hiddenFromPublishing = collectionData.hiddenFromPublishing;
  }

  const existingModes = collection.modes;
  const targetModes = collectionData.modes;

  if (existingModes.length === 1 && targetModes.length > 0) {
    collection.renameMode(existingModes[0].modeId, targetModes[0].name);
  }

  for (let i = 1; i < targetModes.length; i++) {
    const existingMode = existingModes[i];
    if (!existingMode) {
      collection.addMode(targetModes[i].name);
    } else {
      collection.renameMode(existingMode.modeId, targetModes[i].name);
    }
  }

  for (const varData of collectionData.variables) {
    let variable = figma.variables
      .getLocalVariables()
      .find((v) => v.name === varData.name && v.variableCollectionId === collection.id);

    if (!variable) {
      variable = figma.variables.createVariable(varData.name, collection, varData.type);
    }

    if (varData.description) {
      variable.description = varData.description;
    }

    if (varData.scopes) {
      variable.scopes = varData.scopes;
    }

    if (varData.hiddenFromPublishing !== undefined) {
      variable.hiddenFromPublishing = varData.hiddenFromPublishing;
    }

    for (const [modeName, value] of Object.entries(varData.values)) {
      const mode = collection.modes.find((m) => m.name === modeName);
      if (mode) {
        variable.setValueForMode(mode.modeId, value as any);
      }
    }
  }

  return {
    id: msg.id,
    success: true,
    data: { collectionId: collection.id },
  };
}

export async function handleReadVariables(msg: Command): Promise<CommandResponse> {
  const collections = figma.variables.getLocalVariableCollections();
  const result: any[] = [];

  for (const collection of collections) {
    const variables = collection.variableIds
      .map((id) => figma.variables.getVariableById(id))
      .filter((v): v is Variable => v !== null);

    const collectionData = {
      name: collection.name,
      modes: collection.modes.map((m) => ({ name: m.name })),
      variables: variables.map((v) => {
        const values: Record<string, any> = {};
        for (const mode of collection.modes) {
          const value = v.valuesByMode[mode.modeId];
          values[mode.name] = value;
        }

        return {
          name: v.name,
          type: v.resolvedType,
          values,
          description: v.description,
          scopes: v.scopes,
          hiddenFromPublishing: v.hiddenFromPublishing,
        };
      }),
      hiddenFromPublishing: collection.hiddenFromPublishing,
    };

    result.push(collectionData);
  }

  return {
    id: msg.id,
    success: true,
    data: { collections: result },
  };
}
