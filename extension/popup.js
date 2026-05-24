const saveBtn = document.getElementById("save");
const statusNode = document.getElementById("status");
const companyNameInput = document.getElementById("companyName");

saveBtn.addEventListener("click", async () => {
  const companyName = companyNameInput.value.trim();
  if (!companyName) {
    statusNode.textContent = "Please enter company name.";
    return;
  }

  statusNode.textContent = "Saving...";
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab.url) {
    statusNode.textContent = "No active tab found.";
    return;
  }

  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => ({
      title: document.title,
      pageText: document.body?.innerText?.slice(0, 25000) ?? "",
      rawHtml: document.documentElement?.outerHTML?.slice(0, 25000) ?? "",
    }),
  });

  try {
    const res = await fetch("http://localhost:3000/api/extension/ingest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyName,
        url: tab.url,
        roleTitle: result?.title,
        pageText: result?.pageText,
        rawHtml: result?.rawHtml,
      }),
    });

    const json = await res.json();
    if (json.ignored) {
      statusNode.textContent = "Already saved. Ignored duplicate.";
      return;
    }

    statusNode.textContent = res.ok ? "Saved successfully." : "Failed to save.";
  } catch {
    statusNode.textContent = "PrepOps server not reachable.";
  }
});
