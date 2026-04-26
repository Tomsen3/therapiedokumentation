let introOptions = [];
let methodGroups = [];
let selects = {};
let singlePhrases = {};

async function loadBausteine() {
  const response = await fetch(`bausteine.json?v=${APP_VERSION}`, { cache: 'no-store' });
  if (!response.ok) throw new Error('Bausteine konnten nicht geladen werden.');
  const data = await response.json();
  introOptions = data.introOptions || [];
  methodGroups = data.methodGroups || [];
  selects = data.selects || {};
  singlePhrases = data.singlePhrases || {};
  if (data.themen) buildThemenUI(data.themen);
}
function buildThemenUI(themen) {
  const list = document.getElementById('themenList');
  const preview = document.getElementById('themenPreview');
  const previewText = document.getElementById('themenPreviewText');
  const btn = document.getElementById('themenUebernehmenBtn');
  if (!list) return;

  themen.forEach(gruppe => {
    const title = document.createElement('div');
    title.className = 'method-title';
    title.style.marginTop = '10px';
    title.textContent = gruppe.kategorie;
    list.appendChild(title);

    const row = document.createElement('div');
    row.className = 'row';

    gruppe.items.forEach(item => {
      const label = document.createElement('label');
      label.style.cssText = `
        display: inline-flex; align-items: center; gap: 6px;
        padding: 5px 10px; border: 1px solid var(--border-strong);
        border-radius: var(--radius-sm); background: var(--surface);
        font-size: 0.875rem; cursor: pointer; user-select: none;
      `;
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.value = item.text;
      cb.style.accentColor = 'var(--accent-green)';
      cb.addEventListener('change', updateThemenPreview);
      label.appendChild(cb);
      label.appendChild(document.createTextNode(item.label));
      row.appendChild(label);
    });
    list.appendChild(row);
  });

  function updateThemenPreview() {
    const checked = [...list.querySelectorAll('input[type=checkbox]:checked')]
      .map(cb => cb.value);

    if (checked.length === 0) {
      preview.style.display = 'none';
      return;
    }

    let satz = '';
    if (checked.length === 1) {
      satz = `Im Mittelpunkt stand ${checked[0]}.`;
    } else if (checked.length === 2) {
      satz = `Im Mittelpunkt standen ${checked[0]} und ${checked[1]}.`;
    } else {
      const last = checked[checked.length - 1];
      const rest = checked.slice(0, -1).join(', ');
      satz = `Die Stunde berührte Themen wie ${rest} und ${last}.`;
    }

    previewText.textContent = satz;
    preview.style.display = 'block';
  }

  btn.addEventListener('click', () => {
    const ft = document.getElementById('freeText');
    const satz = previewText.textContent;
    if (!satz) return;
    ft.value = ft.value
      ? ft.value.trimEnd() + '\n' + satz
      : satz;
    list.querySelectorAll('input[type=checkbox]').forEach(cb => cb.checked = false);
    preview.style.display = 'none';
    generateText();
  });
}
function showLoadError(error) {
  const output = document.getElementById('output');
  output.value = 'Die Textbausteine konnten nicht geladen werden. Bitte die Seite neu laden oder die bausteine.json prüfen.';
  document.getElementById('copyStatus').textContent = error.message;
  document.getElementById('methodList').textContent = 'Textbausteine konnten nicht geladen werden.';
  document.getElementById('introOptions').textContent = 'Textbausteine konnten nicht geladen werden.';
  autoResizeOutput();
}


const state = {
  mode: "gruppe",
  version: "kurz",
  intro: new Set(),
  methods: new Set(),
  singlePersonSalutation: "herr",
  singlePersonInitials: "M",
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
  freeText: "",
  quickMode: false
};


function allMethods() {
  return methodGroups.flatMap(group => group.items);
}

function getMethod(id) {
  return allMethods().find(item => item.id === id);
}

function lookupText(type, id) {
  const found = (selects[type] || []).find(row => row[0] === id);
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
  introOptions.filter(isAvailableForMode).forEach(opt => {
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

  // Trigger-Zeile (Dropdown-Button)
  const trigger = document.createElement("div");
  trigger.className = "method-dropdown-trigger";
  trigger.setAttribute("role", "button");
  trigger.setAttribute("tabindex", "0");

  const triggerLabel = document.createElement("span");
  triggerLabel.className = "method-dropdown-label";

  const triggerCount = document.createElement("span");
  triggerCount.className = "method-dropdown-count";

  trigger.appendChild(triggerLabel);
  trigger.appendChild(triggerCount);

  // Dropdown-Menü
  const menu = document.createElement("div");
  menu.className = "method-dropdown-menu";
  menu.setAttribute("aria-hidden", "true");

  function updateTrigger() {
    const selected = Array.from(state.methods).map(id => {
      const m = getMethod(id);
      return m ? m.label : "";
    }).filter(Boolean);
    triggerLabel.textContent = selected.length
      ? selected.join(", ")
      : "Methoden auswählen …";
    triggerCount.textContent = `${state.methods.size} / 6`;
    triggerCount.className = "method-dropdown-count" + (state.methods.size > 0 ? " has-selection" : "");
  }

  methodGroups.forEach(group => {
    const groupTitle = document.createElement("div");
    groupTitle.className = "method-dropdown-group-title";
    groupTitle.textContent = group.title;
    menu.appendChild(groupTitle);

    group.items.forEach(item => {
      const disabledInSingle = state.mode === "einzel" && item.groupOnly;
      const row = document.createElement("label");
      row.className = "method-dropdown-item" + (disabledInSingle ? " disabled" : "");

      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = state.methods.has(item.id);
      cb.disabled = disabledInSingle;

      cb.addEventListener("change", () => {
        if (disabledInSingle) return;
        if (cb.checked) {
          if (state.methods.size < 6) {
            state.methods.add(item.id);
          } else {
            cb.checked = false;
            document.getElementById("methodNotice").classList.add("show");
            setTimeout(() => document.getElementById("methodNotice").classList.remove("show"), 2500);
            return;
          }
        } else {
          state.methods.delete(item.id);
        }
        updateTrigger();
        generate();
      });

      const labelText = document.createElement("span");
      labelText.textContent = item.label;

      row.appendChild(cb);
      row.appendChild(labelText);
      menu.appendChild(row);
    });

    const sep = document.createElement("div");
    sep.className = "method-dropdown-sep";
    menu.appendChild(sep);
  });

  // Letzten Separator entfernen
  const lastSep = menu.querySelector(".method-dropdown-sep:last-child");
  if (lastSep) lastSep.remove();

  // Toggle öffnen/schließen
  let isOpen = false;
  function openMenu() {
    isOpen = true;
    menu.classList.add("open");
    menu.setAttribute("aria-hidden", "false");
  }
  function closeMenu() {
    isOpen = false;
    menu.classList.remove("open");
    menu.setAttribute("aria-hidden", "true");
  }

  trigger.addEventListener("click", () => isOpen ? closeMenu() : openMenu());
  trigger.addEventListener("keydown", e => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); isOpen ? closeMenu() : openMenu(); }
    if (e.key === "Escape") closeMenu();
  });

  // Schließen bei Klick außerhalb
  document.addEventListener("click", function handler(e) {
    if (!trigger.contains(e.target) && !menu.contains(e.target)) {
      closeMenu();
    }
  });

  updateTrigger();

  const wrap = document.createElement("div");
  wrap.className = "method-dropdown-wrap";
  wrap.appendChild(trigger);
  wrap.appendChild(menu);
  el.appendChild(wrap);
}

function renderSelect(id, options, value) {
  const el = document.getElementById(id);
  el.innerHTML = "";
  (options || []).forEach(([val, label]) => {
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

function updateSectionStatus() {
  document.querySelectorAll("[data-watch]").forEach(section => {
    const keys = section.dataset.watch.split(",");
    const hasValue = keys.some(key => {
      if (key === "intro") return state.intro.size > 0;
      if (key === "methods") return state.methods.size > 0;
      return Boolean(state[key]);
    });
    section.classList.toggle("has-value", hasValue);
  });
}

function renderModeVisibility() {
  document.getElementById("patientField").style.display = state.mode === "einzel" ? "block" : "none";
  document.getElementById("groupPersonField").style.display = state.mode === "einzelgruppe" ? "block" : "none";
  document.getElementById("methodsField").style.display = state.mode === "einzelgruppe" ? "none" : "block";
  document.getElementById("groupCriteria").style.display = state.mode === "gruppe" ? "block" : "none";
  document.getElementById("singleCriteria").style.display = state.mode !== "gruppe" ? "block" : "none";
  document.getElementById("introField").style.display = state.mode === "einzelgruppe" ? "none" : "block";

  if (state.mode === "einzel") {
    allMethods().filter(item => item.groupOnly).forEach(item => state.methods.delete(item.id));
    introOptions.filter(item => item.groupOnly).forEach(item => state.intro.delete(item.id));
  }
  if (state.mode === "einzelgruppe") {
    state.methods.clear();
    state.intro.clear();
  }

  renderIntroOptions();
  renderMethods();
  renderQuickMode();
  if (state.quickMode) openCoreDetails();
}

function renderQuickMode() {
  document.body.classList.toggle("quick-mode", state.quickMode);
  document.getElementById("quickModeBtn").classList.toggle("active", state.quickMode);
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
  const ordered = introOptions.filter(opt => state.intro.has(opt.id) && isAvailableForMode(opt));
  return ordered.map(opt => opt.text).join(" ");
}

function isAvailableForMode(item) {
  if (state.mode === "einzel" && item.groupOnly) return false;
  if (state.mode !== "einzel" && item.singleOnly) return false;
  return true;
}

function generateMethods() {
  const selectedItems = Array.from(state.methods).map(getMethod).filter(Boolean);
  if (!selectedItems.length) return "";

  const methodTexts = selectedItems.map(methodTextForMode);
  const focusTexts = [...new Set(selectedItems.map(methodFocusForMode).filter(Boolean))];
  const methodDetails = selectedItems.map(methodDetailForMode).filter(Boolean);

  const lines = [];
  if (selectedItems.length === 1) {
    lines.push(state.version === "kurz"
      ? "Methodisch wurde " + methodTexts[0] + " eingesetzt."
      : "Als zentraler musiktherapeutischer Baustein wurde " + methodTexts[0] + " eingesetzt.");
  } else {
    lines.push(state.version === "kurz"
      ? "Methodisch kamen " + joinItems(methodTexts) + " zum Einsatz."
      : "Eingesetzt wurden " + joinItems(methodTexts) + ".");
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

function methodTextForMode(item) {
  if (state.mode === "einzel" && item.singleText) return item.singleText;
  let text = item.text;
  if (state.mode === "einzel") {
    text = text
      .replace("gemeinsames Singen eines", "Singen eines")
      .replace("gemeinsames Musik hören", "Musikhören")
      .replace("gemeinsames Hören von Musik", "Musikhören");
  }
  return text;
}

function methodFocusForMode(item) {
  const focus = state.mode === "einzel" && item.singleFocus ? item.singleFocus : item.focus;
  if (!focus || state.mode !== "einzel") return focus;
  return focus
    .replace("Gruppensynchronisation", "Synchronisation")
    .replace("Gruppenorientierung", "Orientierung");
}

function methodDetailForMode(item) {
  const detail = state.mode === "einzel" && item.singleLangText ? item.singleLangText : item.langText;
  if (!detail || state.mode !== "einzel") return detail;
  return detail
    .replace("Gruppensynchronisation", "Synchronisation")
    .replace("Das gemeinsame Hören von Musik", "Das Musikhören");
}

function subjectForSingle() {
  const initial = singlePersonInitial();
  if (state.singlePersonSalutation === "herr") {
    return { subject: "Herr " + initial + ".", pronoun: "er", dative: "Herrn " + initial + "." };
  }
  if (state.singlePersonSalutation === "frau") {
    return { subject: "Frau " + initial + ".", pronoun: "sie", dative: "Frau " + initial + "." };
  }
  return { subject: "Herr " + initial + ".", pronoun: "er", dative: "Herrn " + initial + "." };
}

function cleanInitials(value) {
  const clean = (value || "M").replace(/[^A-Za-zÄÖÜäöüß]/g, "").slice(0, 3);
  return clean ? clean.charAt(0).toUpperCase() + clean.slice(1) : "M";
}

function singlePersonInitial() {
  return cleanInitials(state.singlePersonInitials);
}

function groupPersonInitial() {
  return cleanInitials(state.groupPersonInitials);
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
    .replaceAll("{prefix}", context.prefix)
    .replaceAll("{subject}", context.subject)
    .replaceAll("{dative}", context.dative)
    .replaceAll("{pronoun}", context.pronoun);
}

function expressionSentenceWithSubject(id, context) {
  const sentences = {
    aktiv: context.subject + " brachte sich aktiv und gestaltend ein.",
    zoegerlich: context.subject + " blieb im musikalischen und verbalen Ausdruck zunächst zögerlich.",
    beobachtend: context.subject + " nahm überwiegend beobachtend teil.",
    impulsiv: context.subject + " wirkte im Ausdruck impulsiv und wenig strukturiert.",
    orientiert: context.subject + " wirkte im Verhalten angepasst und orientiert."
  };
  return sentences[id] || "";
}

function groupExpressionSentence(id, expression, context, isFirstSentence) {
  if (isFirstSentence) {
    return fillSingleTemplate(expression.group, { subject: context.prefix, pronoun: context.pronoun });
  }

  const sentences = {
    aktiv: "Ein aktives und gestaltendes Einbringen war beobachtbar.",
    zoegerlich: "Der musikalische und verbale Ausdruck blieb zunächst zögerlich.",
    beobachtend: "Das Verhalten blieb überwiegend beobachtend.",
    impulsiv: "Der Ausdruck wirkte impulsiv und wenig strukturiert.",
    orientiert: "Das Verhalten wirkte angepasst und orientiert."
  };
  return sentences[id] || fillSingleTemplate(expression.group, { subject: context.prefix, pronoun: context.pronoun });
}

function personInPhrase(context, isGroupObservation) {
  return isGroupObservation
    ? context.prefix.replace(/^Bei /, "bei ")
    : "bei " + context.dative;
}

function personDative(context, isGroupObservation) {
  return isGroupObservation ? context.prefix.replace(/^Bei /, "") : context.dative;
}

function firstExtendedSentence(type, id, context, isGroupObservation) {
  const inPhrase = personInPhrase(context, isGroupObservation);
  const dative = personDative(context, isGroupObservation);

  const sentences = {
    regulation: {
      stabil: "Die Selbstregulation blieb " + inPhrase + " stabil.",
      unterstuetzung: "Die Selbstregulation ließ sich " + inPhrase + " durch strukturierende Impulse unterstützen.",
      ueberfordert: "Bei erhöhter Anforderung benötigte " + dative + " Unterstützung zur Regulation.",
      zunehmend: "Die Selbstregulation gelang " + dative + " zunehmend besser.",
      struktur: "Auf strukturierende musikalische Impulse reagierte " + dative + " zunehmend."
    },
    resources: {
      gut: "Ressourcen waren " + inPhrase + " gut zugänglich.",
      punktuell: "Ressourcen waren " + inPhrase + " punktuell zugänglich und konnten über musikalische Angebote aktiviert werden.",
      erschwert: "Ressourcen waren " + inPhrase + " nur erschwert zugänglich.",
      musik: "Musikalische Angebote erleichterten " + inPhrase + " den Zugang zu Ressourcen.",
      kaum: "Ressourcen waren " + inPhrase + " kaum zugänglich."
    }
  };

  return sentences[type][id] || "";
}

function shortExtendedSentence(type, id) {
  const sentences = {
    regulation: {
      stabil: "Die Selbstregulation blieb stabil.",
      unterstuetzung: "Die Selbstregulation war durch Struktur gut unterstützbar.",
      ueberfordert: "Bei erhöhter Anforderung war Regulationsunterstützung erforderlich.",
      zunehmend: "Die Selbstregulation gelang zunehmend besser.",
      struktur: "Auf strukturierende musikalische Impulse erfolgte eine zunehmende Reaktion."
    },
    resources: {
      gut: "Ressourcen waren gut zugänglich.",
      punktuell: "Ressourcen waren punktuell zugänglich.",
      erschwert: "Ressourcen waren nur erschwert zugänglich.",
      musik: "Musikalische Angebote erleichterten den Ressourcenzugang.",
      kaum: "Ressourcen waren kaum zugänglich."
    }
  };

  return sentences[type][id] || "";
}

function firstShortExtendedSentence(type, id, context, isGroupObservation) {
  const inPhrase = personInPhrase(context, isGroupObservation);
  const dative = personDative(context, isGroupObservation);
  const sentences = {
    regulation: {
      stabil: "Die Selbstregulation blieb " + inPhrase + " stabil.",
      unterstuetzung: "Die Selbstregulation war " + inPhrase + " durch Struktur gut unterstützbar.",
      ueberfordert: "Bei erhöhter Anforderung war " + inPhrase + " Regulationsunterstützung erforderlich.",
      zunehmend: "Die Selbstregulation gelang " + dative + " zunehmend besser.",
      struktur: "Auf strukturierende musikalische Impulse reagierte " + dative + " zunehmend."
    },
    resources: {
      gut: "Ressourcen waren " + inPhrase + " gut zugänglich.",
      punktuell: "Ressourcen waren " + inPhrase + " punktuell zugänglich.",
      erschwert: "Ressourcen waren " + inPhrase + " nur erschwert zugänglich.",
      musik: "Musikalische Angebote erleichterten " + inPhrase + " den Ressourcenzugang.",
      kaum: "Ressourcen waren " + inPhrase + " kaum zugänglich."
    }
  };

  return sentences[type][id] || "";
}

function contactSentence(id, contact, context, isGroupObservation) {
  if (isGroupObservation) {
    const sentences = {
      gut: context.prefix + " war eine Kontaktaufnahme gut möglich.",
      vorsichtig: context.prefix + " erfolgte die Kontaktaufnahme zunächst vorsichtig.",
      wechselhaft: context.prefix + " zeigte sich der Kontakt wechselhaft erreichbar.",
      vermeidend: context.prefix + " zeigte sich eher vermeidender Kontakt.",
      schwer: context.prefix + " war eine Kontaktaufnahme erschwert möglich."
    };
    return sentences[id] || context.prefix + " zeigte sich ein " + contact + "er Kontakt.";
  }

  const sentences = {
    gut: context.subject + " war im Kontakt gut erreichbar.",
    vorsichtig: context.subject + " zeigte sich im Kontakt zunächst vorsichtig und zurückhaltend.",
    wechselhaft: context.subject + " zeigte sich im Kontakt wechselhaft erreichbar.",
    vermeidend: context.subject + " zeigte sich im Kontakt eher vermeidend.",
    schwer: context.subject + " war im Kontakt erschwert erreichbar."
  };
  return sentences[id] || context.subject + " zeigte sich im Kontakt " + contact + ".";
}

function extendedSentence(type, id, template, context, isGroupObservation, isFirstSentence) {
  if (state.version === "kurz" && !isFirstSentence) {
    return shortExtendedSentence(type, id) || fillSingleTemplate(template, context);
  }

  if (isFirstSentence) {
    if (state.version === "kurz") {
      return firstShortExtendedSentence(type, id, context, isGroupObservation) || fillSingleTemplate(template, context);
    }
    return firstExtendedSentence(type, id, context, isGroupObservation) || fillSingleTemplate(template, context);
  }

  const neutral = {
    regulation: {
      stabil: "Die Selbstregulation blieb stabil.",
      unterstuetzung: "Die Selbstregulation ließ sich durch strukturierende Impulse unterstützen.",
      ueberfordert: "Bei erhöhter Anforderung war Unterstützung zur Regulation erforderlich.",
      zunehmend: "Die Selbstregulation gelang zunehmend besser.",
      struktur: "Auf strukturierende musikalische Impulse erfolgte eine zunehmende Reaktion."
    },
    resources: {
      gut: "Ressourcen waren gut zugänglich.",
      punktuell: "Ressourcen waren punktuell zugänglich und konnten über musikalische Angebote aktiviert werden.",
      erschwert: "Ressourcen waren nur erschwert zugänglich.",
      musik: "Musikalische Angebote erleichterten den Zugang zu Ressourcen.",
      kaum: "Ressourcen waren kaum zugänglich."
    }
  };

  if (isGroupObservation && type === "regulation" && id === "struktur") {
    return "Eine zunehmende Reaktion auf strukturierende musikalische Impulse war beobachtbar.";
  }

  return neutral[type][id] || fillSingleTemplate(template, context);
}

function generateSingleObservation(prefix, subjectOverride, pronounOverride, includeExtended = true, dativeOverride) {
  const isGroupObservation = prefix.startsWith("Bei ");
  const context = {
    prefix,
    subject: subjectOverride || prefix,
    dative: dativeOverride || subjectOverride || prefix,
    pronoun: pronounOverride || pronounForPrefix(prefix)
  };
  const lines = [];

  const contact = isGroupObservation
    ? singlePhrases.groupContact[state.singleContact]
    : singlePhrases.contact[state.singleContact];
  if (contact) {
    lines.push(contactSentence(state.singleContact, contact, context, isGroupObservation));
  }

  const expression = singlePhrases.expression[state.singleExpression];
  if (expression) {
    const expressionSentence = !isGroupObservation && !contact
      ? expressionSentenceWithSubject(state.singleExpression, context)
      : isGroupObservation
      ? groupExpressionSentence(state.singleExpression, expression, context, lines.length === 0)
      : expression.sentence
        ? expression.sentence
      : "Im Ausdruck " + fillSingleTemplate(expression.single, context) + ".";
    lines.push(expressionSentence);
  }

  const affect = singlePhrases.affect[state.singleAffect];
  if (affect) {
    const affectSentence = isGroupObservation
      ? lines.length
        ? "Affektiv wirkte " + context.pronoun + " " + affect + "."
        : prefix + " wirkte der Affekt " + affect + "."
      : lines.length
        ? "Affektiv wirkte " + context.pronoun + " " + affect + "."
        : "Affektiv wirkte " + context.subject + " " + affect + ".";
    lines.push(affectSentence);

    if (state.version === "lang" && state.singleAffect === "angespannt") {
      lines.push(isGroupObservation
        ? "Musikalische Angebote ermöglichten eine vorsichtige Regulation."
        : "Musikalische Angebote ermöglichten eine vorsichtige Regulation.");
    }
  }

  if (includeExtended) {
    const regulation = singlePhrases.regulation[state.singleRegulation];
    if (regulation) {
      const template = isGroupObservation ? regulation.group : regulation.single;
      lines.push(extendedSentence("regulation", state.singleRegulation, template, context, isGroupObservation, lines.length === 0));
    }

    const resources = singlePhrases.resources[state.singleResources];
    if (resources) {
      const template = isGroupObservation ? resources.group : resources.single;
      lines.push(extendedSentence("resources", state.singleResources, template, context, isGroupObservation, lines.length === 0));
    }
  }

  return lines.join("\n");
}

function pronounForPrefix(prefix) {
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
    generateIntro(),
    generateMethods(),
    generateSingleObservation(single.subject, single.subject, single.pronoun, true, single.dative),
    generateClosing(),
    state.freeText.trim()
  ].filter(Boolean).join("\n");
}

function generateEinzelGruppe() {
  return [
    generateHeader(),
    generateSingleObservation("Bei " + groupPersonLabel(), groupPersonSubject(), undefined, true),
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
  output.value = text || emptyMessageForMode();
  autoResizeOutput();
  updateSectionStatus();
  showStatus("", "info");
  if (window.innerWidth < 900 && text) {
    const outputEl = document.getElementById("output");
    outputEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
}

function emptyMessageForMode() {
  if (state.mode === "einzelgruppe") {
    return "Wähle Optionen, um eine Dokumentation zu generieren.\n\nHinweis: Für die Einzelbeobachtung sind Kontakt, Affekt oder Ausdruck besonders relevant.";
  }
  if (state.mode === "einzel") {
    return "Wähle Optionen, um eine Dokumentation zu generieren.\n\nHinweis: Für die Einzeldokumentation empfehlen sich Einstieg, Methode, Kontakt und Abschluss.";
  }
  return "Wähle Optionen, um eine Dokumentation zu generieren.\n\nHinweis: Für die Gruppendokumentation empfehlen sich Einstieg, Methoden und Wirkung.";
}

function autoResizeOutput() {
  const output = document.getElementById("output");
  output.style.height = "auto";
  output.style.height = output.scrollHeight + "px";

  // Zeichenzähler
  let counter = document.getElementById("outputCounter");
  if (!counter) {
    counter = document.createElement("p");
    counter.id = "outputCounter";
    counter.className = "output-counter";
    output.insertAdjacentElement("afterend", counter);
  }

  const text = output.value.trim();
  if (!text) {
    counter.textContent = "";
    return;
  }
  const chars = text.length;
  const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(Boolean).length;
  counter.textContent = `${sentences} ${sentences === 1 ? "Satz" : "Sätze"} · ${chars} Zeichen`;
}

function copyGeneratedText() {
  const output = document.getElementById("output");
  const text = output.value;
  navigator.clipboard.writeText(text).then(() => {
    showStatus("Text wurde kopiert.", "success");
    output.classList.add("copy-flash");
    setTimeout(() => output.classList.remove("copy-flash"), 600);
  }).catch(() => {
    showStatus("Kopieren nicht möglich. Text bitte manuell markieren.", "error");
  });
}

function showStatus(message, type = "info") {
  // Inline-Spans weiterhin aktualisieren (Fallback / Screenreader)
  document.querySelectorAll(".copy-status").forEach(el => {
    el.textContent = message;
    el.className = "copy-status status-" + type;
  });
  // Toast
  if (!message) return;
  let toast = document.getElementById("appToast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "appToast";
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.className = "toast toast-" + type + " toast-show";
  clearTimeout(toast._hideTimer);
  toast._hideTimer = setTimeout(() => toast.classList.remove("toast-show"), 2800);
}

function visibleDetails() {
  return Array.from(document.querySelectorAll("details")).filter(detail => detail.offsetParent !== null);
}

function openCoreDetails() {
  visibleDetails().forEach(detail => detail.open = false);
 }

function setDetailsOpen(open) {
  visibleDetails().forEach(detail => detail.open = open);
}

function toggleQuickMode() {
  state.quickMode = !state.quickMode;
  state.version = "kurz";
  renderButtons("version", state.version);
  renderQuickMode();
  if (state.quickMode) {
    renderModeVisibility();
    openCoreDetails();
    showStatus("Schnelldoku: Kernfelder sind geöffnet.", "info");
} else {
    showStatus("Alle Felder sind wieder sichtbar.", "info");
  }
  generate();
}

function condenseOutputText() {
  const output = document.getElementById("output");
  const placeholder = emptyMessageForMode();
  if (!output.value.trim() || output.value === placeholder) {
    showStatus("Zum Kürzen bitte zuerst einen Dokumentationstext erzeugen.", "info");
    return;
  }

  const condensed = output.value
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean)
    .filter(line => !line.startsWith("Durch den Wechsel der methodischen Formen"))
    .filter(line => !line.startsWith("Der methodische Fokus lag auf"))
    .map(line => line
      .replace("Zu Beginn erfolgte eine kurze Begrüßung. ", "")
      .replace("Zu Beginn erfolgten Begrüßung und kurze Orientierung. ", "")
      .replace("Als zentraler musiktherapeutischer Baustein wurde ", "Methodisch wurde ")
      .replace("Eingesetzt wurden ", "Methodisch: ")
      .replace("Methodisch kamen ", "Methodisch: ")
      .replace(" zum Einsatz.", ".")
      .replace("Die Stunde wirkte insgesamt ", "Wirkung: ")
      .replace("Eine Fortführung im Rahmen des Behandlungsplans ist vorgesehen.", "Fortführung im Behandlungsplan vorgesehen."))
    .join("\n");

  output.value = condensed;
  autoResizeOutput();
  showStatus("Text wurde klinisch knapper formuliert.", "success");
}

function resetAll() {
  state.mode = "gruppe";
  state.version = "kurz";
  state.intro = new Set();
  state.methods = new Set();
  state.singlePersonSalutation = "herr";
  state.singlePersonInitials = "";
  state.groupPersonSalutation = "herr";
  state.groupPersonInitials = "";
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
  state.quickMode = false;

  ["docDate","docTime","groupName","station","singlePersonInitials","groupPersonInitials","freeText"].forEach(id => document.getElementById(id).value = "");
  document.getElementById("singlePersonInitials").value = "";
  document.getElementById("groupPersonInitials").value = "";
  showStatus("", "info");
  initSelects();
  renderIntroOptions();
  renderButtons("mode", state.mode);
  renderButtons("version", state.version);
  renderModeVisibility();
  renderQuickMode();
  generate();
  const firstSegBtn = document.querySelector('[data-group="mode"] button');
  if (firstSegBtn) firstSegBtn.focus();
}

function initSelects() {
  const ids = ["dynamic","participation","access","effect","groupClimate","groupDynamics","groupIntegration","singleContact","singleExpression","singleAffect","singleRegulation","singleResources","closing"];
  ids.forEach(id => renderSelect(id, selects[id], state[id]));

  document.getElementById("singlePersonSalutation").value = state.singlePersonSalutation;
  document.getElementById("singlePersonInitials").value = state.singlePersonInitials;
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

document.getElementById("singlePersonSalutation").addEventListener("change", e => {
  state.singlePersonSalutation = e.target.value;
  generate();
});

document.getElementById("singlePersonInitials").addEventListener("input", e => {
  state.singlePersonInitials = e.target.value;
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
document.getElementById("mobileCopyBtn").addEventListener("click", copyGeneratedText);
document.getElementById("mobileRefreshBtn").addEventListener("click", generate);
document.getElementById("mobileResetBtn").addEventListener("click", resetAll);
document.getElementById("quickModeBtn").addEventListener("click", toggleQuickMode);
document.getElementById("expandAllBtn").addEventListener("click", () => setDetailsOpen(true));
document.getElementById("collapseAllBtn").addEventListener("click", () => setDetailsOpen(false));
document.getElementById("condenseBtn").addEventListener("click", condenseOutputText);
document.getElementById("printBtn").addEventListener("click", () => window.print());

document.addEventListener("keydown", e => {
  if (e.ctrlKey && e.key === "Enter") {
    e.preventDefault();
    generate();
    showStatus("Neu generiert.", "info");
  }
  if (e.ctrlKey && e.key === "c") {
    const output = document.getElementById("output");
    if (document.activeElement === output) {
      if (output.selectionStart === output.selectionEnd) {
        e.preventDefault();
        copyGeneratedText();
      }
    }
  }
});

loadBausteine()
  .then(() => {
    initSelects();
    renderIntroOptions();
    renderModeVisibility();
    renderButtons("mode", state.mode);
    renderButtons("version", state.version);
    renderQuickMode();
    generate();
  })
  .catch(showLoadError);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(`./sw.js?v=${APP_VERSION}`).catch(() => {
      // Die App funktioniert auch ohne Service Worker; Installation/Offline-Modus dann ggf. nicht.
    });
  });
}
