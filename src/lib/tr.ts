/**
 * TR — слой полного английского перевода (v11, релизная двуязычность).
 *
 * Архитектура «русский как ключ»: RU-строки остаются единственным источником
 * данных (каталог, движки, компоненты), а EN получается на границе отображения:
 *  • T(s)      — точная карта EN_MAP: русский текст → канонический английский;
 *  • EN_PATTERNS — параметризованные шаблоны движков («база: medium+»,
 *                «Прогноз на 2043…») с функциями-подстановками;
 *  • всё, что не нашлось, возвращается как есть — EN-строки идемпотентны,
 *                пользовательский текст (заметки, имена) не искажается.
 *
 * Язык синхронизируется LangProvider'ом (setTrLang) ДО первого рендера
 * детей — движки и экспорты всегда видят актуальный язык.
 */

export type TrLang = 'ru' | 'en';

let current: TrLang = 'en';

export function setTrLang(l: TrLang): void {
  current = l;
}

export function getTrLang(): TrLang {
  return current;
}

/* ── Точная карта: RU → EN ────────────────────────────────────────────────── */

export const EN_MAP: Record<string, string> = {
  /* ═══ Паспорт вина v18 · компоновка «Три касания» ═══ */
  'Паспорт вина': 'Wine passport',
  'Три касания: бокал · происхождение · детали': 'Three touches: glass · origin · details',
  'Шаги паспорта': 'Passport steps',
  'Что в бокале': 'What’s in the glass',
  'что в бокале': 'What’s in the glass',
  'Откуда': 'Where from',
  'откуда': 'Where from',
  'Детали': 'Details',
  'детали': 'Details',
  'название': 'name',
  'тип · шапка реагирует': 'type · the top reacts',
  'цвет': 'colour',
  'флаги': 'flags',
  'слепая дегустация': 'blind tasting',
  'из погреба': 'from the cellar',
  'тихое': 'still',
  'игристое · мюзле': 'sparkling · mousseux',
  'креплёное · янтарь': 'fortified · amber',
  'Черри · слива': 'Cherry · plum',
  'Лимон · яблоко': 'Lemon · apple',
  'Клубника · лепестки': 'Strawberry · petals',
  'Абрикос · шафран': 'Apricot · saffron',
  'страна': 'country',
  'регион': 'region',
  'сорт': 'grape variety',
  'страна · регион': 'country · region',
  'сорт вина': 'grape variety',
  'производитель · призрак': 'producer · ghost',
  'производитель · цена': 'producer · price',
  'крепость · ±0,5': 'ABV · ±0.5',
  '−0,5': '−0.5',
  '+0,5': '+0.5',
  'цена': 'price',
  'дата дегустации': 'tasting date',
  'винтаж · хронограф': 'vintage · chronograph',
  'сейчас': 'now',
  'NV · без года': 'NV · no year',
  'впишите год целиком — например, 1920': 'type the full year — e.g. 1920',
  'в расцвете': 'at its peak',
  'выдержанное': 'mature',
  'старое': 'old',
  'Начните писать — подхвачу из памяти. Enter — запомнить новое.': 'Start typing — I’ll pick up from memory. Enter — remember a new one.',
  'Призрак приходит из памяти дегустаций — серый хвост вдоль текста и кнопка справа, никаких всплывающих списков. Enter — запомнить новое.':
    'The ghost comes from your tasting memory — a grey tail along the text and a pill button, no pop-up lists. Enter — remember a new one.',
  'Максимум — год устройства': 'maximum — your device’s year',
  'дата — авто-сегодня': 'date — today automatically',
  'запись': 'record',
  'Паспорт собран:': 'Passport assembled:',
  'Заполните шаги — паспорт соберётся сам': 'Fill in the steps — the passport assembles itself',
  'Фотоальбом · внизу паспорта': 'Photo album · at the bottom of the passport',
  'пусто — фото не обязательны · загрузили — появилось и решайте сами': 'empty — photos are optional · add one and decide for yourself',
  'Аверс': 'Front label',
  'Реверс': 'Back label',
  'Пробка · капсула': 'Cork · capsule',
  'аверс': 'front label',
  'реверс': 'back label',
  'бокал': 'glass',
  'пробка': 'cork',
  'снимок': 'shot',
  'этикетка · авто-сжатие ~100 КБ': 'label · auto-compressed to ~100 KB',
  'контрэтикетка · ~100 КБ': 'back label · ~100 KB',
  'вид при свете': 'against the light',
  'осадок, год, печать': 'sediment, year, seal',
  'загружено': 'loaded',
  'КБ': 'KB',
  'на карточку': 'put on card',
  'на карте ✓': 'on the card ✓',
  'на карте': 'on the card',
  'например, Бароло Ризерва': 'e.g. Barolo Riserva',
  'например, Италия': 'e.g. Italy',
  'например, Пьемонт': 'e.g. Piedmont',
  'например, Неббиоло': 'e.g. Nebbiolo',
  'например, Fontanafredda': 'e.g. Fontanafredda',

  /* ═══ Секции: заголовки/подзаголовки/подсказки ═══ */
  'Идентификация и условия дегустации': 'Wine identity & tasting conditions',
  'Прозрачность, интенсивность, цвет': 'Clarity, intensity, colour',
  'Чистота, состояние, ароматический профиль': 'Clarity, condition, aromatic profile',
  'Шкалы SAT, структура и баланс': 'SAT scales, structure & balance',
  'Модель BLIC и вердикт качества': 'BLIC model & quality verdict',
  'Moodboard, образ, гастрономия, свободные заметки': 'Moodboard, image, pairings, free notes',
  'Шесть осей 0–10 · композитный расчёт из всех разделов': 'Six axes 0–10 · a composite score from all sections',
  'Живой структурный профиль': 'Live structural profile',
  'Структурный профиль': 'Structural profile',
  'Спектр аромата': 'Aroma spectrum',
  'Всё, что колесо посчитало под капотом носа': 'Everything the wheel computed under the hood of the nose',
  'Закон Ципфа и Вебер–Фехнер считают энергию семейств, индекс Херфиндаля–Хиршмана — концентрацию букета, пирамида P/S/T — эволюцию. Здесь магия становится цифрами.':
    "Zipf's law and Weber–Fechner compute the energy of families, the Herfindahl–Hirschman index — bouquet concentration, the P/S/T pyramid — evolution. Here the magic becomes numbers.",
  'Проверка логики': 'Logic check',
  'Детектор противоречий дегустации': 'Tasting contradiction detector',
  'Противоречий не найдено — дегустация внутренне непротиворечива.': 'No contradictions found — the tasting is internally consistent.',
  ошибка: 'error',
  внимание: 'warning',
  совет: 'advice',
  'Советник подачи': 'Serving advisor',
  'Температура, декантация, бокал': 'Temperature, decanting, glass',
  Температура: 'Temperature',
  Декантация: 'Decanting',
  Бокал: 'Glass',
  'Карточка для полки': 'Shelf-talker card',
  'Шелф-токер + вердикт': 'Shelf-talker + verdict',
  'Безымянное вино': 'Unnamed wine',
  Вино: 'Wine',
  'скопировать кратко': 'copy briefly',
  'Карточка скопирована': 'Card copied',
  'Карта дегустации': 'Tasting card',
  '· фото сжаты автоматически. Данные хранятся локально (IndexedDB) и переживают перезагрузки.':
    '· photos are compressed automatically. Data is stored locally (IndexedDB) and survives reloads.',
  'Балл сегодня:': 'Score today:',
  'Потенциал в зените:': 'Zenith potential:',
  'Сейчас в бокале': 'Now in the glass',
  'Контур зенита (через 8–10 лет)': 'Zenith contour (in 8–10 years)',
  'нет данных': 'no data',
  'HHI · концентрация': 'HHI · concentration',
  'моно-фокус': 'mono-focus',
  'выраженный профиль': 'pronounced profile',
  'рассеянный букет': 'dispersed bouquet',
  'Сложность (BLIC)': 'Complexity (BLIC)',
  'Комплексное (полифония)': 'Complex (polyphony)',
  Многослойное: 'Layered',
  'Моно-фокус / простое': 'Mono-focus / simple',
  'сем.': 'fam.',
  'энтропия Шеннона': 'Shannon entropy',
  'Эволюция (P/S/T)': 'Evolution (P/S/T)',
  'согласна с «Развитием»': 'matches “Development”',
  'расходится с «Развитием»': 'mismatches “Development”',
  'выберите «Развитие»': 'set “Development”',
  'Громкость букета': 'Bouquet loudness',
  база: 'base',
  '(нос)': '(nose)',
  '(по умолч.)': '(default)',
  'Доли семейств в спектре': 'Family shares in the spectrum',
  'Отметьте дескрипторы на колесе «Носа» — спектр построится сам.':
    'Mark descriptors on the “Nose” wheel — the spectrum will build itself.',
  'Регистр фрукта': 'Fruit register',
  'Пирамида P/S/T': 'P/S/T pyramid',
  'Первичные (фрукты, цветы, травы)': 'Primary (fruit, flowers, herbs)',
  'Вторичные (дуб, ферментация)': 'Secondary (oak, fermentation)',
  'Третичные + минералы': 'Tertiary + minerals',
  'Индекс = (0.5·S + T) / (P + S + T). Сверяется с пунктом «Развитие»: трюфели в молодом вине сработают детектором аномалий.':
    'Index = (0.5·S + T) / (P + S + T). Cross-checked against “Development”: truffles in a young wine will trigger the anomaly detector.',
  'Пороки в спектре:': 'Faults in the spectrum:',
  'Вино больное: качество срезано до «Acceptable»/«Faulty», окно питья закрыто справа.':
    'The wine is faulty: quality is cut to “Acceptable”/“Faulty”, the drinking window is closed on the right.',
  'Лёгкие тона на 1 • — возможная терруарная стилистика: вердикт не блокируется.':
    'Light tones at 1 • — possible terroir styling: the verdict is not blocked.',
  'Меняет метафоры, не факты': 'Changes metaphors, not facts',
  'Стоп': 'Stop',
  'Замерить': 'Measure',

  /* ═══ Семейства ароматов ═══ */
  Фрукты: 'Fruit',
  Цветы: 'Flowers',
  Травы: 'Herbs',
  Специи: 'Spices',
  Дуб: 'Oak',
  Ферментация: 'Fermentation',
  Минералы: 'Minerals',
  Выдержка: 'Ageing',
  'Пороки / Химия': 'Faults / Chemistry',
  'Пороки и химия': 'Faults & chemistry',
  Пороки: 'Faults',
  'Дефекты и химические тона': 'Faults & chemical tones',

  /* ═══ Колесо ароматов ═══ */
  закрыть: 'close',
  ароматов: 'aromas',
  'Закрыть панель дескрипторов': 'Close the descriptor panel',
  'Тап по сектору — панель дескрипторов': 'Tap a sector — the descriptor panel',
  'Сбросить всё ×': 'Reset all ×',
  'Лимит: не больше': 'Limit: no more than',
  'активных дескрипторов — снимите лишний, чтобы добавить новый':
    'active descriptors — remove one to add a new one',
  '→ статус «С дефектом»': '→ “Faulty” status',
  'Далее ➔': 'Next ➔',
  'Свои дескрипторы': 'Custom descriptors',
  'привязаны к': 'bound to',
  'тап — цикл • → •• → ••• → снять; сохраняются для всех дегустаций':
    'tap cycles • → •• → ••• → clear; saved for all tastings',
  'Тап: 1 легко → 2 отчётливо → 3 сильно': 'Tap: 1 light → 2 distinct → 3 heavy',
  'Тап: 1 лёгкий → 2 выраженный → 3 интенсивный': 'Tap: 1 subtle → 2 pronounced → 3 intense',
  'Влияет на чистоту вина': 'Affects wine condition',
  'Химические тона и пороки (TCA, редукция, бретт, уксус)':
    'Chemical tones & faults (TCA, reduction, Brett, vinegar)',
  отмечено: 'marked',
  'На колесе — убрать': 'Remove from wheel',
  '+ Добавить пороки': '+ Add faults',
  'Удалить из библиотеки (и из этой карточки)': 'Remove from the library (and from this card)',
  '+ Свой дескриптор': '+ Custom descriptor',
  'Новый свой дескриптор для семейства': 'New custom descriptor for the family',
  'Удалить свой дескриптор': 'Remove the custom descriptor',
  'из библиотеки': 'from the library',

  /* ═══ Глаз ═══ */
  Прозрачность: 'Clarity',
  Интенсивность: 'Intensity',
  'Ширина каймы': 'Rim width',
  'Ножки / вязкость': 'Legs / viscosity',
  'авторская фича Pro — в WSET не используется':
    'a signature Pro feature — not used in WSET',
  'авторская фича Pro': 'a signature Pro feature',
  'Обода не видно: вино молодое или очень плотное': 'No rim visible: the wine is young or very dense',
  'Тонкая светлая кромка 1–2 мм — возраст не читается': 'A thin light edge of 1–2 mm — age is not readable',
  'Кромка 3–5 мм: первые признаки возраста': 'A 3–5 mm edge: the first signs of age',
  'Широкий прозрачный обод: вино развивается или состарилось':
    'A wide transparent rim: the wine is developing or aged',
  'Ножек нет: низкий алкоголь или экстракт': 'No legs: low alcohol or extract',
  'Тонкие быстрые ножки — лёгкое тело': 'Thin quick legs — a light body',
  'Умеренные ножки, стекают с секундной задержкой': 'Moderate legs, sliding with a one-second delay',
  'Толстые медленные «слёзы» — глицерин и спирт': 'Thick slow “tears” — glycerol and alcohol',
  'Приложение — категория WSET': 'Appendix — the WSET category',
  'определяется автоматически по цвету ядра': 'determined automatically from the core colour',
  'Диск: ядро → кайма': 'Disc: core → rim',
  'Кайма — цвет у стенки бокала: у молодых вин светлее ядра, кирпичный ободок говорит о возрасте. Ядро и кайма задаются независимо; ширина обода управляет градиентом перехода.':
    'The rim is the colour at the glass wall: in young wines it is lighter than the core, a brick edge speaks of age. Core and rim are set independently; the rim width drives the gradient transition.',
  'Перляж и мусс': 'Perlage & mousse',
  'Для игристых WSET ждёт наблюдения о пузырьках и характере мусса. Канвас ниже — живая визуализация.':
    'For sparkling wines WSET expects observations on the bubbles and the mousse character. The canvas below is a live visualisation.',
  'Размер пузырьков': 'Bubble size',
  Мусс: 'Mousse',
  'Деликатная нить: выдержанное вино на осадке': 'A delicate thread: an aged wine on lees',
  'Классический мюзе стандартной выдержки': 'The classic mousse of standard ageing',
  'Крупные пузыри: молодое вино или потеря давления': 'Coarse bubbles: a young wine or lost pressure',
  'Гладкая кремовая пена — зрелый мюзе': 'A smooth creamy foam — a mature mousse',
  'Слаботурбулентная пена, быстро гаснет': 'A low-turbulence foam that dies quickly',
  'Яростная шипучесть — молодое/резкое вино': 'Furious fizz — a young/sharp wine',
  'Заметки по виду': 'Appearance notes',
  'Вязкость, CO₂, наблюдения о кольце смачивания…': 'Viscosity, CO₂, observations on the wetting ring…',

  /* ═══ Нос ═══ */
  'Отметьте дефекты и их выраженность': 'Mark the faults and their intensity',
  'Колесо ароматов': 'Aroma wheel',
  'Заметки по носу': 'Nose notes',
  'Кремень и сланец, мокрый камень…': 'Flint and slate, wet stone…',
  'Режим дефекта активен.': 'Fault mode is active.',
  'Фатальный порок: ': 'Fatal fault: ',
  'Стилистический дефект 2–3 •: ': 'Stylistic fault 2–3 •: ',
  'вердикт качества не выше «Acceptable» (принудительно «Faulty»), потенциал выдержки закрыт — «Не подходит для выдержки».':
    'the quality verdict is capped at “Acceptable” (forced “Faulty”), the ageing potential is closed — “Not suitable for ageing”.',
  'Колесо работает под капотом: семейства кормят оси «Фруктовость» и «Минеральность», сложность BLIC и индекс эволюции — всё это раскроется в «Сводке».':
    'The wheel works under the hood: the families feed the “Fruit” and “Minerality” axes, BLIC complexity and the evolution index — all of it revealed in the “Summary”.',

  /* ═══ Рот ═══ */
  Сладость: 'Sweetness',
  'границы сахара в г/л': 'sugar thresholds in g/l',
  'Форма волны кислотности': 'Acidity wave shape',
  'Танины (количество)': 'Tannin level',
  'Текстура танинов': 'Tannin texture',
  'тактильная матрица: зерно и локализация': 'a tactile matrix: grain & localisation',
  'Каудалиемер': 'Caudalie meter',
  'класс: 8+ секунд': 'class: 8+ seconds',
  достойно: 'worthy',
  коротко: 'short',
  'Глотнуть, проглотить, запустить секундомер — до полного исчезновения вкуса.':
    'Sip, swallow, start the stopwatch — until the taste fully disappears.',
  'Длина послевкусия': 'Finish length',
  'или замерьте каудалиеметром': 'or measure with the caudalie meter',
  'Доминирующий акцент финиша': 'Dominant finish accent',
  Баланс: 'Balance',
  'Причины дисбаланса': 'Causes of the imbalance',
  'Движок: ': 'Engine: ',
  гармонично: 'harmonious',
  спорно: 'debatable',
  'на грани': 'borderline',
  'Комментарий к балансу…': 'Balance comment…',
  'Заметки по рту': 'Palate notes',
  'Эволюция вкуса во рту, сольность, тире…': 'Flavour evolution in the mouth, salinity, dashes…',
  'Калибровка кислотности': 'Calibrating acidity',
  '• <b>Низкая:</b> плоское, как тёплая вода без лимона.':
    '• <b>Low:</b> flat, like warm water without lemon.',
  '• <b>Средняя:</b> спелое яблоко или персик — слюна собирается естественно.':
    '• <b>Medium:</b> a ripe apple or peach — saliva gathers naturally.',
  '• <b>Высокая:</b> раскусить дольку лимона — челюсти сводит, слюна течёт ручьём по бокам языка.':
    '• <b>High:</b> bite into a lemon wedge — the jaws clench, saliva runs down the sides of the tongue.',
  'Кислотность — «скелет» вина: она же поднимает волну на осциллографе выше (Высокая = ×1.35 амплитуды).':
    'Acidity is the wine’s “skeleton”: it also lifts the oscilloscope wave higher (High = ×1.35 of the amplitude).',
  'Калибровка танинов: тест десны': 'Calibrating tannins: the gum test',
  'Через 5 секунд после глотка проведите языком по дёснам над передними зубами. Гладкая поверхность — танины низкие. Десна прилипает к губе, как замша, — танины высокие.':
    'Five seconds after swallowing, run your tongue over the gums above the front teeth. A smooth surface — low tannins. If the gum sticks to the lip like suede — high tannins.',
  'Танины дуба vs танины винограда': 'Oak tannins vs grape tannins',
  '<b>Дуб (бочка):</b> приходит «с приправой» — ваниль, тост, кокос, гвоздика; вяжет аккуратно, чаще нёбо и передние десны.':
    '<b>Oak (barrel):</b> arrives “seasoned” — vanilla, toast, coconut, clove; grips gently, mostly the palate and the front gums.',
  '<b>Виноград (кожица, семена, гребни):</b> суше и горче, вяжет всю полость, горчинка чувствуется в финише.':
    '<b>Grape (skins, seeds, stems):</b> drier and more bitter, grips the whole cavity, the bitterness felt in the finish.',
  'Быстрый тест: если в аромате ваниль/дым/тост — часть танинов принесла бочка.':
    'Quick test: vanilla/smoke/toast in the aroma — part of the tannins was brought by the barrel.',
  'Сбалансированное': 'Balanced',
  'Несбалансированное': 'Unbalanced',
  'Баланс (B из BLIC): сладость ↔ фрукты ↔ кислотность ↔ танины. Сладкое с ярким фруктовым якорем не штрафуется; сахар без якоря — дисбаланс.':
    'Balance (B of BLIC): sweetness ↔ fruit ↔ acidity ↔ tannins. Sweet with a vivid fruit anchor is not penalised; sugar without an anchor — an imbalance.',
  'Выберите вердикт. При «Сбалансированное» список причин автоматически очищается — в отчёт уйдёт только актуальное состояние.':
    'Choose the verdict. With “Balanced” the causes list is cleared automatically — only the actual state goes into the report.',

  /* ═══ Итог ═══ */
  'BLIC — четыре опоры': 'BLIC — four pillars',
  автозаполнить: 'auto-fill',
  'Вердикт качества (WSET)': 'Quality verdict (WSET)',
  'по BLIC': 'from BLIC',
  'Готовность к употреблению': 'Drinking readiness',
  'Окно питья: с': 'Drinking window: from',
  до: 'to',
  '100-балльная шкала (Parker / CMS)': '100-point scale (Parker / CMS)',
  'Коридор вердикта': 'Verdict corridor',
  Медиана: 'Median',
  'Шкала строго зафиксирована в рамках вердикта': 'The scale is strictly locked to the verdict',
  'Сначала выберите вердикт качества — шкала встанет в его коридор.':
    'First choose the quality verdict — the scale will snap into its corridor.',
  'В режиме WSET эта шкала скрыта принципиально.':
    'In WSET mode this scale is hidden on principle.',
  'Балл 100-шкалы': '100-point score',
  'Не подходит для выдержки.': 'Not suitable for ageing.',
  'Фатальный порок (винификация/хранение убили вино)':
    'A fatal fault (vinification/storage killed the wine)',
  'Стилистический дефект 2–3 •': 'A stylistic fault 2–3 •',
  '→ вердикт принудительно «Faulty», готовность — «Пить сейчас», окно питья зажато текущим годом.':
    '→ the verdict is forced to “Faulty”, readiness — “Drink now”, the drinking window is clamped to the current year.',
  ' Балл 100-балльной шкалы следует коридору вердикта (дефектное: 50–69).':
    ' The 100-point score follows the verdict corridor (faulty: 50–69).',
  'BLIC заполнен по данным дегустации': 'BLIC filled from the tasting data',
  'Сначала заполните все 4 компонента BLIC': 'Fill in all 4 BLIC components first',
  Предложено: 'Suggested',
  Заключение: 'Conclusion',
  'Финальный аккорд дегустации…': 'The final chord of the tasting…',
  'Кривая жизни вина': 'Wine life curve',
  'Применить в карту ↵': 'Apply to card ↵',
  'Оценка сейчас:': 'Score now:',
  'Зенит на пике:': 'Zenith at peak:',
  'ЗАКРЫТО': 'CLOSED',
  'ЗОЛОТОЕ ПЛАТО (ПИК)': 'GOLDEN PLATEAU (PEAK)',
  'Окно пика: ': 'Peak window: ',
  'Потенциал: ≈': 'Potential: ≈',
  'л.': 'yrs',
  ' год': '',
  'Порок выявлен: потенциал выдержки закрыт — окно питья зажато текущим годом.':
    'Fault detected: the ageing potential is closed — the drinking window is clamped to the current year.',

  /* ═══ Гипотеза ═══ */
  'Сенсорная гипотеза сомелье': 'Sommelier sensory hypothesis',
  '· ожидание перед глотком': '· an expectation before the sip',
  'Гипотеза выдвигается до пробы: отметьте ожидания, сделайте глоток и сверьте с фактом во «Рту» — расхождения ценнее совпадений.':
    'The hypothesis is made before the sip: mark your expectations, take a sip and compare with the facts in the “Palate” — mismatches are worth more than matches.',
  кислотность: 'acidity',
  танины: 'tannins',
  тело: 'body',
  Тело: 'Body',
  'Гипотеза по составу колеса': 'A hypothesis from the wheel composition',
  'до глотка. Сверьте в разделе «Рот».': 'before the sip. Verify it in the “Palate” section.',

  /* ═══ Осциллограф / кривая кислотности ═══ */
  'Осциллограмма сочности': 'Juiciness oscillogram',
  'форма не выбрана': 'no shape selected',
  'Выберите форму волны — кривая перетечёт в неё. Проведите пальцем по экрану: сканер покажет физиологию каждой секунды глотка.':
    'Choose a wave shape — the curve will morph into it. Sweep a finger across the screen: the scanner shows the physiology of every second of the sip.',
  'Цитрусовый удар': 'Citrus strike',
  'Мозель Рислинг · Совиньон Блан': 'Mosel Riesling · Sauvignon Blanc',
  'Купольная сочность': 'Dome juiciness',
  'Выдержанное Шардоне · Мерло': 'Aged Chardonnay · Merlot',
  'Финишный импульс': 'Finish impulse',
  'Бароло · Шампань Брют · Этна Россо': 'Barolo · Brut Champagne · Etna Rosso',
  'Натянутая струна': 'Taut string',
  'Шабли · Мюскаде · Асиртико': 'Chablis · Muscadet · Assyrtiko',
  'Бархатный купол': 'Velvet dome',
  'Белая Бургундия · Вионье': 'White Burgundy · Viognier',
  'Провал энергии': 'Energy dip',
  'Уставшее · перезрелое вино': 'A tired · overripe wine',
  '0–2 с': '0–2 s',
  Атака: 'Attack',
  'Кончик языка и десны. Первое впечатление кислотного удара.':
    'Tongue tip and gums. The first impression of the acid strike.',
  '2–6 с': '2–6 s',
  Эволюция: 'Evolution',
  'Середина нёба. Взаимодействие сочности с телом вина.':
    'The mid-palate. Juiciness interacting with the wine’s body.',
  '6+ с': '6+ s',
  Финиш: 'Finish',
  'Глоток и каудалии. Слюноотделение и послевкусие.':
    'The swallow and caudalies. Salivation and the aftertaste.',

  /* ═══ Текстуры танинов ═══ */
  'Ультра-мелкая фракция': 'An ultra-fine fraction',
  'Скользит по всему нёбу': 'Glides across the whole palate',
  'Ощущение гладкого атласа, полифенолы идеально встроены в структуру (Пино Нуар, зрелая Бургундия).':
    'The feel of smooth satin; the polyphenols are perfectly integrated into the structure (Pinot Noir, mature Burgundy).',
  'Известковая пудра': 'Limestone dust',
  'Центр языка и десны': 'The centre of the tongue and the gums',
  'Сухая минеральная пыль, ощущение мела или талька между зубами (известняковый терруар, Санджовезе).':
    'Dry mineral dust, a feel of chalk or talc between the teeth (limestone terroir, Sangiovese).',
  'Плотный мягкий ворс': 'A dense soft pile',
  'Щёки и мягкое нёбо': 'The cheeks and the soft palate',
  'Обволакивающий, мягкий объёмный ворс без агрессии (Мерло, спелый Напа Каберне).':
    'An enveloping, soft, voluminous pile without aggression (Merlot, ripe Napa Cabernet).',
  'Осязаемые частицы': 'Palpable particles',
  'Внутренняя сторона губ': 'The inner side of the lips',
  'Мелкая наждачная бумага, ощутимый полифенольный осадок на зубах (молодое Бордо, Каберне Совиньон).':
    'Fine sandpaper, a perceptible polyphenol sediment on the teeth (young Bordeaux, Cabernet Sauvignon).',
  'Мускульный зажим': 'A muscular clamp',
  'Передние верхние десны': 'The front upper gums',
  'Стягивающий каркас, цепкое ощущение высушивания десен (Неббиоло, молодая Сира).':
    'A contracting frame, a clingy gum-drying feel (Nebbiolo, young Syrah).',
  'Деревенский стиль': 'A rustic style',
  'Вся полость рта': 'The whole mouth cavity',
  'Шероховатые, угловатые, неотполированные танины с лёгкой горечью (Танат, автохтоны юга).':
    'Rough, angular, unpolished tannins with a light bitterness (Tannat, southern autochthons).',
};

Object.assign(EN_MAP, {
/* ═══ Шкалы SAT: подписи каталога (RU label → EN) ═══ */
  Низкая: 'Low',
  'Средняя−': 'Medium (-)',
  'Средняя': 'Medium',
  'Средняя+': 'Medium (+)',
  Высокая: 'High',
  'Лёгкое': 'Light',
  'Среднее−': 'Medium (-)',
  'Среднее': 'Medium',
  'Среднее+': 'Medium (+)',
  Полное: 'Full',
  Короткое: 'Short',
  Долгое: 'Long',
  Сухое: 'Dry',
  Полусухое: 'Off-dry',
  Полусладкое: 'Medium',
  'Низкий': 'Low',
  'Средний': 'Medium',
  'Высокий': 'High',
  Прямая: 'Linear',
  'Ранний пик': 'Early peak',
  Середина: 'Mid-palate',
  'Поздний пик': 'Late peak',
  'Мягкая волна': 'Soft wave',
  Плоская: 'Flat',
  'Линейная ось от атаки до финиша: кислотность держит одну ноту и не делает резких движений — честное, прямолинейное вино.':
    'A linear axis from attack to finish: the acidity holds one note and makes no sudden moves — an honest, straightforward wine.',
  'Всплеск на кончике языка: яркая атака сразу на входе и мягкий спад — молодой рислинг, лёгкие белые, часть розе.':
    'A splash on the tongue tip: a vivid attack right at the entry and a soft fade — young Riesling, light whites, some rosés.',
  'Округлая сочность в теле: пик в середине нёба, мягкий вход и выход — классическая арка, типичный шардоне-профиль.':
    'Rounded juiciness in the body: a peak in the mid-palate, a soft entry and exit — the classic arch, a typical Chardonnay profile.',
  'Нарастание к глотку: кислота раскручивается к финишу и вызывает слюноотделение — неббиоло, вертикальные соляные вина с длинной спиной.':
    'A build-up towards the swallow: the acidity spins up towards the finish and triggers salivation — Nebbiolo, vertical saline wines with a long spine.',
  'Купольная гладкая кислота без острых пиков: округлый купол, сливочная текстура, МЛО-тоны, кремовые белые.':
    'Dome-smooth acidity without sharp peaks: a rounded dome, a creamy texture, MLF tones, creamy whites.',
  'Уставшая, проваленная кислота: низкая амплитуда, вино лежит на нёбе плоскостью и не освежает.':
    'Tired, sunken acidity: a low amplitude, the wine lies flat on the palate and does not refresh.',
  'Кислотный (сочный)': 'Acidic (juicy)',
  'Танинный (структурный)': 'Tannic (structural)',
  'Спелый фруктовый': 'Ripe fruit',
  'Пряный / дубовый': 'Spicy / oaky',
  'Минеральный / солоноватый': 'Mineral / saline',
  'Шелковистые': 'Silky',
  'Меловые': 'Chalky',
  'Бархатистые': 'Velvety',
  'Зернистые': 'Grainy',
  'Хваткие': 'Grippy',
  'Грубые': 'Rustic',
  'Кислота давит': 'The acid pushes',
  'Танины давят': 'The tannins push',
  'Сахар без фруктового якоря': 'Sugar without a fruit anchor',
  Горечь: 'Bitterness',
  'Горячий алкоголь': 'Hot alcohol',
  Водянистость: 'Wateriness',
  'Пустой экстракт': 'A hollow extract',
  Другое: 'Other',

  /* ═══ Вердикты, готовность, BLIC ═══ */
  'Дефектное': 'Faulty',
  'Слабое': 'Poor',
  'Приемлемое': 'Acceptable',
  'Хорошее': 'Good',
  'Очень хорошее': 'Very good',
  'Выдающееся': 'Outstanding',
  'Дефектное (50–69)': 'Faulty (50–69)',
  'Слабое (70–79)': 'Poor (70–79)',
  'Приемлемое (80–84)': 'Acceptable (80–84)',
  'Хорошее (85–89)': 'Good (85–89)',
  'Очень хорошее (90–94)': 'Very good (90–94)',
  'Выдающееся (95–100)': 'Outstanding (95–100)',
  'Слишком молодое': 'Too young',
  'Пить можно, но не пик': 'Drinkable, not at peak',
  'Пить сейчас': 'Drink now',
  'Сейчас или в погреб': 'Drink or cellar',
  'На спаде': 'Declining',
  Сильно: 'Strong',
  Достаточно: 'Adequate',
  Слабо: 'Weak',
  'сильно': 'strong',
  'достаточно': 'adequate',
  'слабо': 'weak',
  'Сладкое с ярким фруктовым якорем — не штрафуется.':
    'Sweet with a vivid fruit anchor — not penalised.',
  'Сахар без фруктового якоря — классический дисбаланс.':
    'Sugar without a fruit anchor — a classic imbalance.',
  'Кислота и танины одновременно давят — вино жёсткое.':
    'Acid and tannins push at the same time — the wine is harsh.',
  'Кислота обнажена: фруктового ядра мало.': 'The acid is exposed: too little fruit core.',
  'Простое / моно-фокус': 'Simple / mono-focus',
  Комплексное: 'Complex',

  /* ═══ Чистота / развитие / ножки / перляж ═══ */
  'Прозрачное': 'Clear',
  'Мутноватое': 'Hazy',
  'Светлое': 'Pale',
  'Глубокое': 'Deep',
  'Чистое': 'Clean',
  'С дефектом': 'Unclean',
  'Молодое': 'Youthful',
  'Развивается': 'Developing',
  'Раскрылось': 'Fully developed',
  'Увядшее': 'Tired / past best',
  'Водянистые': 'Watery',
  'Тонкие': 'Thin',
  'Плотные': 'Thick',
  'Деликатный': 'Delicate',
  'Энергичный': 'Vigorous',
  'Без пороков: пробка, оксидация и летучесть не определяются':
    'No faults: cork, oxidation and volatility not detected',
  'Обнаружен дефект — отметьте его тип и выраженность ниже':
    'A fault detected — mark its type and intensity below',
  'Едва уловимо — вино «заперто» или устало': 'Barely perceptible — the wine is “locked” or tired',
  'Слабый, но ясный сигнал': 'A weak but clear signal',
  'Отчётливо при нормальном подносе к носу': 'Distinct at a normal approach to the nose',
  'Чувствуется на расстоянии ладони': 'Perceptible at a hand’s distance',
  'Господствует в бокале, слышно без усилий': 'Dominates the glass, perceptible without effort',
  'Первичный регистр: фрукты и цветы, возраст не читается':
    'The primary register: fruit and flowers, age is not readable',
  'Ноты выдержки появляются поверх свежего фрукта': 'Ageing notes appear over the fresh fruit',
  'Третичные ноты доминируют — пик формы': 'Tertiary notes dominate — peak form',
  'Фрукт угас: оксидативная усталость': 'The fruit has faded: oxidative fatigue',
  'Хрустальная чистота: без взвеси, мути и плёнки': 'Crystal clarity: no sediment, haze or film',
  'Взвесь или муть: осадок, белковая дымка — проверить состояние':
    'Sediment or haze: dregs, a protein veil — check the condition',
  'Свет проходит свободно: бледное ядро, водянистая кайма':
    'Light passes freely: a pale core, a watery rim',
  'Умеренная плотность цвета — средняя насыщенность': 'Moderate colour density — medium saturation',
  'Ядро почти непрозрачно, свет не проходит (тёмные сорта)':
    'The core is almost opaque, light does not pass (dark varieties)',
  'Едва заметная игра пузырьков у стенок бокала': 'Barely noticeable bubble play at the glass walls',
  'Устойчивый поток средней силы': 'A steady medium-strength stream',
  'Энергичный, мускулистый поток с цепочками': 'An energetic, muscular stream with chains',

  /* ═══ Cues: кислотность / танины / тело / алкоголь / финиш / сладость ═══ */
  'Плоская, ленивая сочность (как тёплая вода)': 'Flat, lazy juiciness (like warm water)',
  'Сдержанная сочность (спелый персик / дыня)': 'Restrained juiciness (a ripe peach / melon)',
  'Освежающий баланс (зелёное яблоко)': 'A refreshing balance (a green apple)',
  'Яркий нерв, покалывание боковых зон языка (грейпфрут)':
    'A vivid nerve, tingling in the side zones of the tongue (grapefruit)',
  'Пронзительная атака, челюсти сводит слюной (долька лимона)':
    'A piercing attack, the jaws clench with saliva (a lemon wedge)',
  'Десны гладкие, вяжущий эффект почти отсутствует': 'The gums are smooth, almost no astringent effect',
  'Тончайшее напыление, быстро смывается слюной (Пино Нуар)':
    'The finest dusting, quickly rinsed away by saliva (Pinot Noir)',
  'Умеренная вязкость, язык ощущает бархат (Мерло)': 'Moderate viscosity, the tongue feels velvet (Merlot)',
  'Плотный захват, сухость на деснах держится 5–8 секунд (Каберне)':
    'A dense grip, gum dryness lasting 5–8 seconds (Cabernet)',
  'Губы прилипают к зубам, полная полифенольная стяжка (Неббиоло)':
    'The lips stick to the teeth, a full polyphenol striction (Nebbiolo)',
  'Лёгкая, летящая текстура (вода / обезжиренное молоко)': 'A light, flying texture (water / skimmed milk)',
  'Подвижная ягодная сочность без вязкости': 'Lively berry juiciness without viscosity',
  'Классический объём и вес на нёбе (молоко 3,2%)': 'The classic volume and weight on the palate (3.2% milk)',
  'Густой экстракт, медленно перекатывается во рту': 'A dense extract, slowly rolling in the mouth',
  'Сливочная, обволакивающая плотность (сливки 20%)': 'A creamy, enveloping density (20% cream)',
  '< 11% · Невесомый, прохладный глоток без спиртового тепла':
    '< 11% · A weightless, cool sip without alcoholic warmth',
  '11–13,9% · Мягкое гармоничное тепло в груди без жжения':
    '11–13.9% · A soft, harmonious warmth in the chest without burning',
  '14%+ · Горячая волна в горле и пищеводе, плотный спиртовой вес':
    '14%+ · A hot wave in the throat and oesophagus, a dense alcoholic weight',
  '< 4 сек · Вкус гаснет практически сразу после глотка': '< 4 s · The taste dies almost immediately after the sip',
  '4–6 сек · Быстрое угасание основных нот': '4–6 s · A quick fade of the main notes',
  '7–10 сек · Уверенное классическое послевкусие': '7–10 s · A confident classic finish',
  '11–15 сек · Долгий сочный шлейф': '11–15 s · A long juicy trail',
  '16+ сек · Монументальный финал, звучащий дольше полуминуты':
    '16+ s · A monumental finale sounding for over half a minute',
  '< 4 г/л · Сахар не ощущается рецепторами вовсе, полная сухость':
    '< 4 g/l · Sugar is not felt by the receptors at all, complete dryness',
  '4–12 г/л · Едва уловимая фруктовая округлость на кончике языка':
    '4–12 g/l · A barely perceptible fruity roundness on the tongue tip',
  '12–45 г/л · Выраженный десертный тон, сочность доминирует':
    '12–45 g/l · A pronounced dessert tone, juiciness dominates',
  '45+ г/л · Густая медовая ликёрность (Сотерн, Токай, Айсвайн)':
    '45+ g/l · A thick honeyed liqueur richness (Sauternes, Tokaji, Eiswein)',
  'Финал сочный, слюнотечение — кислотный хвост': 'A juicy finale, salivation — an acid tail',
  'Сухой структурный финал: десны помнят каркас': 'A dry structural finale: the gums remember the frame',
  'Спелая фруктовая волна уходит последней': 'The ripe fruit wave leaves last',
  'Пряный тостовый след: ваниль, гвоздика': 'A spicy toast trail: vanilla, clove',
  'Солоноватый / кремниевый холодок на языке': 'A saline / siliceous coolness on the tongue',

  /* ═══ Цвета ядра/каймы + подсказки ═══ */
  'Лимонно-зелёное': 'Lemon-green',
  'Лимонное': 'Lemon',
  'Золотое': 'Gold',
  'Янтарное': 'Amber',
  'Коричневое': 'Brown',
  'Розовое': 'Pink',
  'Лососевое': 'Salmon',
  'Апельсиновое': 'Orange',
  'Пурпурное': 'Purple',
  'Рубиновое': 'Ruby',
  'Гранатовое': 'Garnet',
  'Рыжеватое (Tawny)': 'Tawny',
  'Золотистое': 'Golden',
  'Кирпичное (Tawny)': 'Brick (Tawny)',
  'Молодое, насыщенное антоцианами': 'Young, saturated with anthocyanins',
  'Классический здоровый цвет': 'The classic healthy colour',
  'Начало развития': 'The beginning of development',
  'Выдержанное, оксидативное': 'Aged, oxidative',
  'Старое вино на спаде': 'An old wine on the decline',
  'Пурпурно-розовая': 'Purple-pink',
  'Рубиновая': 'Ruby',
  'Гранатовая': 'Garnet',
  'Кирпичная / Рыжая': 'Brick / Tawny',
  'Водянистая': 'Watery',
  'Яркий маркер молодости': 'A vivid marker of youth',
  'Сохраняет свежесть, без эволюции': 'Keeps its freshness, no evolution',
  'Начало развития у края': 'The beginning of development at the edge',
  'Возрастной ободок, третичные тона': 'An age rim, tertiary tones',
  'Широкая бесцветная кромка: возраст или высокий алкоголь':
    'A wide colourless edge: age or high alcohol',
  'Очень молодое, прохладный климат': 'Very young, a cool climate',
  'Стандарт молодого белого': 'The standard of a young white',
  'Выдержка в дубе или спелость': 'Oak ageing or ripeness',
  'Окисление или поздний сбор': 'Oxidation or a late harvest',
  'Увядшее / оксидативное': 'Tired / oxidative',
  'Зеленоватая': 'Greenish',
  'Стальная / Водянистая': 'Steel / Watery',
  'Лимонная': 'Lemon',
  'Золотистая': 'Golden',
  'Хрустящая свежесть': 'Crunchy freshness',
  'Бледный прозрачный край': 'A pale transparent edge',
  'Однородный молодой тон': 'A uniform young tone',
  'Тёплая кайма: дуб или возраст': 'A warm rim: oak or age',
  'Нежно-розовое': 'Pale pink',
  'Медно-розовое': 'Copper-pink',
  'Светло-розовая': 'Light pink',
  'Лососевая': 'Salmon',
  'Луковая шелуха': 'Onion skin',
  'Светло-янтарная': 'Light amber',
  'Медная': 'Copper',
  'Чайная / Сухая': 'Tea / Dry',
  'Прямой отжим, стиль Прованса': 'Direct pressing, the Provence style',
  'Классический тёплый розовый': 'The classic warm pink',
  'Мацерация или выдержка': 'Maceration or ageing',
  'Прозрачный диск': 'A transparent disc',
  'Свежий молодой край': 'A fresh young edge',
  'Тёплый однородный край': 'A warm uniform edge',
  'Признак оксидации': 'A sign of oxidation',
  'Короткий скин-контакт': 'Short skin contact',
  'Выраженный скин-контакт': 'Pronounced skin contact',
  'Квеври / амфора': 'Qvevri / amphora',
  'Длительный скин-контакт': 'Long skin contact',
  'Яркий тёплый край': 'A vivid warm edge',
  'Мягкий переход тона': 'A soft transition of tone',
  'Заметная оксидативность': 'A noticeable oxidativeness',
  'Оксидативная кайма': 'An oxidative rim',

  /* ═══ Цвет-основа, характер, фото, режимы ═══ */
  'Белое': 'White',
  'Розе': 'Rosé',
  'Красное': 'Red',
  'Оранжевое': 'Orange',
  'белый виноград или мякоть с минимумом кожи': 'white grapes or pulp with minimal skin contact',
  'короткий контакт с красным виноградом': 'a short contact with red grapes',
  'ферментация на кожице красного винограда': 'fermentation on the skins of red grapes',
  'белый виноград по красной технологии — долгий контакт с кожицей':
    'white grapes by the red method — a long skin contact',
  'игристое': 'sparkling',
  'креплёное': 'fortified',
  'Цвет вина': 'Wine colour',
  Характер: 'Character',
  'Игристое': 'Sparkling',
  'Креплёное': 'Fortified',
  'Игристым бывает любой цвет. Сладость отмечается в разделе «Рот» — шкала по г/л.':
    'Any colour can be sparkling. Sweetness is marked in the “Palate” section — the g/l scale.',
  'Температура подачи (советник):': 'Serving temperature (advisor):',
  'Фотографии · авто-сжатие до 1200px / WebP': 'Photos · auto-compressed to 1200px / WebP',
  'Лицевая этикетка (Аверс)': 'Front label (obverse)',
  'Контрэтикетка (Реверс)': 'Back label (reverse)',
  'Пробка / Капсула': 'Cork / Capsule',
  'Ассоциативное фото / Moodboard': 'Moodboard photo',
  'Фото': 'Photo',
  /* v19: «WSET» вместо «Экзамен WSET L3» — быстрый проход по вину. */
  'Экзамен WSET L3': 'WSET',
  'Сомелье Pro': 'Sommelier Pro',

  /* ═══ v19 · «Витрина»: экспорт, визитки, тиснение ═══ */
  'Тема визитки': 'Card theme',
  'тиснение «П4» ставится на визитку само': 'the “P4” blind emboss lands on the card automatically',
  'Лист A4 «Витрина»: одна центральная ось — визитка в выбранной теме с тихим тиснением, мета и секции SAT по центру. Фотографии и ассоциативный ряд живут на второй странице и печатаются, только если заполнены. «Сохранить как PDF» — на любом устройстве, включая iOS и Android.':
    'An A4 “Showcase” sheet: one central axis — the card in your chosen theme with a quiet blind emboss, meta and SAT sections centred. Photos and the associative row live on page two and print only when filled. “Save as PDF” works on any device, including iOS and Android.',
  'Самодостаточный файл в той же дизайн-системе: визитка с тиснением, секции по центральной оси, вторая страница для фото и ассоциаций. Открывается офлайн и печатается в тот же лист A4.':
    'A self-contained file in the same design system: the embossed card, sections on the central axis, a second page for photos and associations. Opens offline and prints to the same A4 sheet.',
  'страница 2': 'page 2',
  'ассоциации и фотографии': 'associations & photos',
  'Ассоциативный ряд': 'Associative row',
  'паспорт вина': 'wine passport',
  'собрано': 'assembled',
  'в погреб': 'into the cellar',
  'дегустировано': 'tasted',
  'алкоголь': 'alcohol',
  'Слоновая кость': 'Ivory',
  'Бургундия': 'Burgundy',
  'Терруар': 'Terroir',

  /* ═══ v19 · «Бланк к сдаче» (WSET) ═══ */
  'Бланк к сдаче': 'Submission sheet',
  'Чек-лист SAT-полей — быстрый проход перед сдачей': 'A checklist of SAT fields — a quick pass before submitting',
  'готов к сдаче': 'ready to submit',
  'Итог · BLIC': 'Conclusion · BLIC',
  'Все SAT-поля заполнены — бланк можно сдавать.': 'All SAT fields are filled — the sheet is ready to submit.',
  'Заполните отмеченные поля в разделах — бланк дособерётся сам.':
    'Fill in the marked fields across the sections — the sheet will complete itself.',

  /* ═══ Пороки ═══ */
  'TCA (пробка, сырой картон)': 'TCA (cork, wet cardboard)',
  'мокрый картон, плесень': 'wet cardboard, mould',
  'Сероводород / Редукция': 'Hydrogen sulphide / Reduction',
  'тухлые яйца, стоки, тихая сера': 'rotten eggs, drains, struck match',
  'Окисление': 'Oxidation',
  'битое яблоко, уксусный альдегид': 'bruised apple, acetaldehyde',
  'Летучая кислотность (VA)': 'Volatile acidity (VA)',
  'лак, ацетон, уксус': 'nail polish, acetone, vinegar',
  'Бретт': 'Brett',
  'конюшня, пластырь, навоз': 'stable, band-aid, manure',
  'Избыток серы (SO₂)': 'Excess sulphur (SO₂)',
  'жжёные спички, серная дымка': 'burnt matches, a sulphur haze',
  'Жжёная резина': 'Burnt rubber',
  'автопокрышки, жжёная резина': 'car tyres, burnt rubber',
  'Легко': 'Light',
  'Отчётливо': 'Distinct',

  /* ═══ Дескрипторы: группа + ароматы ═══ */
  'Цитрусовые': 'Citrus',
  Лимон: 'Lemon',
  Лайм: 'Lime',
  'Грейпфрут': 'Grapefruit',
  'Апельсиновая цедра': 'Orange zest',
  'Мандарин / Клементин': 'Tangerine / Clementine',
  'Зелёные плоды': 'Green fruits',
  'Зелёное яблоко': 'Green apple',
  'Красное яблоко': 'Red apple',
  'Крыжовник': 'Gooseberry',
  'Груша': 'Pear',
  'Айва': 'Quince',
  'Косточковые': 'Stone fruits',
  'Абрикос': 'Apricot',
  'Персик': 'Peach',
  'Белый персик': 'White peach',
  'Нектарин': 'Nectarine',
  'Тропические': 'Tropical',
  Банан: 'Banana',
  'Личи': 'Lychee',
  'Манго': 'Mango',
  'Дыня': 'Melon',
  'Маракуйя': 'Passion fruit',
  'Ананас': 'Pineapple',
  'Красные ягоды': 'Red berries',
  'Красная смородина': 'Redcurrant',
  'Клюква': 'Cranberry',
  'Малина': 'Raspberry',
  'Клубника': 'Strawberry',
  'Земляника': 'Wild strawberry',
  'Красная вишня': 'Red cherry',
  'Красная слива': 'Red plum',
  'Чёрные ягоды': 'Black berries',
  'Чёрная смородина': 'Blackcurrant',
  'Ежевика': 'Blackberry',
  'Черника / Голубика': 'Blueberry',
  'Черешня': 'Black cherry',
  'Черносливная слива': 'Black plum',
  'Приготовленные / Вяленые плоды': 'Cooked / Dried fruit',
  'Инжир': 'Fig',
  'Чернослив': 'Prune',
  'Изюм': 'Raisin',
  'Финики': 'Dates',
  'Ягодный джем / Варенье': 'Berry jam / Preserve',
  'Печёное яблоко': 'Baked apple',
  'Цветочные': 'Floral',
  'Белые и нежные цветы': 'White & delicate flowers',
  'Акация': 'Acacia',
  'Жимолость': 'Honeysuckle',
  'Ромашка': 'Chamomile',
  'Бузина': 'Elderflower',
  'Цвет яблони': 'Apple blossom',
  'Жасмин': 'Jasmine',
  'Липовый цвет': 'Linden blossom',
  'Парфюмированные и яркие': 'Perfumed & vivid',
  'Роза': 'Rose',
  'Фиалка': 'Violet',
  'Пион': 'Peony',
  'Лаванда': 'Lavender',
  'Герань': 'Geranium',
  'Свежая зелень': 'Fresh green',
  'Зелёный болгарский перец': 'Green bell pepper',
  'Скошенная трава': 'Cut grass',
  'Лист смородины': 'Blackcurrant leaf',
  'Лист томата': 'Tomato leaf',
  'Спаржа': 'Asparagus',
  'Зелёный горошек': 'Green pea',
  'Пряные и лекарственные травы': 'Herbal & medicinal',
  'Эвкалипт': 'Eucalyptus',
  'Мята': 'Mint',
  'Фенхель': 'Fennel',
  'Лемонграсс': 'Lemongrass',
  'Шалфей': 'Sage',
  'Тимьян': 'Thyme',
  'Розмарин': 'Rosemary',
  'Укроп': 'Dill',
  'Сухое сено': 'Dry hay',
  'Пряности': 'Aromatic spices',
  'Чёрный перец': 'Black pepper',
  'Белый перец': 'White pepper',
  'Корица': 'Cinnamon',
  'Гвоздика': 'Clove',
  'Имбирь': 'Ginger',
  'Мускатный орех': 'Nutmeg',
  'Лакрица': 'Liquorice',
  'Можжевельник': 'Juniper',
  'Дубовая бочка': 'Oak barrel',
  'Ваниль': 'Vanilla',
  'Кедр': 'Cedar',
  'Кокос': 'Coconut',
  'Сандал': 'Sandalwood',
  'Древесная смола': 'Wood resin',
  'Обжарка и дым': 'Toast & smoke',
  'Тост / Гренки': 'Toast',
  'Дым': 'Smoke',
  'Обожжённое дерево': 'Charred wood',
  'Кофе': 'Coffee',
  'Шоколад / Какао': 'Chocolate / Cocoa',
  'Дрожжевой осадок (Шампанизация / Сюр Ли)': 'Lees (Méthode traditionnelle / Sur lie)',
  'Бриошь': 'Brioche',
  'Печенье': 'Biscuit',
  'Свежее тесто': 'Raw dough',
  'Дрожжи': 'Yeast',
  'Яблочно-молочное брожение (МЛО)': 'Malolactic fermentation (MLF)',
  'Сливочное масло': 'Butter',
  'Сливки': 'Cream',
  'Йогурт': 'Yogurt',
  'Сырная корка': 'Cheese rind',
  'Камень и порода': 'Stone & rock',
  'Оружейный кремень': 'Gunflint',
  'Мокрый камень': 'Wet stone',
  'Сланец': 'Slate',
  'Мел / Известняк': 'Chalk / Limestone',
  'Графит / Грифель': 'Graphite / Pencil lead',
  'Морские тона': 'Marine tones',
  'Морская соль': 'Sea salt',
  'Йод': 'Iodine',
  'Устричная раковина': 'Oyster shell',
  'Водоросли': 'Seaweed',
  'Земля и лес': 'Earth & forest',
  'Лесная подстилка': 'Forest floor',
  'Грибы': 'Mushrooms',
  'Трюфель': 'Truffle',
  'Влажная земля': 'Damp earth',
  'Орехи, мёд и оксидация': 'Nuts, honey & oxidation',
  'Миндаль': 'Almond',
  'Фундук': 'Hazelnut',
  'Грецкий орех': 'Walnut',
  'Мёд': 'Honey',
  'Карамель / Ирис': 'Caramel / Toffee',
  'Пчелиный воск': 'Beeswax',
  'Табак, кожа и дичь': 'Tobacco, leather & game',
  'Табачный лист': 'Tobacco leaf',
  'Сигарная коробка': 'Cigar box',
  'Старая кожа': 'Old leather',
  'Дичь / Мясо': 'Game / Meat',
  'Чайный лист': 'Tea leaf',
  'Петроль / TDN (Рислинг)': 'Petrol / TDN (Riesling)',
  'Химические тона и дефекты': 'Chemical tones & faults',

  /* ═══ Подсказки групп колеса ═══ */
  'свежесть цитруса': 'citrus freshness',
  'садовая свежесть': 'orchard freshness',
  'мягкий пух косточки': 'soft stone-fruit fuzz',
  'сочная экзотика': 'juicy exotics',
  'яркая ягодность': 'bright berry character',
  'густая тёмная ягода': 'dense dark berry',
  'уваренность, компот': 'cooked, compote',
  'лепестки и нектар': 'petals & nectar',
  'парфюм и пыльца': 'perfume & pollen',
  'колючая зелень': 'prickly green',
  'аптечный луг': 'an apothecary meadow',
  'тепло и острота': 'warmth & pungency',
  'ваниль, тост, дым': 'vanilla, toast, smoke',
  'жареные тона дуба': 'roasted oak tones',
  'хлеб и автолиз': 'bread & autolysis',
  'кремовость МЛО': 'MLF creaminess',
  'пыль камня': 'stone dust',
  'йод и солёный бриз': 'iodine & a salty breeze',
  'подстилка и трюфель': 'forest floor & truffle',
  'орех, оксидативность': 'nuts, oxidation',
  'кожа, время, сафьян': 'leather, time, morocco',
  'настороженность и диагноз': 'vigilance & diagnosis',

  /* ═══ Минеральные ключи текста ═══ */
  'кремень': 'flint',
  'сланец': 'slate',
  'графит': 'graphite',
  'йод': 'iodine',
  'морская соль': 'sea salt',
  'мел': 'chalk',
  'порох': 'gunpowder',
  'петроль/TDN': 'petrol/TDN',
  'минеральность': 'minerality',

  /* ═══ BLIC ═══ */
  Длина: 'Length',
  Сложность: 'Complexity',
  'BLIC · Balance. Гармония сладости ↔ фруктов ↔ кислотности ↔ танинов. Сладость с ярким фруктовым ядром не штрафуется; сахар без якоря — дисбаланс.':
    'BLIC · Balance. The harmony of sweetness ↔ fruit ↔ acidity ↔ tannins. Sweetness with a vivid fruit core is not penalised; sugar without an anchor — an imbalance.',
  'BLIC · Length (каудалии). 8+ секунд послевкусия — признак класса. Оценивается качество и стойкость финального аккорда.':
    'BLIC · Length (caudalies). 8+ seconds of finish — a mark of class. The quality and persistence of the final chord are judged.',
  'BLIC · Intensity. Сила аромата и вкуса. «Слабая интенсивность» при 9+ отмеченных дескрипторах — логическая дыра.':
    'BLIC · Intensity. The power of aroma and flavour. “Low intensity” with 9+ descriptors marked is a logical hole.',
  'BLIC · Complexity. Число семей: праймари → секондари → терциари. Считается автоматически по семействам колеса ароматов.':
    'BLIC · Complexity. The family count: primary → secondary → tertiary. Computed automatically from the aroma wheel families.',
  'Автоподсчёт по семействам: ': 'Auto-count by families: ',

  /* ═══ Пресеты ═══ */
  'Пресеты стилей': 'Style presets',
  'Пресеты': 'Presets',
  'Типовая карточка известного стиля: паспорт, цвет, ароматы и структура заполняются в один тап. Дальше просто правьте значения под ваше вино.':
    'A typical card of a known style: identity, colour, aromas and structure filled in one tap. Then simply adjust the values to your wine.',
  'Брют Шампань': 'Brut Champagne',
  'Три года на осадке: бриошь, зелёное яблоко, высокая кислотность, мелкий перляж.':
    'Three years on lees: brioche, green apple, high acidity, fine perlage.',
  'Шампань': 'Champagne',
  'Франция': 'France',
  'Пино Нуар, Шардоне, Менье': 'Pinot Noir, Chardonnay, Meunier',
  'Молодой Совиньон Блан': 'Young Sauvignon Blanc',
  'Ароматная машинальность: скошенная трава, грейпфрут, бузина, пронзительная кислота.':
    'Aromatic exuberance: cut grass, grapefruit, elderflower, piercing acidity.',
  'Мальборо': 'Marlborough',
  'Новая Зеландия': 'New Zealand',
  'Совиньон Блан': 'Sauvignon Blanc',
  'Дубовое Шардоне': 'Oaked Chardonnay',
  'Бочка + МЛО: ваниль, сливки, персик, округлый купол кислотности и полнотелое тело.':
    'Barrel + MLF: vanilla, cream, peach, a rounded acidity dome and a full body.',
  'Кот-де-Бон': 'Côte de Beaune',
  'Шардоне': 'Chardonnay',
  'Розе Прованса': 'Provence Rosé',
  'Бледный лосось, клубника и цитрус, деликатная горчинка в финале.':
    'Pale salmon, strawberry and citrus, a delicate bitterness in the finish.',
  'Прованс': 'Provence',
  'Гренаш, Сенсо': 'Grenache, Cinsault',
  'Молодое красное (Божоле)': 'Young red (Beaujolais)',
  'Карбоническая мацерация: вишня, банан, фиалка, низкие танины, лёгкое тело.':
    'Carbonic maceration: cherry, banana, violet, low tannins, a light body.',
  'Божоле': 'Beaujolais',
  'Гамэ': 'Gamay',
  'Выдержанное Бордо': 'Aged Bordeaux',
  'Каберне-структура: чёрная смородина, кедр, табак, высокие танины и долгий финиш.':
    'Cabernet structure: blackcurrant, cedar, tobacco, high tannins and a long finish.',
  'Левый берег': 'Left Bank',
  'Каберне Совиньон, Мерло': 'Cabernet Sauvignon, Merlot',
  'Бароло (Неббиоло)': 'Barolo (Nebbiolo)',
  'Вишня, роза, смола и кожа; «кисло-танинный хребет» и кирпичная кайма.':
    'Cherry, rose, tar and leather; an acid–tannin spine and a brick rim.',
  'Пьемонт': 'Piedmont',
  'Италия': 'Italy',
  'Неббиоло': 'Nebbiolo',
  'Тони Портвейн': 'Tawny Port',
  'Креплёное окисленное: орехи, карамель, чернослив, высокий алкоголь, сладость с якорем из фрукта.':
    'Oxidative fortified: nuts, caramel, prune, high alcohol, sweetness anchored by fruit.',
  'Дору': 'Douro',
  'Португалия': 'Portugal',
  'Турига Насьональ и др.': 'Touriga Nacional & others',

  /* ═══ Титул: поля и плейсхолдеры ═══ */
  'Название вина': 'Wine name',
  'Производитель': 'Producer',
  'Винтаж': 'Vintage',
  '2021 или NV': '2021 or NV',
  'Сортовой состав': 'Grape varieties',
  'Рислинг 100%': 'Riesling 100%',
  Регион: 'Region',
  'Мозель': 'Mosel',
  Страна: 'Country',
  'Германия': 'Germany',
  'ABV, % об.': 'ABV, % vol.',
  'Цена': 'Price',
  'Дата дегустации': 'Tasting date',
  'Сомелье': 'Sommelier',
  'Ваше имя': 'Your name',
  '2 400 ₽': '₽ 2,400',

  /* ═══ Ассоциации ═══ */
  'устрицы': 'oysters',
  'белое мясо': 'white meat',
  'большая рыба': 'large fish',
  'ягнёнок': 'lamb',
  'утка': 'duck',
  'трюфельная паста': 'truffle pasta',
  'сыры с голубой плесенью': 'blue cheeses',
  'дичь': 'game',
  'суши': 'sushi',
  'паэлья': 'paella',
  'ризотто с белыми грибами': 'porcini risotto',
  'бри': 'brie',
  'Эмодзи-теги': 'Emoji tags',
  'Гастрономические пары': 'Food pairings',
  'Ассоциативный образ': 'Associative image',
  'Своя пара: каре ягнёнка в травах…': 'Own pairing: herb-crusted rack of lamb…',
  'Свободные заметки': 'Free notes',
  'Всё, что не влезло в шкалы: контекст, компания, погода, минеральные акценты…':
    'Everything that didn’t fit the scales: context, company, weather, mineral accents…',
  'Вечерний пляж после грозы: мокрые камни, соль на губах, лимонная цедра на ветру…':
    'An evening beach after a storm: wet stones, salt on the lips, lemon zest in the wind…',
  'Закат, блюдо, атмосфера — тот же пайплайн сжатия: 1200px / WebP q0.75.':
    'A sunset, a dish, an atmosphere — the same compression pipeline: 1200px / WebP q0.75.',
  'Moodboard, образ, гастрономия, свободные заметки': 'Moodboard, image, pairings, free notes',

  /* ═══ Дайджест (экспорты) ═══ */
  'Дегустация без названия': 'Untitled tasting',
  'Режим': 'Mode',
  'Сорта': 'Grapes',
  'Температура подачи (советник)': 'Serving temperature (advisor)',
  'Цвет': 'Colour',
  'Диск (ядро/кайма)': 'Disc (core/rim)',
  'Кайма (ширина)': 'Rim (width)',
  'нет': 'none',
  'узкая': 'narrow',
  'средняя': 'medium',
  'широкая': 'wide',
  'водянистые': 'watery',
  'тонкие': 'thin',
  'плотные': 'thick',
  'Перляж': 'Perlage',
  'деликатный': 'delicate',
  'энергичный': 'vigorous',
  'мелкие пузырьки': 'fine bubbles',
  'средние пузырьки': 'medium bubbles',
  'крупные пузырьки': 'coarse bubbles',
  'сливочный мусс': 'creamy mousse',
  'лёгкий мусс': 'light mousse',
  'агрессивный мусс': 'aggressive mousse',
  'Заметки': 'Notes',
  'Чистота': 'Condition',
  'Дефекты': 'Faults',
  'Ароматы': 'Aromas',
  'Фруктовость (сенсорная сила P_F)': 'Fruit (P_F sensory power)',
  'Минеральность (сенсорная сила P_F)': 'Minerality (P_F sensory power)',
  'Сложность (энтропия Шеннона)': 'Complexity (Shannon entropy)',
  'Форма кислотности': 'Acidity shape',
  'Кислотность': 'Acidity',
  'Танины': 'Tannins',
  'Алкоголь': 'Alcohol',
  'Интенсивность вкуса': 'Flavour intensity',
  'Послевкусие': 'Finish',
  'Акцент финиша': 'Finish accent',
  'Комментарий к балансу': 'Balance comment',
  'Вердикт качества': 'Quality verdict',
  'Готовность': 'Readiness',
  'Окно питья': 'Drinking window',
  '100-балльная шкала': '100-point scale',
  'Образ': 'Image',
  'Эмодзи': 'Emoji',
  'Гастрономия': 'Pairings',
  'Визуальный паспорт': 'Visual passport',
  'Нос': 'Nose',
  'Рот': 'Palate',
  'Итог': 'Conclusion',
  'Ассоциации': 'Associations',
  'Итог и вердикт (BLIC)': 'Conclusion & verdict (BLIC)',
  'Фотографии': 'Photos',
  'Полная заметка (TXT)': 'Full note (TXT)',
  'дегустационная карта': 'tasting sheet',

  /* ═══ Сенсорная лента (v15) — замена радара в сводке/печати/экспорте ═══ */
  'не оценивалось': 'not assessed',
  'н/о': 'n/a',
  'Лента заполнится, когда будут оценены оси — заполните разделы «Нос» и «Рот».':
    'The bars fill in once the axes are scored — fill in the “Nose” and “Palate” sections.',
  /* Согласованные градации ленты (низкие танины, высокое тело…) */
  низкие: 'low',
  высокие: 'high',
  низкое: 'low',
  среднее: 'medium',
  высокое: 'high',

  /* ═══ Панель ленты + «Полнота профиля» (v16, вариант E «Комбо») ═══ */
  'Сенсорная лента': 'Sensory tape',
  осей: 'axes',
  'Полнота профиля': 'Profile completeness',
  'оценено': 'assessed',
  'пунктир — не оценено': 'dashed — not assessed',
  'Все шесть осей оценены': 'All six axes assessed',
  'шкала во «Рте»': 'scale in “Palate”',
  'шкала «Кислотность» во «Рте»': '“Acidity” scale in “Palate”',
  'шкала «Танины» во «Рте»': '“Tannins” scale in “Palate”',
  'шкала «Тело» во «Рте»': '“Body” scale in “Palate”',
  'фруктовые дескрипторы на колесе «Носа»': 'fruit descriptors on the “Nose” wheel',
  'минеральные дескрипторы на колесе «Носа»': 'mineral descriptors on the “Nose” wheel',
  'шкала «Сладость» во «Рте»': '“Sweetness” scale in “Palate”',

  /* ═══ Кольцо баланса (v17) — замена ленты на экране «Сводки» ═══ */
  'Кольцо баланса': 'Balance ring',
  'Сильнейшие оси — сверху, прорези — внизу: ноль или н/о':
    'Strongest axes on top, slots at the bottom: a true zero or n/a',
  'Кольцо заполнится, когда будут оценены оси — заполните разделы «Нос» и «Рот».':
    'The ring fills in once the axes are scored — fill in the “Nose” and “Palate” sections.',

  /* ═══ Спиртомер (v17) — калибр из ABV, шкала интеграции, кат ощущений ═══ */
  'калибр из ABV Титула': 'strength from the card’s ABV',
  'ABV не указан — калибр вручную': 'no ABV — pick the strength manually',
  '% об. · из Титула': '% vol · from the card',
  'авто по ABV': 'auto from ABV',
  'Ощущения спирта': 'Spirit sensations',
  'необязательно': 'optional',
  'Согревает': 'Warms',

  /* ═══ Динамический радар (v14, легаси — строки ещё могут встретиться в старых экспортах) ═══ */
  'Не оценивалось (вне паутины):': 'Not assessed (outside the web):',
  'Не оценивалось:': 'Not assessed:',
  'Паутина построится, когда будут оценены хотя бы три оси — заполните разделы «Нос» и «Рот».':
    'The spider web builds once at least three axes are assessed — fill in the “Nose” and “Palate” sections.',
  'Оценены:': 'Assessed:',
  'пока ничего': 'nothing yet',
  'Оценено меньше трёх осей': 'Fewer than three axes assessed',
  'паутина построится по мере заполнения разделов': 'the web builds as the sections are filled in',
  /* 'Кислотность'/'Танины'/'Тело'/'Фруктовость'/'Минеральность'/'Сладость'
     уже переведены выше — короткие подписи осей переиспользуют их. */

  /* ═══ Тепло и интеграция алкоголя (v14) ═══ */
  'Тепло и интеграция': 'Warmth & integration',
  'субъективное восприятие · калибр уже в ABV': 'subjective perception · the ABV already fixes the strength',
  'Восприятие алкоголя': 'Alcohol perception',
  'Спрятан': 'Hidden',
  'Вплетён': 'Woven in',
  'Гармоничен': 'Harmonious',
  'Выпирает': 'Protruding',
  'Жгучий': 'Burning',
  'Спирта не слышно: плотность и фрукт держат его в узде.':
    'No alcohol at all: density and fruit keep it on a short leash.',
  'Тёплый фон поддерживает тело и не выходит на первый план.':
    'A warm backdrop supports the body without taking centre stage.',
  'Тепло ощущается, но уравновешено фруктом и кислотой.':
    'The warmth is perceptible yet balanced by fruit and acidity.',
  'Спиртовая волна вылезает над фруктом и тянется в финиш.':
    'A spirit wave pokes above the fruit and stretches into the finish.',
  'Жжёт нёбо и горло: горячий хвост глушит вкус.':
    'It burns the palate and throat: a hot tail muffles the flavour.',
  'Как спирт ведёт себя в бокале: спрятан в плоде или вылезает горячей волной?':
    'How does the spirit behave in the glass: hidden inside the fruit, or poking out in a hot wave?',
  'Согревает в груди': 'Warms the chest',
  'Жжёт в финале': 'Burns in the finish',
  'Жгучие ноздри (ретро-нос)': 'Burning nostrils (retronasal)',
  'Подогревает фрукт': 'Warms up the fruit',
  'Маскирует кислоту': 'Masks the acidity',
  'Сушит вкус': 'Dries the palate',
  'Алкоголь выпирает: спиртовая волна перекрывает фрукт.':
    'The alcohol protrudes: a spirit wave overshadows the fruit.',
  'Спирт жжёт: горячая волна давит на нёбо и глушит финиш.':
    'The spirit burns: a hot wave presses on the palate and mutes the finish.',
  'Спирт интегрирован: тепло не выпирает над фруктом.':
    'The spirit is integrated: the warmth does not stick out above the fruit.',
  'Спирт жгучий — горячий дисбаланс': 'Burning spirit — a hot imbalance',
  'Алкоголь выпирает над фруктом': 'Alcohol protrudes above the fruit',
  'Жгучий спирт глушит вкус и финиш — классический горячий дисбаланс. Проверьте кислотность/фруктовое ядро, температуру подачи или смягчите ожидания в вердикте.':
    'A burning spirit muffles the flavour and finish — a classic hot imbalance. Check the acidity/fruit core, the serving temperature, or soften the verdict.',
  'Спиртовая волна вылезает над фруктом: у гармоничного вина алкоголь держится внутри вкуса. Проверьте калибровку «Алкоголя» и фруктовость в «Рту».':
    'A spirit wave pokes above the fruit: in a harmonious wine the alcohol stays inside the flavour. Check the “Alcohol” calibration and the fruitiness in the “Palate”.',
  'Такое бывает у горячих урожаев и перегретых подач, но чаще это калибровка: тёплое вино показывает спирт резче. Попробуйте охладить и перепроверить.':
    'This happens with hot vintages and over-warm servings, but it is usually calibration: warm wine shows the spirit more sharply. Try chilling it and re-check.',
  'Густота, экстракт и (часто) сахар держат алкоголь в тени — признак концентрации. Стоит отметить эту интеграцию в заметке.':
    'Density, extract and (often) sugar keep the alcohol in the shade — a sign of concentration. It is worth noting this integration in the note.',

  /* ═══ Экспорт / погреб ═══ */
  'Печать / PDF': 'Print / PDF',
  'Автономный HTML': 'Standalone HTML',
  'Экспорт дегустации': 'Export the tasting',
  'Откроется системный диалог печати с картой A4: «Сохранить как PDF» на любом устройстве (включая iOS и Android). Секции и фотографии защищены от разрыва между страницами, поля и колонтитулы настроены через CSS Paged Media.':
    'The system print dialog opens with an A4 sheet: “Save as PDF” on any device (including iOS and Android). Sections and photos are protected from page breaks; margins and headers are set via CSS Paged Media.',
  'Открыть диалог печати': 'Open the print dialog',
  'Самодостаточный файл: инлайновые стили, векторный радар профиля, диск вина и сжатые фотографии внутри. Открывается офлайн, делится в один клик.':
    'A self-sufficient file: inline styles, a vector profile radar, the wine disc and compressed photos inside. Opens offline, shares in one click.',
  'HTML-отчёт скачан': 'HTML report downloaded',
  'Скачать HTML-отчёт': 'Download the HTML report',
  'Карточка для мессенджера (Markdown)': 'Card for messengers (Markdown)',
  'Markdown-карточка скачана': 'Markdown card downloaded',
  'TXT скачан': 'TXT downloaded',
  'Полный JSON-бэкап всех дегустаций погреба. Восстановление — в «Погребе» (кнопка «Импорт»), с валидацией схемы.':
    'A full JSON backup of all the cellar tastings. Restore it in the “Cellar” (the “Import” button), with schema validation.',
  'Бэкап скачан': 'Backup downloaded',
  'Скачать бэкап погреба': 'Download the cellar backup',
  'Импорт доступен в модалке «Погреб» — файл проверяется на метку приложения и версию схемы до записи в базу.':
    'Import is available in the “Cellar” modal — the file is checked for the app label and schema version before being written to the database.',
  'Погреб дегустаций': 'Tasting cellar',
  'Бэкап всех': 'Back up all',
  'Импорт JSON': 'Import JSON',
  'Новая дегустация': 'New tasting',
  'Новая дегустация начата': 'A new tasting has started',
  'IndexedDB недоступна — включён фолбэк на localStorage (~5 МБ). Данные живут в этом браузере.':
    'IndexedDB is unavailable — the localStorage fallback is enabled (~5 MB). The data lives in this browser.',
  'Погреб пуст. Сохраните первую дегустацию кнопкой «В погреб».':
    'The cellar is empty. Save your first tasting with the “To cellar” button.',
  'Без названия': 'Untitled',
  'черновик': 'draft',
  'фото': 'photos',
  'Открыть': 'Open',
  'Удалить': 'Delete',
  'Дегустация загружена': 'The tasting is loaded',
  'Не удалось прочитать файл: это не корректный JSON': 'Could not read the file: it is not valid JSON',
  'Импортировано записей:': 'Records imported:',

  /* ═══ Общие примитивы / ошибки ═══ */
  'Закрыть': 'Close',
  'Пояснение': 'Explanation',
  'Не удалось обработать фото': 'Failed to process the photo',
  'Сжимаю…': 'Compressing…',
  'неизвестная ошибка': 'unknown error',
  'Анатомия аромата: как работает математика колеса': 'Aroma anatomy: how the wheel’s maths works',
  'Калибровка вкуса: шпаргалка WSET L3': 'Palate calibration: the WSET L3 cheat sheet',
  'Разделы дегустации': 'Tasting sections',
  'Навигация по разделам': 'Section navigation',
  'Радар вкусового профиля': 'Taste profile radar',
  'Диск вина': 'Wine disc',
  'Диск вина: градиент от ядра к кайме': 'Wine disc: a gradient from core to rim',
  'Живой перляж': 'Living perlage',
  'Сохранено в погреб': 'Saved to the cellar',
  'применён — поправьте под ваше вино': 'applied — adjust it to your wine',
  'Canvas недоступен в этом браузере': 'Canvas is unavailable in this browser',
  'Canvas недоступен': 'Canvas unavailable',
  'Формат фото не поддерживается браузером. Сконвертируйте его в JPEG или PNG.':
    'The photo format is not supported by the browser. Convert it to JPEG or PNG.',
  'Не удалось прочитать изображение': 'Failed to read the image',
  'Не удалось закодировать фото': 'Failed to encode the photo',
  'Не удалось прочитать blob': 'Failed to read the blob',
  '[db] localStorage переполнен — данные могут не сохраниться':
    '[db] localStorage overflow — the data may not persist',
  'IndexedDB API отсутствует': 'The IndexedDB API is missing',
  '[db] IndexedDB недоступна (file:// или приватный режим) — включён фолбэк на localStorage (~5 МБ).':
    '[db] IndexedDB is unavailable (file:// or private mode) — the localStorage fallback is enabled (~5 MB).',
  'Файл бэкапа не является корректным JSON-объектом.': 'The backup file is not a valid JSON object.',
  'Это бэкап другого приложения (метка app не совпадает). Импорт отклонён.':
    'This is a backup of another app (the app label doesn’t match). The import is rejected.',
  'В бэкапе отсутствует массив tastings.': 'The backup has no tastings array.',
  'В бэкапе нет ни одной валидной записи.': 'The backup contains no valid records.',
  'IndexedDB недоступна — включён фолбэк на localStorage (~5 МБ).':
    'IndexedDB is unavailable — the localStorage fallback is enabled (~5 MB).',

  /* ═══ Движки: структурный профиль ═══ */
  'Кислотность_axis': 'Acidity',
  Фруктовость: 'Fruit',
  'Минеральность': 'Minerality',
  'Сладость (ощущ.)': 'Perceived sweetness',
  'сахар маскирует': 'sugar masks',
  'форма волны': 'the wave shape',
  'кислота подчёркивает вязкость': 'acidity emphasises the viscosity',
  'сахар сглаживает': 'sugar smooths',
  'сахар': 'sugar',
  'глицерин / ножки': 'glycerol / legs',
  'новый дуб': 'new oak',
  'автолиз / МЛО-плотность': 'autolysis / MLF density',
  'финиш 8+ сек держит ядро': 'an 8+ s finish holds the core',
  'финиш: минеральный': 'a mineral finish',
  'кислота сушит': 'acidity dries',
  'танины сушат': 'tannins dry',
  'Primary Crunch': 'Primary Crunch',
  'Ripe Balance': 'Ripe Balance',
  'Tertiary Depth': 'Tertiary Depth',
  'свежий, хрустящий первичный сок': 'a fresh, crunchy primary juice',
  'сочная, округлая спелость': 'a juicy, rounded ripeness',
  'уваренный, вяленый, ликёрный тон выдержки': 'a cooked, dried, liqueur-like tone of age',

  /* ═══ Движки: советник подачи ═══ */
  'Универсальный бокал среднего объёма': 'A universal all-purpose glass',
  'Декантация не обязательна': 'Decanting is not required',
  'Малый бокал для креплёных (120–150 мл)': 'A small fortified glass (120–150 ml)',
  'Тюльпановый флейта-бокал (сохраняет перляж)': 'A tulip flute (preserves the perlage)',
  'Охладить 3+ часа в холодильнике; не декантировать':
    'Chill for 3+ hours in the fridge; do not decant',
  'Малый десертный бокал': 'A small dessert glass',
  'Бокал для полнотелых белых (Burgundy-профиль)': 'A full-bodied white glass (Burgundy profile)',
  'Возможна короткая аэрация 15–30 минут': 'A short 15–30 minute aeration is possible',
  'Бокал для лёгких белых (суженный кверху)': 'A light white glass (tapered towards the top)',
  'Бокал для розе / лёгких белых': 'A rosé / light white glass',
  'Крупный бокал Bordeaux-профиля (500+ мл)': 'A large Bordeaux-profile glass (500+ ml)',
  'Декантировать 1–2 часа': 'Decant for 1–2 hours',
  'Аэрация 30–60 минут в декантере': 'Aerate for 30–60 minutes in a decanter',
  'Бокал Burgundy-профиля (для ароматных лёгких красных)':
    'A Burgundy-profile glass (for aromatic light reds)',
  'Достаточно 15–20 минут в бокале': '15–20 minutes in the glass is enough',
  'Универсальный бокал для красных': 'A universal red wine glass',
  'Крепость 14%+: подавайте у нижней границы диапазона, чтобы алкоголь не «горел».':
    'ABV 14%+: serve at the bottom of the range so that the alcohol doesn’t “burn”.',
  'Высокий алкоголь: слегка снизьте температуру подачи.':
    'High alcohol: lower the serving temperature slightly.',
  'Вино пока не собрано: если это молодь — дайте время в бутылке, если старое — пейте без ожиданий.':
    'The wine is not yet together: if it is young — give it time in the bottle; if old — drink without expectations.',
  'на спаде — пить сейчас': 'on the decline — drink now',

  /* ═══ Движки: дуга жизни ═══ */
  'идеальная гармония полифенолов, шлейф третичных нот.': 'a perfect harmony of polyphenols, a trail of tertiary notes.',
  'На пике — золотое плато': 'At peak — the golden plateau',
  'На пике': 'At peak',
  'Фаза закрытости (Dumb phase) — спит': 'The dumb phase — asleep',
  'Закрыто': 'Closed',
  'Молодое — набор структуры': 'Young — building structure',
  'Молодое — восходящий потенциал': 'Young — rising potential',
  'На спаде — рекомендуется пить': 'Declining — drink up',
  '🍓 Свежий первичный сок: хрустящие ягоды, кислота без шероховатостей.':
    '🍓 Fresh primary juice: crunchy berries, acidity without rough edges.',
  '⚠️ Фаза закрытости: первичный фрукт уснул, танин обнажён. Не тревожить бутылку.':
    '⚠️ The dumb phase: the primary fruit is asleep, the tannin is exposed. Do not disturb the bottle.',
  '🍂 Спад: затухание фрукта, высыхание танинов, оксидативный скелет.':
    '🍂 The decline: a fading fruit, drying tannins, an oxidative skeleton.',
  'Вино набирает тело, кислота и дуб постепенно притираются.':
    'The wine is gaining body; the acidity and oak are gradually mellowing.',
  'Креплёное плато': 'A fortified plateau',
  'Сладкий долгожитель': 'A sweet immortal',
  'Пить молодым (свежесть)': 'Drink young (freshness)',
  'Великий потенциал (Dumb Phase)': 'Grand potential (Dumb Phase)',
  'Классическая выдержка': 'Classic ageing',

  /* ═══ Движки: гипотеза ═══ */
  'Высокая, вибрирующая, острая атака': 'High, vibrating, a sharp attack',
  'Цитрусы, зелень и минералы при свежем регистре фрукта — слюна побежит сразу.':
    'Citrus, green notes and minerals with a fresh fruit register — the saliva will flow at once.',
  'Сглаженная, купольная, мягкая': 'Smoothed, domed, soft',
  'Вяленый фрукт и джем гасят остриё: ожидаем округлую арку без резкой атаки.':
    'Dried fruit and jam dampen the edge: expect a rounded arch without a sharp attack.',
  'Отметьте дескрипторы на колесе — гипотеза соберётся сама.':
    'Mark descriptors on the wheel — the hypothesis will assemble itself.',
  'Сбалансированная, умеренная': 'Balanced, moderate',
  'Состав букета без явного крена в свежесть или уваренность — ровная кислотность.':
    'A bouquet composition with no explicit tilt to freshness or cookedness — an even acidity.',
  'Плотный, структурный каркас': 'A dense, structural frame',
  'Тёмные ягоды, новый дуб или третичность — ожидаем Medium+ / High и держащий скелет.':
    'Dark berries, new oak or tertiarity — expect Medium+ / High and a holding skeleton.',
  'Шелковистый, низкий или бесшовный': 'Silky, low or seamless',
  'Белое/розе без структурных маркеров — танины почти неощутимы.':
    'A white/rosé without structural markers — the tannins are almost imperceptible.',
  'Лёгкая цветочность — текстура скользкая, без вяжущего скелета.':
    'A light florality — a slippery texture, without an astringent skeleton.',
  'Умеренный, округлый': 'Moderate, rounded',
  'Без явных структурных якорей — ожидаем мягкую подложку без жёсткости.':
    'No explicit structural anchors — expect a soft base without harshness.',
  'Плотное, кремовое, обволакивающее': 'Dense, creamy, enveloping',
  'Дуб, МЛО-тоны или сухофрукты дают вес: экстракт держит середину нёба.':
    'Oak, MLF tones or dried fruit give weight: the extract holds the mid-palate.',
  'Лёгкое, линейное, хрустящее': 'Light, linear, crunchy',
  'Свежий минеральный профиль — тонкая вертикаль без лишней плотности.':
    'A fresh mineral profile — a thin vertical line without extra density.',
  'Пока колесо пусто — гипотезе не на что опереться.':
    'The wheel is empty — the hypothesis has nothing to lean on.',
  'Среднее, аккуратное': 'Medium, neat',
  'Умеренный экстракт: ожидаем точную середину без провалов и напора.':
    'A moderate extract: expect a precise middle without dips or pressure.',

  /* ═══ Движки: детектор аномалий ═══ */
  '«Выдающееся», но послевкусие короче 3 секунд': '“Outstanding”, but the finish is shorter than 3 seconds',
  'По BLIC Outstanding требует длинного финиша. Перемерьте каудалии или смягчите вердикт.':
    'By BLIC, Outstanding requires a long finish. Re-measure the caudalies or soften the verdict.',
  '«Выдающееся» при отмеченном дисбалансе': '“Outstanding” with a marked imbalance',
  'Баланс — первая буква BLIC. Дисбаланс блокирует «Выдающееся»: пересмотрите либо вердикт, либо раздел «Баланс».':
    'Balance is the first letter of BLIC. An imbalance blocks “Outstanding”: reconsider either the verdict or the “Balance” section.',
  'Молодое вино с «возрастным» цветом': 'A young wine with an “ageing” colour',
  'Кирпичные/янтарные тона обычно говорят о развитии. Проверьте цвет или стадию развития.':
    'Brick/amber tones usually speak of development. Check the colour or the development stage.',
  'Статус «Чистое», но дефекты отмечены': 'The status is “Clean”, but faults are marked',
  'Либо снимите дефекты, либо смените статус на «С дефектом».':
    'Either remove the faults or change the status to “Faulty”.',
  '«С дефектом», но конкретный дефект не указан': '“Faulty”, but no specific fault is given',
  'Уточните тип дефекта (TCA, редукция, окисление…) — иначе вердикт Faulty будет неаргументированным.':
    'Specify the fault type (TCA, reduction, oxidation…) — otherwise the Faulty verdict will be unargued.',
  'Возможная терруарная стилистика': 'A possible terroir styling',
  'на 1 • — не обязательно дефект: животные/серные тона в лёгкой степени бывают стилистикой хозяйства. Вердикт качества не блокируется.':
    'at 1 • — not necessarily a fault: animal/sulphur tones at low intensity can be the winery’s style. The quality verdict is not blocked.',
  'В карточке выбран другой уровень. WSET разрешает корректировку по вкусу, но проверьте калибр.':
    'A different level is chosen in the card. WSET allows a correction by taste, but check the calibration.',
  'Игристое без описания перляжа': 'A sparkling wine without a perlage description',
  'Для игристых WSET ждёт наблюдения о пузырьках и муссе.':
    'For sparkling wines WSET expects observations on the bubbles and the mousse.',
  'Минеральные ароматы без подтверждения в финише/заметках':
    'Mineral aromas without confirmation in the finish/notes',
  'Ось «Минеральность» усилится, если отметить минеральный акцент финиша или добавить каменистые тона в заметки.':
    'The “Minerality” axis will strengthen if you mark a mineral finish accent or add stony tones to the notes.',
  'Высокие танины при лёгком теле': 'High tannins with a light body',
  'Бывает (Неббиоло, Блауфренкиш в холодных годах), но чаще это ошибка калибровки. Перепроверьте.':
    'It happens (Nebbiolo, Blaufränkisch in cold years), but more often it is a calibration error. Double-check.',
  '«Молодое» вино, но в букете третичные тона': 'A “Youthful” wine, but tertiary tones in the bouquet',
  'Стадия развития не совпадает с индексом эволюции': 'The development stage doesn’t match the evolution index',
  'низкий': 'low',
  'средний': 'medium',
  'высокий': 'high',

  /* ═══ Шпаргалки / гиды / редкие фрагменты ═══ */
  '▲ Скрыть': '▲ Hide',
  'ℹ︎ Шпаргалка': 'ℹ︎ Cheat sheet',
  '1. Психофизический якорь (P F)': '1. The psychophysical anchor (P F)',
  'Если в вине есть одна вишня на ••• (3 балла), базовое ощущение фрукта уже высокое (7.6/10). Появление табака или кожи <b>не вычитает баллы из фрукта</b>, а добавляет комплексности. Ощущение растёт по Веберу–Фехнеру (логарифм), а не делится по остаточному принципу.':
    'If a wine has a single cherry at ••• (3 points), the basic perception of fruit is already high (7.6/10). The appearance of tobacco or leather <b>does not subtract points from the fruit</b> — it adds complexity. The perception grows according to Weber–Fechner (logarithmic), not by the residual principle.',
  '2. Регистр свежести (Φ fresh)': '2. The freshness register (Φ fresh)',
  'свежие цитрусы, зеленые яблоки и ягоды.': 'fresh citrus, green apples and berries.',
  'инжир, изюм, джем, сушеная слива. Они снимают колючую свежесть и сигнализируют о развитии вина.':
    'figs, raisins, jam, dried plum. They remove the prickly freshness and signal the wine’s development.',
  '3. Энтропия Шеннона (Сложность BLIC)': '3. Shannon entropy (BLIC complexity)',
  'Считает баланс между семействами. Вино с одними фруктами = «Моно-фокус». Вино с Фруктами + Дубом + Кожей + Специями = «Комплексное (полифония)».':
    'It counts the balance between the families. A wine with only fruits = “mono-focus”. A wine with Fruit + Oak + Leather + Spices = “complex (polyphony)”.',
  'Уровень:': 'Level:',
  'Фаза:': 'Phase:',
  'Сочность:': 'Juiciness:',
  'с': 's',
  'Локализация:': 'Localisation:',
  'Закрыть панель': 'Close the panel',
  'Убрать': 'Remove',
  'авто-сжатие до ~100 КБ': 'auto-compressed to ~100 KB',
  'Дегустационная карта': 'Tasting sheet',
  'ВИД': 'APPEARANCE',
  'НОС': 'NOSE',
  'РОТ': 'PALATE',
  'СТРУКТУРНЫЙ ПРОФИЛЬ': 'STRUCTURAL PROFILE',
  'ИТОГ': 'CONCLUSION',
  'Профиль': 'Profile',
  'Вердикт': 'Verdict',
  'Пить': 'Drink',
  'Подача': 'Serving',
  'дегустация': 'a tasting',
  'Структурный профиль (0–10)': 'Structural profile (0–10)',
  'Дегустационный компаньон': 'Tasting Companion',
  'структурный профиль и BLIC рассчитаны автоматически': 'the structural profile and BLIC are computed automatically',
  'Раздел': 'Section',
  'не удалось отобразить': 'could not be rendered',
  'Дегустация прервана ошибкой': 'The tasting was interrupted by an error',
  'Приложение восстановится после перезагрузки. Данные черновика сохранены в погребе — они загрузятся автоматически.':
    'The app will recover after a reload. The draft data is saved in the cellar — it will load automatically.',
  'Перезагрузить приложение': 'Reload the app',
  'Повторить': 'Retry',
  'Перезагрузить': 'Reload',
  'Остальные разделы работают. Попробуйте повторить открытие — если ошибка повторяется, перезагрузите приложение (черновик сохранён).':
    'The other sections are fine. Try opening it again — if the error persists, reload the app (the draft is saved).',
  'Прогноз на ': 'Forecast for ',
  'Сейчас: ': 'Now: ',
  'Оценка сейчас:': 'Score now:',

  /* ═══ v12 релиз: зачистка последних утечек EN ═══ */
  'Кривая эволюции вкуса': 'The taste evolution curve',
  'АССОЦИАЦИИ': 'ASSOCIATIONS',
  Ножки: 'Legs',
  Развитие: 'Development',
  средние: 'medium',
  /* Строчные формы семейств колеса (плейсхолдеры, подписи) */
  фрукты: 'fruit',
  цветы: 'flowers',
  травы: 'herbs',
  специи: 'spices',
  дуб: 'oak',
  ферментация: 'fermentation',
  минералы: 'minerals',
  выдержка: 'ageing',
  пороки: 'faults',
  /* Строчные заголовки гипотезы (тултипы Рта) */
  кислотность: 'acidity',
  танины: 'tannins',
  тело: 'body',
  /* Цвет ядра/каймы */
  'Цвет ядра': 'Core colour',
  'Цвет каймы (обода)': 'Rim colour',
  'Тип вина не выбран — показана полная палитра. Выбери цвет-основу в «Титуле», и списки сожмутся до энологически допустимых.':
    'No wine style selected — the full palette is shown. Pick the base colour in “Identity” and the lists will narrow to the oenologically allowed shades.',
  /* Итог: заголовок BLIC и бейдж WSET */
  'BLIC — четыре опоры': 'BLIC — the four pillars',
  'WSET L3: качество оценивается строго по BLIC без численных очков. 100-балльная шкала доступна только в режиме Сомелье Pro.':
    'WSET L3: quality is assessed strictly via BLIC, with no numerical scores. The 100-point scale is available only in Sommelier Pro mode.',
  /* Осциллограф: пустое состояние */
  'Выберите форму волны — кривая перетечёт в неё. Проведите пальцем по экрану: сканер покажет физиологию каждой секунды глотка.':
    'Pick a wave shape — the curve will morph into it. Swipe your finger across the screen: the scanner will show the physiology of every second of the sip.',
  /* Шпаргалка «Нос»: заголовок модалки — уже в карте (см. строку ~1040) */
  /* v12: дыры слоя данных */
  'Сладкое': 'Sweet',
  'Средние': 'Medium',
  'Фруктовые': 'Fruit',
  'Ржаво-медное': 'Rust-copper',
  'мокрый камень': 'wet stone',
  ядро: 'core',
  кайма: 'rim',
  /* Строчные ярлыки шкал — вклады структурного профиля (движок + экспорты) */
  низкая: 'low',
  'средняя−': 'medium-',
  'средняя+': 'medium+',
  высокая: 'high',
  лёгкое: 'light',
  'среднее−': 'medium-',
  'среднее+': 'medium+',
  полное: 'full',
  сухое: 'dry',
  полусухое: 'off-dry',
  полусладкое: 'medium',
  'молодое': 'youthful',
  'развивается': 'developing',
  'раскрылось': 'fully developed',
  'увядшее': 'tired',
  шелковистые: 'silky',
  меловые: 'chalky',
  бархатистые: 'velvety',
  зернистые: 'grainy',
  хваткие: 'grippy',
  грубые: 'rustic',
  'Классический объем и вес на нёбе (молоко 3,2%)': 'Classic volume and weight on the palate (3.2% milk)',
});
/* ── Параметризованные шаблоны движков: RU-формат → EN-формат ─────────────── */

export type PatternTo = string | ((m: RegExpMatchArray) => string);
export const EN_PATTERNS: ReadonlyArray<[RegExp, PatternTo]> = [
  /* Годы и величины дайджеста */
  [/^(\d{4}) г\.$/, '$1'],
  [/^([\d.]+)% об\.$/, '$1% abv'],
  [/^пик был ≈ (\d{4}) г\.$/, 'the peak was ≈ $1'],
  [/^(\d{4})–(\d{4}) г\.$/, '$1–$2'],
  [/^пить до ≈ (\d{4}) г\. от урожая$/, 'drink by ≈ $1 from the vintage'],
  [/^H=([\d.]+) · (\d+) сем\. — (.+)$/, (m) => `H=${m[1]} · ${m[2]} fam. — ${T(m[3] ?? '')}`],
  [/^(.+?) \(≈(\d+) с\)$/, (m) => `${T(m[1] ?? '')} (≈${m[2]} s)`],

  /* Вклады осей структурного профиля (внутри — каталожные ярлыки) */
  [/^база: (.+)$/, (m) => `base: ${T(m[1] ?? '')}`],
  [/^количество: (.+)$/, (m) => `amount: ${T(m[1] ?? '')}`],
  [/^текстура: (.+)$/, (m) => `texture: ${T(m[1] ?? '')}`],
  [/^алкоголь: (.+)$/, (m) => `alcohol: ${T(m[1] ?? '')}`],
  [/^сахар: (.+)$/, (m) => `sugar: ${T(m[1] ?? '')}`],
  [/^развитие: (.+)$/, (m) => `development: ${T(m[1] ?? '')}`],
  [/^сенсорная сила P_F: якорь (\d+) ур\. \+ разнообразие (\d+) нот( · громкость ([\d.]+))?$/, (m) =>
    `P_F sensory power: an anchor of ${m[1]} lvl + diversity of ${m[2]} notes${m[3] ? ` · loudness ${m[4]}` : ''}`],
  [/^регистр Φ_fresh ([\d.]+): (.+)$/, (m) => `the Φ_fresh register ${m[1]}: ${T(m[2] ?? '')}`],
  [/^сенсорная сила P_F «Минералов»( · громкость ([\d.]+))?$/, (m) =>
    `the P_F sensory power of “Minerals”${m[1] ? ` · loudness ${m[2]}` : ''}`],
  [/^текст: (.+)$/, (m) => `text: ${T(m[1] ?? '')}`],

  /* Детектор аномалий */
  [/^Слабая интенсивность, но отмечено (\d+) ароматов$/, (m) => `Low intensity, but ${m[1]} aroma${m[1] === '1' ? ' is' : 's are'} marked`],
  [/^Отмечено: (.+)\. Либо снимите дефекты, либо смените статус на «С дефектом»\.$/, (m) =>
    `Marked: ${m[1]}. Either remove the faults or change the status to “Faulty”.`],
  [/^Сенсорная сила фруктов P_F ([\d.]+)\/10 \(< 4\) при ощутимой сладости — классический дисбаланс\. Отметьте фруктовые дескрипторы или поднимите «Интенсивность вкуса» в «Рту»\.$/,
    'A fruit sensory power of P_F $1/10 (< 4) with a perceptible sweetness — a classic imbalance. Mark fruit descriptors or raise “Flavour intensity” in the “Palate”.'],
  [/^([A-Z][A-Z, ]+) на 1 • — не обязательно дефект.*$/, (m) =>
    `${m[1]} at 1 • — not necessarily a fault: animal/sulphur tones at low intensity can be the winery’s style. The quality verdict is not blocked.`],
  [/^ABV ([\d.]+)% обычно даёт «(низкий|средний|высокий)» алкоголь$/, (m) =>
    `ABV ${m[1]}% usually indicates “${m[2] === 'низкий' ? 'low' : m[2] === 'средний' ? 'medium' : 'high'}” alcohol`],
  [/^Индекс эволюции (\d+)% при «Молодом»: .+$/, (m) =>
    `An evolution index of ${m[1]}% for “Youthful”: truffle, leather, nuts or oxidation hint at development. Check “Development” or the “Ageing” sector.`],
  [/^Индекс эволюции (\d+)% — .+$/, (m) =>
    `An evolution index of ${m[1]}% — the tertiary notes are barely expressed for the chosen stage. Re-check “Development” or the wheel.`],

  /* Дуга жизни */
  [/^👑 Золотое плато \(Зенит ~(\d+) б\.\): (.+)$/, (m) => `👑 The golden plateau (Zenith ~${m[1]} pts): ${T(m[2] ?? '')}`],
  [/^Дуга применена: (\d+)–(\d+) гг\. \(«(.+)»\)$/, (m) =>
    `The arc is applied: ${m[1]}–${m[2]} (“${T(m[3] ?? '')}”)`],
  [/^ВЫ ЗДЕСЬ \((\d+)\)$/, 'YOU ARE HERE ($1)'],
  [/^Осциллограф кислотности: (.+)$/, (m) => `The acidity oscilloscope: ${T(m[1] ?? '')}`],
  [/^Колесо ароматов: отмечено дескрипторов (\d+)$/, (m) => `The aroma wheel: ${m[1]} descriptor${m[1] === '1' ? '' : 's'} marked`],
  [/^(.+): дескрипторов отмечено (\d+), сила ([\d.]+) из 10$/, (m) =>
    `${T(m[1] ?? '')}: ${m[2]} descriptor${m[2] === '1' ? '' : 's'} marked, a power of ${m[3]} out of 10`],
  [/^(.+): дескрипторов отмечено (\d+)$/, (m) => `${T(m[1] ?? '')}: ${m[2]} descriptor${m[2] === '1' ? '' : 's'} marked`],
  [/^Всего дескрипторов: (\d+)$/, (m) => `Total descriptors: ${m[1]}`],
  [/^Всего дескрипторов: (\d+), доминанты: (.+)$/, (m) => `Total descriptors: ${m[1]}, dominants: ${(m[2] ?? '').split(' · ').map(T).join(' · ')}`],
  [/^уровень (\d+)$/, 'level $1'],
  [/^\+ Свой дескриптор \((.+)\)…$/, (m) => `+ Custom descriptor (${T(m[1] ?? '').toLowerCase()})…`],
  [/^Новый свой дескриптор для семейства (.+)$/, (m) => `A new custom descriptor for the ${T(m[1] ?? '')} family`],
  /* v12: специфичный шаблон — строго ДО общего /^Удалить (.+)$/ */
  [/^Удалить свой дескриптор «(.+)» из библиотеки$/, (m) =>
    `Remove the custom descriptor “${T(m[1] ?? '')}” from the library`],
  [/^Удалить (.+)$/, (m) => `Remove ${T(m[1] ?? '')}`],
  [/^Убрать (.+)$/, 'Remove $1'],
  [/^Пресет «(.+)» применён — поправьте под ваше вино$/, (m) =>
    `The “${T(m[1] ?? '')}” preset is applied — adjust it to your wine`],
  [/^Гипотеза по составу колеса: (.+) до глотка\. Сверьте в разделе «Рот»\.$/, (m) =>
    `A hypothesis from the wheel composition: ${T(m[1] ?? '')} before the sip. Verify it in the “Palate” section.`],
  [/^Неподдерживаемая версия схемы: (\d+)\. Ожидается ≤ (\d+)\.$/, 'An unsupported schema version: $1. Expected ≤ $2.'],
  /* v12: лимит колеса */
  [/^Лимит: не больше (\d+) активных дескрипторов — снимите лишний, чтобы добавить новый$/,
    'Limit: no more than $1 active descriptors — remove one to add a new one'],

  /* ═══ Паспорт v18 · призрак и хронограф ═══ */
  [/^✓ «(.+)» — запомню, буду подсказывать$/, '✓ “$1” — I’ll remember and suggest it'],
  [/^«(.+)» уже в памяти — призрак подхватит$/, '“$1” is already in memory — the ghost will pick it up'],
  [/^винтаж не из будущего — максимум (\d+), год взят с вашего устройства$/,
    'no vintages from the future — max $1, the year comes from your device'],
  [/^глубже (\d+)-го не пускаю — там уже археология, а не вино$/,
    'nothing before $1 — that’s archaeology, not wine'],
];

/* ── Рантайм ──────────────────────────────────────────────────────────────── */

/** Перевод строки на заданном языке: RU → EN (карта → шаблоны → как есть). */
export function tr(lang: TrLang, s: string): string {
  if (lang !== 'en') return s;
  const exact = EN_MAP[s];
  if (exact !== undefined) return exact;
  for (const [re, to] of EN_PATTERNS) {
    const m = s.match(re);
    if (m) return typeof to === 'function' ? to(m) : s.replace(re, to);
  }
  return s;
}

/** Перевод на текущем глобальном языке (движки, экспорты, тосты). */
export function T(s: string): string {
  return tr(current, s);
}
