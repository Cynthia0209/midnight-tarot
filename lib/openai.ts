import OpenAI from "openai";

let client: OpenAI | undefined;

export function getOpenAI() {
	if (!process.env.DEEPSEEK_API_KEY) {
		throw new Error("DEEPSEEK_API_KEY is not configured");
	}

	client ??= new OpenAI({
		apiKey: process.env.DEEPSEEK_API_KEY,
		baseURL: "https://api.deepseek.com",
	});

	return client;
}
