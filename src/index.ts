/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.jsonc`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

// Please install OpenAI SDK first: `npm install openai`

import strict from "node:assert/strict";
import OpenAI from "openai";

export interface Env {
	DEEPSEEK_API_KEY: string;
}

export default {
	async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
		if (request.method === "OPTIONS") {
			return new Response(null, {
				headers: {
					"Access-Control-Allow-Origin": "*",
					"Access-Control-Allow-Methods": "POST, OPTIONS",
					"Access-Control-Allow-Headers": "Content-Type",
				},
			});
		}

		if (request.method !== "POST") {
			return new Response(JSON.stringify({error: "Method not allowed"}), {
				status: 405,
				headers: {
					"Content-Type": "application/json",
					"Access-Control-Allow-Origin": "*",
				},
			});
		}

		try {
			const { message, systemPrompt = "You are a helpful assistant."} = await request.json() as {
				message: string;
				systemPrompt?: string;
			};
			if (!message) {
				return new Response(JSON.stringify({ error: "Message is required" }), {
					status: 400,
					headers: {
						"Content-Type": "application/json",
						"Access-Control-Allow-Origin": "*",
					}
				});
			}
			const deepseek = new OpenAI({
				baseURL: 'https://api.deepseek.com',
				apiKey: env.DEEPSEEK_API_KEY,
			});
			const completion = await deepseek.chat.completions.create({
				model: "deepseek-chat",
				messages: [
					{ role: "system", content: systemPrompt },
					{ role: "user", content: message },
				],
			});
			const reply = completion.choices[0]?.message?.content || "No response";

			return new Response(JSON.stringify({success: true, reply}), {
				headers: {
					"Content-Type": "application/json",
					"Access-Control-Allow-Origin": "*",
				}
			});
		} catch (error: any) {
			console.error("Error processing request:", error);
			return new Response(JSON.stringify({ success: false, error: error.message }), {
				status: 500,
				headers: {
					"Content-Type": "application/json",
					"Access-Control-Allow-Origin": "*",
				}
			});
		}
	}
};