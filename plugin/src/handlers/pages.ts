import { Command, CommandResponse } from '../types';

// 1. sync-page: Create or update page
export async function handleSyncPage(msg: Command): Promise<CommandResponse> {
  try {
    const { id, name, ...props } = msg.payload;
    let page: PageNode;

    if (id) {
      const node = figma.getNodeById(id);
      if (node && node.type === 'PAGE') {
        page = node as PageNode;
      } else {
        return { id: msg.id, success: false, error: `Page with id '${id}' not found` };
      }
    } else if (name) {
      const existing = figma.root.children.find((p) => p.name === name);
      if (existing) {
        page = existing as PageNode;
      } else {
        page = figma.createPage();
        page.name = name;
      }
    } else {
      page = figma.createPage();
    }

    if (props.name !== undefined) page.name = props.name;
    if (props.backgrounds !== undefined) page.backgrounds = props.backgrounds as Paint[];

    return {
      id: msg.id,
      success: true,
      data: { pageId: page.id, name: page.name, type: page.type }
    };
  } catch (error) {
    return { id: msg.id, success: false, error: String(error) };
  }
}

// 2. read-pages: Read all pages
export async function handleReadPages(msg: Command): Promise<CommandResponse> {
  try {
    const pages = figma.root.children.map((page) => ({
      id: page.id,
      name: page.name,
      type: page.type,
      backgrounds: [...page.backgrounds],
      isCurrent: page.id === figma.currentPage.id
    }));

    return {
      id: msg.id,
      success: true,
      data: { pages, count: pages.length }
    };
  } catch (error) {
    return { id: msg.id, success: false, error: String(error) };
  }
}

// 3. set-current-page: Switch to a specific page
export async function handleSetCurrentPage(msg: Command): Promise<CommandResponse> {
  try {
    const { pageId, pageName } = msg.payload;
    let page: PageNode | null = null;

    if (pageId) {
      const node = figma.getNodeById(pageId);
      if (node && node.type === 'PAGE') {
        page = node as PageNode;
      }
    } else if (pageName) {
      const found = figma.root.children.find((p) => p.name === pageName);
      if (found) page = found as PageNode;
    }

    if (!page) {
      return { id: msg.id, success: false, error: 'Page not found' };
    }

    await figma.setCurrentPageAsync(page);

    return {
      id: msg.id,
      success: true,
      data: { pageId: page.id, name: page.name }
    };
  } catch (error) {
    return { id: msg.id, success: false, error: String(error) };
  }
}

// 4. delete-page: Delete a page
export async function handleDeletePage(msg: Command): Promise<CommandResponse> {
  try {
    const { pageId, pageName } = msg.payload;
    let page: PageNode | null = null;

    if (pageId) {
      const node = figma.getNodeById(pageId);
      if (node && node.type === 'PAGE') {
        page = node as PageNode;
      }
    } else if (pageName) {
      const found = figma.root.children.find((p) => p.name === pageName);
      if (found) page = found as PageNode;
    }

    if (!page) {
      return { id: msg.id, success: false, error: 'Page not found' };
    }

    if (figma.root.children.length === 1) {
      return { id: msg.id, success: false, error: 'Cannot delete the last page' };
    }

    const pageInfo = { id: page.id, name: page.name };
    page.remove();

    return {
      id: msg.id,
      success: true,
      data: { deleted: pageInfo }
    };
  } catch (error) {
    return { id: msg.id, success: false, error: String(error) };
  }
}

// 5. clone-page: Clone/duplicate a page
export async function handleClonePage(msg: Command): Promise<CommandResponse> {
  try {
    const { pageId, pageName, newName } = msg.payload;
    let page: PageNode | null = null;

    if (pageId) {
      const node = figma.getNodeById(pageId);
      if (node && node.type === 'PAGE') {
        page = node as PageNode;
      }
    } else if (pageName) {
      const found = figma.root.children.find((p) => p.name === pageName);
      if (found) page = found as PageNode;
    }

    if (!page) {
      return { id: msg.id, success: false, error: 'Page not found' };
    }

    const clonedPage = page.clone();
    if (newName) {
      clonedPage.name = newName;
    } else {
      clonedPage.name = `${page.name} (Copy)`;
    }

    return {
      id: msg.id,
      success: true,
      data: {
        pageId: clonedPage.id,
        name: clonedPage.name,
        originalPageId: page.id
      }
    };
  } catch (error) {
    return { id: msg.id, success: false, error: String(error) };
  }
}
