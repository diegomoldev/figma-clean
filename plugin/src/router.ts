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
  handleGetNodesByIds,
  handleDeleteNode,
  handleDeleteNodes,
  handleUpdateNode,
  handleGetSelection,
  handleSetSelection,
  handleReadTextFormatting,
  handleUpdateTextFormatting,
  handleReorderChildren,
  handleReadTextContent
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
import { handleBatchCommands } from './handlers/batch';
import { handleFindAllColors, handleReplaceColorsBatch } from './handlers/colors';
import { handleReplaceAllColors } from './handlers/globalColors';

export async function routeCommand(msg: Command): Promise<CommandResponse> {
  switch (msg.type) {
    case 'sync-variables':
      return await handleSyncVariables(msg);
    case 'sync-styles':
      return await handleSyncStyles(msg);
    case 'read-variables':
      return await handleReadVariables(msg);
    case 'read-styles':
      return await handleReadStyles(msg);
    case 'delete-collection':
      return await handleDeleteCollection(msg);
    case 'delete-all-collections':
      return await handleDeleteAllCollections(msg);
    case 'sync-frame':
      return await handleSyncFrame(msg);
    case 'sync-rectangle':
      return await handleSyncRectangle(msg);
    case 'sync-text':
      return await handleSyncText(msg);
    case 'sync-ellipse':
      return await handleSyncEllipse(msg);
    case 'sync-group':
      return await handleSyncGroup(msg);
    case 'read-nodes':
      return await handleReadNodes(msg);
    case 'get-nodes-by-ids':
      return await handleGetNodesByIds(msg);
    case 'delete-node':
      return await handleDeleteNode(msg);
    case 'delete-nodes':
      return await handleDeleteNodes(msg);
    case 'update-node':
      return await handleUpdateNode(msg);
    case 'get-selection':
      return await handleGetSelection(msg);
    case 'set-selection':
      return await handleSetSelection(msg);
    case 'set-auto-layout':
      return await handleSetAutoLayout(msg);
    case 'set-fills':
      return await handleSetFills(msg);
    case 'set-effects':
      return await handleSetEffects(msg);
    case 'set-constraints':
      return await handleSetConstraints(msg);
    case 'sync-component':
      return await handleSyncComponent(msg);
    case 'sync-instance':
      return await handleSyncInstance(msg);
    case 'read-components':
      return await handleReadComponents(msg);
    case 'create-page-structure':
      return await handleCreatePageStructure(msg);
    case 'create-button':
      return await handleCreateButton(msg);
    case 'create-card':
      return await handleCreateCard(msg);
    case 'sync-page':
      return await handleSyncPage(msg);
    case 'read-pages':
      return await handleReadPages(msg);
    case 'set-current-page':
      return await handleSetCurrentPage(msg);
    case 'delete-page':
      return await handleDeletePage(msg);
    case 'clone-page':
      return await handleClonePage(msg);
    case 'export-image':
      return await handleExportImage(msg);
    case 'batch-commands':
      return await handleBatchCommands(msg);
    case 'read-text-formatting':
      return await handleReadTextFormatting(msg);
    case 'update-text-formatting':
      return await handleUpdateTextFormatting(msg);
    case 'reorder-children':
      return await handleReorderChildren(msg);
    case 'read-text-content':
      return await handleReadTextContent(msg);
    case 'find-all-colors':
      return await handleFindAllColors(msg);
    case 'replace-colors-batch':
      return await handleReplaceColorsBatch(msg);
    case 'replace-all-colors-global':
      return await handleReplaceAllColors(msg);
    default:
      return {
        id: msg.id,
        success: false,
        error: `Unknown command type: ${(msg as any).type}`,
      };
  }
}
