"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LS_CERT_FINGERPRINT = exports.WINDOW_ORIGIN = exports.LS_LOG_FILE_NAME = exports.DYNAMIC_PORT = void 0;
/** Pass 0 to the LS so the OS assigns an available port automatically. */
exports.DYNAMIC_PORT = 0;
exports.LS_LOG_FILE_NAME = 'language_server.log';
exports.WINDOW_ORIGIN = 'https://127.0.0.1';
// Antigravity's local language-server HTTPS cert fingerprint. This is
// stable across launches (Antigravity's own architecture assumes a fixed
// cert - hardcoding it at all only makes sense on that assumption) but
// rotates when Google updates the app. Confirmed happening in practice:
// this value went stale on the v2.14.0 update, which caused every window
// load past the initial one to fail with ERR_CERT_AUTHORITY_INVALID and
// leave a black screen with no recovery path. Re-captured 2026-09-16
// directly from the live language server's TLS certificate. If this ever
// goes stale again, capture the current one the same way: connect to the
// port Antigravity prints at startup ("Local: https://127.0.0.1:<port>/")
// with an SslStream, read RemoteCertificate, and SHA-256 it.
// TODO: read this from the LS's own cert file dynamically instead of
// hardcoding it, so an Antigravity update can't silently invalidate this
// again - see setupLocalCertTrust() in languageServer.ts.
exports.LS_CERT_FINGERPRINT = 'sha256/+Lur1Xot/zKZLyBe3oQfm6jZXN9FmC4dDnOqWDTpz5Q=';
//# sourceMappingURL=constants.js.map