declare let msCrypto:
    | undefined
    | { getRandomValues: (holder: Uint8Array) => Uint8Array };

export const getRandomValues = (holder: Uint8Array): Uint8Array => {
    if (crypto) {
        return crypto.getRandomValues(holder);
    } else if (msCrypto) {
        return msCrypto.getRandomValues(holder);
    } else {
        throw new Error('No crypto library found.');
    }
};
