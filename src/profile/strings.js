/** UI text for the name screen and the profile menu. */

import { NAME_MIN, NAME_MAX } from './name.js';

const faNum = n => n.toLocaleString('fa-IR');

export const PROFILE_STRINGS = {
  en: {
    nameLabel: 'Your name',
    namePlaceholder: 'write it here',
    nameHint: 'Write your name at the top of the sheet to start.',
    start: 'Start',
    nameField: 'Name:',
    errors: {
      empty: 'Write your name first.',
      tooShort: `At least ${NAME_MIN} characters, please.`,
      tooLong: `That’s a long one: ${NAME_MAX} characters at most.`,
      badChars: 'Only letters, numbers and spaces, please.',
      noLetter: 'Put at least one letter in it.',
    },
    menu: 'Player menu',
    changeName: 'Change name',
    choosePicture: 'Choose picture',
    comingSoon: 'coming soon',
    leave: 'Leave',
    save: 'Save',
    cancel: 'Cancel',
    leaveQuestion: 'Leave this sheet? Your name and scores will be erased.',
    leaveYes: 'Yes, leave',
    renamed: name => `Name changed to ${name}.`,
  },
  fa: {
    nameLabel: 'اسمت چیه؟',
    namePlaceholder: 'اینجا بنویس',
    nameHint: 'برای شروع، اسمت را بالای برگه بنویس.',
    start: 'شروع',
    nameField: 'نام:',
    errors: {
      empty: 'اول اسمت را بنویس.',
      tooShort: `حداقل ${faNum(NAME_MIN)} حرف بنویس.`,
      tooLong: `اسمت طولانی است؛ حداکثر ${faNum(NAME_MAX)} حرف.`,
      badChars: 'فقط حرف، عدد و فاصله مجاز است.',
      noLetter: 'حداقل یک حرف در اسمت باشد.',
    },
    menu: 'منوی بازیکن',
    changeName: 'تغییر اسم',
    choosePicture: 'انتخاب عکس',
    comingSoon: 'به‌زودی',
    leave: 'خروج',
    save: 'ذخیره',
    cancel: 'انصراف',
    leaveQuestion: 'از این برگه بیرون می‌روی؟ اسم و امتیازهایت پاک می‌شود.',
    leaveYes: 'بله، خروج',
    renamed: name => `اسم به ${name} تغییر کرد.`,
  },
};
