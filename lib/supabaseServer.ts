import { createHash } from "crypto";
import { NextRequest } from "next/server";

type SupabaseConfig = {
	url: string;
	serviceRoleKey: string;
	anonKey: string;
};

export type AuthenticatedUser = {
	id: string;
	email?: string;
};

export type AnonymousClient = {
	clientId: string;
	clientIdHash: string;
};

export function getSupabaseConfig(): SupabaseConfig {
	const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
	const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
	const anonKey =
		process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
	if (!url || !serviceRoleKey || !anonKey) {
		throw new Error(
			"Supabase is not configured. Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and SUPABASE_ANON_KEY.",
		);
	}
	return { url: url.replace(/\/$/, ""), serviceRoleKey, anonKey };
}

function jsonHeaders(key: string) {
	return {
		apikey: key,
		Authorization: `Bearer ${key}`,
		"Content-Type": "application/json",
	};
}

export async function supabaseRest<T>(
	path: string,
	init: RequestInit & { prefer?: string } = {},
): Promise<T> {
	const config = getSupabaseConfig();
	const headers = new Headers({
		...jsonHeaders(config.serviceRoleKey),
		...(init.prefer ? { Prefer: init.prefer } : {}),
		...init.headers,
	});
	const response = await fetch(`${config.url}/rest/v1/${path}`, {
		...init,
		headers,
		cache: "no-store",
	});
	if (!response.ok) {
		const text = await response.text();
		throw new Error(`Supabase REST error ${response.status}: ${text}`);
	}
	if (response.status === 204) return undefined as T;
	const text = await response.text();
	if (!text.trim()) return undefined as T;
	return JSON.parse(text) as T;
}

export async function supabaseRpc<T>(
	fn: string,
	body: Record<string, unknown>,
): Promise<T> {
	return supabaseRest<T>(`rpc/${fn}`, {
		method: "POST",
		body: JSON.stringify(body),
	});
}

export async function authenticateRequest(
	request: NextRequest,
): Promise<AuthenticatedUser | null> {
	const token = request.headers
		.get("authorization")
		?.replace(/^Bearer\s+/i, "")
		.trim();
	if (!token) return null;
	const config = getSupabaseConfig();
	const response = await fetch(`${config.url}/auth/v1/user`, {
		headers: {
			apikey: config.anonKey,
			Authorization: `Bearer ${token}`,
		},
		cache: "no-store",
	});
	if (!response.ok) return null;
	const user = (await response.json()) as { id?: string; email?: string };
	return user.id ? { id: user.id, email: user.email } : null;
}

export async function requireUser(
	request: NextRequest,
): Promise<AuthenticatedUser> {
	const user = await authenticateRequest(request);
	if (!user)
		throw new Response(JSON.stringify({ error: "请先登录。" }), {
			status: 401,
		});
	return user;
}

function anonymousPepper() {
	return (
		process.env.ANON_CLIENT_HASH_SECRET ??
		process.env.SUPABASE_SERVICE_ROLE_KEY ??
		"midnight-tarot-dev-anonymous-secret"
	);
}

export function hashAnonymousClient(clientId: string, clientSecret: string) {
	return createHash("sha256")
		.update(`${anonymousPepper()}:${clientId}:${clientSecret}`)
		.digest("hex");
}

export function getAnonymousClient(
	request: NextRequest,
): AnonymousClient | null {
	const clientId = request.headers.get("x-mt-client-id")?.trim();
	const clientSecret = request.headers.get("x-mt-client-secret")?.trim();
	if (!clientId || !clientSecret) return null;
	if (
		clientId.length < 12 ||
		clientId.length > 80 ||
		clientSecret.length < 24 ||
		clientSecret.length > 160
	)
		return null;
	if (
		!/^[a-zA-Z0-9_-]+$/.test(clientId) ||
		!/^[a-zA-Z0-9_-]+$/.test(clientSecret)
	)
		return null;
	return {
		clientId,
		clientIdHash: hashAnonymousClient(clientId, clientSecret),
	};
}

export function requireAnonymousClient(request: NextRequest): AnonymousClient {
	const client = getAnonymousClient(request);
	if (!client)
		throw new Response(
			JSON.stringify({ error: "当前浏览器凭证无效，请刷新页面后重试。" }),
			{ status: 401 },
		);
	return client;
}

export function getSiteUrl(request?: NextRequest) {
	return (
		process.env.NEXT_PUBLIC_SITE_URL ??
		process.env.URL ??
		(request ? request.nextUrl.origin : "http://localhost:3000")
	);
}
