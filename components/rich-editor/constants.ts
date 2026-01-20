import type { OnChangeStateEvent, OnLinkDetected } from "react-native-enriched"

export type StylesState = OnChangeStateEvent
export type CurrentLinkState = OnLinkDetected

export interface Selection {
    start: number
    end: number
    text: string
}

export const DEFAULT_STYLE_STATE = {
    isActive: false,
    isConflicting: false,
    isBlocking: false,
}

export const DEFAULT_STYLES: StylesState = {
    bold: DEFAULT_STYLE_STATE,
    italic: DEFAULT_STYLE_STATE,
    underline: DEFAULT_STYLE_STATE,
    strikeThrough: DEFAULT_STYLE_STATE,
    inlineCode: DEFAULT_STYLE_STATE,
    h1: DEFAULT_STYLE_STATE,
    h2: DEFAULT_STYLE_STATE,
    h3: DEFAULT_STYLE_STATE,
    h4: DEFAULT_STYLE_STATE,
    h5: DEFAULT_STYLE_STATE,
    h6: DEFAULT_STYLE_STATE,
    blockQuote: DEFAULT_STYLE_STATE,
    codeBlock: DEFAULT_STYLE_STATE,
    orderedList: DEFAULT_STYLE_STATE,
    unorderedList: DEFAULT_STYLE_STATE,
    link: DEFAULT_STYLE_STATE,
    image: DEFAULT_STYLE_STATE,
    mention: DEFAULT_STYLE_STATE,
}

export const DEFAULT_LINK_STATE: CurrentLinkState = {
    text: "",
    url: "",
    start: 0,
    end: 0,
}

export const LINK_REGEX = /^(?:enriched:\/\/\S+|(?:https?:\/\/)?(?:www\.)?swmansion\.com(?:\/\S*)?)$/i

export const AUTOSAVE_DELAY = 3000
