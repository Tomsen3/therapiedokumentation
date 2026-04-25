let introOptions = [];
let methodGroups = [];
let selects = {};
let singlePhrases = {};

async function loadBausteine() {
  const response = await fetch('bausteine.json', { cache: 'no-cache' });
  if (!response.ok) throw new Error('Bausteine konnten nicht geladen werden.');
  const data = await response.json();
  introOptions = data.introOptions || [];
  methodGroups = data.methodGroups || [];
  selects = data.selects || {};
  singlePhrases = data.singlePhrases || {};
}

function showLoadError(error) {
  const output = document.getElementById('output');
  output.value = 'Die Textbausteine konnten nicht geladen werden. Bitte die Seite neu laden oder die bausteine.json pruefen.';
  document.getElementById('copyStatus').textContent = error.message;
  autoResizeOutput();
}


const state = {
  mode: "gruppe",
  version: "kurz",
  intro: new Set(["kurze_begruessung"]),
  methods: new Set(),
  patientTerm: "patient",
  groupPersonSalutation: "herr",
  groupPersonInitials: "M",
  docDate: "",
  docTime: "",
  groupName: "",
  station: "",
  dynamic: "",
  participation: "",
  access: "",
  effect: "",
  groupClimate: "",
  groupDynamics: "",
  groupIntegration: "",
  singleContact: "",
  singleExpression: "",
  singleAffect: "",
  singleRegulation: "",
  singleResources: "",
  closing: "",
  freeText: ""
};


function allMethods() {
  return methodGroups.flatMap(group => group.items);
}

function getMethod(id) {
  return allMethods().find(item => item.id === id);
}

function lookupText(type, id) {
  const found = selects[type].find(row => row[0] === id);
  return found ? found[2] : "";
}

function joinItems(items) {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return items.join(" sowie ");
  return items.slice(0, -1).join(", ") + " sowie " + items[items.length - 1];
}

function renderIntroOptions() {
  const el = document.getElementById("introOptions");
  el.innerHTML = "";
  introOptions.forEach(opt => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = opt.label;
    btn.className = state.intro.has(opt.id) ? "active" : "";
    btn.addEventListener("click", () => {
      state.intro.has(opt.id) ? state.intro.delete(opt.id) : state.intro.add(opt.id);
      renderIntroOptions();
      generate();
    });
    el.appendChild(btn);
  });
}

function renderMethods() {
  const el = document.getElementById("methodList");
  el.innerHTML = "";
  methodGroups.forEach(group => {
    const wrap = document.createElement("div");
    wrap.className = "method-group";
    const title = document.createElement("div");
    title.className = "method-title";
    title.textContent = group.title;
    const row = document.createElement("div");
    row.className = "row";

    group.items.forEach(item => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = item.label;
      const disabledInSingle = state.mode === "einzel" && item.groupOnly;
      btn.disabled = disabledInSingle;
      btn.className = state.methods.has(item.id) ? "active" : "";

      btn.addEventListener("click", () => {
        if (disabledInSingle) {
          document.getElementById("singleModeNotice").classList.add("show");
          setTimeout(() => document.getElementById("singleModeNotice").classList.remove("show"), 2500);
          return;
        }

        if (state.methods.has(item.id)) {
          state.methods.delete(item.id);
        } else if (state.methods.size < 6) {
          state.methods.add(item.id);
        } else {
          document.getElementById("methodNotice").classList.add("show");
          setTimeout(() => document.getElementById("methodNotice").classList.remove("show"), 2500);
        }
        renderMethods();
        generate();
      });

      row.appendChild(btn);
    });

    wrap.appendChild(title);
    wrap.appendChild(row);
    el.appendChild(wrap);
  });
}

function renderSelect(id, options, value) {
  const el = document.getElementById(id);
  el.innerHTML = "";
  options.forEach(([val, label]) => {
    const opt = document.createElement("option");
    opt.value = val;
    opt.textContent = label;
    if (val === value) opt.selected = true;
    el.appendChild(opt);
  });

  el.onchange = () => {
    state[id] = el.value;
    generate();
  };
}

function renderModeVisibility() {
  document.getElementById("patientField").style.display = state.mode === "einzel" ? "block" : "none";
  document.getElementById("groupPersonField").style.display = state.mode === "einzelgruppe" ? "block" : "none";
  document.getElementById("groupCriteria").style.display = state.mode === "gruppe" ? "block" : "none";
  document.getElementById("singleCriteria").style.display = state.mode !== "gruppe" ? "block" : "none";
  document.getElementById("introField").style.display = state.mode === "einzel" ? "none" : "block";

  if (state.mode === "einzel") {
    allMethods().filter(item => item.groupOnly).forEach(item => state.methods.delete(item.id));
  }

  renderMethods();
}

function renderButtons(groupName, value) {
  document.querySelectorAll(`[data-group="${groupName}"] button`).forEach(btn => {
    btn.classList.toggle("active", btn.dataset.value === value);
  });
}

function generateHeader() {
  const parts = [];
  if (state.groupName) parts.push(state.groupName);
  if (state.station) parts.push(state.station);
  if (state.docDate) parts.push(state.docDate);
  if (state.docTime) parts.push(state.docTime);
  return parts.length ? parts.join(" | ") : "";
}

function generateIntro() {
  if (state.mode === "einzel") return "";
  const ordered = introOptions.filter(opt => state.intro.has(opt.id));
  return ordered.map(opt => opt.text).join(" ");
}

function generateMethods() {
  const selectedItems = Array.from(state.methods).map(getMethod).filter(Boolean);
  if (!selectedItems.length) return "";

  const methodTexts = selectedItems.map(item => item.text);
  const focusTexts = [...new Set(selectedItems.map(item => item.focus).filter(Boolean))];
  const methodDetails = selectedItems.map(item => item.langText).filter(Boolean);

  const lines = [];
  if (selectedItems.length === 1) {
    lines.push("Als zentraler methodischer Baustein wurde " + methodTexts[0] + " eingesetzt.");
  } else {
    lines.push("Eingesetzt wurden " + joinItems(methodTexts) + ".");
  }

  if (state.version === "lang" && methodDetails.length) {
    lines.push(methodDetails.slice(0, 4).join(" "));
  } else if (state.version === "lang" && focusTexts.length) {
    lines.push("Der methodische Fokus lag auf " + joinItems(focusTexts.slice(0, 4)) + ".");
  }

  if (state.version === "lang" && selectedItems.length >= 3) {
    const flow = state.mode === "gruppe"
      ? "Durch den Wechsel der methodischen Formen entstand ein abwechslungsreicher Stundenverlauf mit aktivierenden, wahrnehmungsbezogenen und verarbeitenden Anteilen."
      : "Durch den Wechsel der methodischen Formen entstand ein strukturierter Verlauf mit aktivierenden, wahrnehmungsbezogenen und verarbeitenden Anteilen.";
    lines.push(flow);
  }

  return lines.join("\n");
}

function subjectForSingle() {
  if (state.patientTerm === "patientin") {
    return { subject: "Die Patientin", pronoun: "sie", dative: "der Patientin" };
  }
  if (state.patientTerm === "neutral") {
    return { subject: "Die behandelte Person", pronoun: "sie", dative: "der behandelten Person" };
  }
  return { subject: "Der Patient", pronoun: "er", dative: "dem Patienten" };
}

function groupPersonInitial() {
  const clean = (state.groupPersonInitials || "M").replace(/[^A-Za-zÄÖÜäöüß]/g, "").slice(0, 3);
  return clean ? clean.charAt(0).toUpperCase() + clean.slice(1) : "M";
}

function groupPersonLabel() {
  const initial = groupPersonInitial();
  if (state.groupPersonSalutation === "frau") return "Frau " + initial + ".";
  return "Herrn " + initial + ".";
}

function groupPersonSubject() {
  const initial = groupPersonInitial();
  if (state.groupPersonSalutation === "frau") return "Frau " + initial + ".";
  return "Herr " + initial + ".";
}

function fillSingleTemplate(template, context) {
  return template
    .replace("{subject}", context.subject)
    .replace("{pronoun}", context.pronoun);
}

function generateSingleObservation(prefix, subjectOverride) {
  const isGroupObservation = prefix.startsWith("Bei ");
  const context = {
    subject: subjectOverride || prefix,
    pronoun: pronounForPrefix(prefix)
  };
  const lines = [];

  const contact = isGroupObservation
    ? singlePhrases.groupContact[state.singleContact]
    : singlePhrases.contact[state.singleContact];
  if (contact) {
    const contactSentence = state.version === "lang" && state.singleContact === "vorsichtig"
      ? (isGroupObservation
        ? prefix + " erfolgte zunächst eine vorsichtige Kontaktaufnahme."
        : "Im therapeutischen Kontakt erfolgte zunächst eine vorsichtige Kontaktaufnahme.")
      : (isGroupObservation
        ? prefix + " war der Kontakt " + contact + "."
        : context.subject + " war im Kontakt " + contact + ".");
    lines.push(contactSentence);
  }

  const expression = singlePhrases.expression[state.singleExpression];
  if (expression) {
    const expressionSentence = isGroupObservation
      ? expression.group
      : expression.sentence
        ? expression.sentence
      : "Im Ausdruck " + fillSingleTemplate(expression.single, context) + ".";
    lines.push(expressionSentence);
  }

  const affect = singlePhrases.affect[state.singleAffect];
  if (affect) {
    const affectSentence = isGroupObservation
      ? "Affektiv wirkte " + context.subject + " " + affect + "."
      : "Affektiv wirkte " + context.pronoun + " " + affect + ".";
    lines.push(affectSentence);

    if (state.version === "lang" && state.singleAffect === "angespannt") {
      lines.push("Musikalische Angebote ermöglichten eine vorsichtige Regulation.");
    }
  }

  if (state.version === "lang") {
    const regulation = singlePhrases.regulation[state.singleRegulation];
    if (regulation) {
      lines.push(fillSingleTemplate(
        isGroupObservation ? regulation.group : regulation.single,
        context
      ));
    }

    const resources = singlePhrases.resources[state.singleResources];
    if (resources) {
      lines.push(isGroupObservation ? resources.group : resources.single);
    }
  }

  return lines.join("\n");
}

function pronounForPrefix(prefix) {
  if (prefix.startsWith("Die Patientin")) return "sie";
  if (prefix.startsWith("Die behandelte Person")) return "sie";
  if (prefix.startsWith("Bei Frau")) return "sie";
  return "er";
}

function generateGroupCriteria() {
  const items = [
    lookupText("dynamic", state.dynamic),
    lookupText("participation", state.participation),
    lookupText("access", state.access),
    lookupText("effect", state.effect)
  ].filter(Boolean);

  if (state.version === "lang") {
    items.push(
      lookupText("groupClimate", state.groupClimate),
      lookupText("groupDynamics", state.groupDynamics),
      lookupText("groupIntegration", state.groupIntegration)
    );
  }

  return items.filter(Boolean).join("\n");
}

function generateClosing() {
  return lookupText("closing", state.closing);
}

function generateGruppe() {
  return [
    generateHeader(),
    generateIntro(),
    generateMethods(),
    generateGroupCriteria(),
    generateClosing(),
    state.freeText.trim()
  ].filter(Boolean).join("\n");
}

function generateEinzel() {
  const single = subjectForSingle();
  return [
    generateHeader(),
    generateMethods(),
    generateSingleObservation(single.subject),
    generateClosing(),
    state.freeText.trim()
  ].filter(Boolean).join("\n");
}

function generateEinzelGruppe() {
  return [
    generateHeader(),
    generateMethods(),
    generateSingleObservation("Bei " + groupPersonLabel(), groupPersonSubject()),
    generateClosing(),
    state.freeText.trim()
  ].filter(Boolean).join("\n");
}

function generate() {
  let text = "";

  if (state.mode === "gruppe") text = generateGruppe();
  if (state.mode === "einzel") text = generateEinzel();
  if (state.mode === "einzelgruppe") text = generateEinzelGruppe();

  const output = document.getElementById("output");
  output.value = text || "Bitte mindestens einen Inhaltsbaustein oder ein Kriterium auswählen.";
  autoResizeOutput();
}

function autoResizeOutput() {
  const output = document.getElementById("output");
  output.style.height = "auto";
  output.style.height = output.scrollHeight + "px";
}

function copyGeneratedText() {
  const text = document.getElementById("output").value;
  navigator.clipboard.writeText(text).then(() => {
    document.getElementById("copyStatus").textContent = "Text wurde kopiert.";
  }).catch(() => {
    document.getElementById("copyStatus").textContent = "Kopieren nicht möglich. Text bitte manuell markieren.";
  });
}

function resetAll() {
  state.mode = "gruppe";
  state.version = "kurz";
  state.intro = new Set(["kurze_begruessung"]);
  state.methods = new Set();
  state.patientTerm = "patient";
  state.groupPersonSalutation = "herr";
  state.groupPersonInitials = "M";
  state.docDate = "";
  state.docTime = "";
  state.groupName = "";
  state.station = "";
  state.dynamic = "";
  state.participation = "";
  state.access = "";
  state.effect = "";
  state.groupClimate = "";
  state.groupDynamics = "";
  state.groupIntegration = "";
  state.singleContact = "";
  state.singleExpression = "";
  state.singleAffect = "";
  state.singleRegulation = "";
  state.singleResources = "";
  state.closing = "";
  state.freeText = "";

  ["docDate","docTime","groupName","station","groupPersonInitials","freeText"].forEach(id => document.getElementById(id).value = "");
  document.getElementById("groupPersonInitials").value = "M";
  initSelects();
  renderIntroOptions();
  renderButtons("mode", state.mode);
  renderButtons("version", state.version);
  renderModeVisibility();
  generate();
}

function initSelects() {
  const ids = ["dynamic","participation","access","effect","groupClimate","groupDynamics","groupIntegration","singleContact","singleExpression","singleAffect","singleRegulation","singleResources","closing"];
  ids.forEach(id => renderSelect(id, selects[id], state[id]));

  document.getElementById("patientTerm").value = state.patientTerm;
  document.getElementById("groupPersonSalutation").value = state.groupPersonSalutation;
  document.getElementById("groupPersonInitials").value = state.groupPersonInitials;
}

document.querySelectorAll('[data-group="mode"] button').forEach(btn => {
  btn.addEventListener("click", () => {
    state.mode = btn.dataset.value;
    renderButtons("mode", state.mode);
    renderModeVisibility();
    generate();
  });
});

document.querySelectorAll('[data-group="version"] button').forEach(btn => {
  btn.addEventListener("click", () => {
    state.version = btn.dataset.value;
    renderButtons("version", state.version);
    generate();
  });
});

document.getElementById("patientTerm").addEventListener("change", e => {
  state.patientTerm = e.target.value;
  generate();
});

document.getElementById("groupPersonSalutation").addEventListener("change", e => {
  state.groupPersonSalutation = e.target.value;
  generate();
});

document.getElementById("groupPersonInitials").addEventListener("input", e => {
  state.groupPersonInitials = e.target.value;
  generate();
});

["docDate","docTime","groupName","station","freeText"].forEach(id => {
  document.getElementById(id).addEventListener("input", e => {
    state[id] = e.target.value;
    generate();
  });
});

document.getElementById("refreshBtn").addEventListener("click", generate);
document.getElementById("resetBtn").addEventListener("click", resetAll);
document.getElementById("copyBtn").addEventListener("click", copyGeneratedText);
document.getElementById("copyBtnTop").addEventListener("click", copyGeneratedText);

loadBausteine()
  .then(() => {
    initSelects();
    renderIntroOptions();
    renderModeVisibility();
    renderButtons("mode", state.mode);
    renderButtons("version", state.version);
    generate();
  })
  .catch(showLoadError);
