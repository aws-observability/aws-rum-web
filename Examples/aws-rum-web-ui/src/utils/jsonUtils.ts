export function recursiveParse(obj: any): any {
    if (typeof obj === 'string') {
        try {
            const parsed = JSON.parse(obj);
            return recursiveParse(parsed);
        } catch {
            return obj;
        }
    }
    if (Array.isArray(obj)) {
        return obj.map((item) => recursiveParse(item));
    }
    if (obj && typeof obj === 'object') {
        const result: any = {};
        for (const key in obj) {
            result[key] = recursiveParse(obj[key]);
        }
        return result;
    }
    return obj;
}
