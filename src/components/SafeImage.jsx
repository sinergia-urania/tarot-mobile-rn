// src/components/SafeImage.jsx
// Thin wrapper oko expo-image sa zdravim podrazumevanim vrednostima,
// WebP-friendly i malim fallback-om za slučaj da .webp negde ne prođe.

import { Image } from "expo-image";
import React, { useCallback, useMemo, useState } from "react";

/**
 * Props:
 * - source: string | { uri: string } | number (require)
 * - style: any
 * - contentFit: "cover" | "contain" | "fill" | "scale-down" (default: "cover")
 * - placeholder: number | string (npr. require(...) ili blurhash)
 * - transition: number (ms) - default: 200
 * - cachePolicy: "none" | "disk" | "memory" (default: "disk")
 * - alt: string (za web)
 * - onLoad, onError: callback
 * - ...rest: bilo koji dodatni prop koji expo-image podržava
 */
export default function SafeImage({
    source,
    style,
    contentFit = "cover",
    placeholder,
    transition = 200,
    cachePolicy = "disk",
    alt,
    onLoad,
    onError,
    ...rest
}) {
    const [retryUri, setRetryUri] = useState(null);
    const [tried, setTried] = useState({ png: false, jpg: false });

    // Izvuci "osnovni" uri ako je prosleđen string ili { uri }
    const baseUri = useMemo(() => {
        if (typeof source === "string") return source;
        if (source && typeof source === "object" && source.uri) return source.uri;
        return null;
    }, [source]);

    // Ako je dat require(...) broj ili objekat bez uri-ja, samo ga prosledi
    const isStaticRequire = typeof source === "number" && !baseUri;

    // Uvek pošalji normalizovani source ka <Image/>
    const normalizedSource = useMemo(() => {
        if (isStaticRequire) return source;
        const finalUri = retryUri || baseUri;
        return finalUri ? { uri: finalUri } : source;
    }, [isStaticRequire, source, baseUri, retryUri]);

    // Mali fallback: ako .webp omane, probaj .png pa .jpg (samo za remote uri)
    const handleError = useCallback(
        (e) => {
            if (baseUri && typeof baseUri === "string") {
                if (baseUri.endsWith(".webp") && !tried.png) {
                    setRetryUri(baseUri.replace(/\.webp$/i, ".png"));
                    setTried((t) => ({ ...t, png: true }));
                    return;
                }
                if (!tried.jpg && (retryUri?.endsWith(".png") || baseUri.endsWith(".png"))) {
                    setRetryUri((retryUri || baseUri).replace(/\.png$/i, ".jpg"));
                    setTried((t) => ({ ...t, jpg: true }));
                    return;
                }
            }
            // Prosledi dalje ako postoji korisnički onError
            onError?.(e);
        },
        [baseUri, retryUri, tried.png, tried.jpg, onError]
    );

    return (
        <Image
            source={normalizedSource}
            style={style}
            contentFit={contentFit}
            placeholder={placeholder}
            transition={transition}
            cachePolicy={cachePolicy}
            alt={alt ?? ""}
            onLoad={onLoad}
            onError={handleError}
            {...rest}
        />
    );
}
