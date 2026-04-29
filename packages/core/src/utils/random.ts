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

export const generateUUID = (): string => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    const bytes = getRandomValues(new Uint8Array(16));
    // eslint-disable-next-line no-bitwise
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    // eslint-disable-next-line no-bitwise
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join(
        ''
    );
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(
        12,
        16
    )}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};
