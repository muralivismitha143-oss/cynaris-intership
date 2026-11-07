/**
 * Virtual DOM Engine Simulation
 * 
 * Illustrates the core mechanics of React's Virtual DOM:
 * 1. JSX Compilation Target: React.createElement(...) returns lightweight JS objects (VNodes).
 * 2. Tree Reconciliation (Diffing): Compares Old VNode Tree vs New VNode Tree in O(n) heuristic time.
 * 3. Minimal Batched DOM Mutations: Only elements with detected changes are patched in the real DOM.
 */

export function createElement(type, props, ...children) {
  return {
    type,
    props: {
      ...(props || {}),
      children: children.flat().map((child) =>
        typeof child === 'object' && child !== null
          ? child
          : createTextElement(child)
      ),
    },
  };
}

export function createTextElement(text) {
  return {
    type: 'TEXT_ELEMENT',
    props: {
      nodeValue: text ?? '',
      children: [],
    },
  };
}

/**
 * Heuristic Diff Algorithm
 * Compares old VNode vs new VNode and returns atomic patch operations.
 */
export function diff(oldVNode, newVNode) {
  // Case 1: Node was removed
  if (!newVNode) {
    return { type: 'REMOVE' };
  }

  // Case 2: Node was newly added
  if (!oldVNode) {
    return { type: 'CREATE', newVNode };
  }

  // Case 3: Node type changed (e.g. <div> replaced by <span> or text changed)
  if (oldVNode.type !== newVNode.type) {
    return { type: 'REPLACE', newVNode };
  }

  // Case 4: Text element changed
  if (oldVNode.type === 'TEXT_ELEMENT') {
    if (oldVNode.props.nodeValue !== newVNode.props.nodeValue) {
      return { type: 'TEXT', text: newVNode.props.nodeValue };
    }
    return { type: 'NO_OP' };
  }

  // Case 5: Props diffing
  const propsPatches = {};
  const allKeys = new Set([
    ...Object.keys(oldVNode.props || {}).filter((k) => k !== 'children'),
    ...Object.keys(newVNode.props || {}).filter((k) => k !== 'children'),
  ]);

  let propsChanged = false;
  allKeys.forEach((key) => {
    if (oldVNode.props[key] !== newVNode.props[key]) {
      propsPatches[key] = newVNode.props[key];
      propsChanged = true;
    }
  });

  // Case 6: Children diffing (recursive)
  const childPatches = [];
  const maxChildren = Math.max(
    oldVNode.props.children.length,
    newVNode.props.children.length
  );

  for (let i = 0; i < maxChildren; i++) {
    childPatches.push(
      diff(oldVNode.props.children[i], newVNode.props.children[i])
    );
  }

  const hasChildChanges = childPatches.some((p) => p.type !== 'NO_OP');

  if (!propsChanged && !hasChildChanges) {
    return { type: 'NO_OP' };
  }

  return {
    type: 'UPDATE',
    props: propsPatches,
    children: childPatches,
  };
}
