(function () {
  /**
   * Branching quiz: each option sets tag weights and `next` (question id),
   * or omits `next` to finish. Typical path is 3 questions.
   */
  let QUESTIONS = {
    start: {
      prompt: "What are you most drawn to?",
      options: [
        {
          label: "Building robots, cars, rockets…",
          why: "hands-on design & competition",
          boost: { design: 4, "hands-on": 3, competitive: 2, hardware: 2 },
          preferCategories: ["Design Teams"],
          next: "build",
        },
        {
          label: "Hackathons, labs & makerspaces",
          why: "makerspaces & tech projects",
          boost: { makerspace: 4, "hands-on": 3, software: 2, hardware: 2 },
          preferCategories: ["Departmental Committees", "Clubs"],
          next: "make",
        },
        {
          label: "Clubs, identity & advocacy",
          why: "community & advocacy",
          boost: { equity: 3, advocacy: 3, social: 2 },
          preferCategories: ["Clubs"],
          next: "community",
        },
        {
          label: "Events, pubs & student life",
          why: "events & student life",
          boost: { events: 4, social: 3, campus: 1 },
          preferCategories: ["Committees"],
          next: "events",
        },
        {
          label: "Design, media & creative work",
          why: "creative & media",
          boost: { creative: 4, media: 3, design: 1 },
          preferCategories: ["Publications", "Committees"],
          next: "create",
        },
      ],
    },

    build: {
      prompt: "On a design team, what sounds best?",
      options: [
        {
          label: "Racing / vehicles",
          why: "racing & vehicles",
          boost: { racing: 4, competitive: 3, hardware: 2, design: 2 },
          preferCategories: ["Design Teams"],
          next: "pace",
        },
        {
          label: "Aerospace / rockets / planes",
          why: "aerospace & aviation",
          boost: { aerospace: 4, aviation: 3, competitive: 2, design: 2, hardware: 2 },
          preferCategories: ["Design Teams"],
          next: "pace",
        },
        {
          label: "Robots, hardware & fabrication",
          why: "robots & hardware",
          boost: { hardware: 4, "hands-on": 3, design: 2, competitive: 2 },
          preferCategories: ["Design Teams"],
          next: "pace",
        },
        {
          label: "Software / controls / electronics",
          why: "software & controls",
          boost: { software: 4, hardware: 2, design: 2, competitive: 1 },
          preferCategories: ["Design Teams"],
          next: "pace",
        },
      ],
    },

    make: {
      prompt: "Which makerspace vibe fits you?",
      options: [
        {
          label: "Build physical things in a shop",
          why: "hands-on makerspace",
          boost: { "hands-on": 4, makerspace: 3, hardware: 3, design: 1 },
          next: "pace",
        },
        {
          label: "Code, games, or digital projects",
          why: "software & games",
          boost: { software: 4, gaming: 3, creative: 2, makerspace: 1 },
          preferCategories: ["Clubs"],
          next: "pace",
        },
        {
          label: "Career fairs, research & networking",
          why: "career & research",
          boost: { career: 4, networking: 3, research: 2, academic: 1 },
          preferCategories: ["Departmental Committees"],
          next: "vibe",
        },
      ],
    },

    community: {
      prompt: "What kind of community?",
      options: [
        {
          label: "Equity, identity & advocacy",
          why: "equity & advocacy",
          boost: { equity: 4, advocacy: 4, social: 1 },
          preferCategories: ["Clubs"],
          next: "vibe",
        },
        {
          label: "Friends, sports & chill hangouts",
          why: "social community",
          boost: { social: 4, sports: 2, wellness: 2, events: 1 },
          preferCategories: ["Clubs", "Committees"],
          next: "vibe",
        },
        {
          label: "Volunteering & campus impact",
          why: "service & impact",
          boost: { service: 4, advocacy: 2, sustainability: 2, campus: 1 },
          preferCategories: ["Clubs", "Committees"],
          next: "vibe",
        },
      ],
    },

    events: {
      prompt: "How do you want to show up?",
      options: [
        {
          label: "Help run the big nights",
          why: "organizing events",
          boost: { events: 4, leadership: 3, music: 2, campus: 1 },
          preferCategories: ["Committees"],
          next: "vibe",
        },
        {
          label: "Show up for vibes & socials",
          why: "social events",
          boost: { social: 4, events: 3, music: 2, "first-year": 1 },
          preferCategories: ["Committees", "Clubs"],
          next: "vibe",
        },
        {
          label: "Sports, music, or nightlife",
          why: "sports & nightlife",
          boost: { sports: 3, music: 3, events: 2, social: 2 },
          preferCategories: ["Committees", "Clubs"],
          next: "vibe",
        },
      ],
    },

    create: {
      prompt: "What’s your creative lane?",
      options: [
        {
          label: "Photos, graphics & media",
          why: "media & photography",
          boost: { media: 4, photography: 3, creative: 3 },
          preferCategories: ["Committees", "Publications"],
          next: "vibe",
        },
        {
          label: "Writing, yearbook & publications",
          why: "publications",
          boost: { publications: 4, media: 2, creative: 2 },
          preferCategories: ["Publications"],
          next: "vibe",
        },
        {
          label: "Design systems, branding & visuals",
          why: "creative design",
          boost: { creative: 4, design: 2, media: 2 },
          preferCategories: ["Committees", "Publications"],
          next: "vibe",
        },
      ],
    },

    pace: {
      prompt: "How do you want to be involved?",
      options: [
        {
          label: "Compete hard — competitions & deadlines",
          why: "competitive teams",
          boost: { competitive: 4, design: 2, racing: 1, "hands-on": 1 },
          preferCategories: ["Design Teams"],
        },
        {
          label: "Learn by building on a real project",
          why: "hands-on project work",
          boost: { "hands-on": 3, design: 2, hardware: 1, software: 1, makerspace: 1 },
          preferCategories: ["Design Teams", "Departmental Committees"],
        },
        {
          label: "Keep it flexible — try things out",
          why: "flexible exploring",
          boost: { social: 2, makerspace: 2, creative: 1, campus: 1 },
          penalize: { competitive: 2 },
          preferCategories: ["Clubs", "Departmental Committees"],
        },
      ],
    },

    vibe: {
      prompt: "What do you mainly want out of it?",
      options: [
        {
          label: "Skills I can put on a resume",
          why: "skills & resume",
          boost: { career: 3, "hands-on": 2, networking: 2, leadership: 1 },
        },
        {
          label: "Friends and a community",
          why: "community & friends",
          boost: { social: 4, events: 2, "first-year": 2, wellness: 1 },
          preferCategories: ["Clubs", "Committees"],
        },
        {
          label: "Just vibes — fun is the point",
          why: "fun first",
          boost: { social: 3, events: 3, music: 2, creative: 1 },
          penalize: { competitive: 1 },
          preferCategories: ["Committees", "Clubs"],
        },
      ],
    },
  };

  let START_ID = "start";
  let PATH_DEPTH = 3; // typical: start → branch → finish

  let WHY_LABELS = {
    design: "design & building",
    "hands-on": "hands-on work",
    competitive: "competition",
    equity: "equity & inclusion",
    advocacy: "advocacy",
    social: "social community",
    events: "events",
    creative: "creative work",
    media: "media",
    career: "career development",
    networking: "networking",
    service: "service & impact",
    wellness: "wellness",
    sports: "sports",
    software: "software",
    hardware: "hardware",
    gaming: "games",
    research: "research",
    makerspace: "makerspaces",
    photography: "photography",
    publications: "publications",
    sustainability: "sustainability",
    racing: "racing",
    aerospace: "aerospace",
    aviation: "aviation",
    music: "music & nightlife",
    "first-year": "first-year community",
    leadership: "leadership",
    campus: "campus life",
    academic: "academic life",
  };

  function scoreGroups(groups, answers) {
    const weights = {};
    const penalties = {};
    const categoryBoost = {};
    const categoryPenalty = {};
    const whyFromAnswers = [];

    answers.forEach((answer) => {
      if (answer.why) whyFromAnswers.push(answer.why);
      Object.entries(answer.boost || {}).forEach(([tag, weight]) => {
        weights[tag] = (weights[tag] || 0) + weight;
      });
      Object.entries(answer.penalize || {}).forEach(([tag, weight]) => {
        penalties[tag] = (penalties[tag] || 0) + weight;
      });
      (answer.preferCategories || []).forEach((category) => {
        categoryBoost[category] = (categoryBoost[category] || 0) + 3;
      });
      (answer.avoidCategories || []).forEach((category) => {
        categoryPenalty[category] = (categoryPenalty[category] || 0) + 2;
      });
    });

    const ranked = groups
      .filter((group) => group.category !== "Departmental Societies")
      .map((group) => {
        const tags = group.tags || [];
        let score = 0;
        const matchedTags = [];

        tags.forEach((tag) => {
          if (weights[tag]) {
            score += weights[tag];
            matchedTags.push(tag);
          }
          if (penalties[tag]) score -= penalties[tag];
        });

        score += categoryBoost[group.category] || 0;
        score -= categoryPenalty[group.category] || 0;
        score += matchedTags.length * 0.35;

        const whyBits = [
          ...whyFromAnswers.slice(0, 2),
          ...matchedTags.slice(0, 2).map((tag) => WHY_LABELS[tag] || tag),
        ];
        const why = [...new Set(whyBits)].slice(0, 2).join(" · ");

        return { group, score, matchedTags, why };
      })
      .filter((item) => item.score > 2)
      .sort((a, b) => b.score - a.score || a.group.name.localeCompare(b.group.name));

    return diversifyResults(ranked, 3);
  }

  function diversifyResults(ranked, limit) {
    const picked = [];
    const categoryCounts = {};

    for (const item of ranked) {
      if (picked.length >= limit) break;
      const category = item.group.category || "Other";
      const count = categoryCounts[category] || 0;
      if (count >= 2) continue;
      picked.push(item);
      categoryCounts[category] = count + 1;
    }

    if (picked.length < limit) {
      for (const item of ranked) {
        if (picked.length >= limit) break;
        if (picked.some((p) => p.group.id === item.group.id)) continue;
        picked.push(item);
      }
    }

    return picked;
  }

  let quizController = null;

  function initGroupsQuiz(options) {
    const { root, groups, onOpenGroup, openButton } = options || {};

    if (!root || !Array.isArray(groups)) return;

    quizController?.abort();
    quizController = new AbortController();
    const { signal } = quizController;

    let questionId = START_ID;
    const answers = [];
    let animating = false;

    const getStage = () => root.querySelector("[data-quiz-stage]");
    const getBar = () => root.querySelector(".involved-quiz__progress-bar");
    const getPanel = () => root.querySelector(".involved-quiz__panel");

    const progressFraction = () => {
      // answers so far + current question, capped at PATH_DEPTH
      const current = Math.min(answers.length + 1, PATH_DEPTH);
      return current / PATH_DEPTH;
    };

    const ensureShell = () => {
      if (root.querySelector(".involved-quiz__panel")) return;
      const closeLabel = quizUi().closeLabel || "Close";
      root.innerHTML = `
        <div class="involved-quiz__panel is-in">
          <button type="button" class="involved-quiz__close" data-quiz-close aria-label="${escapeAttr(
            closeLabel
          )}">×</button>
          <div class="involved-quiz__progress-track" aria-hidden="true">
            <span class="involved-quiz__progress-bar" style="width:0%"></span>
          </div>
          <div class="involved-quiz__stage is-in" data-quiz-stage></div>
        </div>
      `;
      root.querySelector("[data-quiz-close]")?.addEventListener("click", close);
    };

    const bindStage = () => {
      root.querySelector("[data-quiz-restart]")?.addEventListener("click", () => {
        if (animating) return;
        questionId = START_ID;
        answers.length = 0;
        getPanel()?.removeAttribute("data-quiz-results");
        swapStage(renderQuestionHtml);
      });
      root.querySelector("[data-quiz-browse]")?.addEventListener("click", () => {
        close({ scrollTo: "#all-groups" });
      });
      root.querySelectorAll("[data-option]").forEach((btn) => {
        btn.addEventListener("click", () => {
          if (animating) return;
          const index = Number(btn.getAttribute("data-option"));
          const question = QUESTIONS[questionId];
          const option = question?.options?.[index];
          if (!option) return;
          btn.classList.add("is-selected");
          answers.push(option);
          window.setTimeout(() => {
            if (option.next && QUESTIONS[option.next]) {
              questionId = option.next;
              swapStage(renderQuestionHtml);
            } else {
              swapStage(renderResultsHtml);
            }
          }, 120);
        });
      });
      root.querySelectorAll("[data-open-group]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const id = btn.getAttribute("data-open-group");
          const group = groups.find((item) => item.id === id);
          if (group && typeof onOpenGroup === "function") onOpenGroup(group);
        });
      });
    };

    const renderQuestionHtml = () => {
      const question = QUESTIONS[questionId];
      const bar = getBar();
      if (bar) bar.style.width = `${progressFraction() * 100}%`;
      getPanel()?.removeAttribute("data-quiz-results");
      const stepNum = answers.length + 1;
      const progressTemplate = quizUi().progressTemplate || "Question {n} of {total}";
      const progressLabel = progressTemplate
        .replace("{n}", String(stepNum))
        .replace("{total}", String(PATH_DEPTH));
      return `
        <p class="involved-quiz__progress">${escapeHtml(progressLabel)}</p>
        <h2 class="involved-quiz__title">${escapeHtml(question.prompt)}</h2>
        <div class="involved-quiz__options">
          ${question.options
            .map(
              (option, index) => `
            <button type="button" class="involved-quiz__option" data-option="${index}" style="--i:${index}">
              ${escapeHtml(option.label)}
            </button>`
            )
            .join("")}
        </div>
      `;
    };

    const renderResultsHtml = () => {
      const matches = scoreGroups(groups, answers);
      const bar = getBar();
      if (bar) bar.style.width = "100%";
      getPanel()?.setAttribute("data-quiz-results", "");
      const ui = quizUi();
      const resultsTitle = ui.resultsTitle || "Your top matches";
      const emptyMessage =
        ui.emptyMessage || "No strong matches — browse the directory below.";
      const retakeLabel = ui.retakeLabel || "Retake quiz";
      const browseLabel = ui.browseLabel || "Browse all groups";
      return `
        <h2 class="involved-quiz__title involved-quiz__title--results">${escapeHtml(
          resultsTitle
        )}</h2>
        <div class="involved-quiz__results">
          ${
            matches.length
              ? matches
                  .map(
                    ({ group, why }, index) => `
            <button type="button" class="involved-quiz__result" data-open-group="${escapeAttr(
              group.id
            )}" style="--i:${index}">
              <span class="involved-quiz__result-rank">${index + 1}</span>
              <img src="${escapeAttr(group.logo || "")}" alt="" class="involved-quiz__result-logo">
              <span class="involved-quiz__result-copy">
                <span class="involved-quiz__result-name">${escapeHtml(group.name)}</span>
                <span class="involved-quiz__result-meta">${escapeHtml(
                  group.category || ""
                )}${why ? ` · ${escapeHtml(why)}` : ""}</span>
              </span>
            </button>`
                  )
                  .join("")
              : `<p class="involved-quiz__empty">${escapeHtml(emptyMessage)}</p>`
          }
        </div>
        <div class="involved-quiz__actions">
          <button type="button" class="involved-quiz__btn involved-quiz__btn--ghost" data-quiz-restart>${escapeHtml(
            retakeLabel
          )}</button>
          <button type="button" class="involved-quiz__btn" data-quiz-browse>${escapeHtml(
            browseLabel
          )}</button>
        </div>
      `;
    };

    const fillStage = (html) => {
      const stage = getStage();
      if (!stage) return;
      stage.scrollTop = 0;
      stage.innerHTML = html;
      stage.classList.remove("is-out");
      void stage.offsetWidth;
      stage.classList.add("is-in");
      bindStage();
      stage.querySelectorAll("[data-quiz-close]").forEach((btn) => {
        btn.addEventListener("click", close);
      });
    };

    const swapStage = (renderHtml) => {
      const stage = getStage();
      if (!stage) {
        fillStage(renderHtml());
        return;
      }
      animating = true;
      stage.classList.remove("is-in");
      stage.classList.add("is-out");
      window.setTimeout(() => {
        fillStage(renderHtml());
        animating = false;
      }, 160);
    };

    const open = () => {
      questionId = START_ID;
      answers.length = 0;
      animating = false;
      root.hidden = false;
      root.setAttribute("data-quiz-open", "");
      root.classList.remove("is-visible");
      document.body.classList.add("involved-quiz-open");
      if (typeof window.pauseSiteScroll === "function") window.pauseSiteScroll();
      ensureShell();
      fillStage(renderQuestionHtml());
      requestAnimationFrame(() => root.classList.add("is-visible"));
    };

    const close = (opts) => {
      if (!root.hasAttribute("data-quiz-open")) return;
      const scrollTo = opts && opts.scrollTo;
      root.classList.remove("is-visible");
      window.setTimeout(() => {
        root.hidden = true;
        root.removeAttribute("data-quiz-open");
        document.body.classList.remove("involved-quiz-open");
        root.innerHTML = "";
        if (typeof window.resumeSiteScroll === "function") {
          window.resumeSiteScroll();
        }
        if (scrollTo) {
          requestAnimationFrame(() => {
            if (typeof window.scrollSiteTo === "function") {
              window.scrollSiteTo(scrollTo, { offset: -20 });
            } else {
              document.querySelector(scrollTo)?.scrollIntoView({
                behavior: "smooth",
                block: "start",
              });
            }
          });
        }
      }, 220);
    };

    openButton?.addEventListener("click", open, { signal });
    root.addEventListener(
      "click",
      (event) => {
        if (event.target === root) close();
      },
      { signal }
    );
    document.addEventListener(
      "keydown",
      (event) => {
        if (event.key !== "Escape" || !root.hasAttribute("data-quiz-open")) return;
        const groupModal = document.getElementById("involved-group-modal");
        if (groupModal?.getAttribute("data-modal-group-status") === "active") return;
        close();
      },
      { signal }
    );

    return { open, close };
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function escapeAttr(value) {
    return escapeHtml(value).replace(/'/g, "&#39;");
  }

  function quizUi() {
    return (window.__involvedPageCopy && window.__involvedPageCopy.quizUi) || {};
  }

  async function loadQuizConfig() {
    const sources = ["/api/quiz", "data/quiz.json"];
    for (const url of sources) {
      try {
        const response = await fetch(url, { credentials: "same-origin" });
        if (!response.ok) continue;
        const data = await response.json();
        if (!data?.questions || !data.questions[data.startId || "start"]) continue;
        QUESTIONS = data.questions;
        START_ID = data.startId || "start";
        PATH_DEPTH = Number(data.pathDepth) > 0 ? Math.round(Number(data.pathDepth)) : 3;
        if (data.whyLabels && typeof data.whyLabels === "object") {
          WHY_LABELS = { ...WHY_LABELS, ...data.whyLabels };
        }
        return data;
      } catch (_error) {
        /* try next */
      }
    }
    return null;
  }

  window.initGroupsQuiz = initGroupsQuiz;
  window.loadQuizConfig = loadQuizConfig;
})();
