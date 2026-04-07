import { toHex } from '@smithy/util-hex-encoding';
import { SignatureV4 } from '@smithy/signature-v4';
import {
    AwsCredentialIdentityProvider,
    AwsCredentialIdentity,
    RequestPresigningArguments
} from '@aws-sdk/types';
import { Sha256 } from '@aws-crypto/sha256-js';
import { HttpRequest } from '@smithy/protocol-http';
import { SigningConfig } from '@aws-rum-web/core/dispatch/DataPlaneClient';

const SERVICE = 'rum';
const REQUEST_PRESIGN_ARGS: RequestPresigningArguments = { expiresIn: 60 };

export const createSigningConfig = (
    credentials: AwsCredentialIdentity | AwsCredentialIdentityProvider,
    region: string
): SigningConfig => {
    const awsSigV4 = new SignatureV4({
        applyChecksum: true,
        credentials,
        region,
        service: SERVICE,
        uriEscapePath: true,
        sha256: Sha256
    });

    return {
        sign: async (request: HttpRequest) =>
            (await awsSigV4.sign(request)) as HttpRequest,
        presign: async (request: HttpRequest) =>
            (await awsSigV4.presign(
                request,
                REQUEST_PRESIGN_ARGS
            )) as HttpRequest,
        hashAndEncode: async (payload: string | Uint8Array) => {
            const sha256 = new Sha256();
            sha256.update(payload);
            return toHex(await sha256.digest()).toLowerCase();
        }
    };
};
