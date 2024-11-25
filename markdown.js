function nodeToHTML(node, targetFormat = "all") {
  let html = ""
  node.childNodes.forEach((childNode) => {
    if (childNode.nodeType === Node.TEXT_NODE) {
      if (targetFormat === "all") {
        html += mdInlineToHTML(childNode.textContent, ["bold", "italic", "img", "link", "code", "strikethrough", "ruby", "underline"]);
      } else {
        html += childNode.textContent;
      }
    } else if (childNode.nodeType === Node.ELEMENT_NODE) {
      if (childNode.tagName === "pre") {
        childNode.innerHTML = nodeToHTML(childNode, "pre")
        html += `${childNode.outerHTML}`;
      } else if (childNode.tagName === "code") {
        childNode.innerHTML = nodeToHTML(childNode, "code")
        html += `${childNode.outerHTML}`;
      } else {
        childNode.innerHTML = nodeToHTML(childNode, "all")
        html += `${childNode.outerHTML}`;
      }
    }
  })
  return html;
}

function mdInlineToHTML(text, groups) {
  if (!groups || groups.length === 0) {
    return text;
  }
  let html = text;
  if (groups.includes('bold')&&groups.includes('italic')) {
    html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<em><strong>$1</strong></em>');
  }
  // Bold
  if (groups.includes('bold')) {
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  }
  // Italic
  if (groups.includes('italic')) {
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  }
  // Image
  if (groups.includes('img')) {
    html = html.replace(/!\[(.*?)\]\((.+?)\)/g, '<img src="$2" alt="$1">');
  }
  // Link
  if (groups.includes('link')) {
    html = html.replace(/\[(.*?)\]\((.+?)\)/g, '<a href="$2">$1</a>');
  }
  // Code
  if (groups.includes('code')) {
    html = html.replace(/`(.+?)`/g, '<code>$1</code>');
  }
  // Strikethrough
  if (groups.includes('strikethrough')) {
    html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');
  }
  // Ruby
  if (groups.includes('ruby')) {
    html = html.replace(/_([^_]+?)\/(.+?)\/_/g, '<ruby>$1<rt>$2</rt></ruby>');
  }
  // Underline
  if (groups.includes('underline')) {
    html = html.replace(/_(.+?)_/g, '<ins>$1</ins>');
  }
  return html;
}

function formatInlineHTML(htmlString) {
  const tempElement = document.createElement('div');
  tempElement.innerHTML = htmlString;

  return nodeToHTML(tempElement);
}

function formatBlockHTML(text, nested = false, nestedType = null) {
  const lines = text.split("\n");
  const block = [];
  let isBlock = false;

  const regexHeading = /^#{1,6}\s+(.+)$/;
  const regexOrderedList = /^([*+\-]|[①②③④⑤⑥⑦⑧❶❷❸❹❺❻]|\d+\.|[a-z]\.)[ \n]+([\s\S]*)$/;
  // [ \n]+ or \s+
  
  const regexNonEmptyLine = /^\S.*$/;
  const regexOrderedListEI = /^([*+\-]|[①②③④⑤⑥⑦⑧❶❷❸❹❺❻]|\d+\.|[a-z]\.)$/;

  const processBlockContent = (line) => {
    if (isBlock) {
      const lastBlock = block[block.length - 1];
      if (lastBlock.type === "p") {
        lastBlock.type = "div";
      }
      lastBlock.content.push(line);
    }
  };

  const handleNonEmptyLine = (line) => {
    if (isBlock) {
      if (block[block.length - 1].type === "ul") {
        block.push({ type: "p", content: [line] });
      } else {
        block[block.length - 1].content.push(line);
      }
    } else {
      block.push({ type: "p", content: [line] });
      isBlock = true;
    }
  };

  const handleOrderedList = (line) => {
    processBlockContent(line);
    if (!isBlock) {
      block.push({ type: "ul", content: [line] });
      isBlock = true;
    }
  };

  const handleNestedOrderedList = (line) => {
    if (isBlock) {
      if (block[block.length - 1].type !== "ul") {
        block.push({ type: "ul", content: [line] });
      } else {
        block[block.length - 1].content.push(line);
      }
    } else {
      block.push({ type: "ul", content: [line] });
      isBlock = true;
    }
  };

  const handleNestedText = (line) => {
    if (isBlock) {
      if (block[block.length - 1].type !== "text") {
        block.push({ type: "text", content: [line] });
      } else {
        block[block.length - 1].content.push(line);
      }
    } else {
      block.push({ type: "text", content: [line] });
      isBlock = true;
    }
  };

  if (!nested) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (regexHeading.test(line)) {
        processBlockContent(line);
        if (!isBlock) {
          const headingText = line.match(regexHeading)[1];
          const level = line.match(/^#+/)[0].length;
          block.push({ type: `h${level}`, content: [headingText] });
        }
      } else if (regexOrderedList.test(line)) {
        handleOrderedList(line);
      } else if (regexOrderedListEI.test(line)) {
        if (lines[i + 1]) {
          if (/^ +/.test(lines[i + 1])) {
            handleOrderedList(line);
          } else {
            handleNonEmptyLine(line);
          }
        } else {
          handleNonEmptyLine(line);
        }
      } else if (regexNonEmptyLine.test(line)) {
        handleNonEmptyLine(line);
      } else if (line === "") {
        isBlock = false;
      } else {
        if (isBlock) {
          block[block.length - 1].content.push(line);
        } else {
          block.push({ type: "text", content: [line] });
          isBlock = true;
        }
      }
    }

    block.forEach(ele => {
      if (ele.type === "ul") {
        ele.content = [formatBlockHTML(ele.content.join("\n"), true, "ul")];
      } else if (ele.type === "div") {
        ele.content = [formatBlockHTML(ele.content.join("\n"), true, "div")];
      } else if (ele.type === "text") {
        ele.content = [ele.content.join("<br>")];
      } else if (ele.type === "p") {
        ele.content = [ele.content.join("<br>")];
      }
    });

  } else {
    if (nestedType === "ul") {
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (regexOrderedList.test(line) || regexOrderedListEI.test(line)) {
          block.push({ type: "li", content: [line] });
        } else {
          block[block.length - 1].content.push(line);
        }
      }

      block.forEach(ele => {
          // Extract matching content based on regex
          const getContent = ele.content.join("\n").match(regexOrderedList);
          const getContentE = ele.content.join("\n").match(regexOrderedListEI);
      
          // Define the marker content based on conditions
          const markerContent = getContent ? getContent[1] : getContentE ? getContentE[1] : "";
      
          // Check if markerContent contains invalid symbols
          const isValidMarker = !/[*+\-]/.test(markerContent);
      
          // Construct the content with or without the marker
          ele.content = getContent ? [
          (isValidMarker ? `<span class='marker'>${markerContent} </span>` : "") + formatBlockHTML(getContent[2], true, "li")
          ] : [
          isValidMarker ? `<span class='marker'>${markerContent}</span>` : ""
          ];
      });
      // regexOrderedList contain all, group 1, group 2

    } else if (nestedType === "li") {
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].replace(/^ {1,4}/, "");
        if (regexOrderedList.test(line)) {
          handleNestedOrderedList(line);
        } else if (regexOrderedListEI.test(line)) {
          if (lines[i + 1]) {
            let lineTest = lines[i + 1].replace(/^ {1,4}/, "");
            if (/^ +/.test(lineTest)) {
              handleNestedOrderedList(line);
            } else {
              handleNestedText(line);
            }
          } else {
            handleNestedText(line);
          }
        } else if (line === "") {
          isBlock = false;
        } else if (regexNonEmptyLine.test(line)) {
          handleNestedText(line);
        } else {
          if (isBlock) {
            block[block.length - 1].content.push(line);
          } else {
            block.push({ type: "text", content: [line] });
            isBlock = true;
          }
        }
      }

      block.forEach(ele => {
        if (ele.type === "ul") {
          ele.content = [formatBlockHTML(ele.content.join("\n"), true, "ul")];
        } else if (ele.type === "text") {
          ele.content = [ele.content.join("<br>")];
        }
      });

    } else if (nestedType === "div") {
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (regexHeading.test(line)) {
          const headingText = line.match(regexHeading)[1];
          const level = line.match(/^#+/)[0].length;
          block.push({ type: `h${level}`, content: [headingText] });
        } else if (regexOrderedList.test(line)) {
          handleNestedOrderedList(line);
        } else if (regexOrderedListEI.test(line)) {
          if (lines[i + 1]) {
            if (/^ +/.test(lines[i + 1])) {
              handleNestedOrderedList(line);
            } else {
              handleNestedText(line);
            }
          } else {
            handleNestedText(line);
          }
        } else if (regexNonEmptyLine.test(line)) {
          handleNestedText(line);
        } else {
          if (isBlock) {
            block[block.length - 1].content.push(line);
          } else {
            block.push({ type: "text", content: [line] });
            isBlock = true;
          }
        }
      }
      block.forEach(ele => {
        if (ele.type === "ul") {
          ele.content = [formatBlockHTML(ele.content.join("\n"), true, "ul")];
        } else if (ele.type === "text") {
          ele.content = [ele.content.join("<br>")];
        }
      });
    }
  }

  return block.map(ele => {
    return ele.type === "text"
      ? ele.content.join("\n")
      : `<${ele.type}>${ele.content.join("\n")}</${ele.type}>`;
  }).join("\n");
}

function markdownHTML(markdownText) {
  return formatInlineHTML(formatBlockHTML(markdownText))
}
