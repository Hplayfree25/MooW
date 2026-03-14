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

const MODEL_MAP: Record<string, string> = {
    "NeroLLM": "deepseek-chat",
    "NeroLLM Reasoner": "deepseek-reasoner"
};

const SYSTEM_INJECTION = "You are currently roleplaying. Assume the persona described by the user entirely. Be immersive, descriptive, and stay completely in character at all times. Do not break character or acknowledge that you are an AI unless instructed.";

async function handleProxy(req: NextRequest, params: { slug: string[] }) {
    try {
        const clientAuth = req.headers.get("Authorization");
        const expectedClientKey = process.env.urc_client_key;

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

        if (req.method === "GET" && path === "models") {
            return NextResponse.json({
                object: "list",
                data: [
                    {
                        id: "NeroLLM",
                        object: "model",
                        created: Date.now(),
                        owned_by: "system"
                    },
                    {
                        id: "NeroLLM Reasoner",
                        object: "model",
                        created: Date.now(),
                        owned_by: "system"
                    }
                ]
            });
        }

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
            let bodyStr = await req.text();
            
            if (path === "chat/completions" && bodyStr) {
                try {
                    const bodyJson = JSON.parse(bodyStr);
                    if (bodyJson.model && MODEL_MAP[bodyJson.model]) {
                        bodyJson.model = MODEL_MAP[bodyJson.model];
                    }
                    if (bodyJson.messages && Array.isArray(bodyJson.messages)) {
                        const hasSystem = bodyJson.messages.some((m: any) => m.role === "system");
                        if (hasSystem) {
                            bodyJson.messages = bodyJson.messages.map((m: any) => {
                                if (m.role === "system") {
                                    return { ...m, content: `${SYSTEM_INJECTION}\n\n${m.content}` };
                                }
                                return m;
                            });
                        } else {
                            bodyJson.messages.unshift({ role: "system", content: SYSTEM_INJECTION });
                        }
                    }
                    bodyStr = JSON.stringify(bodyJson);
                } catch (e) {
                }
            }
            if (bodyStr) {
                init.body = bodyStr;
            }
        }

        const searchParams = req.nextUrl.searchParams.toString();
        const targetUrl = searchParams
            ? `${baseUrl}/${path}?${searchParams}`
            : `${baseUrl}/${path}`;

        const response = await fetch(targetUrl, init);

        if (response.status === 503) {
            const errBody = await response.text();
            if (errBody.toLowerCase().includes("cpu overload") || errBody.toLowerCase().includes("overload")) {
                return NextResponse.json(
                    {
                        error: {
                            message: "Our system is overloaded for this model, please try again",
                            type: "server_error",
                            param: null,
                            code: "cpu_overload"
                        }
                    },
                    { status: 503 }
                );
            }
            return NextResponse.json(
                {
                    error: {
                        message: "Service temporarily unavailable, please try again later",
                        type: "server_error",
                        param: null,
                        code: "service_unavailable"
                    }
                },
                { status: 503 }
            );
        }

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
