chrome.contextMenus.onClicked.addListener(genericOnClick);

async function translate(text: string) {
  return fetch(
    `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${encodeURIComponent(
      text
    )}`,
    {}
  )
    .then((response) => {
      if (!response.ok) {
        throw new Error(response.statusText);
      }

      return response.json();
    })
    .then((body) => {
      const translation: string | undefined =
        body &&
        body[0] &&
        body[0][0] &&
        body[0].map((s: [string]) => s[0]).join("");
      return translation || "";
    });
}

let ports: chrome.runtime.Port[] = [];

// A generic onclick callback function.
function genericOnClick(
  info: Parameters<
    Parameters<typeof chrome.contextMenus.onClicked.addListener>[0]
  >[0]
) {
  switch (info.menuItemId) {
    case "translate":
      ports.forEach((port) => {
        if (port.sender?.tab?.active) {
          port.postMessage({ action: "init-translate" });
        }
      });
      break;
    default:
      console.error("Unknown menu item clicked:", info.menuItemId);
  }
}

chrome.runtime.onConnect.addListener(function (port) {
  ports.push(port);

  port.onMessage.addListener(function (msg) {
    if (msg.action === "translate") {
      const text = msg.text as string;
      const id = msg.id as number;
      console.debug("translate", text, id);

      translate(text).then((translated) => {
        console.log("translated from: '%s' to: '%s'", text, translated);
        port.postMessage({ action: "translated", id, translated });
      });
    }
  });

  port.onDisconnect.addListener(function () {
    ports = ports.filter((p) => p !== port);
  });
});

chrome.runtime.onInstalled.addListener(function () {
  // Create one test item for each context type.
  chrome.contextMenus.create({
    title: "Translate to English",
    contexts: ["selection", "page"],
    id: "translate",
  });
});
