import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string[] }> }) {
    return handleProxy(req, await params);
}
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string[] }> }) {
    return handleProxy(req, await params);
}
export async function PUT(req: NextRequest, { params }: { params: Promise<{ slug: string[] }> }) {
    return handleProxy(req, await params);
}
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ slug: string[] }> }) {
    return handleProxy(req, await params);
}
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ slug: string[] }> }) {
    return handleProxy(req, await params);
}
export async function OPTIONS(req: NextRequest, { params }: { params: Promise<{ slug: string[] }> }) {
    return handleProxy(req, await params);
}

async function handleProxy(req: NextRequest, params: { slug: string[] }) {
    try {
        const clientAuth = req.headers.get("Authorization");
        const expectedClientKey = process.env.urc_client_key; // pastiin klien adalah sah

        if (expectedClientKey && clientAuth !== `Bearer ${expectedClientKey}`) {
            return NextResponse.json(
                {
                    error: {
                        message: "Unauthorized",
                        type: "invalid_request_error",
                        param: null,
                        code: "invalid_api_key"
                    }
                },
                { status: 401 }
            );
        }

        const baseUrl = process.env.urc_base_url;
        const apiKey = process.env.urc_key;

        if (!baseUrl || !apiKey) {
            console.error("Missing urc_base_url or urc_key in environment variables");
            return NextResponse.json(
                {
                    error: {
                        message: "Internal server error. API Configuration is missing.",
                        type: "server_error",
                        param: null,
                        code: "internal_server_error"
                    }
                },
                { status: 500 }
            );
        }

        const path = params.slug.join("/");
        const searchParams = req.nextUrl.searchParams.toString();
        const targetUrl = searchParams
            ? `${baseUrl}/${path}?${searchParams}`
            : `${baseUrl}/${path}`;

        const headers = new Headers(req.headers);

        headers.delete("host");
        headers.delete("connection");
        headers.delete("content-length");
        headers.delete("referer");
        headers.delete("origin");

        headers.set("Authorization", `Bearer ${apiKey}`);

        const init: RequestInit = {
            method: req.method,
            headers,
        };

        if (req.method !== "GET" && req.method !== "HEAD") {
            const body = await req.text();
            if (body) {
                init.body = body;
            }
        }

        const response = await fetch(targetUrl, init);

        const responseHeaders = new Headers(response.headers);

        responseHeaders.delete("content-encoding");
        responseHeaders.delete("content-length");
        responseHeaders.delete("transfer-encoding");
        responseHeaders.delete("x-powered-by");
        responseHeaders.delete("server");
        responseHeaders.delete("via");
        responseHeaders.delete("cf-cache-status");
        responseHeaders.delete("cf-ray");
        responseHeaders.delete("x-envoy-upstream-service-time");

        responseHeaders.set("access-control-allow-origin", "*");

        if (response.headers.get("content-type")?.includes("text/event-stream")) {
            return new NextResponse(response.body, {
                status: response.status,
                headers: {
                    ...Object.fromEntries(responseHeaders.entries()),
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive"
                }
            });
        }

        const resBody = await response.arrayBuffer();

        return new NextResponse(resBody, {
            status: response.status,
            headers: responseHeaders,
        });

    } catch (error: any) {
        return NextResponse.json(
            {
                error: {
                    message: "An error occurred while proxying the request.",
                    type: "api_error",
                    param: null,
                    code: "api_error"
                }
            },
            { status: 500 }
        );
    }
}
