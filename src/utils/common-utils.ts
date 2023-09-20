export enum ResourceType {
    OTHER = 'other',
    STYLESHEET = 'stylesheet',
    DOCUMENT = 'document',
    SCRIPT = 'script',
    IMAGE = 'image',
    FONT = 'font'
}

/**
 * https://developer.mozilla.org/en-US/docs/Web/API/PerformanceResourceTiming/initiatorType
 */
export enum InitiatorType {
    /**
     * IMAGES
     * PerformanceResourceTiming with initiatorType=Input must be an image
     * Per MDN docs: "if the request was initiated by an <input> element of type image.""
     */
    IMG = 'img',
    IMAGE = 'image',
    INPUT = 'input',

    /**
     * DOCUMENTS
     */
    IFRAME = 'iframe',
    FRAME = 'frame',

    /**
     * SCRIPTS
     */
    SCRIPT = 'script',

    /**
     * STYLESHEETS
     */
    CSS = 'css'
}

const extensions = [
    {
        name: ResourceType.STYLESHEET,
        list: ['css', 'less']
    },
    {
        name: ResourceType.DOCUMENT,
        list: ['htm', 'html', 'ts', 'doc', 'docx', 'pdf', 'xls', 'xlsx']
    },
    {
        name: ResourceType.SCRIPT,
        list: ['js']
    },
    {
        name: ResourceType.IMAGE,
        list: [
            'ai',
            'bmp',
            'gif',
            'ico',
            'jpeg',
            'jpg',
            'png',
            'ps',
            'psd',
            'svg',
            'tif',
            'tiff'
        ]
    },
    {
        name: ResourceType.FONT,
        list: ['fnt', 'fon', 'otf', 'ttf', 'woff']
    }
];

export const shuffle = (a: any[]) => {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const v = a[i];
        a[i] = a[j];
        a[j] = v;
    }
};

export const getResourceFileType = (
    url: string,
    initiatorType?: string
): ResourceType => {
    let ext = ResourceType.OTHER;
    if (url) {
        const filename = url.substring(url.lastIndexOf('/') + 1);
        const extension = filename
            .substring(filename.lastIndexOf('.') + 1)
            .split(/[?#]/)[0];

        extensions.forEach((type) => {
            if (type.list.indexOf(extension) > -1) {
                ext = type.name;
            }
        });
    }

    /**
     * Resource name sometimes does not have the correct file extension names due to redirects.
     * In these cases, they are mislablled as "other". In these cases, we can infer the correct
     * fileType from the initiator.
     */
    if (initiatorType && ext === ResourceType.OTHER) {
        switch (initiatorType) {
            case InitiatorType.IMAGE:
            case InitiatorType.IMG:
            case InitiatorType.INPUT:
                ext = ResourceType.IMAGE;
                break;
            case InitiatorType.IFRAME:
            case InitiatorType.FRAME:
                ext = ResourceType.DOCUMENT;
                break;
            case InitiatorType.SCRIPT:
                ext = ResourceType.SCRIPT;
                break;
            case InitiatorType.CSS:
                ext = ResourceType.STYLESHEET;
                break;
        }
    }
    return ext;
};

/* Helpers */
export const httpStatusText = {
    '0': 'Abort Request',
    '200': 'OK',
    '201': 'Created',
    '202': 'Accepted',
    '203': 'Non-Authoritative Information',
    '204': 'No Content',
    '205': 'Reset Content',
    '206': 'Partial Content',
    '300': 'Multiple Choices',
    '301': 'Moved Permanently',
    '302': 'Found',
    '303': 'See Other',
    '304': 'Not Modified',
    '305': 'Use Proxy',
    '306': 'Unused',
    '307': 'Temporary Redirect',
    '400': 'Bad Request',
    '401': 'Unauthorized',
    '402': 'Payment Required',
    '403': 'Forbidden',
    '404': 'Not Found',
    '405': 'Method Not Allowed',
    '406': 'Not Acceptable',
    '407': 'Proxy Authentication Required',
    '408': 'Request Timeout',
    '409': 'Conflict',
    '410': 'Gone',
    '411': 'Length Required',
    '412': 'Precondition Required',
    '413': 'Request Entry Too Large',
    '414': 'Request-URI Too Long',
    '415': 'Unsupported Media Type',
    '416': 'Requested Range Not Satisfiable',
    '417': 'Expectation Failed',
    '418': 'I"m a teapot',
    '500': 'Internal Server Error',
    '501': 'Not Implemented',
    '502': 'Bad Gateway',
    '503': 'Service Unavailable',
    '504': 'Gateway Timeout',
    '505': 'HTTP Version Not Supported'
};
