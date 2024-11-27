function cleanHTML(node) {
  let html = "";
  node.childNodes.forEach((childNode) => {
    if (childNode.nodeType === Node.TEXT_NODE) {
      const textContent = childNode.textContent;
      const regexStart = /^[\t\n ]{2,}/;
      const regexEnd = /[\t\n ]{2,}$/;
      const regexOther = /[\t\n ]{2,}/g;
      
      if (regexOther.test(textContent)) {
        // Get the previous and next siblings
        const prevNode = childNode.previousSibling;
        const nextNode = childNode.nextSibling;

        // Determine replacement based on neighboring elements
        if (
          prevNode && nextNode &&
          isInlineElement(prevNode) &&
          isInlineElement(nextNode)
        ) {
          html += textContent.replace(regexOther, " ");
        } else if (prevNode && nextNode && (!isInlineElement(prevNode)) && (!isInlineElement(nextNode))) {
          html += textContent.replace(regexStart, "\n").replace(regexEnd, "\n").replace(regexOther, " ");
        } else if (prevNode && nextNode && (!isInlineElement(prevNode)) && isInlineElement(nextNode)) {
          html += textContent.replace(regexStart, "\n").replace(regexOther, " ");
        } else if (prevNode && nextNode && isInlineElement(prevNode) && (!isInlineElement(nextNode))) {
          html += textContent.replace(regexEnd, "\n").replace(regexOther, " ");
        } else if ((!prevNode) && (!nextNode)) {
          // No previous or next node
          html += textContent.replace(regexStart, "").replace(regexEnd, "").replace(regexOther, " ");
        } else if ((!prevNode) && nextNode) {
          if ((!isInlineElement(nextNode))) {
            html += textContent.replace(regexStart, "").replace(regexEnd, "\n").replace(regexOther, " ");
          } else {
            html += textContent.replace(regexStart, "").replace(regexOther, " ");
          }
        } else if (prevNode && (!nextNode)) {
          if ((!isInlineElement(prevNode))) {
            html += textContent.replace(regexEnd, "").replace(regexStart, "\n").replace(regexOther, " ");
          } else {
            html += textContent.replace(regexEnd, "").replace(regexOther, " ");
          }
        }
      } else {
        html += textContent;
      }
    } else if (childNode.nodeType === Node.ELEMENT_NODE) {
      // Recursively clean child elements
      const tagName = childNode.tagName.toLowerCase()
      if (tagName === "script" || tagName === "code" || tagName === "pre") {
        html += `${childNode.outerHTML}`;
      } else {
        childNode.innerHTML = cleanHTML(childNode);
        html += childNode.outerHTML;
      }
    }
  });
  return html;
  
}

function isInlineElement(node) {
  if (node.nodeType !== Node.ELEMENT_NODE) return false;
  const inlineElements = [
    "a", "abbr", "b", "bdo", "button", "cite", "code", "dfn", "em", "i", "ins", "kbd", "q", "s", "samp", "small", "span", "strong", "sub", "sup", "time", "u", "var", "ruby", "rb", "rt", "rp", "del", "mark"
    ];
  return inlineElements.includes(node.tagName.toLowerCase());
}

function minifyHTML(html) {
  let parser = new DOMParser();
  let doc = parser.parseFromString(html, 'text/html');
  return cleanHTML(doc)
}
