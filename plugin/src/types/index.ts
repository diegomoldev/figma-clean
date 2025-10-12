export type CommandType =
  | 'sync-variables'
  | 'sync-styles'
  | 'read-variables'
  | 'read-styles'
  | 'delete-collection'
  | 'delete-all-collections'
  | 'sync-frame'
  | 'sync-rectangle'
  | 'sync-text'
  | 'sync-ellipse'
  | 'sync-group'
  | 'read-nodes'
  | 'delete-node'
  | 'delete-nodes'
  | 'set-auto-layout'
  | 'set-fills'
  | 'set-effects'
  | 'set-constraints'
  | 'sync-component'
  | 'sync-instance'
  | 'read-components'
  | 'create-page-structure'
  | 'create-button'
  | 'create-card'
  | 'sync-page'
  | 'read-pages'
  | 'set-current-page'
  | 'delete-page'
  | 'clone-page'
  | 'sync-line'
  | 'sync-polygon'
  | 'sync-star'
  | 'sync-vector'
  | 'update-node'
  | 'get-selection'
  | 'set-selection'
  | 'create-image'
  | 'create-video'
  | 'export-image'
  | 'batch-commands';

export interface Command {
  id: string;
  type: CommandType;
  payload: any;
}

export interface CommandResponse {
  id: string;
  success: boolean;
  data?: any;
  error?: string;
}
