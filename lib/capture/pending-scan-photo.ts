let pendingScanPhotoUri: string | null = null;

export function setPendingScanPhotoUri(uri: string) {
    pendingScanPhotoUri = uri;
}

export function consumePendingScanPhotoUri(): string | null {
    const uri = pendingScanPhotoUri;
    pendingScanPhotoUri = null;
    return uri;
}
