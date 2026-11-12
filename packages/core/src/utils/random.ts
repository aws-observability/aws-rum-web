declare let msCrypto:
    | undefined
    | { getRandomValues: (holder: Uint8Array) => void };

// The holder is filled in place. Callers must read the array they passed in,
// because legacy implementations such as IE11's msCrypto return undefined.
export const getRandomValues = (holder: Uint8Array): void => {
    // `typeof x !== 'undefined'` must come first. Optional chaining still
    // evaluates the identifier, so `crypto?.foo` throws a ReferenceError when
    // no `crypto` binding exists at all.
    if (
        typeof crypto !== 'undefined' &&
        typeof crypto.getRandomValues === 'function'
    ) {
        crypto.getRandomValues(holder);
    } else if (
        typeof msCrypto !== 'undefined' &&
        typeof msCrypto.getRandomValues === 'function'
    ) {
        msCrypto.getRandomValues(holder);
    } else {
        throw new Error('No crypto library found.');
    }
};

export const generateUUID = (): string => {
    if (
        typeof crypto !== 'undefined' &&
        typeof crypto.randomUUID === 'function'
    ) {
        return crypto.randomUUID();
    }
    const bytes = new Uint8Array(16);
    getRandomValues(bytes);
    // eslint-disable-next-line no-bitwise
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    // eslint-disable-next-line no-bitwise
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    // Two-digit hex without String.prototype.padStart, which needs Chrome 57
    // and would raise the Chrome >= 55 floor in browserslist.
    const hex = Array.from(bytes, (b) => ('0' + b.toString(16)).slice(-2)).join(
        ''
    );
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(
        12,
        16
    )}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};
