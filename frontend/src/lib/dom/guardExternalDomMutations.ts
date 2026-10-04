/**
 * Chrome and Edge page translation rewrite text nodes that React still owns.
 * The next commit then calls removeChild/insertBefore on a node that is no
 * longer a child, which white-screens the page (NotFoundError).
 *
 * The app already ships Pashto, Dari, and Arabic, so the document opts out of
 * browser translation. This guard covers the case where a user forces
 * translation anyway, or an extension moves a node.
 */
let installed = false;

export function installExternalDomMutationGuard(): void {
  if (installed || typeof Node === 'undefined') {
    return;
  }
  installed = true;

  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function removeChild<T extends Node>(this: Node, child: T): T {
    if (child.parentNode !== this) {
      return child;
    }
    return originalRemoveChild.call(this, child) as T;
  };

  const originalInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function insertBefore<T extends Node>(
    this: Node,
    node: T,
    child: Node | null,
  ): T {
    if (child && child.parentNode !== this) {
      return node;
    }
    return originalInsertBefore.call(this, node, child) as T;
  };
}
