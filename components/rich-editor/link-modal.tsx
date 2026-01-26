import {
    AlertDialog,
    AlertDialogBackdrop,
    AlertDialogBody,
    AlertDialogContent,
    AlertDialogFooter,
    AlertDialogHeader,
} from "@/components/ui/alert-dialog";
import { Button, ButtonText } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Input, InputField } from "@/components/ui/input";
import { type FC, useEffect, useState } from "react";

interface LinkModalProps {
    isOpen: boolean;
    editedText: string;
    editedUrl: string;
    onClose: () => void;
    onSubmit: (text: string, url: string) => void;
}

export const LinkModal: FC<LinkModalProps> = ({ isOpen, editedText, editedUrl, onClose, onSubmit }) => {
    const [text, setText] = useState("");
    const [url, setUrl] = useState("");

    useEffect(() => {
        setText(editedText);
        setUrl(editedUrl);
    }, [editedText, editedUrl]);

    const handleSave = () => {
        onSubmit(text, url);
    };

    return (
        <AlertDialog isOpen={isOpen} onClose={onClose} size="md">
            <AlertDialogBackdrop />
            <AlertDialogContent>
                <AlertDialogHeader>
                    <Heading className="font-semibold text-typography-950" size="md">
                        Add a link
                    </Heading>
                </AlertDialogHeader>
                <AlertDialogBody className="mt-3 mb-4">
                    <Input variant="outline" size="md" className="mb-4">
                        <InputField placeholder="Text" defaultValue={editedText} onChangeText={setText} />
                    </Input>
                    <Input variant="outline" size="md">
                        <InputField placeholder="Link" defaultValue={editedUrl} onChangeText={setUrl} />
                    </Input>
                </AlertDialogBody>
                <AlertDialogFooter>
                    <Button onPress={handleSave} disabled={url.length === 0}>
                        <ButtonText className="text-white dark:text-black">Save</ButtonText>
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};
