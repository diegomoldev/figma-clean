# Figma Plugin Development Context

When working on this project, consider the following Figma plugin API references:

-   **Quickstart Guide:** [https://developers.figma.com/docs/plugins/plugin-quickstart-guide/](https://developers.figma.com/docs/plugins/plugin-quickstart-guide/)
-   **Global Objects:** [https://developers.figma.com/docs/plugins/api/global-objects/](https://developers.figma.com/docs/plugins/api/global-objects/)

This is a Figma plugin with endpoints that sends commands.

## Functionality Overview

The plugin acts as a bridge, allowing external tools to interact with the Figma API. It receives commands and routes them to the appropriate handlers.

### Core

-   `main.ts`: The main plugin file that listens for UI messages and routes commands to the appropriate handlers based on the command type.

### Handlers

The plugin has a variety of handlers for different types of commands, organized by category:

-   **Collections (`collections.ts`):**
    -   `handleDeleteCollection`: Deletes a variable collection by name.
    -   `handleDeleteAllCollections`: Deletes all local variable collections.

-   **Components (`components.ts`):**
    -   `handleSyncComponent`: Creates or updates a component.
    -   `handleSyncInstance`: Creates an instance of a component.
    -   `handleReadComponents`: Reads all local components on the current page.

-   **Export (`export.ts`):**
    -   `handleExportImage`: Exports a node as a PNG, JPG, SVG, or PDF image.

-   **Nodes (`nodes/`):**
    -   **CRUD (`crud.ts`):**
        -   `handleReadNodes`: Reads nodes with optional filters for type, name, and parent.
        -   `handleDeleteNode`: Deletes a single node by ID.
        -   `handleDeleteNodes`: Deletes multiple nodes based on filters.
        -   `handleUpdateNode`: Updates the properties of a node and can move it to a new parent.
    -   **Helpers (`helpers.ts`):** Contains helper functions for working with nodes, such as applying properties, creating child nodes, and serializing nodes to JSON.
    -   **Selection (`selection.ts`):**
        -   `handleGetSelection`: Gets the currently selected nodes.
        -   `handleSetSelection`: Sets the selection to specific nodes by their IDs.
    -   **Sync (`sync.ts`):** Contains handlers for creating and updating different types of nodes, including frames, rectangles, text, ellipses, groups, lines, polygons, stars, and vectors.

-   **Pages (`pages.ts`):**
    -   `handleSyncPage`: Creates or updates a page.
    -   `handleReadPages`: Reads all pages in the document.
    -   `handleSetCurrentPage`: Switches to a specific page.
    -   `handleDeletePage`: Deletes a page.
    -   `handleClonePage`: Clones a page.

-   **Properties (`properties.ts`):**
    -   `handleSetAutoLayout`: Applies auto layout properties to a frame.
    -   `handleSetFills`: Updates the fills for a node.
    -   `handleSetEffects`: Updates the effects for a node.
    -   `handleSetConstraints`: Updates the constraints for a node.

-   **Styles (`styles.ts`):**
    -   `handleSyncStyles`: Creates or updates paint, text, effect, and grid styles.
    -   `handleReadStyles`: Reads all local styles.

-   **Templates (`templates.ts`):**
    -   `handleCreatePageStructure`: Creates a full page hierarchy from a JSON structure.
    -   `handleCreateButton`: Creates a pre-configured button component.
    -   `handleCreateCard`: Creates a pre-configured card component.

-   **Variables (`variables.ts`):**
    -   `handleSyncVariables`: Creates or updates a variable collection and its variables.
    -   `handleReadVariables`: Reads all local variable collections.

### Types

-   `types/index.ts`: Contains the TypeScript type definitions for the `Command` and `CommandResponse` objects that are used for communication between the UI and the plugin's main code.

## Debugging

To debug the plugin, you can use `curl` to send commands to the bridge server. For example, to get the current selection in Figma, you can use the following command:

```bash
curl -X POST -H "Content-Type: application/json" -d "{}" http://localhost:3001/api/get-selection
```
