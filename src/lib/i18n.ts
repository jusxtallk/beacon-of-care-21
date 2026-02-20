export type Language = "en" | "zh" | "ms" | "ta";

export interface LanguageOption {
  code: Language;
  label: string;
  nativeLabel: string;
}

export const LANGUAGES: LanguageOption[] = [
  { code: "en", label: "English", nativeLabel: "English" },
  { code: "zh", label: "Chinese", nativeLabel: "中文" },
  { code: "ms", label: "Malay", nativeLabel: "Bahasa Melayu" },
  { code: "ta", label: "Tamil", nativeLabel: "தமிழ்" },
];

type TranslationKey =
  | "app_name"
  | "good_morning"
  | "good_afternoon"
  | "good_evening"
  | "checkin_prompt"
  | "im_ok"
  | "done"
  | "checkin"
  | "history"
  | "settings"
  | "checkin_history"
  | "no_checkins"
  | "tap_to_start"
  | "checked_in"
  | "last_checkin"
  | "no_checkins_yet"
  | "just_now"
  | "minutes_ago"
  | "hours_ago"
  | "data_sharing"
  | "data_sharing_desc"
  | "battery_level"
  | "battery_desc"
  | "app_usage"
  | "app_usage_desc"
  | "location"
  | "location_desc"
  | "notifications"
  | "notifications_desc"
  | "daily_reminder"
  | "daily_reminder_desc"
  | "privacy_title"
  | "privacy_desc"
  | "sign_out"
  | "language"
  | "language_desc"
  | "profile"
  | "control_privacy"
  | "face_scan_prompt"
  | "place_face_in_oval"
  | "scanning"
  | "face_detected"
  | "face_not_detected"
  | "attempts_remaining"
  | "manual_checkin"
  | "upload_photo"
  | "photo_required"
  | "save"
  | "cancel"
  | "today"
  | "yesterday";

type Translations = Record<TranslationKey, string>;

const translations: Record<Language, Translations> = {
  en: {
    app_name: "SafeCheck",
    good_morning: "Good Morning ☀️",
    good_afternoon: "Good Afternoon 🌤",
    good_evening: "Good Evening 🌙",
    checkin_prompt: "Tap the button to let everyone know you're doing well",
    im_ok: "I'm OK",
    done: "Done!",
    checkin: "Check In",
    history: "History",
    settings: "Settings",
    checkin_history: "Check-in History",
    no_checkins: "No check-ins yet",
    tap_to_start: "Tap \"I'm OK\" to start",
    checked_in: "Checked in",
    last_checkin: "Last check-in",
    no_checkins_yet: "No check-ins yet",
    just_now: "Just now",
    minutes_ago: "m ago",
    hours_ago: "h ago",
    data_sharing: "Data Sharing",
    data_sharing_desc: "Choose what information to share with your care team",
    battery_level: "Battery Level",
    battery_desc: "Share your phone's battery status",
    app_usage: "App Usage",
    app_usage_desc: "Share when you last used your phone",
    location: "Location",
    location_desc: "Share your approximate location",
    notifications: "Notifications",
    notifications_desc: "Manage your reminders",
    daily_reminder: "Daily Reminder",
    daily_reminder_desc: "Get a daily reminder to check in",
    privacy_title: "Your Privacy Matters",
    privacy_desc: "All shared data is only visible to your designated care team. You can change these settings at any time.",
    sign_out: "Sign Out",
    language: "Language",
    language_desc: "Choose your preferred language",
    profile: "Profile",
    control_privacy: "Control your privacy and preferences",
    face_scan_prompt: "Place your face in the oval to check in",
    place_face_in_oval: "Position your face within the oval",
    scanning: "Scanning...",
    face_detected: "Face detected! Checking in...",
    face_not_detected: "Face not detected. Please try again.",
    attempts_remaining: "attempts remaining",
    manual_checkin: "Check In Manually",
    upload_photo: "Upload Photo",
    photo_required: "A profile photo is required",
    save: "Save",
    cancel: "Cancel",
    today: "Today",
    yesterday: "Yesterday",
  },
  zh: {
    app_name: "安全签到",
    good_morning: "早上好 ☀️",
    good_afternoon: "下午好 🌤",
    good_evening: "晚上好 🌙",
    checkin_prompt: "点击按钮让大家知道您一切安好",
    im_ok: "我很好",
    done: "完成！",
    checkin: "签到",
    history: "记录",
    settings: "设置",
    checkin_history: "签到记录",
    no_checkins: "暂无签到记录",
    tap_to_start: "点击「我很好」开始签到",
    checked_in: "已签到",
    last_checkin: "上次签到",
    no_checkins_yet: "暂无签到记录",
    just_now: "刚刚",
    minutes_ago: "分钟前",
    hours_ago: "小时前",
    data_sharing: "数据共享",
    data_sharing_desc: "选择与您的护理团队共享哪些信息",
    battery_level: "电池电量",
    battery_desc: "共享您手机的电池状态",
    app_usage: "应用使用",
    app_usage_desc: "共享您上次使用手机的时间",
    location: "位置",
    location_desc: "共享您的大致位置",
    notifications: "通知",
    notifications_desc: "管理您的提醒",
    daily_reminder: "每日提醒",
    daily_reminder_desc: "获取每日签到提醒",
    privacy_title: "您的隐私很重要",
    privacy_desc: "所有共享数据仅对您指定的护理团队可见。您可以随时更改这些设置。",
    sign_out: "退出登录",
    language: "语言",
    language_desc: "选择您偏好的语言",
    profile: "个人资料",
    control_privacy: "控制您的隐私和偏好",
    face_scan_prompt: "将您的脸放入椭圆框内进行签到",
    place_face_in_oval: "请将脸部对准椭圆框内",
    scanning: "扫描中...",
    face_detected: "已检测到面部！正在签到...",
    face_not_detected: "未检测到面部，请重试。",
    attempts_remaining: "次尝试剩余",
    manual_checkin: "手动签到",
    upload_photo: "上传照片",
    photo_required: "需要上传个人照片",
    save: "保存",
    cancel: "取消",
    today: "今天",
    yesterday: "昨天",
  },
  ms: {
    app_name: "SafeCheck",
    good_morning: "Selamat Pagi ☀️",
    good_afternoon: "Selamat Petang 🌤",
    good_evening: "Selamat Malam 🌙",
    checkin_prompt: "Tekan butang untuk memberitahu semua orang anda sihat",
    im_ok: "Saya OK",
    done: "Selesai!",
    checkin: "Daftar Masuk",
    history: "Sejarah",
    settings: "Tetapan",
    checkin_history: "Sejarah Daftar Masuk",
    no_checkins: "Belum ada daftar masuk",
    tap_to_start: "Tekan \"Saya OK\" untuk mula",
    checked_in: "Telah daftar masuk",
    last_checkin: "Daftar masuk terakhir",
    no_checkins_yet: "Belum ada daftar masuk",
    just_now: "Baru sahaja",
    minutes_ago: "minit lalu",
    hours_ago: "jam lalu",
    data_sharing: "Perkongsian Data",
    data_sharing_desc: "Pilih maklumat yang ingin dikongsi dengan pasukan penjagaan anda",
    battery_level: "Tahap Bateri",
    battery_desc: "Kongsi status bateri telefon anda",
    app_usage: "Penggunaan Aplikasi",
    app_usage_desc: "Kongsi bila anda terakhir menggunakan telefon",
    location: "Lokasi",
    location_desc: "Kongsi lokasi anggaran anda",
    notifications: "Pemberitahuan",
    notifications_desc: "Urus peringatan anda",
    daily_reminder: "Peringatan Harian",
    daily_reminder_desc: "Dapatkan peringatan harian untuk daftar masuk",
    privacy_title: "Privasi Anda Penting",
    privacy_desc: "Semua data yang dikongsi hanya boleh dilihat oleh pasukan penjagaan anda. Anda boleh menukar tetapan ini pada bila-bila masa.",
    sign_out: "Log Keluar",
    language: "Bahasa",
    language_desc: "Pilih bahasa pilihan anda",
    profile: "Profil",
    control_privacy: "Kawal privasi dan keutamaan anda",
    face_scan_prompt: "Letakkan muka anda dalam bujur untuk daftar masuk",
    place_face_in_oval: "Letakkan muka anda di dalam bujur",
    scanning: "Mengimbas...",
    face_detected: "Muka dikesan! Mendaftar masuk...",
    face_not_detected: "Muka tidak dikesan. Sila cuba lagi.",
    attempts_remaining: "percubaan berbaki",
    manual_checkin: "Daftar Masuk Manual",
    upload_photo: "Muat Naik Foto",
    photo_required: "Foto profil diperlukan",
    save: "Simpan",
    cancel: "Batal",
    today: "Hari Ini",
    yesterday: "Semalam",
  },
  ta: {
    app_name: "பாதுகாப்பு சோதனை",
    good_morning: "காலை வணக்கம் ☀️",
    good_afternoon: "மதிய வணக்கம் 🌤",
    good_evening: "மாலை வணக்கம் 🌙",
    checkin_prompt: "நீங்கள் நலமாக இருப்பதை அனைவருக்கும் தெரிவிக்க பொத்தானை அழுத்தவும்",
    im_ok: "நான் நலம்",
    done: "முடிந்தது!",
    checkin: "பதிவு",
    history: "வரலாறு",
    settings: "அமைப்புகள்",
    checkin_history: "பதிவு வரலாறு",
    no_checkins: "இதுவரை பதிவுகள் இல்லை",
    tap_to_start: "தொடங்க \"நான் நலம்\" அழுத்தவும்",
    checked_in: "பதிவு செய்யப்பட்டது",
    last_checkin: "கடைசி பதிவு",
    no_checkins_yet: "இதுவரை பதிவுகள் இல்லை",
    just_now: "இப்போது",
    minutes_ago: "நிமிடங்கள் முன்",
    hours_ago: "மணி நேரம் முன்",
    data_sharing: "தரவு பகிர்வு",
    data_sharing_desc: "உங்கள் பராமரிப்பு குழுவுடன் பகிர வேண்டிய தகவல்களைத் தேர்ந்தெடுக்கவும்",
    battery_level: "பேட்டரி நிலை",
    battery_desc: "உங்கள் தொலைபேசியின் பேட்டரி நிலையைப் பகிரவும்",
    app_usage: "செயலி பயன்பாடு",
    app_usage_desc: "நீங்கள் கடைசியாக தொலைபேசியைப் பயன்படுத்திய நேரத்தைப் பகிரவும்",
    location: "இடம்",
    location_desc: "உங்கள் தோராயமான இருப்பிடத்தைப் பகிரவும்",
    notifications: "அறிவிப்புகள்",
    notifications_desc: "உங்கள் நினைவூட்டல்களை நிர்வகிக்கவும்",
    daily_reminder: "தினசரி நினைவூட்டல்",
    daily_reminder_desc: "பதிவு செய்ய தினசரி நினைவூட்டல் பெறவும்",
    privacy_title: "உங்கள் தனியுரிமை முக்கியம்",
    privacy_desc: "பகிரப்பட்ட அனைத்து தரவும் உங்கள் நியமிக்கப்பட்ட பராமரிப்பு குழுவிற்கு மட்டுமே தெரியும். இந்த அமைப்புகளை எந்த நேரத்திலும் மாற்றலாம்.",
    sign_out: "வெளியேறு",
    language: "மொழி",
    language_desc: "உங்களுக்கு விருப்பமான மொழியைத் தேர்ந்தெடுக்கவும்",
    profile: "சுயவிவரம்",
    control_privacy: "உங்கள் தனியுரிமை மற்றும் விருப்பங்களைக் கட்டுப்படுத்தவும்",
    face_scan_prompt: "பதிவு செய்ய உங்கள் முகத்தை நீள்வட்டத்தில் வைக்கவும்",
    place_face_in_oval: "உங்கள் முகத்தை நீள்வட்டத்திற்குள் வைக்கவும்",
    scanning: "ஸ்கேன் செய்கிறது...",
    face_detected: "முகம் கண்டறியப்பட்டது! பதிவு செய்கிறது...",
    face_not_detected: "முகம் கண்டறியப்படவில்லை. மீண்டும் முயற்சிக்கவும்.",
    attempts_remaining: "முயற்சிகள் மீதமுள்ளன",
    manual_checkin: "கைமுறையாக பதிவு செய்",
    upload_photo: "புகைப்படம் பதிவேற்றம்",
    photo_required: "சுயவிவர புகைப்படம் தேவை",
    save: "சேமி",
    cancel: "ரத்து",
    today: "இன்று",
    yesterday: "நேற்று",
  },
};

export const t = (key: TranslationKey, lang: Language): string => {
  return translations[lang]?.[key] || translations.en[key] || key;
};
