import { Command, CommandResponse } from './types';
import { handleSyncVariables, handleReadVariables } from './handlers/variables';
import { handleDeleteCollection, handleDeleteAllCollections } from './handlers/collections';
import { handleSyncStyles, handleReadStyles } from './handlers/styles';
import {
  handleSyncFrame,
  handleSyncRectangle,
  handleSyncText,
  handleSyncEllipse,
  handleSyncGroup,
  handleReadNodes,
  handleDeleteNode,
  handleDeleteNodes,
  handleUpdateNode,
  handleGetSelection,
  handleSetSelection
} from './handlers/nodes';
import {
  handleSetAutoLayout,
  handleSetFills,
  handleSetEffects,
  handleSetConstraints
} from './handlers/properties';
import {
  handleSyncComponent,
  handleSyncInstance,
  handleReadComponents
} from './handlers/components';
import {
  handleCreatePageStructure,
  handleCreateButton,
  handleCreateCard
} from './handlers/templates';
import {
  handleSyncPage,
  handleReadPages,
  handleSetCurrentPage,
  handleDeletePage,
  handleClonePage
} from './handlers/pages';
import { handleExportImage } from './handlers/export';

figma.showUI(__html__, { width: 300, height: 400 });

figma.ui.onmessage = async (msg: Command) => {
  try {
    let response: CommandResponse;

    switch (msg.type) {
      case 'sync-variables':
        response = await handleSyncVariables(msg);
        break;
      case 'sync-styles':
        response = await handleSyncStyles(msg);
        break;
      case 'read-variables':
        response = await handleReadVariables(msg);
        break;
      case 'read-styles':
        response = await handleReadStyles(msg);
        break;
      case 'delete-collection':
        response = await handleDeleteCollection(msg);
        break;
      case 'delete-all-collections':
        response = await handleDeleteAllCollections(msg);
        break;
      case 'sync-frame':
        response = await handleSyncFrame(msg);
        break;
      case 'sync-rectangle':
        response = await handleSyncRectangle(msg);
        break;
      case 'sync-text':
        response = await handleSyncText(msg);
        break;
      case 'sync-ellipse':
        response = await handleSyncEllipse(msg);
        break;
      case 'sync-group':
        response = await handleSyncGroup(msg);
        break;
      case 'read-nodes':
        response = await handleReadNodes(msg);
        break;
      case 'delete-node':
        response = await handleDeleteNode(msg);
        break;
      case 'delete-nodes':
        response = await handleDeleteNodes(msg);
        break;
      case 'update-node':
        response = await handleUpdateNode(msg);
        break;
      case 'get-selection':
        response = await handleGetSelection(msg);
        break;
      case 'set-selection':
        response = await handleSetSelection(msg);
        break;
      case 'set-auto-layout':
        response = await handleSetAutoLayout(msg);
        break;
      case 'set-fills':
        response = await handleSetFills(msg);
        break;
      case 'set-effects':
        response = await handleSetEffects(msg);
        break;
      case 'set-constraints':
        response = await handleSetConstraints(msg);
        break;
      case 'sync-component':
        response = await handleSyncComponent(msg);
        break;
      case 'sync-instance':
        response = await handleSyncInstance(msg);
        break;
      case 'read-components':
        response = await handleReadComponents(msg);
        break;
      case 'create-page-structure':
        response = await handleCreatePageStructure(msg);
        break;
      case 'create-button':
        response = await handleCreateButton(msg);
        break;
      case 'create-card':
        response = await handleCreateCard(msg);
        break;
      case 'sync-page':
        response = await handleSyncPage(msg);
        break;
      case 'read-pages':
        response = await handleReadPages(msg);
        break;
      case 'set-current-page':
        response = await handleSetCurrentPage(msg);
        break;
      case 'delete-page':
        response = await handleDeletePage(msg);
        break;
      case 'clone-page':
        response = await handleClonePage(msg);
        break;
      case 'export-image':
        response = await handleExportImage(msg);
        break;
      default:
        response = {
          id: msg.id,
          success: false,
          error: `Unknown command type: ${(msg as any).type}`,
        };
    }

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
