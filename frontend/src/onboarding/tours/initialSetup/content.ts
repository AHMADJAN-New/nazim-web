/**
 * Initial Setup Tour - Content
 * 
 * Step content for the updated guided tour.
 */

export const tourContent = {
  welcome: {
    title: 'Welcome to Nazim!',
    text: [
      'This guided tour highlights the navigation, layout, and quick actions you will rely on every day.',
      'You will stay on the dashboard as we walk through the core sections and icons you often see.',
      'Let us show you the key pieces that keep your school running smoothly.',
    ],
  },
  sidebar: {
    title: 'Sidebar Navigation',
    text: [
      'The sidebar is the spine of the application.',
      'It groups features into Operations, Academic, Finance, and Administration, so you always know where to go.',
      'Expand a section to reveal the related links that take you into each module; collapse it to reclaim screen space.',
      'Think of each group as a domain of work: Operations for people and processes, Academic for curriculum, Finance for money, and Administration for users and settings.',
    ],
  },
  editIcon: {
    title: 'Edit Icon (Pencil)',
    text: [
      'The edit action always uses the `Pencil` icon from our lucide set.',
      'You will find it beside each record in tables and lists.',
      'Click it to open the inline form where you can update fields right away.',
      'Keeping edits next to the data prevents losing context.',
    ],
  },
  deleteIcon: {
    title: 'Delete Icon (Trash)',
    text: [
      'Our delete icon is the `Trash2` icon from lucide.',
      'It appears beside the edit icon in the same action area.',
      'Use it to remove outdated entries, and confirm when prompted before the deletion goes through.',
    ],
  },
  viewIcon: {
    title: 'View Icon (Eye)',
    text: [
      'The `Eye` icon lets you open a read-only view of a record.',
      'Use its button when you want to preview data before editing or deleting.',
      'It is handy for quick lookups without navigating away from the list.',
    ],
  },
  tabsActions: {
    title: 'Tabs & Action Buttons',
    text: [
      'Many pages show tabs or pills at the top of the content area (for example, Overview, Records, and Reports).',
      'Switch between these tabs to change the focus of the page without leaving the module.',
      'Action buttons near the tabs (Add, Export, Filter, etc.) let you perform tasks immediately.',
      'Together the tabs and actions keep you moving through the workflow without extra navigation.',
    ],
  },
  helpCenter: {
    title: 'Help Center',
    text: [
      'If you ever get stuck, click the help icon in the top bar.',
      'It opens the Help Center where you can browse documentation, tutorials, and contextual tips.',
      'Treat it as the living knowledge base for the entire app whenever you need extra guidance.',
    ],
  },
  complete: {
    title: "You're Ready!",
    text: [
      'You just explored the sidebar, the icons for edit/delete/view, and the tabs/actions that keep workflows tight.',
      'You now know where the core navigation lives and how to act on records from the dashboard.',
      'Reopen this tour anytime from the user menu if you want a refresher.',
    ],
  },
};

import { getCurrentLanguage } from '../../rtl';

type SupportedLanguage = 'en' | 'ps' | 'fa' | 'ar';

function getLang(): SupportedLanguage {
  const lang = getCurrentLanguage();
  return lang === 'ps' || lang === 'fa' || lang === 'ar' ? lang : 'en';
}

export const tourContentEn = tourContent;

export const tourContentPs: typeof tourContentEn = {
  welcome: {
    title: 'ناظم ته ښه راغلاست!',
    text: [
      'دا لارښود سفر ستاسو لپاره د ناوبرۍ، جوړښت او چټکو کارونو مهم ټکي ښيي چې هره ورځ پرې تکیه کوئ.',
      'موږ به پر ډشبورډ پاتې شو او د اصلي برخو او هغو آیکنونو په اړه به خبرې وکړو چې ډېر یې وینئ.',
      'راځئ هغه مهم ټکي وښیو چې ستاسو ښوونځی په منظم ډول روان ساتي.',
    ],
  },
  sidebar: {
    title: 'د Sidebar ناوبرۍ',
    text: [
      'Sidebar د اپلیکیشن ملا تیر دی.',
      'دا ځانګړتیاوې په Operations، Academic، Finance او Administration برخو کې منظموي ترڅو تل پوه شئ چې کوم ځای ته لاړ شئ.',
      'یو برخه پراخه کړئ ترڅو اړوند لینکونه ښکاره شي؛ او بیا یې وتړئ ترڅو ځای خلاص شي.',
      'هره ډله د کار ډومېن دی: Operations د خلکو/کړنو لپاره، Academic د نصاب لپاره، Finance د پیسو لپاره، او Administration د کاروونکو او تنظیماتو لپاره.',
    ],
  },
  editIcon: {
    title: 'د سمون آیکن (پنسل)',
    text: [
      'د سمون لپاره تل د `Pencil` آیکن کارېږي.',
      'دا به د جدولونو او لېستونو په هر ریکارډ کې د عمل برخه کې ومومئ.',
      'پر دې کلیک سره هماغه ځای فورم پرانیستل کېږي او تاسو سمدستي بدلون کولی شئ.',
      'دا کار ستاسو تمرکز له معلوماتو سره نږدې ساتي.',
    ],
  },
  deleteIcon: {
    title: 'د ړنګولو آیکن (Trash)',
    text: [
      'د ړنګولو لپاره د `Trash2` آیکن کارېږي.',
      'دا عموماً د سمون آیکن ترڅنګ وي.',
      'زړې یا ناسمې داخلې لرې کړئ، او د تایید پیغام پر وخت احتیاط وکړئ.',
    ],
  },
  viewIcon: {
    title: 'د کتلو آیکن (Eye)',
    text: [
      'د `Eye` آیکن د ریکارډ د یوازې-لوستلو (Read-only) کتنې لپاره دی.',
      'کله چې غواړئ له سمون یا ړنګولو مخکې معلومات وګورئ، دا تڼۍ وکاروئ.',
      'دا د چټکو کتنو لپاره ګټور دی پرته له دې چې له لېسته ووځئ.',
    ],
  },
  tabsActions: {
    title: 'ټبونه او د عمل تڼۍ',
    text: [
      'ډېری پاڼې د محتوا په سر کې ټبونه/پیلونه ښيي (لکه Overview، Records، Reports).',
      'د ټبونو ترمنځ بدلون وکړئ ترڅو د پاڼې تمرکز بدل کړئ پرته له دې چې له مودول څخه ووځئ.',
      'د ټبونو ترڅنګ د عمل تڼۍ (Add، Export، Filter او نور) تاسو ته ژر کار کول اسانه کوي.',
      'ټبونه او عمل تڼۍ یو ځای ستاسو کاري بهیر چټکوي او اضافي ناوبرۍ کموي.',
    ],
  },
  helpCenter: {
    title: 'د مرستې مرکز',
    text: [
      'که کله ستونزه لرئ، د پورته بار د مرستې آیکن کلیک کړئ.',
      'دا د مرستې مرکز پرانیزي چېرته چې اسناد، درسونه، او اړوندې مشورې موندلی شئ.',
      'دا د اپلیکیشن لپاره ژوندی لارښود دی—هر وخت ترې ګټه واخلئ.',
    ],
  },
  complete: {
    title: 'تاسو چمتو یاست!',
    text: [
      'تاسو Sidebar، د سمون/ړنګولو/کتلو آیکنونه، او د ټبونو/عمل تڼیو مفهوم وپېژاند.',
      'اوس پوهېږئ چې اصلي ناوبرۍ چېرته ده او څنګه له ډشبورډه ریکارډونه اداره کړئ.',
      'که بیا یادونې ته اړتیا وي، دا سفر هر وخت د کاروونکي مینو څخه بیا پرانیستلی شئ.',
    ],
  },
};

export type InitialSetupStepId = keyof typeof tourContentEn;

/**
 * Get content for a step
 */
export function getStepContent(stepId: InitialSetupStepId): { title: string; text: string[] } {
  const lang = getLang();
  const dict = lang === 'ps' ? tourContentPs : tourContentEn;
  const content = dict[stepId];
  return {
    title: content.title,
    text: Array.isArray(content.text) ? content.text : [content.text],
  };
}
