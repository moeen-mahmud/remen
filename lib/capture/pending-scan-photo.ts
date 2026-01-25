let pendingScanPhotoUri: string | null = null

/**
 * Stores a captured photo URI in-memory so the `/scan/camera` route can return
 * it to the `/scan` screen without keeping camera screen state alive.
 */
export function setPendingScanPhotoUri(uri: string) {
    pendingScanPhotoUri = uri
}

/**
 * Reads and clears the pending photo URI (one-time consumption).
 */
export function consumePendingScanPhotoUri(): string | null {
    const uri = pendingScanPhotoUri
    pendingScanPhotoUri = null
    return uri
}
