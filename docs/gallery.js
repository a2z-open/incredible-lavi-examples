const demos = [
  {
    slug: "switchyard", title: "Switchyard", medium: "Game",
    summary: "Route freight through a working rail yard.",
    task: "Dispatch the first car to its destination. Finish a shift, then try the next one with a different constraint.",
    notes: "The baseline presents the active switch settings as controls. The redesign moves route feedback onto the yard itself. Compare what you can predict before dispatch and how easily you recover after a wrong turn."
  },
  {
    slug: "contour", title: "Contour", medium: "Website",
    summary: "Compare two trail packs and build a demo order.",
    task: "Find a pack for a wet, long day hike. Compare capacities, choose an available color and review your demo bag.",
    notes: "Both versions share the same product data and bag workflow. The second layout brings fit, stock and specifications into the selection step so you can decide with the product in view."
  },
  {
    slug: "relay", title: "Relay", medium: "App interface",
    summary: "Triage an incident and leave a handoff.",
    task: "Find the urgent unassigned incident. Assign it, leave a handoff note and check that both changes survive a reload.",
    notes: "The redesign keeps the queue and the current incident in view together on wide screens. Compare how quickly you can switch incidents, confirm who owns one and resume from its history."
  },
  {
    slug: "ferry", title: "Ferry Dispatch", medium: "Transit website",
    summary: "Find the next sailing after a cancellation.",
    task: "You're waiting at Pier 1. Which boat can you take next, and what happened to the cancelled sailing?",
    notes: "The current board gives the selected pier its own next departure. Compare the times on Pier 1 with the quay-wide view, and open a cancelled sailing for the caller summary."
  }
];

const demoPath = (demo, version) => `examples/${demo.slug}/${version}.html`;

const gallery = document.querySelector("#exhibits");
if (gallery) {
  gallery.innerHTML = demos.map(demo => `
    <article class="exhibit">
      <a class="exhibit-link" href="compare.html?demo=${demo.slug}" aria-label="Compare ${demo.title}">
        <div class="preview">
          <img src="assets/${demo.slug}-after.webp" alt="" width="700" height="416">
        </div>
        <div class="exhibit-info">
          <div><h2>${demo.title}</h2><p class="category">${demo.medium}</p><p>${demo.summary}</p></div>
          <span class="arrow" aria-hidden="true">↗</span>
        </div>
      </a>
    </article>`).join("");
  document.querySelector("#back-top").addEventListener("click", (event) => {
    event.preventDefault();
    window.scrollTo(0, 0);
    document.querySelector(".brand").focus();
  });
}

const comparison = document.querySelector("#comparison");
if (comparison) {
  const params = new URLSearchParams(location.search);
  const demo = demos.find(item => item.slug === params.get("demo")) ?? demos[0];
  const viewport = matchMedia("(max-width: 1050px)");
  const modes = ["before", "after", "side"];
  const buttons = [...document.querySelectorAll("[data-mode]")];
  const panes = ["before", "after"].map(version => document.getElementById(version));

  document.title = `${demo.title} · Incredible Lavi`;
  document.querySelector("#medium").textContent = demo.medium;
  document.querySelector("#demo-title").textContent = demo.title;
  document.querySelector("#task").textContent = demo.task;
  document.querySelector("#notes-text").textContent = demo.notes;
  for (const pane of panes) {
    const url = demoPath(demo, pane.id);
    pane.querySelector("a").href = url;
    const frame = pane.querySelector("iframe");
    frame.dataset.src = url;
    frame.title = `${demo.title} · ${pane.id === "after" ? "After" : "Before"}`;
  }

  function setMode(requested, writeUrl) {
    const mode = requested === "side" && viewport.matches ? "after" : requested;
    comparison.dataset.view = mode;
    for (const button of buttons) {
      button.setAttribute("aria-pressed", String(button.dataset.mode === mode));
    }
    for (const pane of panes) {
      const visible = mode === "side" || pane.id === mode;
      pane.hidden = !visible;
      const frame = pane.querySelector("iframe");
      if (visible && !frame.hasAttribute("src")) frame.src = frame.dataset.src;
    }
    document.querySelector("#standalone").href = demoPath(demo, mode === "before" ? "before" : "after");
    if (writeUrl) {
      const url = new URL(location.href);
      url.searchParams.set("view", mode);
      history.replaceState(null, "", url);
    }
  }

  for (const button of buttons) {
    button.addEventListener("click", () => setMode(button.dataset.mode, true));
  }
  function viewFromUrl() {
    const view = new URLSearchParams(location.search).get("view");
    return modes.includes(view) ? view : viewport.matches ? "after" : "side";
  }
  viewport.addEventListener("change", () => setMode(viewFromUrl(), false));
  setMode(viewFromUrl(), false);
  comparison.hidden = false;
}
