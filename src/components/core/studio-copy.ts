"use client";

import { useLocale } from "@/lib/i18n";

export const studioCopy = {
  ru: {
    generator: "Генератор контента", generatorNote: "От идеи к видео, звуку, изображению и персонажу.",
    types: ["Видео", "Аудио", "Голос", "Изображение", "Аватар"],
    hints: ["Сценарий и видеоряд", "Музыка и звуковое оформление", "Текст для озвучки", "Сцена и визуальный стиль", "Персонаж и сценарий"],
    open: "Открыть", create: "Создать", prompt: "Описание", placeholder: "Опишите идею, стиль и желаемый результат…",
    format: "Формат", formats: ["Горизонтальный", "Вертикальный", "Квадратный"], style: "Стиль", styles: ["HayDevOS · Стекло и свет", "Кинематографический", "Минималистичный"],
    preview: "Предпросмотр", previewEmpty: "Результат появится после подключения сервиса генерации.",
    mediaUnavailable: "Генерация медиа пока не подключена.", generate: "Запустить генерацию", prepare: "Составить задание с Owner AI", preparing: "Отправка…",
    request: "Подготовь задание для создания {type}. Формат: {format}. Стиль: {style}. Описание: {prompt}",
    editor: "Монтажная", project: "Новый монтаж", back: "Назад", import: "Добавить медиа", download: "Скачать проект", export: "Экспорт видео",
    exportUnavailable: "Экспорт готового видео пока не подключён. Можно скачать настройки проекта.",
    tools: ["Медиа", "Шаблоны", "Текст", "Аудио", "Озвучка", "Субтитры", "Эффекты", "Фильтры", "Бренд", "AI-инструменты"],
    empty: "Добавьте видео, изображение или аудио", local: "Предпросмотр использует выбранный файл на этом устройстве.",
    play: "Воспроизвести", pause: "Пауза", seek: "Позиция воспроизведения", tracks: ["Видео", "Текст", "Аудио"],
    inspector: "Свойства", position: "Положение", scale: "Масштаб", rotation: "Поворот", opacity: "Непрозрачность", color: "Цвет", text: "Текст на экране",
    trimStart: "Начало фрагмента", trimEnd: "Конец фрагмента", seconds: "с", subtitle: "Текст субтитров", brand: "Фирменная подпись", filter: "Фильтр", filters: ["Без фильтра", "Чёрно-белый", "Сепия"],
    audioNote: "Добавьте аудиофайл через «Добавить медиа», чтобы прослушать его.", voiceNote: "Озвучка доступна в генераторе после подключения сервиса.",
    templatesNote: "Выберите формат композиции.", effectsNote: "Настройте масштаб, поворот и прозрачность в свойствах.",
    fileError: "Выберите видео, изображение или аудиофайл.", loadError: "Не удалось открыть файл. Попробуйте другой формат.", clear: "Убрать медиа",
  },
  en: {
    generator: "Content generator", generatorNote: "From an idea to video, sound, images and characters.",
    types: ["Video", "Audio", "Voice", "Image", "Avatar"],
    hints: ["Script and visuals", "Music and sound design", "Text to speech", "Scene and visual style", "Character and script"],
    open: "Open", create: "Create", prompt: "Description", placeholder: "Describe your idea, style and desired result…",
    format: "Format", formats: ["Landscape", "Portrait", "Square"], style: "Style", styles: ["HayDevOS · Glass and light", "Cinematic", "Minimal"],
    preview: "Preview", previewEmpty: "Results will appear when a generation service is connected.",
    mediaUnavailable: "Media generation is not connected yet.", generate: "Start generation", prepare: "Prepare a brief with Owner AI", preparing: "Sending…",
    request: "Prepare a brief to create {type}. Format: {format}. Style: {style}. Description: {prompt}",
    editor: "Editing room", project: "New edit", back: "Back", import: "Add media", download: "Download project", export: "Export video",
    exportUnavailable: "Video export is not connected yet. You can download the project settings.",
    tools: ["Media", "Templates", "Text", "Audio", "Voice", "Subtitles", "Effects", "Filters", "Brand", "AI tools"],
    empty: "Add a video, image or audio file", local: "The preview uses the file selected on this device.",
    play: "Play", pause: "Pause", seek: "Playback position", tracks: ["Video", "Text", "Audio"],
    inspector: "Properties", position: "Position", scale: "Scale", rotation: "Rotation", opacity: "Opacity", color: "Color", text: "On-screen text",
    trimStart: "Clip start", trimEnd: "Clip end", seconds: "s", subtitle: "Subtitle text", brand: "Brand signature", filter: "Filter", filters: ["None", "Grayscale", "Sepia"],
    audioNote: "Use Add media to select and preview an audio file.", voiceNote: "Voice generation becomes available when a service is connected.",
    templatesNote: "Choose the composition format.", effectsNote: "Adjust scale, rotation and opacity in Properties.",
    fileError: "Choose a video, image or audio file.", loadError: "This file could not be opened. Try another format.", clear: "Remove media",
  },
  hy: {
    generator: "Բովանդակության գեներատոր", generatorNote: "Գաղափարից դեպի տեսանյութ, ձայն, պատկեր և կերպար։",
    types: ["Տեսանյութ", "Աուդիո", "Ձայն", "Պատկեր", "Ավատար"],
    hints: ["Սցենար և տեսաշար", "Երաժշտություն և ձայնային ձևավորում", "Տեքստի ձայնավորում", "Տեսարան և տեսողական ոճ", "Կերպար և սցենար"],
    open: "Բացել", create: "Ստեղծել", prompt: "Նկարագրություն", placeholder: "Նկարագրեք գաղափարը, ոճը և ցանկալի արդյունքը…",
    format: "Ձևաչափ", formats: ["Հորիզոնական", "Ուղղահայաց", "Քառակուսի"], style: "Ոճ", styles: ["HayDevOS · Ապակի և լույս", "Կինեմատոգրաֆիկ", "Մինիմալիստական"],
    preview: "Նախադիտում", previewEmpty: "Արդյունքը կհայտնվի գեներացման ծառայությունը միացնելուց հետո։",
    mediaUnavailable: "Մեդիայի գեներացումը դեռ միացված չէ։", generate: "Սկսել գեներացումը", prepare: "Պատրաստել առաջադրանք Owner AI-ի հետ", preparing: "Ուղարկվում է…",
    request: "Պատրաստիր առաջադրանք՝ {type} ստեղծելու համար։ Ձևաչափ՝ {format}։ Ոճ՝ {style}։ Նկարագրություն՝ {prompt}",
    editor: "Մոնտաժային սենյակ", project: "Նոր մոնտաժ", back: "Հետ", import: "Ավելացնել մեդիա", download: "Ներբեռնել նախագիծը", export: "Արտահանել տեսանյութը",
    exportUnavailable: "Պատրաստի տեսանյութի արտահանումը դեռ միացված չէ։ Կարող եք ներբեռնել նախագծի կարգավորումները։",
    tools: ["Մեդիա", "Ձևանմուշներ", "Տեքստ", "Աուդիո", "Ձայնավորում", "Ենթագրեր", "Էֆեկտներ", "Զտիչներ", "Ապրանքանիշ", "ԱԲ գործիքներ"],
    empty: "Ավելացրեք տեսանյութ, պատկեր կամ աուդիո", local: "Նախադիտումն օգտագործում է այս սարքից ընտրված ֆայլը։",
    play: "Նվագարկել", pause: "Դադար", seek: "Նվագարկման դիրք", tracks: ["Տեսանյութ", "Տեքստ", "Աուդիո"],
    inspector: "Հատկություններ", position: "Դիրք", scale: "Մասշտաբ", rotation: "Պտույտ", opacity: "Անթափանցիկություն", color: "Գույն", text: "Էկրանի տեքստ",
    trimStart: "Հատվածի սկիզբ", trimEnd: "Հատվածի ավարտ", seconds: "վ", subtitle: "Ենթագրերի տեքստ", brand: "Ապրանքանիշի ստորագրություն", filter: "Զտիչ", filters: ["Առանց զտիչի", "Սև ու սպիտակ", "Սեպիա"],
    audioNote: "Ընտրեք աուդիոֆայլ «Ավելացնել մեդիա» կոճակով՝ այն լսելու համար։", voiceNote: "Ձայնավորումը հասանելի կլինի գեներատորում՝ ծառայությունը միացնելուց հետո։",
    templatesNote: "Ընտրեք կոմպոզիցիայի ձևաչափը։", effectsNote: "Կարգավորեք մասշտաբը, պտույտը և անթափանցիկությունը հատկությունների վահանակում։",
    fileError: "Ընտրեք տեսանյութ, պատկեր կամ աուդիոֆայլ։", loadError: "Ֆայլը բացել չհաջողվեց։ Փորձեք այլ ձևաչափ։", clear: "Հեռացնել մեդիան",
  },
} as const;

export function useStudioCopy() {
  const { locale } = useLocale();
  return studioCopy[locale];
}
