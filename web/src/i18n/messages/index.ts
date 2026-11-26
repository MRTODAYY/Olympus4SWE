import type { Locale } from "../locale";

import { EN as boardEN, ZH as boardZH } from "./board";
import { EN as commonEN, ZH as commonZH } from "./common";
import { EN as dialogsEN, ZH as dialogsZH } from "./dialogs";
import { EN as drawerEN, ZH as drawerZH } from "./drawer";
import { EN as graphEN, ZH as graphZH } from "./graph";
import { EN as inspectorEN, ZH as inspectorZH } from "./inspector";
import { EN as railEN, ZH as railZH } from "./rail";
import { EN as runtimeEN, ZH as runtimeZH } from "./runtime";
import { EN as specEN, ZH as specZH } from "./spec";
import { EN as topologyEN, ZH as topologyZH } from "./topology";
import { EN as viewsEN, ZH as viewsZH } from "./views";

/** Source copy -> translation. Missing keys fall back to the source copy itself. */
export const MESSAGES: Record<Locale, Record<string, string>> = {
  en: {
    ...commonEN,
    ...railEN,
    ...boardEN,
    ...inspectorEN,
    ...drawerEN,
    ...dialogsEN,
    ...topologyEN,
    ...specEN,
    ...viewsEN,
    ...graphEN,
    ...runtimeEN,
  },
  zh: {
    ...commonZH,
    ...railZH,
    ...boardZH,
    ...inspectorZH,
    ...drawerZH,
    ...dialogsZH,
    ...topologyZH,
    ...specZH,
    ...viewsZH,
    ...graphZH,
    ...runtimeZH,
  },
};

export const MESSAGE_COUNT = {
  en: Object.keys(MESSAGES.en).length,
  zh: Object.keys(MESSAGES.zh).length,
};