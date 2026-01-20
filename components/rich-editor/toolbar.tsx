import {
    BoldIcon,
    CodeIcon,
    CodeSquareIcon,
    Heading1Icon,
    Heading2Icon,
    Heading3Icon,
    Heading4Icon,
    Heading5Icon,
    Heading6Icon,
    ItalicIcon,
    LinkIcon,
    ListIcon,
    ListOrderedIcon,
    QuoteIcon,
    StrikethroughIcon,
    UnderlineIcon,
} from "lucide-react-native"
import type { FC } from "react"
import { FlatList, type ListRenderItemInfo, StyleSheet } from "react-native"
import type { EnrichedTextInputInstance, OnChangeStateEvent } from "react-native-enriched"
import { ToolbarButton } from "./toolbar-button"

const STYLE_ITEMS = [
    {
        name: "bold",
        icon: BoldIcon,
    },
    {
        name: "italic",
        icon: ItalicIcon,
    },
    {
        name: "underline",
        icon: UnderlineIcon,
    },
    {
        name: "strikethrough",
        icon: StrikethroughIcon,
    },
    {
        name: "inline-code",
        icon: CodeIcon,
    },
    {
        name: "heading-1",
        icon: Heading1Icon,
    },
    {
        name: "heading-2",
        icon: Heading2Icon,
    },
    {
        name: "heading-3",
        icon: Heading3Icon,
    },
    {
        name: "heading-4",
        icon: Heading4Icon,
    },
    {
        name: "heading-5",
        icon: Heading5Icon,
    },
    {
        name: "heading-6",
        icon: Heading6Icon,
    },
    {
        name: "quote",
        icon: QuoteIcon,
    },
    {
        name: "code-block",
        icon: CodeSquareIcon,
    },
    {
        name: "link",
        icon: LinkIcon,
    },
    {
        name: "unordered-list",
        icon: ListIcon,
    },
    {
        name: "ordered-list",
        icon: ListOrderedIcon,
    },
] as const

type Item = (typeof STYLE_ITEMS)[number]
type StylesState = OnChangeStateEvent

export interface ToolbarProps {
    stylesState: StylesState
    editorRef?: React.RefObject<EnrichedTextInputInstance | null>
    onOpenLinkModal: () => void
}

export const Toolbar: FC<ToolbarProps> = ({ stylesState, editorRef, onOpenLinkModal }) => {
    const handlePress = (item: Item) => {
        const currentRef = editorRef?.current
        if (!currentRef) return

        switch (item.name) {
            case "bold":
                editorRef.current?.toggleBold()
                break
            case "italic":
                editorRef.current?.toggleItalic()
                break
            case "underline":
                editorRef.current?.toggleUnderline()
                break
            case "strikethrough":
                editorRef.current?.toggleStrikeThrough()
                break
            case "inline-code":
                editorRef?.current?.toggleInlineCode()
                break
            case "heading-1":
                editorRef.current?.toggleH1()
                break
            case "heading-2":
                editorRef.current?.toggleH2()
                break
            case "heading-3":
                editorRef.current?.toggleH3()
                break
            case "heading-4":
                editorRef.current?.toggleH4()
                break
            case "heading-5":
                editorRef.current?.toggleH5()
                break
            case "heading-6":
                editorRef.current?.toggleH6()
                break
            case "code-block":
                editorRef?.current?.toggleCodeBlock()
                break
            case "quote":
                editorRef?.current?.toggleBlockQuote()
                break
            case "unordered-list":
                editorRef.current?.toggleUnorderedList()
                break
            case "ordered-list":
                editorRef.current?.toggleOrderedList()
                break
            case "link":
                onOpenLinkModal()
                break
        }
    }

    const isDisabled = (item: Item) => {
        switch (item.name) {
            case "bold":
                return stylesState.bold.isBlocking
            case "italic":
                return stylesState.italic.isBlocking
            case "underline":
                return stylesState.underline.isBlocking
            case "strikethrough":
                return stylesState.strikeThrough.isBlocking
            case "inline-code":
                return stylesState.inlineCode.isBlocking
            case "heading-1":
                return stylesState.h1.isBlocking
            case "heading-2":
                return stylesState.h2.isBlocking
            case "heading-3":
                return stylesState.h3.isBlocking
            case "heading-4":
                return stylesState.h4.isBlocking
            case "heading-5":
                return stylesState.h5.isBlocking
            case "heading-6":
                return stylesState.h6.isBlocking
            case "code-block":
                return stylesState.codeBlock.isBlocking
            case "quote":
                return stylesState.blockQuote.isBlocking
            case "unordered-list":
                return stylesState.unorderedList.isBlocking
            case "ordered-list":
                return stylesState.orderedList.isBlocking
            case "link":
                return stylesState.link.isBlocking
            default:
                return false
        }
    }

    const isActive = (item: Item) => {
        switch (item.name) {
            case "bold":
                return stylesState.bold.isActive
            case "italic":
                return stylesState.italic.isActive
            case "underline":
                return stylesState.underline.isActive
            case "strikethrough":
                return stylesState.strikeThrough.isActive
            case "inline-code":
                return stylesState.inlineCode.isActive
            case "heading-1":
                return stylesState.h1.isActive
            case "heading-2":
                return stylesState.h2.isActive
            case "heading-3":
                return stylesState.h3.isActive
            case "heading-4":
                return stylesState.h4.isActive
            case "heading-5":
                return stylesState.h5.isActive
            case "heading-6":
                return stylesState.h6.isActive
            case "code-block":
                return stylesState.codeBlock.isActive
            case "quote":
                return stylesState.blockQuote.isActive
            case "unordered-list":
                return stylesState.unorderedList.isActive
            case "ordered-list":
                return stylesState.orderedList.isActive
            case "link":
                return stylesState.link.isActive
            default:
                return false
        }
    }

    const renderItem = ({ item }: ListRenderItemInfo<Item>) => {
        return (
            <ToolbarButton
                text={item.name}
                icon={item.icon as any}
                isActive={isActive(item)}
                isDisabled={isDisabled(item)}
                onPress={() => handlePress(item)}
            />
        )
    }

    const keyExtractor = (item: Item) => item.name

    return (
        <FlatList
            showsHorizontalScrollIndicator={false}
            horizontal
            data={STYLE_ITEMS}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            style={styles.container}
        />
    )
}

const styles = StyleSheet.create({
    container: {
        width: "100%",
    },
})
