import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  Award,
  BarChart2,
  Bell,
  BookOpen,
  Calendar,
  Check,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Cpu,
  Heart,
  Home,
  Info,
  Lock,
  LogOut,
  Mail,
  Map,
  MapPin,
  Menu,
  MessageCircle,
  Send,
  Settings,
  ShieldAlert,
  Star,
  Target,
  User,
  X,
} from "lucide-react";

const STORAGE_PREFIX = "mammocare_full_";

type Lang = "ru" | "kz" | "en";
type View = "home" | "learn" | "articles" | "cycle" | "clinics" | "about" | "account";
type CycleMode = "menstrual" | "menopause";

type UserRecord = {
  userId: string;
  name: string;
  email: string;
  passwordHash: string;
  registered: string;
};

type CurrentUser = UserRecord & { remember?: boolean };

type Progress = {
  currentDay: number;
  totalPoints: number;
  streak: number;
  completedDays: number[];
  achievements: string[];
  lastDate: string | null;
};

type CycleData = {
  lastPeriod?: string;
  cycleLength?: number;
  periodLength?: number;
  menopauseDate?: string;
};

type ReminderData = {
  notificationsEnabled: boolean;
  lastMammogram: string;
  nextSelfExam: string;
  nextMammogram: string;
  note: string;
};

type RiskData = {
  level: "risk_low" | "risk_moderate" | "risk_high";
  bmi: string | null;
  score: number;
};

type Lesson = {
  id: number;
  title: string;
  xp: number;
  content: string;
  quiz: null | { q: string; options: string[]; answer: number }[];
};

const defaultProgress: Progress = {
  currentDay: 1,
  totalPoints: 0,
  streak: 0,
  completedDays: [],
  achievements: [],
  lastDate: null,
};

const defaultReminders: ReminderData = {
  notificationsEnabled: false,
  lastMammogram: "",
  nextSelfExam: "",
  nextMammogram: "",
  note: "",
};

const articlesData = [
  { title: "Рак груди: факты ВОЗ", desc: "Официальная информация от Всемирной организации здравоохранения.", link: "https://www.who.int/ru/news-room/fact-sheets/detail/breast-cancer" },
  { title: "Рак молочной железы (Вики)", desc: "Полная энциклопедическая статья о заболевании.", link: "https://ru.wikipedia.org/wiki/%D0%A0%D0%B0%D0%BA_%D0%BC%D0%BE%D0%BB%D0%BE%D1%87%D0%BD%D0%BE%D0%B9_%D0%B6%D0%B5%D0%BB%D0%B5%D0%B7%D1%8B" },
  { title: "BreastCancer.org", desc: "Международный ресурс о раке груди.", link: "https://www.breastcancer.org/" },
  { title: "Маммография: подготовка", desc: "Как подготовиться к маммографии.", link: "https://www.mayoclinic.org/tests-procedures/mammogram/about/pac-20384806" },
  { title: "Американское онкообщество", desc: "Подробные материалы от ACS.", link: "https://www.cancer.org/cancer/breast-cancer.html" },
];

const clinicsData = [
  { id: 1, name: "Городская больница №2", address: "ул. Турар Рыскулова, 6", type: "public", lat: 51.1477, lng: 71.4216 },
  { id: 2, name: "Городская поликлиника №9", address: "пр. Мангилик Ел, 16/1", type: "public", lat: 51.0899, lng: 71.4165 },
  { id: 3, name: "ННОЦ (Онкоцентр)", address: "пр. Кабанбай Батыра, 53", type: "research", lat: 51.1201, lng: 71.4428 },
  { id: 4, name: "РДЦ (UMC)", address: "ул. Сыганак, 46", type: "public", lat: 51.1356, lng: 71.4254 },
  { id: 5, name: "Клиника Big Tau", address: "пр. Туран, 50", type: "private", lat: 51.1325, lng: 71.4301 },
  { id: 6, name: "Медцентр Sak", address: "пр. Сарыарка, 42", type: "private", lat: 51.1428, lng: 71.4389 },
  { id: 7, name: "Президентская клиника", address: "пр. Мангилик Ел, 80", type: "private", lat: 51.0954, lng: 71.4218 },
  { id: 8, name: "Онкоцентр UMIT", address: "пр. Абылай хана, 42/1", type: "private", lat: 51.1253, lng: 71.4328 },
  { id: 9, name: "Медцентр EMIRMED", address: "ул. Куйши Дина, 9", type: "private", lat: 51.1224, lng: 71.4193 },
  { id: 10, name: "Поликлиника №4", address: "ул. Ауэзова, 1", type: "public", lat: 51.1591, lng: 71.4182 },
];

const lessons: Lesson[] = [
  { id: 1, title: "Добро пожаловать!", xp: 100, content: "<h3>Добро пожаловать в 30-дневную программу MammoCare!</h3><p>Вы сделали важный шаг, заботясь о своём здоровье. В течение следующих 30 дней вы узнаете всё о здоровье груди и профилактике рака.</p><h4>Сегодня:</h4><ol><li>Узнайте свой уровень риска</li><li>Настройте трекер цикла</li><li>Начните первый урок</li></ol>", quiz: null },
  { id: 2, title: "Самообследование", xp: 150, content: "<h3>Как правильно проводить самообследование</h3><p><strong>Когда:</strong> 5-7 день цикла, после душа.</p><p>Встаньте перед зеркалом, осмотрите форму, кожу и соски. Затем подушечками пальцев аккуратно прощупайте грудь по спирали от подмышки к соску.</p><div class='mt-4 p-4 bg-yellow-50 rounded-lg'><p><strong>Важно:</strong> Самообследование не заменяет маммографию и УЗИ. При любых изменениях обратитесь к врачу.</p></div>", quiz: [{ q: "Когда лучше делать самообследование?", options: ["Любой день", "5-7 день цикла", "Во время месячных"], answer: 1 }] },
  { id: 3, title: "Менструальный цикл", xp: 50, content: "<h3>Понимание менструального цикла</h3><p>Средний цикл — 28 дней. Каждая фаза влияет на ткани груди.</p><h4>Фолликулярная фаза</h4><p>Растёт уровень эстрогена.</p><h4>Лютеиновая фаза</h4><p>Возможен дискомфорт и чувствительность груди.</p>", quiz: [{ q: "Сколько дней длится средний цикл?", options: ["14", "28", "35"], answer: 1 }] },
  { id: 4, title: "Анатомия груди", xp: 50, content: "<h3>Структура тканей груди</h3><p>Грудь состоит из долек, протоков и жировой ткани. Нормально знать, как выглядит и ощущается ваша грудь, чтобы вовремя заметить изменения.</p>", quiz: null },
  { id: 5, title: "Факторы риска", xp: 50, content: "<h3>Что повышает риск</h3><ul><li>Возраст после 40 лет</li><li>Семейная история</li><li>Генетические мутации</li><li>Ожирение, курение, алкоголь</li><li>Малоподвижный образ жизни</li></ul>", quiz: null },
  { id: 6, title: "Питание и здоровье", xp: 50, content: "<h3>Полезные продукты</h3><p>Овощи, фрукты, цельнозерновые продукты, рыба и оливковое масло поддерживают общее здоровье. Ограничьте красное мясо, сахар и ультрапереработанные продукты.</p>", quiz: null },
  { id: 7, title: "Физические упражнения", xp: 50, content: "<h3>Активность для здоровья</h3><p>Регулярные упражнения снижают риск рака груди на 10-20%. Цель: 150 минут умеренной активности в неделю.</p>", quiz: null },
  { id: 8, title: "Стресс и гормоны", xp: 50, content: "<h3>Влияние стресса</h3><p>Хронический стресс нарушает сон, иммунитет и гормональный баланс. Помогают дыхательные практики, прогулки и достаточный сон.</p>", quiz: null },
  { id: 9, title: "Что такое маммография", xp: 50, content: "<h3>Рентген груди</h3><p>Маммография помогает обнаружить опухоли до появления симптомов. Бывает скрининговой и диагностической.</p>", quiz: null },
  { id: 10, title: "Когда проходить", xp: 50, content: "<h3>Возраст и частота</h3><ul><li>40-50 лет: раз в 1-2 года</li><li>После 50: ежегодно</li><li>При высоком риске: с 30-35 лет по рекомендации врача</li></ul>", quiz: null },
  { id: 11, title: "Симптомы рака", xp: 50, content: "<h3>На что обращать внимание</h3><ul><li>Уплотнение в груди или подмышке</li><li>Изменение формы или размера</li><li>Покраснение или шелушение кожи</li><li>Выделения из соска</li><li>Втяжение кожи или соска</li></ul>", quiz: null },
  { id: 12, title: "Мифы о раке груди", xp: 50, content: "<h3>Развенчание мифов</h3><p><strong>Миф:</strong> антиперспиранты вызывают рак. <strong>Факт:</strong> доказательств нет.</p><p><strong>Миф:</strong> травма груди вызывает рак. <strong>Факт:</strong> травма не является причиной.</p>", quiz: null },
  { id: 13, title: "Генетическое тестирование", xp: 50, content: "<h3>BRCA1 и BRCA2</h3><p>Генетические мутации повышают риск. Тестирование стоит обсудить с врачом при семейной истории рака груди.</p>", quiz: null },
  { id: 14, title: "Биопсия", xp: 50, content: "<h3>Забор ткани для анализа</h3><p>Биопсия — способ подтвердить диагноз. Обычно проводится амбулаторно под местной анестезией.</p>", quiz: null },
  { id: 15, title: "Стадии рака", xp: 50, content: "<h3>Стадирование</h3><p>Стадия описывает распространённость процесса и помогает выбрать лечение: от 0 стадии до IV стадии.</p>", quiz: null },
  { id: 16, title: "Гормонотерапия", xp: 50, content: "<h3>Лечение гормонами</h3><p>Некоторые опухоли зависят от гормонов. Врач может назначить препараты, блокирующие действие эстрогена.</p>", quiz: null },
  { id: 17, title: "Химиотерапия", xp: 50, content: "<h3>Лекарственное лечение</h3><p>Химиотерапия применяется до или после операции, а также при распространённом заболевании.</p>", quiz: null },
  { id: 18, title: "Хирургическое лечение", xp: 50, content: "<h3>Виды операций</h3><p>Лампэктомия сохраняет грудь, мастэктомия удаляет железу. Возможна реконструкция.</p>", quiz: null },
  { id: 19, title: "Лучевая терапия", xp: 50, content: "<h3>Радиотерапия</h3><p>Излучение уничтожает раковые клетки и часто применяется после органосохраняющей операции.</p>", quiz: null },
  { id: 20, title: "Иммунотерапия", xp: 50, content: "<h3>Новый метод лечения</h3><p>Иммунотерапия помогает иммунной системе распознавать и атаковать опухолевые клетки.</p>", quiz: null },
  { id: 21, title: "Жизнь после лечения", xp: 50, content: "<h3>Реабилитация</h3><p>Важны регулярное наблюдение, здоровый образ жизни, психологическая поддержка и физическая активность.</p>", quiz: null },
  { id: 22, title: "Психологическая поддержка", xp: 50, content: "<h3>Эмоциональное здоровье</h3><p>Диагноз — стресс для всей семьи. Помогают психоонкологи, группы поддержки и открытый разговор.</p>", quiz: null },
  { id: 23, title: "Поддержка близких", xp: 50, content: "<h3>Как помочь</h3><ul><li>Слушать и поддерживать</li><li>Помогать с бытовыми делами</li><li>Ходить на приёмы вместе</li><li>Не давить советами</li></ul>", quiz: null },
  { id: 24, title: "Реконструкция груди", xp: 50, content: "<h3>Восстановление</h3><p>Реконструкция может выполняться имплантами, собственными тканями или комбинированно.</p>", quiz: null },
  { id: 25, title: "Профилактика", xp: 50, content: "<h3>Как снизить риск</h3><ul><li>Поддерживать здоровый вес</li><li>Быть физически активной</li><li>Ограничить алкоголь</li><li>Не курить</li><li>Регулярно проходить скрининг</li></ul>", quiz: null },
  { id: 26, title: "Скрининговые программы", xp: 50, content: "<h3>В Казахстане</h3><p>Государственная программа скрининга доступна женщинам 40-70 лет раз в 2 года.</p>", quiz: null },
  { id: 27, title: "Мужской рак груди", xp: 50, content: "<h3>Редко, но бывает</h3><p>Мужчины тоже могут болеть раком груди. Симптомы: уплотнение, выделения, изменения соска.</p>", quiz: null },
  { id: 28, title: "Беременность и рак", xp: 50, content: "<h3>Рак при беременности</h3><p>Редкое сочетание, но диагностика и лечение возможны. Решения принимаются индивидуально с врачом.</p>", quiz: null },
  { id: 29, title: "Новые исследования", xp: 50, content: "<h3>Достижения науки</h3><p>Развиваются персонализированная медицина, таргетная терапия и методы ранней диагностики.</p>", quiz: null },
  { id: 30, title: "Итоги курса", xp: 100, content: "<h3>Поздравляем!</h3><p>Вы прошли 30-дневную программу MammoCare.</p><p><strong>Продолжайте заботиться о своём здоровье!</strong></p>", quiz: null },
];

const achievements = [
  { id: "first_steps", title: "Первые шаги", icon: "🌟", test: (p: Progress) => p.completedDays.includes(1) },
  { id: "self_care_expert", title: "Эксперт самообследования", icon: "🔥", test: (p: Progress) => p.completedDays.includes(2) },
  { id: "week_warrior", title: "Воин недели", icon: "💪", test: (p: Progress) => p.completedDays.length >= 7 },
  { id: "knowledge_seeker", title: "Искатель знаний", icon: "📚", test: (p: Progress) => p.completedDays.length >= 15 },
  { id: "health_champion", title: "Чемпион здоровья", icon: "🏆", test: (p: Progress) => p.completedDays.length >= 30 },
];

const translations = {
  ru: {
    nav_home: "Главная", nav_learn: "Обучение", nav_articles: "Статьи", nav_cycle: "Цикл", nav_clinics: "Клиники", nav_about: "О нас", nav_account: "Аккаунт",
    home_welcome: "Добро пожаловать в MammoCare", home_desc: "Осознание сегодня — может спасти жизнь завтра.", btn_cycle: "Трекер", btn_clinic: "Клиники",
    risk_low: "Низкий риск", risk_moderate: "Умеренный риск", risk_high: "Высокий риск", risk_adv_low: "Продолжайте здоровый образ жизни и регулярный скрининг.", risk_adv_mod: "Рекомендована консультация врача и плановое обследование.", risk_adv_high: "Срочно обратитесь к врачу для очного осмотра.",
  },
  kz: {
    nav_home: "Басты", nav_learn: "Оқыту", nav_articles: "Мақалалар", nav_cycle: "Цикл", nav_clinics: "Клиникалар", nav_about: "Біз туралы", nav_account: "Аккаунт",
    home_welcome: "MammoCare қош келдіңіз", home_desc: "Бүгінгі хабардарлық ертең өмірді сақтауы мүмкін.", btn_cycle: "Трекер", btn_clinic: "Клиникалар",
    risk_low: "Төмен тәуекел", risk_moderate: "Орташа тәуекел", risk_high: "Жоғары тәуекел", risk_adv_low: "Салауатты өмір салтын жалғастырыңыз.", risk_adv_mod: "Дәрігер кеңесі ұсынылады.", risk_adv_high: "Дәрігерге шұғыл көрініңіз.",
  },
  en: {
    nav_home: "Home", nav_learn: "Learn", nav_articles: "Articles", nav_cycle: "Cycle", nav_clinics: "Clinics", nav_about: "About", nav_account: "Account",
    home_welcome: "Welcome to MammoCare", home_desc: "Awareness today can save a life tomorrow.", btn_cycle: "Tracker", btn_clinic: "Clinics",
    risk_low: "Low risk", risk_moderate: "Moderate risk", risk_high: "High risk", risk_adv_low: "Keep a healthy lifestyle and regular screening.", risk_adv_mod: "A doctor's consultation is recommended.", risk_adv_high: "Please see a doctor urgently.",
  },
};
const staticTranslations: Record<Exclude<Lang, "ru">, Record<string, string>> = {
  kz: {
    "Меню": "Мәзір",
    "Ваш риск": "Тәуекеліңіз",
    "Пересчитать": "Қайта есептеу",
    "Оценить риск": "Тәуекелді бағалау",
    "Статистика рака груди": "Сүт безі обыры статистикасы",
    "Казахстан": "Қазақстан",
    "в мире": "әлемде",
    "место по заболеваемости среди женщин": "әйелдер арасында аурушаңдық бойынша орын",
    "случаев ежегодно по данным ВОЗ": "ДДҰ дерегі бойынша жыл сайынғы жағдайлар",
    "Раннее обнаружение повышает выживаемость до 98 %": "Ерте анықтау өмір сүру мүмкіндігін 98%-ға дейін арттырады",
    "День цикла": "Цикл күні",
    "След. месячные": "Келесі етеккір",
    "Прогресс": "Прогресс",
    "Активный трекер": "Белсенді трекер",
    "Настройте": "Баптаңыз",
    "Полезная информация": "Пайдалы ақпарат",
    "Пройти самообследование": "Өзіндік тексеруден өту",
    "Самообследование": "Өзіндік тексеру",
    "Делайте это раз в месяц. Самообследование занимает 5 минут.": "Мұны айына бір рет жасаңыз. Өзіндік тексеру 5 минут алады.",
    "Скрининг": "Скрининг",
    "Маммография рекомендована женщинам старше 40 лет, а при риске — раньше по назначению врача.": "Маммография 40 жастан асқан әйелдерге, ал тәуекел болса дәрігер тағайындауымен ертерек ұсынылады.",
    "Читать все статьи →": "Барлық мақалаларды оқу →",
    "Разблокируйте Premium!": "Premium мүмкіндіктерін ашыңыз!",
    "Эксклюзивные уроки и персональные рекомендации": "Эксклюзивті сабақтар және жеке ұсыныстар",
    "Узнать больше": "Толығырақ",
    "30-дневная программа": "30 күндік бағдарлама",
    "Укрепите здоровье шаг за шагом": "Денсаулықты қадам сайын нығайтыңыз",
    "Баллов": "Ұпай",
    "Дней подряд": "Күн қатарынан",
    "дней": "күн",
    "Включить напоминания": "Ескертулерді қосу",
    "Достижения": "Жетістіктер",
    "Пройдено": "Өтілді",
    "Доступно": "Қолжетімді",
    "Заблокировано": "Құлыпталған",
    "Настройка трекера": "Трекерді баптау",
    "Режим": "Режим",
    "Менструальный цикл": "Етеккір циклі",
    "Менопауза": "Менопауза",
    "Дата последних месячных": "Соңғы етеккір күні",
    "Длина цикла (дни)": "Цикл ұзақтығы (күн)",
    "Длина месячных (дни)": "Етеккір ұзақтығы (күн)",
    "Дата наступления менопаузы": "Менопауза басталған күн",
    "О менопаузе": "Менопауза туралы",
    "После менопаузы риск рака молочной железы увеличивается. Важно регулярно проходить маммографию, продолжать самообследование и поддерживать здоровый вес.": "Менопаузадан кейін сүт безі обыры қаупі артады. Маммографиядан тұрақты өтіп, өзіндік тексеруді жалғастырып, салмақты бақылау маңызды.",
    "Сохранить": "Сақтау",
    "Сброс": "Тазалау",
    "Изменить настройки": "Баптауларды өзгерту",
    "Сегодня": "Бүгін",
    "День": "Күн",
    "до месячных": "етеккірге дейін",
    "до овуляции": "овуляцияға дейін",
    "Время для самообследования!": "Өзіндік тексеру уақыты!",
    "Оптимальный период (5-7 день).": "Оңтайлы кезең (5-7 күн).",
    "Начать": "Бастау",
    "Пн": "Дс",
    "Вт": "Сс",
    "Ср": "Ср",
    "Чт": "Бс",
    "Пт": "Жм",
    "Сб": "Сб",
    "Вс": "Жс",
    "Месячные": "Етеккір",
    "Овуляция": "Овуляция",
    "Прогноз на 3 месяца": "3 айлық болжам",
    "Активный режим": "Белсенді режим",
    "Дата не указана": "Күні көрсетілмеген",
    "Рекомендации для вас": "Сізге арналған ұсыныстар",
    "Маммография": "Маммография",
    "После менопаузы рекомендуется проходить ежегодно": "Менопаузадан кейін жыл сайын өту ұсынылады",
    "Продолжайте делать ежемесячно": "Ай сайын жалғастырыңыз",
    "Здоровый образ жизни": "Салауатты өмір салты",
    "Контролируйте вес, занимайтесь спортом": "Салмақты бақылаңыз, спортпен айналысыңыз",
    "Напоминание о маммографии": "Маммография туралы ескерту",
    "Проверьте, когда вы проходили последнюю маммографию.": "Соңғы маммографиядан қашан өткеніңізді тексеріңіз.",
    "Клиники маммографии": "Маммография клиникалары",
    "Найдите ближайший центр в Астане.": "Астанадағы жақын орталықты табыңыз.",
    "Поиск...": "Іздеу...",
    "Все": "Барлығы",
    "Гос.": "Мемл.",
    "Частные": "Жеке",
    "Онкоцентр": "Онкоорталық",
    "Список": "Тізім",
    "Открыть маршрут": "Маршрутты ашу",
    "О проекте MammoCare": "MammoCare жобасы туралы",
    "Миссия": "Миссия",
    "Контакты": "Байланыс",
    "Вы не авторизованы": "Сіз жүйеге кірмедіңіз",
    "Войдите в аккаунт, чтобы сохранять прогресс обучения и персональные данные": "Оқу прогресі мен жеке деректерді сақтау үшін аккаунтқа кіріңіз",
    "Войти / Регистрация": "Кіру / Тіркелу",
    "Напоминания": "Ескертулер",
    "Дата последней маммографии": "Соңғы маммография күні",
    "Статус уведомлений": "Хабарландыру күйі",
    "Уведомления включены": "Хабарландырулар қосылды",
    "Включить уведомления": "Хабарландыруларды қосу",
    "Следующее самообследование": "Келесі өзіндік тексеру",
    "Следующая маммография": "Келесі маммография",
    "Добро пожаловать!": "Қош келдіңіз!",
    "Ответьте на вопросы для расчета риска": "Тәуекелді есептеу үшін сұрақтарға жауап беріңіз",
    "Ваш возраст": "Жасыңыз",
    "Вес (кг)": "Салмақ (кг)",
    "Рост (см)": "Бой (см)",
    "Наследственность": "Тұқымқуалаушылық",
    "Курение": "Темекі шегу",
    "Жалобы": "Шағымдар",
    "Нет": "Жоқ",
    "Да": "Иә",
    "Дальние родственники": "Алыс туыстар",
    "Мама/сестра": "Ана/әпке",
    "Не курю": "Шекпеймін",
    "Бросила": "Тастадым",
    "Курю": "Шегемін",
    "Дискомфорт": "Қолайсыздық",
    "Уплотнения/боль": "Түйіндер/ауырсыну",
    "Рассчитать": "Есептеу",
    "Пропустить": "Өткізу",
    "Продолжить": "Жалғастыру",
    "Видео: Как проводить самообследование": "Видео: өзіндік тексеруді қалай жүргізу керек",
    "Закрыть": "Жабу",
    "Урок": "Сабақ",
    "Проверьте свои знания": "Біліміңізді тексеріңіз",
    "Premium возможности": "Premium мүмкіндіктері",
    "Разблокируйте дополнительные функции!": "Қосымша мүмкіндіктерді ашыңыз!",
    "Эксклюзивные уроки и материалы": "Эксклюзивті сабақтар мен материалдар",
    "Персональные рекомендации": "Жеке ұсыныстар",
    "Скидки на маммографию до 30%": "Маммографияға 30%-ға дейін жеңілдік",
    "Позже": "Кейін",
    "Вход": "Кіру",
    "Регистрация": "Тіркелу",
    "Восстановление": "Қалпына келтіру",
    "Пароль": "Құпиясөз",
    "Запомнить меня": "Мені есте сақтау",
    "Забыли пароль?": "Құпиясөзді ұмыттыңыз ба?",
    "Войти": "Кіру",
    "Нет аккаунта?": "Аккаунтыңыз жоқ па?",
    "Зарегистрироваться": "Тіркелу",
    "Имя": "Аты",
    "Подтвердите пароль": "Құпиясөзді растаңыз",
    "Выйти": "Шығу"
  },
  en: {
    "Меню": "Menu",
    "Ваш риск": "Your risk",
    "Пересчитать": "Recalculate",
    "Оценить риск": "Assess risk",
    "Статистика рака груди": "Breast cancer statistics",
    "Казахстан": "Kazakhstan",
    "в мире": "worldwide",
    "место по заболеваемости среди женщин": "rank among women by incidence",
    "случаев ежегодно по данным ВОЗ": "cases annually according to WHO",
    "Раннее обнаружение повышает выживаемость до 98 %": "Early detection increases survival up to 98%",
    "День цикла": "Cycle day",
    "След. месячные": "Next period",
    "Прогресс": "Progress",
    "Активный трекер": "Active tracker",
    "Настройте": "Configure",
    "Полезная информация": "Useful information",
    "Пройти самообследование": "Start self-exam",
    "Самообследование": "Self-exam",
    "Делайте это раз в месяц. Самообследование занимает 5 минут.": "Do this once a month. A self-exam takes 5 minutes.",
    "Скрининг": "Screening",
    "Маммография рекомендована женщинам старше 40 лет, а при риске — раньше по назначению врача.": "Mammography is recommended after 40, or earlier if your doctor advises it.",
    "Читать все статьи →": "Read all articles →",
    "Разблокируйте Premium!": "Unlock Premium!",
    "Эксклюзивные уроки и персональные рекомендации": "Exclusive lessons and personal recommendations",
    "Узнать больше": "Learn more",
    "30-дневная программа": "30-day program",
    "Укрепите здоровье шаг за шагом": "Improve your health step by step",
    "Баллов": "Points",
    "Дней подряд": "Day streak",
    "дней": "days",
    "Включить напоминания": "Enable reminders",
    "Достижения": "Achievements",
    "Пройдено": "Completed",
    "Доступно": "Available",
    "Заблокировано": "Locked",
    "Настройка трекера": "Tracker setup",
    "Режим": "Mode",
    "Менструальный цикл": "Menstrual cycle",
    "Менопауза": "Menopause",
    "Дата последних месячных": "Last period date",
    "Длина цикла (дни)": "Cycle length (days)",
    "Длина месячных (дни)": "Period length (days)",
    "Дата наступления менопаузы": "Menopause start date",
    "О менопаузе": "About menopause",
    "После менопаузы риск рака молочной железы увеличивается. Важно регулярно проходить маммографию, продолжать самообследование и поддерживать здоровый вес.": "After menopause, breast cancer risk increases. Regular mammography, self-exams, and maintaining a healthy weight are important.",
    "Сохранить": "Save",
    "Сброс": "Reset",
    "Изменить настройки": "Edit settings",
    "Сегодня": "Today",
    "День": "Day",
    "до месячных": "until period",
    "до овуляции": "until ovulation",
    "Время для самообследования!": "Time for self-exam!",
    "Оптимальный период (5-7 день).": "Optimal period (days 5-7).",
    "Начать": "Start",
    "Пн": "Mon",
    "Вт": "Tue",
    "Ср": "Wed",
    "Чт": "Thu",
    "Пт": "Fri",
    "Сб": "Sat",
    "Вс": "Sun",
    "Месячные": "Period",
    "Овуляция": "Ovulation",
    "Прогноз на 3 месяца": "3-month forecast",
    "Активный режим": "Active mode",
    "Дата не указана": "Date not set",
    "Рекомендации для вас": "Recommendations for you",
    "Маммография": "Mammography",
    "После менопаузы рекомендуется проходить ежегодно": "Annual mammography is recommended after menopause",
    "Продолжайте делать ежемесячно": "Continue monthly",
    "Здоровый образ жизни": "Healthy lifestyle",
    "Контролируйте вес, занимайтесь спортом": "Manage weight and exercise",
    "Напоминание о маммографии": "Mammography reminder",
        "Проверьте, когда вы проходили последнюю маммографию.": "Check when you had your last mammogram.",
    "Клиники маммографии": "Mammography clinics",
    "Найдите ближайший центр в Астане.": "Find the nearest center in Astana.",
    "Поиск...": "Search...",
    "Все": "All",
    "Гос.": "Public",
    "Частные": "Private",
    "Онкоцентр": "Cancer center",
    "Список": "List",
    "Открыть маршрут": "Open route",
    "О проекте MammoCare": "About MammoCare",
    "Миссия": "Mission",
    "Контакты": "Contacts",
    "Вы не авторизованы": "You are not signed in",
    "Войдите в аккаунт, чтобы сохранять прогресс обучения и персональные данные": "Sign in to save learning progress and personal data",
    "Войти / Регистрация": "Sign in / Register",
    "Напоминания": "Reminders",
    "Дата последней маммографии": "Last mammogram date",
    "Статус уведомлений": "Notification status",
    "Уведомления включены": "Notifications enabled",
    "Включить уведомления": "Enable notifications",
    "Следующее самообследование": "Next self-exam",
    "Следующая маммография": "Next mammogram",
    "Добро пожаловать!": "Welcome!",
    "Ответьте на вопросы для расчета риска": "Answer questions to calculate risk",
    "Ваш возраст": "Your age",
    "Вес (кг)": "Weight (kg)",
    "Рост (см)": "Height (cm)",
    "Наследственность": "Family history",
    "Курение": "Smoking",
    "Жалобы": "Symptoms",
    "Нет": "No",
    "Да": "Yes",
    "Дальние родственники": "Distant relatives",
    "Мама/сестра": "Mother/sister",
    "Не курю": "Non-smoker",
    "Бросила": "Quit",
    "Курю": "Smoker",
    "Дискомфорт": "Discomfort",
    "Уплотнения/боль": "Lumps/pain",
    "Рассчитать": "Calculate",
    "Пропустить": "Skip",
    "Продолжить": "Continue",
    "Видео: Как проводить самообследование": "Video: how to do a self-exam",
    "Закрыть": "Close",
    "Урок": "Lesson",
    "Проверьте свои знания": "Check your knowledge",
    "Premium возможности": "Premium features",
    "Разблокируйте дополнительные функции!": "Unlock extra features!",
    "Эксклюзивные уроки и материалы": "Exclusive lessons and materials",
    "Персональные рекомендации": "Personal recommendations",
    "Скидки на маммографию до 30%": "Mammography discounts up to 30%",
    "Позже": "Later",
    "Вход": "Sign in",
    "Регистрация": "Registration",
    "Восстановление": "Recovery",
    "Пароль": "Password",
    "Запомнить меня": "Remember me",
    "Забыли пароль?": "Forgot password?",
    "Войти": "Sign in",
    "Нет аккаунта?": "No account?",
    "Зарегистрироваться": "Register",
    "Имя": "Name",
    "Подтвердите пароль": "Confirm password",
    "Выйти": "Log out"
  }
};

function translateStaticDom(lang: Lang) {
  if (lang === "ru") return;
  const dictionary = staticTranslations[lang];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent || ["SCRIPT", "STYLE", "TEXTAREA"].includes(parent.tagName)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  });
  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);
  nodes.forEach((node) => {
    const text = node.nodeValue || "";
    const trimmed = text.trim();
    if (dictionary[trimmed]) node.nodeValue = text.replace(trimmed, dictionary[trimmed]);
  });
  document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("[placeholder]").forEach((element) => {
    const placeholder = element.getAttribute("placeholder") || "";
    if (dictionary[placeholder]) element.setAttribute("placeholder", dictionary[placeholder]);
  });
}

function storageKey(key: string) {
  return `${STORAGE_PREFIX}${key}`;
}

function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(storageKey(key));
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage<T>(key: string, value: T) {
  localStorage.setItem(storageKey(key), JSON.stringify(value));
}

function useStoredState<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(() => readStorage(key, fallback));
  const update = useCallback((next: T | ((prev: T) => T)) => {
    setValue((prev) => {
      const resolved = typeof next === "function" ? (next as (prev: T) => T)(prev) : next;
      writeStorage(key, resolved);
      return resolved;
    });
  }, [key]);
  return [value, update] as const;
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function daysBetween(d1: Date, d2: Date) {
  const a = new Date(d1.getFullYear(), d1.getMonth(), d1.getDate()).getTime();
  const b = new Date(d2.getFullYear(), d2.getMonth(), d2.getDate()).getTime();
  return Math.round((b - a) / 86400000);
}

function dateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatDate(value?: string | Date) {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" });
}

async function hashPassword(password: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${password}mammocare_salt`);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function getProgressKey(user: CurrentUser | null) {
  return user ? `progress_${user.userId}` : "progress_guest";
}

function calculateCycleDay(cycle: CycleData | null, date = new Date()) {
  if (!cycle?.lastPeriod || !cycle.cycleLength) return null;
  let periodStart = new Date(cycle.lastPeriod);
  while (addDays(periodStart, cycle.cycleLength) <= date) periodStart = addDays(periodStart, cycle.cycleLength);
  return daysBetween(periodStart, date) + 1;
}

function getDayPhase(cycle: CycleData | null, date: Date) {
  if (!cycle?.lastPeriod || !cycle.cycleLength || !cycle.periodLength) return null;
  let periodStart = new Date(cycle.lastPeriod);
  while (addDays(periodStart, cycle.cycleLength) <= date) periodStart = addDays(periodStart, cycle.cycleLength);
  while (periodStart > date) periodStart = addDays(periodStart, -cycle.cycleLength);
  const day = daysBetween(periodStart, date) + 1;
  const ovulation = cycle.cycleLength - 14;
  if (day <= cycle.periodLength) return "period";
  if (day === ovulation) return "ovulation";
  if (day >= ovulation - 4 && day <= ovulation + 1) return "fertile";
  if (day >= 5 && day <= 7) return "exam";
  return null;
}

function nextPeriodDate(cycle: CycleData | null) {
  if (!cycle?.lastPeriod || !cycle.cycleLength) return null;
  let next = new Date(cycle.lastPeriod);
  const today = new Date();
  while (next <= today) next = addDays(next, cycle.cycleLength);
  return next;
}

function calculateNextSelfExam(cycle: CycleData | null, mode: CycleMode) {
  const today = new Date();
  if (mode === "menopause") return addDays(today, 30);
  if (!cycle?.lastPeriod || !cycle.cycleLength) return addDays(today, 30);
  let start = new Date(cycle.lastPeriod);
  while (addDays(start, 6) <= today) start = addDays(start, cycle.cycleLength);
  return addDays(start, 5);
}

function calculateNextMammogram(lastMammogram: string, mode: CycleMode) {
  if (lastMammogram) {
    const date = new Date(lastMammogram);
    date.setFullYear(date.getFullYear() + (mode === "menopause" ? 1 : 2));
    return date;
  }
  const date = new Date();
  date.setMonth(date.getMonth() + (mode === "menopause" ? 1 : 3));
  return date;
}

function App() {
  const [view, setView] = useState<View>(() => (window.location.hash.replace("#", "") as View) || "home");
  const [lang, setLang] = useStoredState<Lang>("appLang", "ru");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [currentUser, setCurrentUser] = useStoredState<CurrentUser | null>("currentUser", null);
  const [cycleMode, setCycleMode] = useStoredState<CycleMode>("cycleMode", "menstrual");
  const [cycle, setCycle] = useStoredState<CycleData | null>("cycleData", null);
  const [riskData, setRiskData] = useStoredState<RiskData | null>("riskData", null);
  const [riskModal, setRiskModal] = useState(false);
  const [selfExamOpen, setSelfExamOpen] = useState(false);
  const [lessonOpen, setLessonOpen] = useState<Lesson | null>(null);
  const [premiumOpen, setPremiumOpen] = useState(false);
    const [authOpen, setAuthOpen] = useState(false);
  const [achievementOpen, setAchievementOpen] = useState<typeof achievements[number] | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [progress, setProgress] = useState<Progress>(() => readStorage(getProgressKey(currentUser), defaultProgress));
  const [reminders, setReminders] = useStoredState<ReminderData>("reminders", defaultReminders);

  const t = useCallback((key: keyof typeof translations.ru) => translations[lang][key] || translations.ru[key] || key, [lang]);

  useEffect(() => {
    const id = window.setTimeout(() => translateStaticDom(lang), 0);
    return () => window.clearTimeout(id);
  });

  useEffect(() => {
    const nextSelfExam = dateInput(calculateNextSelfExam(cycle, cycleMode));
    const nextMammogram = dateInput(calculateNextMammogram(reminders.lastMammogram, cycleMode));
    const note = cycleMode === "menopause" ? "После менопаузы маммография рекомендуется ежегодно." : "Самообследование рассчитано на 5-7 день цикла.";
    if (reminders.nextSelfExam !== nextSelfExam || reminders.nextMammogram !== nextMammogram || reminders.note !== note) {
      setReminders((prev) => ({ ...prev, nextSelfExam, nextMammogram, note }));
    }
  }, [cycle, cycleMode, reminders.lastMammogram, reminders.nextSelfExam, reminders.nextMammogram, reminders.note, setReminders]);

  useEffect(() => {
    const onHash = () => {
      const next = (window.location.hash.replace("#", "") || "home") as View;
      setView(["home", "learn", "articles", "cycle", "clinics", "about", "account"].includes(next) ? next : "home");
      setMobileOpen(false);
    };
    window.addEventListener("hashchange", onHash);
    onHash();
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    setProgress(readStorage(getProgressKey(currentUser), defaultProgress));
  }, [currentUser]);

  const saveProgress = useCallback((next: Progress) => {
    setProgress(next);
    writeStorage(getProgressKey(currentUser), next);
  }, [currentUser]);

  const navigate = (next: View) => {
    window.location.hash = next;
    setView(next);
    setMobileOpen(false);
  };

  const completeLesson = (lesson: Lesson) => {
    const already = progress.completedDays.includes(lesson.id);
    let next: Progress = { ...progress, completedDays: [...progress.completedDays], achievements: [...progress.achievements] };
    if (!already) {
      const today = dateInput(new Date());
      const yesterday = dateInput(addDays(new Date(), -1));
      next.completedDays.push(lesson.id);
      next.totalPoints += lesson.xp;
      next.currentDay = Math.max(next.currentDay, Math.min(30, lesson.id + 1));
      next.streak = progress.lastDate === yesterday ? progress.streak + 1 : progress.lastDate === today ? progress.streak : 1;
      next.lastDate = today;
      achievements.forEach((achievement) => {
        if (achievement.test(next) && !next.achievements.includes(achievement.id)) {
          next.achievements.push(achievement.id);
          setAchievementOpen(achievement);
        }
      });
    }
    saveProgress(next);
    setLessonOpen(null);
    if (lesson.id >= 5) setPremiumOpen(true);
  };

  const updateRemindersFromCycle = (lastMammogram = reminders.lastMammogram) => {
    const nextSelf = calculateNextSelfExam(cycle, cycleMode);
    const nextMammo = calculateNextMammogram(lastMammogram, cycleMode);
    setReminders({
      ...reminders,
      lastMammogram,
      nextSelfExam: dateInput(nextSelf),
      nextMammogram: dateInput(nextMammo),
      note: cycleMode === "menopause" ? "После менопаузы маммография рекомендуется ежегодно." : "Самообследование рассчитано на 5-7 день цикла.",
    });
  };

  const enableNotifications = async () => {
    if (!("Notification" in window)) {
      alert("Браузер не поддерживает уведомления.");
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      alert("Разрешение отклонено");
      return;
    }
    updateRemindersFromCycle();
    setReminders((prev) => ({ ...prev, notificationsEnabled: true }));
    new Notification("MammoCare", { body: "Напоминания включены. Мы рассчитали даты самообследования и маммографии." });
  };

  const navItems: { id: View; label: string; icon: React.ElementType }[] = [
    { id: "home", label: t("nav_home"), icon: Home },
    { id: "learn", label: t("nav_learn"), icon: Award },
    { id: "articles", label: t("nav_articles"), icon: BookOpen },
    { id: "cycle", label: t("nav_cycle"), icon: Calendar },
    { id: "clinics", label: t("nav_clinics"), icon: Map },
    { id: "about", label: t("nav_about"), icon: Info },
  ];

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 flex flex-col">
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => navigate("home")} className="flex items-center gap-2">
            <Heart className="w-7 h-7 text-primary fill-primary/20" />
            <span className="text-xl font-bold">MammoCare</span>
          </button>
          <nav className="hidden md:flex gap-1">
            {navItems.map((item) => <NavButton key={item.id} item={item} active={view === item.id} onClick={() => navigate(item.id)} />)}
          </nav>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate("account")} className={`p-2 rounded-full hover:bg-gray-100 ${view === "account" ? "text-primary" : "text-gray-600"}`}><User className="w-5 h-5" /></button>
            <select value={lang} onChange={(e) => setLang(e.target.value as Lang)} className="border border-gray-200 rounded-lg px-2 py-2 bg-white text-sm">
              <option value="ru">🇷🇺</option>
              <option value="kz">🇰🇿</option>
              <option value="en">🇬🇧</option>
            </select>
            <button onClick={() => setMobileOpen(true)} className="md:hidden p-2"><Menu className="w-6 h-6" /></button>
          </div>
        </div>
      </header>

      {mobileOpen && <div className="fixed inset-0 z-[999] bg-black/40" onClick={() => setMobileOpen(false)}>
        <div className="bg-white h-full w-80 max-w-full p-6 ml-auto" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-8"><h2 className="text-xl font-bold">Меню</h2><button onClick={() => setMobileOpen(false)}><X /></button></div>
          <nav className="space-y-2">
            {[...navItems, { id: "account" as View, label: t("nav_account"), icon: User }].map((item) => <NavButton key={item.id} item={item} active={view === item.id} onClick={() => navigate(item.id)} mobile />)}
          </nav>
        </div>
      </div>}

      <main className="flex-grow container mx-auto px-4 py-6 pb-28 md:pb-8">
        {view === "home" && <HomeView t={t} riskData={riskData} progress={progress} cycle={cycle} cycleMode={cycleMode} navigate={navigate} openRisk={() => setRiskModal(true)} openSelfExam={() => setSelfExamOpen(true)} openPremium={() => setPremiumOpen(true)} />}
        {view === "learn" && <LearnView progress={progress} openLesson={setLessonOpen} enableNotifications={enableNotifications} />}
        {view === "articles" && <ArticlesView />}
        {view === "cycle" && <CycleView cycle={cycle} setCycle={setCycle} cycleMode={cycleMode} setCycleMode={setCycleMode} openSelfExam={() => setSelfExamOpen(true)} updateRemindersFromCycle={updateRemindersFromCycle} />}
        {view === "clinics" && <ClinicsView />}
        {view === "about" && <AboutView />}
        {view === "account" && <AccountView currentUser={currentUser} setCurrentUser={setCurrentUser} setAuthOpen={setAuthOpen} progress={progress} reminders={reminders} setReminders={setReminders} enableNotifications={enableNotifications} updateRemindersFromCycle={updateRemindersFromCycle} />}
      </main>

      <footer className="bg-white border-t border-gray-100 py-4 mt-auto hidden md:block"><div className="container mx-auto px-4 text-center text-sm text-gray-500">© 2026 MammoCare • <button onClick={() => navigate("about")} className="hover:text-primary">О нас</button></div></footer>

      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur border-t border-gray-100 md:hidden grid grid-cols-5">
        {[navItems[0], navItems[1], navItems[3], navItems[4], { id: "account" as View, label: t("nav_account"), icon: User }].map((item) => {
          const Icon = item.icon;
          return <button key={item.id} onClick={() => navigate(item.id)} className={`py-3 text-[10px] flex flex-col items-center gap-1 ${view === item.id ? "text-primary" : "text-gray-500"}`}><Icon className="w-5 h-5" />{item.label}</button>;
        })}
      </div>

      <button onClick={() => setAiOpen(true)} className="fixed bottom-20 md:bottom-5 right-5 z-50 bg-primary text-white p-4 rounded-full shadow-lg hover:bg-pink-600 transition"><MessageCircle className="w-6 h-6" /></button>

      {riskModal && <RiskModal t={t} setRiskData={setRiskData} onClose={() => setRiskModal(false)} />}
      {selfExamOpen && <SelfExamModal onClose={() => setSelfExamOpen(false)} />}
      {lessonOpen && <LessonModal lesson={lessonOpen} progress={progress} onClose={() => setLessonOpen(null)} onComplete={completeLesson} />}
      {premiumOpen && <PremiumModal onClose={() => setPremiumOpen(false)} />}
      {authOpen && <AuthModal setCurrentUser={setCurrentUser} onClose={() => setAuthOpen(false)} />}
      {achievementOpen && <AchievementModal achievement={achievementOpen} onClose={() => setAchievementOpen(null)} />}
      {aiOpen && <AIModal onClose={() => setAiOpen(false)} />}
    </div>
  );
}

function NavButton({ item, active, onClick, mobile = false }: { item: { label: string; icon: React.ElementType }; active: boolean; onClick: () => void; mobile?: boolean }) {
  const Icon = item.icon;
  return <button onClick={onClick} className={`nav-item ${active ? "active" : ""} ${mobile ? "w-full justify-start px-4 py-3" : "px-4 py-2"} rounded-lg flex items-center gap-2`}><Icon className="w-4 h-4" /><span>{item.label}</span></button>;
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`card ${className}`}>{children}</div>;
}
function HomeView({ t, riskData, progress, cycle, cycleMode, navigate, openRisk, openSelfExam, openPremium }: any) {
  const cycleDay = cycleMode === "menstrual" ? calculateCycleDay(cycle) : null;
  const next = cycleMode === "menstrual" ? nextPeriodDate(cycle) : null;

  return <section className="space-y-6 slide-up">
    {riskData && <Card className="p-5 bg-gradient-to-r from-pink-50 to-red-50 border-pink-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">Ваш риск</p>
          <p className="text-2xl font-bold">{t(riskData.level)}</p>
          {riskData.bmi && <p className="text-xs text-gray-500">BMI: {riskData.bmi}</p>}
        </div>
        <button onClick={openRisk} className="text-sm text-primary hover:underline">Пересчитать</button>
      </div>
    </Card>}

    <Card className="p-6 bg-white border-l-4 border-primary">
      <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
        <BarChart2 className="w-5 h-5 text-primary" /> Статистика рака груди
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-sm font-bold text-gray-500 mb-1">🇰🇿 Казахстан</p>
          <p className="text-3xl font-bold">1-е</p>
          <p className="text-sm text-gray-600">место по заболеваемости среди женщин</p>
          <p className="text-xs text-gray-400 mt-2">~4 600 новых случаев ежегодно</p>
        </div>
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-sm font-bold text-gray-500 mb-1">🌍 В мире</p>
          <p className="text-3xl font-bold">2.3 млн</p>
          <p className="text-sm text-gray-600">случаев ежегодно по данным ВОЗ</p>
          <p className="text-xs text-gray-400 mt-2">Каждую 8-ю женщину затрагивает диагноз</p>
        </div>
      </div>
      <div className="mt-4 p-3 bg-green-50 rounded-lg text-sm text-green-700 flex items-center gap-2">
        <CheckCircle className="w-4 h-4" /> Раннее обнаружение повышает выживаемость до 98%
      </div>
    </Card>

    <Card className="p-8 bg-gradient-to-br from-pink-50 via-white to-purple-50">
      <h2 className="text-2xl md:text-3xl font-bold mb-3">{t("home_welcome")}</h2>
      <p className="text-gray-600 mb-6">{t("home_desc")}</p>
      <div className="flex flex-wrap gap-3">
        <button onClick={() => navigate("cycle")} className="px-5 py-2.5 bg-primary text-white rounded-lg hover:bg-pink-600">{t("btn_cycle")}</button>
        <button onClick={() => navigate("clinics")} className="px-5 py-2.5 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">{t("btn_clinic")}</button>
        <button onClick={openRisk} className="px-5 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700">Оценить риск</button>
      </div>
    </Card>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card className="p-5">
        <div className="flex items-center gap-3 mb-3">
          <IconBubble color="pink"><Calendar className="w-5 h-5" /></IconBubble>
          <span className="font-medium">День цикла</span>
        </div>
        <p className="text-3xl font-bold">{cycleMode === "menopause" ? "—" : cycleDay || "—"}</p>
        <p className="text-sm text-gray-500">{cycleMode === "menopause" ? "Менопауза" : cycleDay ? "Активный трекер" : "Настройте"}</p>
      </Card>

      <Card className="p-5">
        <div className="flex items-center gap-3 mb-3">
          <IconBubble color="red"><Activity className="w-5 h-5" /></IconBubble>
          <span className="font-medium">След. месячные</span>
        </div>
        <p className="text-xl font-bold">{next ? formatDate(next) : "—"}</p>
        <p className="text-sm text-gray-500">{next ? `${daysBetween(new Date(), next)} дн.` : ""}</p>
      </Card>

      <Card className="p-5">
        <div className="flex items-center gap-3 mb-3">
          <IconBubble color="purple"><Award className="w-5 h-5" /></IconBubble>
          <span className="font-medium">Прогресс</span>
        </div>
        <p className="text-xl font-bold">{progress.totalPoints} XP</p>
        <p className="text-sm text-gray-500">{progress.completedDays.length}/30 дней</p>
      </Card>
    </div>

    <Card className="p-6">
      <h3 className="text-lg font-bold mb-4">Полезная информация</h3>
      <button onClick={openSelfExam} className="mb-4 w-full py-3 bg-primary text-white rounded-lg font-medium hover:bg-pink-600">
        Пройти самообследование
      </button>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <InfoItem icon={<Check className="w-4 h-4" />} title="Самообследование" text="Делайте это раз в месяц. Самообследование занимает 5 минут." />
        <InfoItem icon={<Clock className="w-4 h-4" />} title="Скрининг" text="Маммография рекомендована женщинам старше 40 лет, а при риске — раньше по назначению врача." />
      </div>
      <div className="mt-4 text-right">
        <button onClick={() => navigate("articles")} className="text-sm text-primary hover:underline font-medium">Читать все статьи →</button>
      </div>
    </Card>

    {progress.completedDays.includes(5) && <Card className="p-6 bg-gradient-to-r from-purple-500 to-pink-500 text-white">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center"><Star /></div>
          <div>
            <h3 className="font-semibold">Разблокируйте Premium!</h3>
            <p className="text-sm opacity-90">Эксклюзивные уроки и персональные рекомендации</p>
          </div>
        </div>
        <button onClick={openPremium} className="px-6 py-2 bg-white text-primary rounded-lg font-medium hover:bg-gray-100">Узнать больше</button>
      </div>
    </Card>}
  </section>;
}

function LearnView({ progress, openLesson, enableNotifications }: { progress: Progress; openLesson: (l: Lesson) => void; enableNotifications: () => void }) {
  return <section className="space-y-6 slide-up">
    <Card className="p-6 bg-gradient-to-r from-purple-50 to-pink-50">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Award className="w-6 h-6 text-primary" />30-дневная программа
          </h2>
          <p className="text-gray-600 mt-1">Укрепите здоровье шаг за шагом</p>
        </div>
        <div className="flex gap-4">
          <RoundStat value={progress.totalPoints} label="Баллов" color="yellow" />
          <RoundStat value={progress.streak} label="Дней подряд" color="orange" />
        </div>
      </div>
      <div className="mt-4">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Прогресс</span>
          <span>{progress.completedDays.length}/30 дней</span>
        </div>
        <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all" style={{ width: `${progress.completedDays.length / 30 * 100}%` }} />
        </div>
      </div>
    </Card>

    <button onClick={enableNotifications} className="w-full py-3 bg-primary text-white rounded-lg font-medium hover:bg-pink-600">
      Включить напоминания
    </button>

    <Card className="p-6">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <Award className="w-5 h-5 text-yellow-500" />Достижения
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {achievements.map((a) => (
          <div key={a.id} className={`p-3 rounded-xl text-center ${progress.achievements.includes(a.id) ? "bg-yellow-50" : "bg-gray-100 opacity-50"}`}>
            <div className="text-2xl mb-1">{a.icon}</div>
            <p className="text-xs font-medium">{a.title}</p>
          </div>
        ))}
      </div>
    </Card>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {lessons.map((lesson) => {
        const done = progress.completedDays.includes(lesson.id);
        const locked = lesson.id > progress.currentDay + 1 && !done;
        return <button key={lesson.id} disabled={locked} onClick={() => openLesson(lesson)} className={`lesson-card card p-5 text-left ${done ? "completed" : locked ? "locked" : ""}`}>
          <div className="flex justify-between items-start mb-3">
            <span className="text-xl font-bold">{lesson.id}</span>
            <span className="bg-pink-100 text-pink-700 px-2 py-1 rounded-full text-xs font-bold">+{lesson.xp} XP</span>
          </div>
          <h3 className="font-bold mb-1">{lesson.title}</h3>
          <p className="text-sm text-gray-500">
            {done ? "✓ Пройдено" : locked ? <span className="inline-flex items-center gap-1"><Lock className="w-3 h-3" />Заблокировано</span> : "▶ Доступно"}
          </p>
        </button>;
      })}
    </div>
  </section>;
}

function ArticlesView() {
  return <section className="space-y-6 slide-up">
    <Card className="p-6">
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <BookOpen className="w-6 h-6 text-primary" /> Полезная информация
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {articlesData.map((article) => (
          <a key={article.title} href={article.link} target="_blank" rel="noreferrer" className="block p-4 border border-gray-200 rounded-lg hover:border-primary bg-white transition">
            <h4 className="font-bold mb-1">{article.title}</h4>
            <p className="text-sm text-gray-500">{article.desc}</p>
          </a>
        ))}
      </div>
    </Card>
  </section>;
}
function CycleView({ cycle, setCycle, cycleMode, setCycleMode, openSelfExam, updateRemindersFromCycle }: any) {
  const [setupOpen, setSetupOpen] = useState(!cycle);
  const [lastPeriod, setLastPeriod] = useState(cycle?.lastPeriod || dateInput(new Date()));
  const [cycleLength, setCycleLength] = useState(cycle?.cycleLength || 28);
  const [periodLength, setPeriodLength] = useState(cycle?.periodLength || 5);
  const [menopauseDate, setMenopauseDate] = useState(cycle?.menopauseDate || dateInput(new Date()));
  const [month, setMonth] = useState(new Date());

  const todayCycleDay = calculateCycleDay(cycle);
  const next = nextPeriodDate(cycle);
  const ovulation = next ? addDays(next, -14) : null;

  const save = () => {
    const nextCycle = cycleMode === "menopause"
      ? { menopauseDate }
      : { lastPeriod, cycleLength: Number(cycleLength), periodLength: Number(periodLength) };

    setCycle(nextCycle);
    setSetupOpen(false);
    setTimeout(() => updateRemindersFromCycle(), 0);
  };

  const reset = () => {
    if (confirm("Сбросить настройки цикла?")) {
      setCycle(null);
      setSetupOpen(true);
    }
  };

  return <section className="space-y-6 slide-up">
    {setupOpen ? (
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">Настройка трекера</h2>

        <div className="space-y-4 max-w-md">
          <div>
            <label className="block text-sm font-medium mb-2">Режим</label>
            <div className="flex gap-2">
              <button
                onClick={() => setCycleMode("menstrual")}
                className={`flex-1 py-2 px-4 border-2 rounded-lg font-medium ${
                  cycleMode === "menstrual"
                    ? "border-primary bg-pink-50 text-primary"
                    : "border-gray-200 text-gray-600"
                }`}
              >
                Менструальный цикл
              </button>

              <button
                onClick={() => setCycleMode("menopause")}
                className={`flex-1 py-2 px-4 border-2 rounded-lg font-medium ${
                  cycleMode === "menopause"
                    ? "border-primary bg-blue-50 text-primary"
                    : "border-gray-200 text-gray-600"
                }`}
              >
                Менопауза
              </button>
            </div>
          </div>

          {cycleMode === "menstrual" ? (
            <>
              <Input label="Дата последних месячных" type="date" value={lastPeriod} onChange={setLastPeriod} />
              <Input label="Длина цикла (дни)" type="number" value={cycleLength} onChange={setCycleLength} />
              <Input label="Длина месячных (дни)" type="number" value={periodLength} onChange={setPeriodLength} />
            </>
          ) : (
            <>
              <Input label="Дата наступления менопаузы" type="date" value={menopauseDate} onChange={setMenopauseDate} />
              <div className="mt-4 p-4 bg-blue-50 rounded-lg text-sm text-blue-700">
                <h4 className="font-medium text-blue-800 mb-2">О менопаузе</h4>
                <p>
                  После менопаузы риск рака молочной железы увеличивается.
                  Важно регулярно проходить маммографию, продолжать самообследование
                  и поддерживать здоровый вес.
                </p>
              </div>
            </>
          )}

          <div className="flex gap-2">
            <button onClick={save} className="flex-1 py-3 bg-primary text-white rounded-lg hover:bg-pink-600 font-medium">
              Сохранить
            </button>
            <button onClick={reset} className="py-3 px-4 bg-gray-200 rounded-lg">
              Сброс
            </button>
          </div>
        </div>
      </Card>
    ) : (
      <>
        {cycleMode === "menopause" ? (
          <MenopauseView cycle={cycle} />
        ) : (
          <MenstrualView
            cycle={cycle}
            month={month}
            setMonth={setMonth}
            todayCycleDay={todayCycleDay}
            next={next}
            ovulation={ovulation}
            openSelfExam={openSelfExam}
          />
        )}

        <div className="text-center">
          <button onClick={() => setSetupOpen(true)} className="text-sm text-gray-500 hover:text-primary">
            <Settings className="w-4 h-4 inline" /> Изменить настройки
          </button>
        </div>
      </>
    )}
  </section>;
}

function MenstrualView({ cycle, month, setMonth, todayCycleDay, next, ovulation, openSelfExam }: any) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const first = new Date(year, monthIndex, 1);
  const last = new Date(year, monthIndex + 1, 0);

  let startDay = first.getDay() - 1;
  if (startDay < 0) startDay = 6;

  const cells: (Date | null)[] = Array(startDay).fill(null);
  for (let day = 1; day <= last.getDate(); day++) {
    cells.push(new Date(year, monthIndex, day));
  }

  return <div className="space-y-6">
    <Card className="p-6 bg-gradient-to-r from-pink-50 to-purple-50">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <p className="text-sm text-gray-600">Сегодня</p>
          <p className="text-4xl font-bold">День <span>{todayCycleDay || "—"}</span></p>
        </div>

        <div className="flex gap-4">
          <RoundStat value={next ? Math.max(0, daysBetween(new Date(), next)) : "—"} label="до месячных" color="red" />
          <RoundStat value={ovulation ? Math.max(0, daysBetween(new Date(), ovulation)) : "—"} label="до овуляции" color="purple" />
        </div>
      </div>
    </Card>

    {todayCycleDay && todayCycleDay >= 5 && todayCycleDay <= 7 && (
      <Card className="p-4 bg-cyan-50 border-cyan-200">
        <div className="flex items-start gap-3">
          <IconBubble color="cyan"><Bell className="w-5 h-5" /></IconBubble>
          <div className="flex-1">
            <p className="font-medium text-cyan-800">Время для самообследования!</p>
            <p className="text-sm text-cyan-700">Оптимальный период (5-7 день).</p>
          </div>
          <button onClick={openSelfExam} className="px-3 py-1 bg-cyan-600 text-white text-sm rounded-lg">
            Начать
          </button>
        </div>
      </Card>
    )}

    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setMonth(new Date(year, monthIndex - 1, 1))} className="p-2 hover:bg-gray-100 rounded-lg">
          <ChevronLeft />
        </button>
        <h3 className="text-lg font-semibold">
          {month.toLocaleDateString("ru-RU", { month: "long", year: "numeric" })}
        </h3>
        <button onClick={() => setMonth(new Date(year, monthIndex + 1, 1))} className="p-2 hover:bg-gray-100 rounded-lg">
          <ChevronRight />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2 text-center text-xs font-medium text-gray-500">
        {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map(d => <div key={d}>{d}</div>)}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((date, index) => {
          const phase = date ? getDayPhase(cycle, date) : null;
          const isToday = date?.toDateString() === new Date().toDateString();

          return <div key={index} className={`calendar-day ${isToday ? "today" : ""} ${phase || ""}`}>
            {date?.getDate()}
          </div>;
        })}
      </div>

      <div className="flex flex-wrap gap-4 mt-6 pt-4 border-t">
        <Legend color="bg-red-200" text="Месячные" />
        <Legend color="bg-purple-200" text="Овуляция" />
        <Legend color="bg-cyan-100" text="Самообследование" />
      </div>
    </Card>

    <Card className="p-6">
      <h3 className="font-semibold mb-4">Прогноз на 3 месяца</h3>
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => {
          const start = next && cycle?.cycleLength ? addDays(next, i * cycle.cycleLength) : null;
          const end = start && cycle?.periodLength ? addDays(start, cycle.periodLength - 1) : null;

          return <div key={i} className="p-3 bg-gray-50 rounded-lg flex justify-between">
            <span className="font-medium">{start ? start.toLocaleDateString("ru-RU", { month: "long" }) : "—"}</span>
            <span className="text-sm text-gray-500">{start && end ? `${start.getDate()} - ${end.getDate()}` : "—"}</span>
          </div>;
        })}
      </div>
    </Card>
  </div>;
}

function MenopauseView({ cycle }: { cycle: CycleData | null }) {
  const date = cycle?.menopauseDate ? new Date(cycle.menopauseDate) : null;
  const months = date ? Math.max(0, Math.floor(daysBetween(date, new Date()) / 30.44)) : 0;
  const years = Math.floor(months / 12);

  return <div className="space-y-6">
    <Card className="p-6 bg-gradient-to-r from-blue-50 to-teal-50">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-3xl">🌸</div>
        <div>
          <p className="text-4xl font-bold">Менопауза</p>
          <p className="text-lg text-blue-600">Активный режим</p>
          <p className="text-gray-600 mt-2">
            {date ? `Менопауза наступила ${years > 0 ? `${years} лет` : `${months} мес.`} назад` : "Дата не указана"}
          </p>
        </div>
      </div>
    </Card>

    <Card className="p-6">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <Heart className="w-5 h-5 text-red-500" /> Рекомендации для вас
      </h3>
      <div className="space-y-3">
        <InfoRow icon={<Activity />} title="Маммография" text="После менопаузы рекомендуется проходить ежегодно" color="pink" />
        <InfoRow icon={<CheckCircle />} title="Самообследование" text="Продолжайте делать ежемесячно" color="green" />
        <InfoRow icon={<Target />} title="Здоровый образ жизни" text="Контролируйте вес, занимайтесь спортом" color="blue" />
      </div>
    </Card>

    <Card className="p-4 bg-orange-50 border-orange-200">
      <div className="flex gap-3">
        <IconBubble color="orange"><Bell className="w-5 h-5" /></IconBubble>
        <div>
          <p className="font-medium text-orange-800">Напоминание о маммографии</p>
          <p className="text-sm text-orange-700">Проверьте, когда вы проходили последнюю маммографию.</p>
        </div>
      </div>
    </Card>
  </div>;
}

function ClinicsView() {
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [selected, setSelected] = useState(clinicsData[0]);

  const filtered = clinicsData.filter(c =>
    (!search || `${c.name} ${c.address}`.toLowerCase().includes(search.toLowerCase())) &&
    (!type || c.type === type)
  );

  const mapSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${selected.lng - 0.025}%2C${selected.lat - 0.015}%2C${selected.lng + 0.025}%2C${selected.lat + 0.015}&layer=mapnik&marker=${selected.lat}%2C${selected.lng}`;

  return <section className="space-y-6 slide-up">
    <Card className="p-6">
      <h2 className="text-2xl font-bold mb-2">Клиники маммографии</h2>
      <p className="text-gray-600 mb-6">Найдите ближайший центр в Астане.</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex gap-3">
            <input value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 px-4 py-2 border rounded-lg" placeholder="Поиск..." />
            <select value={type} onChange={(e) => setType(e.target.value)} className="px-4 py-2 border rounded-lg">
              <option value="">Все</option>
              <option value="public">Гос.</option>
              <option value="private">Частные</option>
              <option value="research">Онкоцентр</option>
            </select>
          </div>

          <iframe title="Карта клиник" src={mapSrc} className="w-full h-[400px] rounded-lg border-0 bg-gray-200" />
        </div>

        <div>
          <h3 className="font-semibold mb-3">Список</h3>
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
            {filtered.map(c => (
              <button
                key={c.id}
                onClick={() => setSelected(c)}
                className={`w-full text-left p-3 border rounded-lg hover:border-primary bg-white ${selected.id === c.id ? "border-primary" : ""}`}
              >
                <p className="font-medium">{c.name}</p>
                <p className="text-xs text-gray-500">{c.address}</p>
                <a
                  className="text-xs text-primary mt-1 inline-block"
                  href={`https://www.google.com/maps/search/?api=1&query=${c.lat},${c.lng}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Открыть маршрут
                </a>
              </button>
            ))}
          </div>
        </div>
      </div>
    </Card>
  </section>;
}

function AboutView() {
  return <section className="space-y-6 slide-up">
    <Card className="p-8 text-center bg-gradient-to-br from-pink-50 to-white">
      <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 text-primary">
        <Heart className="w-10 h-10 fill-primary/20" />
      </div>
      <h2 className="text-3xl font-bold mb-2">О проекте MammoCare</h2>
      <p className="text-lg text-gray-600 max-w-2xl mx-auto">
        Проект MammoCare был создан нашей командой девушек как ответ на одну из самых острых и недооценённых проблем здоровья женщин в Казахстане — высокий уровень заболеваемости и смертности от рака молочной железы.
      </p>
    </Card>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card className="p-6">
        <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
          <Target className="w-5 h-5 text-primary" /> Миссия
        </h3>
        <p className="text-gray-600">
          Снизить смертность от рака молочной железы за счёт раннего выявления, цифрового мониторинга здоровья и доступной профилактики.
        </p>
      </Card>

      <Card className="p-6">
        <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
          <Mail className="w-5 h-5 text-purple-500" /> Контакты
        </h3>
        <p className="text-gray-600">
          Instagram: <a href="https://instagram.com/qyzqylttaspa" target="_blank" rel="noreferrer" className="text-primary font-medium">@qyzqylttaspa</a>
        </p>
        <p className="text-gray-600">
          Email: <span className="text-primary font-medium">team@mammocare.kz</span>
        </p>
      </Card>
    </div>
  </section>;
}

function AccountView({ currentUser, setCurrentUser, setAuthOpen, progress, reminders, setReminders, enableNotifications, updateRemindersFromCycle }: any) {
  const logout = () => {
    setCurrentUser(null);
  };

  return <section className="space-y-6 slide-up">
    {currentUser ? (
      <Card className="p-8 bg-gradient-to-r from-purple-500 to-pink-500 text-white">
        <div className="flex items-center gap-6 mb-6">
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center">
            <User className="w-10 h-10" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">{currentUser.name}</h2>
            <p className="opacity-90">{currentUser.email}</p>
            <p className="text-sm opacity-80 mt-1">С нами с {formatDate(currentUser.registered)}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <AccountStat value={progress.totalPoints} label="Баллов" />
          <AccountStat value={progress.streak} label="Дней подряд" />
          <AccountStat value={progress.completedDays.length} label="Дней пройдено" />
          <AccountStat value={progress.achievements.length} label="Достижений" />
        </div>

        <button onClick={logout} className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm inline-flex items-center gap-2">
          <LogOut className="w-4 h-4" />Выйти
        </button>
      </Card>
    ) : (
      <Card className="p-8 text-center">
        <div className="w-20 h-20 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
          <User className="w-10 h-10 text-gray-400" />
        </div>
        <h3 className="text-xl font-semibold mb-2">Вы не авторизованы</h3>
        <p className="text-gray-600 mb-4">Войдите в аккаунт, чтобы сохранять прогресс обучения и персональные данные</p>
        <button onClick={() => setAuthOpen(true)} className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-pink-600 font-medium">
          Войти / Регистрация
        </button>
      </Card>
    )}

    <Card className="p-6">
      <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
        <Bell className="w-5 h-5 text-primary" /> Напоминания
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Input
          label="Дата последней маммографии"
          type="date"
          value={reminders.lastMammogram}
          onChange={(value: string) => {
            setReminders({ ...reminders, lastMammogram: value });
            setTimeout(() => updateRemindersFromCycle(value), 0);
          }}
        />

        <div>
          <label className="block text-sm font-medium mb-1">Статус уведомлений</label>
          <button onClick={enableNotifications} className="w-full px-4 py-2 bg-primary text-white rounded-lg">
            {reminders.notificationsEnabled ? "Уведомления включены" : "Включить уведомления"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="p-4 bg-cyan-50 rounded-lg">
          <p className="text-sm text-cyan-700">Следующее самообследование</p>
          <p className="text-xl font-bold text-cyan-900">{formatDate(reminders.nextSelfExam)}</p>
        </div>
        <div className="p-4 bg-orange-50 rounded-lg">
          <p className="text-sm text-orange-700">Следующая маммография</p>
          <p className="text-xl font-bold text-orange-900">{formatDate(reminders.nextMammogram)}</p>
        </div>
      </div>

      {reminders.note && <p className="text-sm text-gray-500 mt-3">{reminders.note}</p>}
    </Card>
  </section>;
}

function RiskModal({ t, setRiskData, onClose }: { t: any; setRiskData: (r: RiskData) => void; onClose: () => void }) {
  const [age, setAge] = useState("35");
  const [weight, setWeight] = useState("65");
  const [height, setHeight] = useState("165");
  const [family, setFamily] = useState("0");
  const [smoke, setSmoke] = useState("0");
  const [symptoms, setSymptoms] = useState("0");
  const [result, setResult] = useState<RiskData | null>(null);

  const calculate = () => {
    let score = 0;
    const a = Number(age) || 30;

    if (a >= 60) score += 3;
    else if (a >= 40) score += 2;
    else if (a >= 30) score += 1;

    let bmi = 0;
    if (Number(weight) > 0 && Number(height) > 0) {
      bmi = Number(weight) / Math.pow(Number(height) / 100, 2);
      if (bmi >= 30) score += 2;
      else if (bmi >= 25) score += 1;
    }

    score += Number(family) + Number(smoke) + Number(symptoms);

    const level = score <= 3 ? "risk_low" : score <= 7 ? "risk_moderate" : "risk_high";
    const data = { level, bmi: bmi ? bmi.toFixed(1) : null, score } as RiskData;

    setResult(data);
    setRiskData(data);
  };

  const advice = result?.level === "risk_low" ? "risk_adv_low" : result?.level === "risk_moderate" ? "risk_adv_mod" : "risk_adv_high";

  return <Modal onClose={onClose}>
    <div className="bg-white rounded-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4 text-primary">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold">Добро пожаловать!</h2>
        <p className="text-gray-600 mt-2">Ответьте на вопросы для расчета риска</p>
      </div>

      <div className="space-y-4">
        <Input label="Ваш возраст" type="number" value={age} onChange={setAge} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Вес (кг)" type="number" value={weight} onChange={setWeight} />
          <Input label="Рост (см)" type="number" value={height} onChange={setHeight} />
        </div>
        <Select label="Наследственность" value={family} onChange={setFamily} options={[["0", "Нет"], ["1", "Дальние родственники"], ["2", "Мама/сестра"]]} />
        <Select label="Курение" value={smoke} onChange={setSmoke} options={[["0", "Не курю"], ["1", "Бросила"], ["2", "Курю"]]} />
        <Select label="Жалобы" value={symptoms} onChange={setSymptoms} options={[["0", "Нет"], ["1", "Дискомфорт"], ["3", "Уплотнения/боль"]]} />
        <button onClick={calculate} className="w-full py-3 bg-primary text-white rounded-lg hover:bg-pink-600 font-medium">Рассчитать</button>
        <button onClick={onClose} className="w-full py-2 text-gray-500 text-sm">Пропустить</button>
      </div>

      {result && (
        <div className="mt-6 p-4 rounded-lg text-center bg-pink-50">
          <p className="text-lg font-bold">{t(result.level)}</p>
          <p className="text-sm mt-2">{t(advice)}</p>
          <button onClick={onClose} className="mt-4 px-6 py-2 bg-primary text-white rounded-lg">Продолжить</button>
        </div>
      )}
    </div>
  </Modal>;
}

function SelfExamModal({ onClose }: { onClose: () => void }) {
  const steps = [
    { text: "Осмотрите грудь в зеркале", check: "Есть ли изменения формы?", risk: 2 },
    { text: "Поднимите руки вверх", check: "Есть ли втяжения кожи?", risk: 3 },
    { text: "Проверьте кожу", check: "Покраснение или шелушение?", risk: 2 },
    { text: "Пальпация груди", check: "Есть ли уплотнения?", risk: 5 },
    { text: "Проверьте подмышки", check: "Есть ли узлы?", risk: 4 },
  ];

  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const score = answers.reduce((sum, answer, i) => sum + (answer ? steps[i].risk : 0), 0);
  const done = index >= steps.length;

  const answer = (value: number) => {
    setAnswers([...answers, value]);
    setIndex(index + 1);
    writeStorage("lastExam", Date.now());
  };

  const result = score >= 8
    ? { text: "❗ Срочно к врачу", color: "text-red-600" }
    : score >= 4
      ? { text: "⚠️ Есть подозрения", color: "text-yellow-600" }
      : { text: "✅ Всё нормально", color: "text-green-600" };

  return <Modal onClose={onClose}>
    <div className="bg-white rounded-2xl w-full max-w-md p-6 relative">
      <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"><X /></button>
      <h2 className="text-xl font-bold mb-4">Самообследование</h2>

      <div className="mb-4">
        <div className="relative pb-[56.25%] h-0 overflow-hidden rounded-xl">
          <iframe className="absolute inset-0 w-full h-full" src="https://www.youtube.com/embed/Y5y6hrHbZtU" title="Самообследование груди" allowFullScreen />
        </div>
        <p className="text-sm text-gray-500 mt-2 text-center">Видео: Как проводить самообследование</p>
      </div>

      {done ? (
        <div>
          <p className={`font-bold ${result.color} mb-4 text-lg`}>{result.text}</p>
          <p className="text-sm text-gray-600 mb-4">Если вы заметили изменение, обратитесь к врачу. Самотест не заменяет диагностику.</p>
          <button onClick={onClose} className="w-full py-2 bg-gray-200 rounded-lg">Закрыть</button>
        </div>
      ) : (
        <div>
          <p className="font-medium mb-2">{steps[index].text}</p>
          <p className="text-sm text-gray-600 mb-4">{steps[index].check}</p>
          <div className="flex gap-2">
            <button onClick={() => answer(0)} className="flex-1 py-2 bg-green-100 rounded hover:bg-green-200">Нет</button>
            <button onClick={() => answer(1)} className="flex-1 py-2 bg-red-100 rounded hover:bg-red-200">Да</button>
          </div>
          <p className="text-xs mt-3 text-gray-400">Шаг {index + 1}/{steps.length}</p>
        </div>
      )}
    </div>
  </Modal>;
}

function LessonModal({ lesson, progress, onClose, onComplete }: { lesson: Lesson; progress: Progress; onClose: () => void; onComplete: (l: Lesson) => void }) {
  return <Modal onClose={onClose}>
    <div className="bg-white rounded-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto relative">
      <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X /></button>

      <div className="text-center mb-6">
        <p className="text-sm text-gray-500">Урок {lesson.id}</p>
        <h2 className="text-xl font-bold">{lesson.title}</h2>
      </div>

      <div className="prose prose-pink max-w-none" dangerouslySetInnerHTML={{ __html: lesson.content }} />

      {lesson.quiz && (
        <div className="mt-6 pt-6 border-t">
          <h4 className="font-semibold mb-3">Проверьте свои знания</h4>
          {lesson.quiz.map((q, i) => (
            <div key={q.q} className="mb-4">
              <p className="font-medium mb-2">{i + 1}. {q.q}</p>
              {q.options.map((opt, j) => (
                <label key={opt} className="flex items-center gap-2 p-2 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input type="radio" name={`q${i}`} defaultChecked={j === q.answer} />
                  {opt}
                </label>
              ))}
            </div>
          ))}
        </div>
      )}

      <button onClick={() => onComplete(lesson)} className="w-full mt-6 py-3 bg-primary text-white rounded-lg font-medium">
        {progress.completedDays.includes(lesson.id) ? "Закрыть" : `Завершить урок (+${lesson.xp} XP)`}
      </button>
    </div>
  </Modal>;
}

