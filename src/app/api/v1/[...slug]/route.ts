import { NextRequest, NextResponse } from "next/server";
import fs from 'fs';
import path from 'path';
import { _genSys } from "@/lib/internal_sys";

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

function getModelMap(): Record<string, string> {
    try {
        const yamlPath = path.join(process.cwd(), 'models.yaml');
        if (fs.existsSync(yamlPath)) {
            const content = fs.readFileSync(yamlPath, 'utf8');
            const map: Record<string, string> = {};
            const lines = content.split('\n');
            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || trimmed.startsWith('#')) continue;
                const colonIdx = trimmed.indexOf(':');
                if (colonIdx > 0) {
                    const key = trimmed.substring(0, colonIdx).trim().replace(/^["']|["']$/g, '');
                    let value = trimmed.substring(colonIdx + 1).trim();
                    
                    const inlineCommentIdx = value.indexOf('#');
                    if (inlineCommentIdx >= 0) {
                        value = value.substring(0, inlineCommentIdx).trim();
                    }
                    
                    value = value.replace(/^["']|["']$/g, '');
                    
                    if (key && value) {
                        map[key] = value;
                    }
                }
            }
            if (Object.keys(map).length > 0) return map;
        }
    } catch (e) {
        console.error("Failed to parse models.yaml", e);
    }
    
    return {};
}

async function handleProxy(req: NextRequest, params: { slug: string[] }) {
    const MODEL_MAP = getModelMap();

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
            const data = Object.keys(MODEL_MAP).map(key => ({
                id: key,
                object: "model",
                created: Date.now(),
                owned_by: "system"
            }));

            return NextResponse.json({
                object: "list",
                data
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

        let isBuiltInModel = false;
        let isBuiltInReasoner = false;

        if (req.method !== "GET" && req.method !== "HEAD") {
            let bodyStr = await req.text();
            
            if (path === "chat/completions" && bodyStr) {
                try {
                    const bodyJson = JSON.parse(bodyStr);
                    const requestedModelName = bodyJson.model || "Unknown Model";
                    
                    if (bodyJson.model && MODEL_MAP[bodyJson.model]) {
                        isBuiltInModel = true;
                        if (bodyJson.model === "NeroLLM Reasoner" || MODEL_MAP[bodyJson.model].toLowerCase().includes("reasoner")) {
                            isBuiltInReasoner = true;
                        }
                        bodyJson.model = MODEL_MAP[bodyJson.model];
                    }

                    if (isBuiltInModel) {
                        const _sInj = _genSys(requestedModelName);
                        if (bodyJson.messages && Array.isArray(bodyJson.messages)) {
                            const hasSystem = bodyJson.messages.some((m: any) => m.role === "system");
                            if (hasSystem) {
                                bodyJson.messages = bodyJson.messages.map((m: any) => {
                                    if (m.role === "system") {
                                        return { ...m, content: `${_sInj}\n\n${m.content}` };
                                    }
                                    return m;
                                });
                            } else {
                                bodyJson.messages.unshift({ role: "system", content: _sInj });
                            }
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

        if (!response.ok) {
            const errBody = await response.text();
            
            if (response.status === 503) {
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
            }
            
            return NextResponse.json(
                {
                    error: {
                        message: `Upstream API error (${response.status}): ${errBody.substring(0, 200)}`,
                        type: "server_error",
                        param: null,
                        code: "upstream_error"
                    }
                },
                { status: response.status }
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
            if (isBuiltInReasoner) {
                const encoder = new TextEncoder();
                const decoder = new TextDecoder();
                
                const stream = new ReadableStream({
                    async start(controller) {
                        const reader = response.body?.getReader();
                        if (!reader) {
                            controller.close();
                            return;
                        }
                        
                        let buffer = '';
                        let reasoningBuffer = '';
                        let contentStarted = false;
                        let summaryChunksSent = 0;

                        try {
                            while (true) {
                                const { done, value } = await reader.read();
                                if (done) break;
                                
                                buffer += decoder.decode(value, { stream: true });
                                const lines = buffer.split('\n');
                                buffer = lines.pop() || '';
                                
                                for (const line of lines) {
                                    if (line.trim() === '') continue;
                                    if (line.startsWith('data: ')) {
                                        const dataStr = line.slice(6);
                                        if (dataStr === '[DONE]') {
                                            if (!contentStarted && reasoningBuffer.trim().length > 0) {
                                                const { _z_sum_rz } = await import('@/lib/z_rx_sum');
                                                const isFirst = summaryChunksSent === 0;
                                                const flashSummary = await _z_sum_rz(reasoningBuffer, apiKey, baseUrl, isFirst);
                                                const sumParsed = { id: "res", object: "chat.completion.chunk", created: Date.now(), model: "NeroLLM Reasoner", choices: [{ index: 0, delta: { reasoning_content: flashSummary + "\n\n" }, finish_reason: "length" }] };
                                                controller.enqueue(encoder.encode(`data: ${JSON.stringify(sumParsed)}\n\n`));
                                            }
                                            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                                            continue;
                                        }
                                        
                                        try {
                                            const parsed = JSON.parse(dataStr);
                                            const delta = parsed.choices?.[0]?.delta || {};
                                            
                                            let isReasoningChunk = "reasoning_content" in delta && delta.reasoning_content !== null;
                                            let hasContentKey = "content" in delta && delta.content !== null;

                                            if (isReasoningChunk && !contentStarted) {
                                                reasoningBuffer += delta.reasoning_content || "";
                                                const sentences = reasoningBuffer.match(/[^.!?\n]+[.!?\n]+(?:\s+|$)/g) || [];
                                                if (sentences.length >= 4) {
                                                    const chunkToSummarize = sentences.slice(0, 4).join("");
                                                    reasoningBuffer = reasoningBuffer.slice(chunkToSummarize.length);
                                                    
                                                    const { _z_sum_rz } = await import('@/lib/z_rx_sum');
                                                    const isFirst = summaryChunksSent === 0;
                                                    const flashSummary = await _z_sum_rz(chunkToSummarize, apiKey, baseUrl, isFirst);
                                                    summaryChunksSent++;
                                                    
                                                    const sumParsed = { ...parsed };
                                                    sumParsed.choices[0].delta = { reasoning_content: flashSummary + "\n\n" };
                                                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(sumParsed)}\n\n`));
                                                }
                                            }
                                            
                                            if (hasContentKey) {
                                                if (!contentStarted) {
                                                    contentStarted = true;
                                                    if (reasoningBuffer.trim().length > 0) {
                                                        const { _z_sum_rz } = await import('@/lib/z_rx_sum');
                                                        const isFirst = summaryChunksSent === 0;
                                                        const flashSummary = await _z_sum_rz(reasoningBuffer, apiKey, baseUrl, isFirst);
                                                        const sumParsed = { ...parsed };
                                                        sumParsed.choices[0].delta = { reasoning_content: flashSummary + "\n\n" };
                                                        controller.enqueue(encoder.encode(`data: ${JSON.stringify(sumParsed)}\n\n`));
                                                    }
                                                }
                                                controller.enqueue(encoder.encode(`data: ${dataStr}\n\n`));
                                            }

                                            if (!isReasoningChunk && !hasContentKey) {
                                                controller.enqueue(encoder.encode(`data: ${dataStr}\n\n`));
                                            }
                                        } catch (e) {
                                            controller.enqueue(encoder.encode(`data: ${dataStr}\n\n`));
                                        }
                                    }
                                }
                            }
                        } catch (err) {
                            controller.error(err);
                        } finally {
                            controller.close();
                            reader.releaseLock();
                        }
                    }
                });

                return new NextResponse(stream, {
                    status: response.status,
                    headers: {
                        ...Object.fromEntries(responseHeaders.entries()),
                        "Cache-Control": "no-cache",
                        "Connection": "keep-alive"
                    }
                });
            }

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
