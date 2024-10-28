var port = chrome.runtime.connect();

// Keep track of the translations in progress
let workingTranlations: {
  id: number;
  element: Node;
}[] = [];
let lastId = -1;

port.onMessage.addListener(function (msg) {
  // "init-translate" is sent from the background script when the context menu item for translating is clicked
  if (msg.action === "init-translate") {
    const selection = window.getSelection();
    if (!selection) return;

    // Get the selection range and expand it to the whole text
    const range = selection.getRangeAt(0);
    const expandedRange = range.cloneRange();
    expandedRange.setStart(expandedRange.startContainer, 0);
    expandedRange.setEnd(
      expandedRange.endContainer,
      expandedRange.endContainer.textContent?.length ?? 0
    );
    range.collapse(true);

    // traverse the DOM from the current element to find all the TextNodes
    function traverse(node: Node) {
      // If the node is a text node and it is within the expanded selection, translate it
      if (
        node.nodeType === Node.TEXT_NODE &&
        node.textContent &&
        expandedRange.isPointInRange(node, 0)
      ) {
        const currentId = ++lastId % Number.MAX_SAFE_INTEGER;
        workingTranlations.push({ id: currentId, element: node });

        port.postMessage({
          action: "translate",
          text: node.textContent,
          id: currentId,
        });
      }

      // Recursively traverse the child nodes
      for (let i = 0; i < node.childNodes.length; i++) {
        traverse(node.childNodes[i]);
      }
    }

    traverse(expandedRange.commonAncestorContainer);
  }

  // When the translation is done replace the text on the site and remove it from the workingTranlations array
  if (msg.action === "translated") {
    const translated = msg.translated as string;
    const id: number = msg.id as number;

    const matchingTranslation = workingTranlations.find((t) => t.id === id);
    workingTranlations = workingTranlations.filter((t) => t.id !== id);

    if (matchingTranslation) {
      matchingTranslation.element.textContent = translated;
    }
  }
});
