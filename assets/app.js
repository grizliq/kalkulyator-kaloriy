/* kalkulyator-kaloriy.com: калькулятор нормы / КБЖУ / дефицита и таблица продуктов.
   Формула Миффлина — Сан Жеора. Нижняя граница нормы — 1200 ккал для женщин и 1500 для мужчин. */
(function () {
  "use strict";
  var REF = "https://kegelfood.ru/";
  var KEY = "kk-calc";
  var GOAL = { lose: -0.15, keep: 0, gain: 0.10 };
  var PROT = { lose: 1.6, keep: 1.4, gain: 1.6 };
  var FAT = 0.9;

  function nf(n) { return Math.round(n).toLocaleString("ru-RU"); }
  function store(get, val) {
    try { if (get) return JSON.parse(localStorage.getItem(KEY) || "null"); localStorage.setItem(KEY, JSON.stringify(val)); } catch (e) { return null; }
  }
  function bmr(s, w, h, a) { return 10 * w + 6.25 * h - 5 * a + (s === "m" ? 5 : -161); }
  function floorOf(s) { return s === "m" ? 1500 : 1200; }

  function macros(kcal, w, goal) {
    var p = PROT[goal] * w, f = FAT * w;
    var c = (kcal - p * 4 - f * 9) / 4;
    if (c < 50) { f = Math.max(0.6 * w, (kcal - p * 4 - 50 * 4) / 9); c = (kcal - p * 4 - f * 9) / 4; }
    return { p: p, f: f, c: Math.max(c, 0) };
  }

  function macroBlock(m) {
    var kp = m.p * 4, kf = m.f * 9, kc = m.c * 4, t = kp + kf + kc || 1;
    return '<div class="res__grid">' +
      '<div class="res__m"><b>' + nf(m.p) + ' г</b><span>белки</span></div>' +
      '<div class="res__m"><b>' + nf(m.f) + ' г</b><span>жиры</span></div>' +
      '<div class="res__m"><b>' + nf(m.c) + ' г</b><span>углеводы</span></div></div>' +
      '<div class="res__bar" aria-hidden="true"><i style="width:' + (kp / t * 100) + '%;background:#2F7A3E"></i>' +
      '<i style="width:' + (kf / t * 100) + '%;background:#E5533D"></i><i style="width:' + (kc / t * 100) + '%;background:#C9D9C2"></i></div>';
  }

  function cta() {
    return '<a class="btn res__cta" href="' + REF + '" target="_blank" rel="sponsored noopener" data-ref>Считать съеденное по фото — Kegel Food</a>';
  }

  function render(box, mode, v) {
    var base = bmr(v.sex, v.weight, v.height, v.age);
    var tdee = base * v.act;
    var fl = floorOf(v.sex), html = "";

    if (mode === "deficit") {
      var rows = [0.10, 0.15, 0.20, 0.25].map(function (p) {
        var k = Math.max(tdee * (1 - p), fl);
        var kg = (tdee - k) * 7 / 7700;
        var tag = p === 0.15 || p === 0.2 ? "рекомендуем · " : p === 0.25 ? "только коротко · " : "";
        return '<li><span>Дефицит ' + Math.round(p * 100) + ' %<small>' + tag + '≈' + kg.toFixed(2).replace(".", ",") +
          ' кг жира в неделю</small></span><b>' + nf(k) + ' ккал</b></li>';
      }).join("");
      html = '<p class="res__k">Ваш суточный расход</p><p class="res__big">' + nf(tdee) + '<small>ккал</small></p>' +
        '<p class="res__sub">Базовый обмен — ' + nf(base) + ' ккал. Чтобы худеть, ешьте меньше расхода:</p>' +
        '<ul class="res__rows">' + rows + '</ul>' +
        '<p class="res__note">Безопасный темп — до 1 % массы тела в неделю, для вас это до ' + (v.weight * 0.01).toFixed(1).replace(".", ",") +
        ' кг. Ниже ' + nf(fl) + ' ккал калькулятор не опускается.</p>';
    } else {
      var target = tdee * (1 + GOAL[v.goal]);
      var floored = target < fl;
      if (floored) target = fl;
      var m = macros(target, v.weight, v.goal);
      var label = { lose: "Для похудения", keep: "Чтобы держать вес", gain: "Для набора" }[v.goal];
      html = '<p class="res__k">' + label + '</p><p class="res__big">' + nf(target) + '<small>ккал в день</small></p>' +
        '<p class="res__sub">Базовый обмен — ' + nf(base) + ' ккал, расход с активностью — ' + nf(tdee) + ' ккал.</p>' + macroBlock(m);
      if (mode === "kbzhu") {
        html += '<ul class="res__rows">' + [["Завтрак", 0.28], ["Обед", 0.33], ["Ужин", 0.27], ["Перекус", 0.12]].map(function (r) {
          return '<li><span>' + r[0] + '</span><b>' + nf(target * r[1]) + ' ккал · Б ' + nf(m.p * r[1]) + ' г</b></li>';
        }).join("") + '</ul>';
      }
      html += '<p class="res__note">' + (floored ? 'Расчёт дал меньше ' + nf(fl) + ' ккал — калькулятор поднял норму до безопасного минимума. ' : "") +
        'Это оценка: через 2–3 недели сверьтесь с весом и поправьте норму на 100–150 ккал.</p>';
    }
    box.innerHTML = html + cta();
    box.hidden = false;
  }

  function initCalc(sec) {
    var form = sec.querySelector("form"), out = sec.querySelector(".calc__out"), err = sec.querySelector(".calc__err");
    var mode = sec.getAttribute("data-mode");
    var saved = store(true);
    if (saved) {
      ["age", "height", "weight", "act"].forEach(function (n) { if (saved[n] != null && form[n]) form[n].value = saved[n]; });
      ["sex", "goal"].forEach(function (n) {
        var el = saved[n] && form.querySelector('input[name="' + n + '"][value="' + saved[n] + '"]'); if (el) el.checked = true;
      });
    }
    function read() {
      var g = form.querySelector('input[name="goal"]:checked');
      return {
        sex: form.querySelector('input[name="sex"]:checked').value,
        age: parseFloat(form.age.value), height: parseFloat(form.height.value),
        weight: parseFloat(String(form.weight.value).replace(",", ".")), act: parseFloat(form.act.value),
        goal: g ? g.value : "lose"
      };
    }
    function check(v) {
      if (!(v.age >= 18 && v.age <= 80)) return "Возраст — от 18 до 80 лет: для подростков формула не подходит.";
      if (!(v.height >= 140 && v.height <= 220)) return "Рост — от 140 до 220 см.";
      if (!(v.weight >= 40 && v.weight <= 250)) return "Вес — от 40 до 250 кг.";
      return "";
    }
    function run(scroll) {
      var v = read(), e = check(v);
      err.hidden = !e; err.textContent = e;
      if (e) { out.hidden = true; return; }
      store(false, v);
      render(out, mode, v);
      if (scroll && window.innerWidth < 860) out.scrollIntoView({ behavior: "smooth", block: "start" });
      if (window.ym && window.__ymId) window.ym(window.__ymId, "reachGoal", "calc_" + mode);
    }
    form.addEventListener("submit", function (ev) { ev.preventDefault(); run(true); });
    form.addEventListener("change", function () { if (!out.hidden) run(false); });
    run(false); // сразу показываем результат для значений по умолчанию или сохранённых
  }

  function initFood(root) {
    var q = root.querySelector("input[type=search]"), g = root.querySelector("select");
    var tb = root.querySelector("tbody"), rows = [].slice.call(tb.rows), empty = root.querySelector(".food__empty");
    function norm(s) { return s.toLowerCase().replace(/ё/g, "е"); }
    function filter() {
      var t = norm(q.value.trim()), gr = g.value, n = 0;
      rows.forEach(function (r) {
        var ok = (!t || norm(r.cells[0].textContent).indexOf(t) > -1) && (!gr || r.getAttribute("data-g") === gr);
        r.hidden = !ok; if (ok) n++;
      });
      empty.hidden = n > 0;
    }
    q.addEventListener("input", filter); g.addEventListener("change", filter);
    [].forEach.call(root.querySelectorAll("th[data-k]"), function (th) {
      th.tabIndex = 0;
      function sort() {
        var k = +th.getAttribute("data-k"), num = th.hasAttribute("data-num");
        var dir = th.getAttribute("aria-sort") === "descending" ? 1 : -1;
        if (!num) dir = th.getAttribute("aria-sort") === "ascending" ? -1 : 1;
        [].forEach.call(root.querySelectorAll("th[data-k]"), function (o) { o.setAttribute("aria-sort", "none"); });
        th.setAttribute("aria-sort", dir === 1 ? "ascending" : "descending");
        rows.sort(function (a, b) {
          var x = a.cells[k].textContent, y = b.cells[k].textContent;
          if (num) return (parseFloat(x.replace(",", ".")) - parseFloat(y.replace(",", "."))) * dir;
          return x.localeCompare(y, "ru") * dir;
        }).forEach(function (r) { tb.appendChild(r); });
      }
      th.addEventListener("click", sort);
      th.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); sort(); } });
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    var c = document.getElementById("calc"); if (c) initCalc(c);
    var f = document.getElementById("food"); if (f) initFood(f);
  });
})();
